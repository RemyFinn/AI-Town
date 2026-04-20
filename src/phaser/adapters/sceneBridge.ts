import * as Phaser from "phaser";

import { NPC_DEFINITIONS_BY_ID } from "../../game/content/npcs";
import { WORLD_CONFIG } from "../../game/content/world";
import { TownSimulation } from "../../game/simulation/systems/TownSimulation";
import { resolveRenderableAnimation } from "../view/sprites/animationFactory";

export interface ActorView {
  actorKey: string;
  sprite: Phaser.GameObjects.Sprite;
  nameLabel?: Phaser.GameObjects.Text;
  dialogueLabel?: Phaser.GameObjects.Text;
}

export class TownSceneBridge {
  private readonly scene: Phaser.Scene;
  private readonly simulation: TownSimulation;
  private readonly playerView: ActorView;
  private readonly npcViews: Record<string, ActorView>;
  private readonly promptText: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    simulation: TownSimulation,
    playerView: ActorView,
    npcViews: Record<string, ActorView>,
    promptText: Phaser.GameObjects.Text,
  ) {
    this.scene = scene;
    this.simulation = simulation;
    this.playerView = playerView;
    this.npcViews = npcViews;
    this.promptText = promptText;
  }

  render(): void {
    const state = this.simulation.getState();

    this.playerView.sprite.setPosition(
      state.player.position.x,
      state.player.position.y,
    );
    this.playerView.sprite.setDepth(state.player.position.y);
    this.playActorAnimation(
      this.playerView.sprite,
      this.playerView.actorKey,
      state.player.animation,
    );

    for (const npc of Object.values(state.npcs)) {
      const npcView = this.npcViews[npc.id];
      npcView.sprite.setPosition(npc.position.x, npc.position.y);
      npcView.sprite.setDepth(npc.position.y);

      this.playActorAnimation(npcView.sprite, npcView.actorKey, npc.animation);

      if (npcView.nameLabel) {
        npcView.nameLabel
          .setPosition(npc.position.x, npc.position.y - 76)
          .setDepth(npc.position.y + 1000)
          .setColor(
            state.player.nearbyNpcId === npc.id ? "#fff6b4" : "#f8e8a2",
          );
      }

      if (npcView.dialogueLabel) {
        const isVisible = npc.currentDialogue !== "" && npc.dialogueVisibleUntil > state.time;
        npcView.dialogueLabel
          .setVisible(isVisible)
          .setPosition(npc.position.x - 58, npc.position.y - 118)
          .setDepth(npc.position.y + 1001)
          .setText(npc.currentDialogue);
      }
    }

    const nearbyNpc = state.player.nearbyNpcId
      ? NPC_DEFINITIONS_BY_ID[state.player.nearbyNpcId]
      : null;

    this.promptText
      .setVisible(Boolean(nearbyNpc) && !state.dialogue.open)
      .setText(
        nearbyNpc
          ? `按 E 与 ${nearbyNpc.name} 对话`
          : "靠近 NPC 后按 E 开始对话",
      );

    const bottomMargin = WORLD_CONFIG.height - 40;
    this.promptText.setPosition(WORLD_CONFIG.width / 2, bottomMargin);
  }

  private playActorAnimation(
    sprite: Phaser.GameObjects.Sprite,
    spriteKey: string,
    animationKey: Parameters<typeof resolveRenderableAnimation>[2],
  ): void {
    const resolvedAnimation = resolveRenderableAnimation(
      this.scene,
      spriteKey,
      animationKey,
    );

    if (sprite.anims.currentAnim?.key === resolvedAnimation) {
      return;
    }

    sprite.play(resolvedAnimation, true);
  }
}
