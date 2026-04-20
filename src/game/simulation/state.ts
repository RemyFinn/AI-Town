import type { ActorAnimationKey } from "../assets/manifest";

export interface Vector2 {
  x: number;
  y: number;
}

export type FacingDirection = "up" | "down" | "left" | "right";

export interface PlayerState {
  position: Vector2;
  velocity: Vector2;
  facing: FacingDirection;
  animation: ActorAnimationKey;
  nearbyNpcId: string | null;
  isInteracting: boolean;
}

export interface NPCState {
  id: string;
  name: string;
  title: string;
  spriteKey: string;
  position: Vector2;
  velocity: Vector2;
  spawnPosition: Vector2;
  facing: FacingDirection;
  animation: ActorAnimationKey;
  moveSpeed: number;
  wanderEnabled: boolean;
  wanderRange: number;
  wanderIntervalMinMs: number;
  wanderIntervalMaxMs: number;
  wanderCooldownMs: number;
  wanderTarget: Vector2 | null;
  currentDialogue: string;
  dialogueVisibleUntil: number;
  defaultAnimation: ActorAnimationKey;
  isInteracting: boolean;
}

export interface DialogueMessage {
  id: string;
  npcId: string;
  speaker: "player" | "npc" | "system";
  text: string;
  timestamp: number;
}

export interface DialogueState {
  open: boolean;
  npcId: string | null;
  sending: boolean;
  messages: DialogueMessage[];
}

export interface BackendState {
  apiBaseUrl: string;
  connected: boolean;
  usingFallback: boolean;
  lastError: string | null;
  nextStatusRefreshAt: number;
  lastStatusUpdateAt: number | null;
}

export interface TownGameState {
  time: number;
  player: PlayerState;
  npcs: Record<string, NPCState>;
  dialogue: DialogueState;
  backend: BackendState;
}
