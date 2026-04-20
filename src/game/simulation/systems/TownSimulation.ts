import { WORLD_CONFIG, type RectObstacle } from "../../content/world";
import {
  NPC_DEFINITIONS,
  type NpcDefinition,
} from "../../content/npcs";
import type { MoveIntent } from "../../input/actions";
import type { ActorAnimationKey } from "../../assets/manifest";
import { TownBackendClient } from "../../api/TownBackendClient";
import type {
  DialogueMessage,
  FacingDirection,
  NPCState,
  TownGameState,
  Vector2,
} from "../state";

type Listener = () => void;

interface Footprint {
  width: number;
  height: number;
}

interface AxisRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ZERO_VECTOR: Vector2 = { x: 0, y: 0 };

const normalize = (vector: MoveIntent): Vector2 => {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) {
    return ZERO_VECTOR;
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
};

const cloneVector = (vector: Vector2): Vector2 => ({
  x: vector.x,
  y: vector.y,
});

const randomBetween = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const distance = (from: Vector2, to: Vector2): number =>
  Math.hypot(from.x - to.x, from.y - to.y);

export class TownSimulation {
  private readonly backendClient: TownBackendClient;
  private readonly listeners = new Set<Listener>();
  private readonly state: TownGameState;
  private moveIntent: MoveIntent = ZERO_VECTOR;
  private statusRequestInFlight = false;
  private messageSequence = 0;
  private lastCountdownSeconds = -1;

  constructor(backendClient = new TownBackendClient()) {
    this.backendClient = backendClient;
    this.state = {
      time: 0,
      player: {
        position: cloneVector(WORLD_CONFIG.playerSpawn),
        velocity: ZERO_VECTOR,
        facing: "down",
        animation: "idle",
        nearbyNpcId: null,
        isInteracting: false,
      },
      npcs: Object.fromEntries(
        NPC_DEFINITIONS.map((npc) => [npc.id, this.createNpcState(npc)]),
      ) as TownGameState["npcs"],
      dialogue: {
        open: false,
        npcId: null,
        sending: false,
        messages: [],
      },
      backend: {
        apiBaseUrl: this.backendClient.apiBaseUrl,
        connected: false,
        usingFallback: false,
        lastError: null,
        nextStatusRefreshAt: 0,
        lastStatusUpdateAt: null,
      },
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async initialize(): Promise<void> {
    if (this.state.backend.lastStatusUpdateAt !== null) {
      return;
    }

    await this.refreshNpcStatuses();
    this.notify();
  }

  getState(): TownGameState {
    return this.state;
  }

  setMoveIntent(intent: MoveIntent): void {
    this.moveIntent = intent;
  }

  update(deltaMs: number): void {
    this.state.time += deltaMs;

    this.updatePlayer(deltaMs);
    this.updateNpcs(deltaMs);

    const nearbyChanged = this.refreshNearbyNpc();
    const countdownSeconds = Math.max(
      0,
      Math.ceil((this.state.backend.nextStatusRefreshAt - this.state.time) / 1000),
    );

    if (
      this.state.time >= this.state.backend.nextStatusRefreshAt &&
      !this.statusRequestInFlight
    ) {
      void this.refreshNpcStatuses();
    }

    if (nearbyChanged || countdownSeconds !== this.lastCountdownSeconds) {
      this.lastCountdownSeconds = countdownSeconds;
      this.notify();
    }
  }

  startDialogueWithNearbyNpc(): void {
    const npcId = this.state.player.nearbyNpcId;
    if (!npcId) {
      return;
    }

    this.openDialogue(npcId);
  }

  openDialogue(npcId: string): void {
    if (!this.state.npcs[npcId]) {
      return;
    }

    if (this.state.dialogue.open && this.state.dialogue.npcId === npcId) {
      return;
    }

    if (this.state.dialogue.open && this.state.dialogue.npcId) {
      this.state.npcs[this.state.dialogue.npcId].isInteracting = false;
    }

    this.state.dialogue.open = true;
    this.state.dialogue.npcId = npcId;
    this.state.dialogue.sending = false;
    this.state.player.isInteracting = true;
    this.state.player.velocity = ZERO_VECTOR;
    this.state.player.animation = "idle";
    this.state.npcs[npcId].isInteracting = true;

    if (!this.hasDialogueHistory(npcId)) {
      this.pushMessage("system", npcId, `与 ${this.state.npcs[npcId].name} 的对话开始。`);
    }

    this.notify();
  }

  closeDialogue(): void {
    if (this.state.dialogue.npcId) {
      this.state.npcs[this.state.dialogue.npcId].isInteracting = false;
    }

    this.state.dialogue.open = false;
    this.state.dialogue.npcId = null;
    this.state.dialogue.sending = false;
    this.state.player.isInteracting = false;
    this.notify();
  }

  async sendMessage(rawMessage: string): Promise<void> {
    const npcId = this.state.dialogue.npcId;
    if (!npcId || this.state.dialogue.sending) {
      return;
    }

    const message = rawMessage.trim();
    if (!message) {
      return;
    }

    const npc = this.state.npcs[npcId];
    this.pushMessage("player", npcId, message);
    this.state.dialogue.sending = true;
    this.notify();

    const result = await this.backendClient.sendChat(npc.name, message);

    this.state.dialogue.sending = false;
    this.state.backend.connected = result.source === "backend";
    this.state.backend.usingFallback = result.source === "fallback";
    this.state.backend.lastError = result.error ?? null;

    this.pushMessage("npc", npcId, result.message);
    this.applyNpcSpeech(npcId, result.message);
    this.notify();
  }

  private createNpcState(definition: NpcDefinition): NPCState {
    return {
      id: definition.id,
      name: definition.name,
      title: definition.title,
      spriteKey: definition.spriteKey,
      position: cloneVector(definition.initialPosition),
      velocity: ZERO_VECTOR,
      spawnPosition: cloneVector(definition.initialPosition),
      facing: "down",
      animation: definition.defaultAnimation,
      moveSpeed: definition.moveSpeed,
      wanderEnabled: definition.wander.enabled,
      wanderRange: definition.wander.range,
      wanderIntervalMinMs: definition.wander.intervalMinMs,
      wanderIntervalMaxMs: definition.wander.intervalMaxMs,
      wanderCooldownMs: randomBetween(
        definition.wander.intervalMinMs,
        definition.wander.intervalMaxMs,
      ),
      wanderTarget: null,
      currentDialogue: "",
      dialogueVisibleUntil: 0,
      defaultAnimation: definition.defaultAnimation,
      isInteracting: false,
    };
  }

  private updatePlayer(deltaMs: number): void {
    if (this.state.player.isInteracting) {
      this.state.player.velocity = ZERO_VECTOR;
      this.state.player.animation = "idle";
      return;
    }

    const direction = normalize(this.moveIntent);
    const speed = WORLD_CONFIG.playerSpeed;
    const movement = {
      x: direction.x * speed * (deltaMs / 1000),
      y: direction.y * speed * (deltaMs / 1000),
    };

    const nextPosition = this.resolveMovement(
      "player",
      this.state.player.position,
      movement,
      WORLD_CONFIG.playerFootprint,
    );

    this.state.player.velocity = {
      x: (nextPosition.x - this.state.player.position.x) / (deltaMs / 1000 || 1),
      y: (nextPosition.y - this.state.player.position.y) / (deltaMs / 1000 || 1),
    };
    this.state.player.position = nextPosition;

    if (direction.x !== 0 || direction.y !== 0) {
      this.state.player.facing = this.getFacingFromVector(direction);
      this.state.player.animation = this.getWalkAnimation(this.state.player.facing);
    } else {
      this.state.player.animation = "idle";
    }
  }

  private updateNpcs(deltaMs: number): void {
    for (const npc of Object.values(this.state.npcs)) {
      if (!npc.wanderEnabled || npc.wanderRange <= 0 || npc.moveSpeed <= 0) {
        npc.velocity = ZERO_VECTOR;
        npc.animation = npc.defaultAnimation;
        continue;
      }

      if (npc.isInteracting) {
        npc.velocity = ZERO_VECTOR;
        npc.animation = npc.defaultAnimation === "default" ? "default" : "idle";
        continue;
      }

      npc.wanderCooldownMs -= deltaMs;

      if (!npc.wanderTarget && npc.wanderCooldownMs <= 0) {
        npc.wanderTarget = this.pickWanderTarget(npc);
        npc.wanderCooldownMs = randomBetween(
          npc.wanderIntervalMinMs,
          npc.wanderIntervalMaxMs,
        );
      }

      if (!npc.wanderTarget) {
        npc.velocity = ZERO_VECTOR;
        npc.animation = npc.defaultAnimation === "default" ? "default" : "idle";
        continue;
      }

      const toTarget = {
        x: npc.wanderTarget.x - npc.position.x,
        y: npc.wanderTarget.y - npc.position.y,
      };
      const normalized = normalize(toTarget);

      if (distance(npc.position, npc.wanderTarget) < 8) {
        npc.wanderTarget = null;
        npc.velocity = ZERO_VECTOR;
        npc.animation = npc.defaultAnimation === "default" ? "default" : "idle";
        continue;
      }

      const movement = {
        x: normalized.x * npc.moveSpeed * (deltaMs / 1000),
        y: normalized.y * npc.moveSpeed * (deltaMs / 1000),
      };
      const nextPosition = this.resolveMovement(
        npc.id,
        npc.position,
        movement,
        WORLD_CONFIG.npcFootprint,
      );

      const moved = distance(nextPosition, npc.position) > 0.1;
      npc.velocity = {
        x: (nextPosition.x - npc.position.x) / (deltaMs / 1000 || 1),
        y: (nextPosition.y - npc.position.y) / (deltaMs / 1000 || 1),
      };
      npc.position = nextPosition;

      if (!moved) {
        npc.wanderTarget = null;
        npc.animation = npc.defaultAnimation === "default" ? "default" : "idle";
        continue;
      }

      npc.facing = this.getFacingFromVector(normalized);
      npc.animation = this.getWalkAnimation(npc.facing);
    }
  }

  private refreshNearbyNpc(): boolean {
    const previous = this.state.player.nearbyNpcId;
    let nearestNpcId: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const npc of Object.values(this.state.npcs)) {
      const npcDistance = distance(this.state.player.position, npc.position);
      if (
        npcDistance <= WORLD_CONFIG.interactionDistance &&
        npcDistance < nearestDistance
      ) {
        nearestDistance = npcDistance;
        nearestNpcId = npc.id;
      }
    }

    this.state.player.nearbyNpcId = nearestNpcId;
    return previous !== nearestNpcId;
  }

  private async refreshNpcStatuses(): Promise<void> {
    if (this.statusRequestInFlight) {
      return;
    }

    this.statusRequestInFlight = true;

    try {
      const result = await this.backendClient.fetchNpcStatuses();

      for (const npc of Object.values(this.state.npcs)) {
        const nextDialogue = result.dialogues[npc.name];
        if (nextDialogue) {
          this.applyNpcSpeech(npc.id, nextDialogue);
        }
      }

      this.state.backend.connected = result.source === "backend";
      this.state.backend.usingFallback = result.source === "fallback";
      this.state.backend.lastError = result.error ?? null;
      this.state.backend.lastStatusUpdateAt = this.state.time;
      this.state.backend.nextStatusRefreshAt =
        this.state.time + WORLD_CONFIG.npcStatusRefreshIntervalMs;

      this.notify();
    } finally {
      this.statusRequestInFlight = false;
    }
  }

  private applyNpcSpeech(npcId: string, dialogue: string): void {
    const npc = this.state.npcs[npcId];
    npc.currentDialogue = dialogue;
    npc.dialogueVisibleUntil =
      this.state.time + WORLD_CONFIG.dialogueBubbleDurationMs;
  }

  private resolveMovement(
    actorId: string,
    position: Vector2,
    movement: Vector2,
    footprint: Footprint,
  ): Vector2 {
    const movedX = this.resolveAxis(actorId, position, movement.x, footprint, "x");
    const movedY = this.resolveAxis(
      actorId,
      { x: movedX, y: position.y },
      movement.y,
      footprint,
      "y",
    );

    return { x: movedX, y: movedY };
  }

  private resolveAxis(
    actorId: string,
    position: Vector2,
    delta: number,
    footprint: Footprint,
    axis: "x" | "y",
  ): number {
    let next = position[axis] + delta;

    if (axis === "x") {
      next = Math.min(
        Math.max(next, footprint.width / 2),
        WORLD_CONFIG.width - footprint.width / 2,
      );
    } else {
      next = Math.min(
        Math.max(next, footprint.height),
        WORLD_CONFIG.height,
      );
    }

    const candidatePosition =
      axis === "x"
        ? { x: next, y: position.y }
        : { x: position.x, y: next };

    for (const obstacle of this.getBlockingRects(actorId, footprint)) {
      const actorRect = this.getFootprintRect(candidatePosition, footprint);
      if (!this.rectanglesOverlap(actorRect, obstacle)) {
        continue;
      }

      if (axis === "x") {
        if (delta > 0) {
          next = Math.min(next, obstacle.x - footprint.width / 2);
        } else if (delta < 0) {
          next = Math.max(next, obstacle.x + obstacle.width + footprint.width / 2);
        }
      } else if (delta > 0) {
        next = Math.min(next, obstacle.y);
      } else if (delta < 0) {
        next = Math.max(next, obstacle.y + obstacle.height + footprint.height);
      }
    }

    return next;
  }

  private getBlockingRects(actorId: string, footprint: Footprint): RectObstacle[] {
    const staticObstacles = [...WORLD_CONFIG.obstacles];
    const actorObstacles: RectObstacle[] = [];

    if (actorId !== "player") {
      actorObstacles.push({
        id: "player",
        ...this.getFootprintRect(this.state.player.position, WORLD_CONFIG.playerFootprint),
      });
    }

    for (const npc of Object.values(this.state.npcs)) {
      if (npc.id === actorId) {
        continue;
      }

      actorObstacles.push({
        id: npc.id,
        ...this.getFootprintRect(npc.position, footprint),
      });
    }

    return [...staticObstacles, ...actorObstacles];
  }

  private pickWanderTarget(npc: NPCState): Vector2 | null {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * npc.wanderRange;
      const candidate = {
        x: npc.spawnPosition.x + Math.cos(angle) * radius,
        y: npc.spawnPosition.y + Math.sin(angle) * radius,
      };

      if (
        this.isWalkable(candidate, npc.id, WORLD_CONFIG.npcFootprint) &&
        distance(candidate, npc.spawnPosition) <= npc.wanderRange
      ) {
        return candidate;
      }
    }

    return null;
  }

  private isWalkable(
    position: Vector2,
    actorId: string,
    footprint: Footprint,
  ): boolean {
    if (
      position.x < footprint.width / 2 ||
      position.x > WORLD_CONFIG.width - footprint.width / 2 ||
      position.y < footprint.height ||
      position.y > WORLD_CONFIG.height
    ) {
      return false;
    }

    const rect = this.getFootprintRect(position, footprint);
    return this.getBlockingRects(actorId, footprint).every(
      (obstacle) => !this.rectanglesOverlap(rect, obstacle),
    );
  }

  private getFootprintRect(position: Vector2, footprint: Footprint): AxisRect {
    return {
      x: position.x - footprint.width / 2,
      y: position.y - footprint.height,
      width: footprint.width,
      height: footprint.height,
    };
  }

  private rectanglesOverlap(a: AxisRect, b: AxisRect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private getFacingFromVector(vector: Vector2): FacingDirection {
    if (Math.abs(vector.x) > Math.abs(vector.y)) {
      return vector.x >= 0 ? "right" : "left";
    }

    return vector.y >= 0 ? "down" : "up";
  }

  private getWalkAnimation(facing: FacingDirection): ActorAnimationKey {
    return `walk_${facing}` as ActorAnimationKey;
  }

  private pushMessage(
    speaker: DialogueMessage["speaker"],
    npcId: string,
    text: string,
  ): void {
    this.messageSequence += 1;
    this.state.dialogue.messages.push({
      id: `${npcId}-${this.messageSequence}`,
      npcId,
      speaker,
      text,
      timestamp: this.state.time,
    });
  }

  private hasDialogueHistory(npcId: string): boolean {
    return this.state.dialogue.messages.some((message) => message.npcId === npcId);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
