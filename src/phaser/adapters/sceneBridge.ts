import * as Phaser from "phaser";

import { WORLD_CONFIG } from "../../game/content/world";
import { TownSimulation } from "../../game/simulation/systems/TownSimulation";
import { resolveRenderableAnimation } from "../view/sprites/animationFactory";

interface BubbleLayout {
  npcNameFont: number;
  npcNameOffsetY: number;
  npcNameStrokeThickness: number;
  nameBubblePadX: number;
  nameBubblePadY: number;
  nameBubbleRadius: number;
  npcDialogueFont: number;
  npcDialoguePaddingX: number;
  npcDialoguePaddingY: number;
  npcDialogueWrapWidth: number;
  npcDialogueOffsetY: number;
  dialogueBubblePadX: number;
  dialogueBubblePadY: number;
  dialogueBubbleRadius: number;
  dialogueBubbleTailWidth: number;
  dialogueBubbleTailHeight: number;
  edgeMargin: number;
}

export interface ActorView {
  actorKey: string;
  sprite: Phaser.GameObjects.Sprite;
  nameBubble?: Phaser.GameObjects.Graphics;
  nameLabel?: Phaser.GameObjects.Text;
  dialogueBubble?: Phaser.GameObjects.Graphics;
  dialogueLabel?: Phaser.GameObjects.Text;
}

export class TownSceneBridge {
  private readonly scene: Phaser.Scene;
  private readonly simulation: TownSimulation;
  private readonly playerView: ActorView;
  private readonly npcViews: Record<string, ActorView>;
  private bubbleLayout?: BubbleLayout;
  private bubbleLayoutSignature = "";

  constructor(
    scene: Phaser.Scene,
    simulation: TownSimulation,
    playerView: ActorView,
    npcViews: Record<string, ActorView>,
  ) {
    this.scene = scene;
    this.simulation = simulation;
    this.playerView = playerView;
    this.npcViews = npcViews;
  }

  render(): void {
    const bubbleLayout = this.ensureBubbleLayout();
    const state = this.simulation.getState();
    const worldView = this.scene.cameras.main.worldView;

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
      const isHighlighted = state.player.nearbyNpcId === npc.id;
      npcView.sprite.setPosition(npc.position.x, npc.position.y);
      npcView.sprite.setDepth(npc.position.y);

      this.playActorAnimation(npcView.sprite, npcView.actorKey, npc.animation);

      if (npcView.nameLabel) {
        npcView.nameLabel
          .setPosition(npc.position.x, npc.position.y - bubbleLayout.npcNameOffsetY)
          .setDepth(npc.position.y + 1000)
          .setColor(isHighlighted ? "#fff9da" : "#f5f8ff");

        if (npcView.nameBubble) {
          this.renderNameBubble(
            npcView.nameBubble,
            npcView.nameLabel,
            isHighlighted,
            npc.position.y + 999,
            bubbleLayout,
          );
        }
      } else {
        npcView.nameBubble?.setVisible(false);
      }

      if (npcView.dialogueLabel) {
        const isVisible = npc.currentDialogue !== "" && npc.dialogueVisibleUntil > state.time;
        npcView.dialogueLabel
          .setVisible(isVisible)
          .setDepth(npc.position.y + 1002)
          .setColor(isHighlighted ? "#f9fdff" : "#eaf3ff")
          .setText(npc.currentDialogue);

        if (isVisible) {
          const halfWidth =
            npcView.dialogueLabel.displayWidth / 2 + bubbleLayout.dialogueBubblePadX;
          const minX = worldView.left + bubbleLayout.edgeMargin + halfWidth;
          const maxX = worldView.right - bubbleLayout.edgeMargin - halfWidth;
          const bubbleX =
            minX <= maxX
              ? Phaser.Math.Clamp(npc.position.x, minX, maxX)
              : worldView.centerX;

          npcView.dialogueLabel.setPosition(
            bubbleX,
            npc.position.y - bubbleLayout.npcDialogueOffsetY,
          );

          if (npcView.dialogueBubble) {
            this.renderDialogueBubble(
              npcView.dialogueBubble,
              npcView.dialogueLabel,
              isHighlighted,
              npc.position.y + 1001,
              bubbleLayout,
            );
          }
        } else {
          npcView.dialogueBubble?.setVisible(false);
        }
      } else {
        npcView.dialogueBubble?.setVisible(false);
      }
    }
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

  private renderNameBubble(
    bubble: Phaser.GameObjects.Graphics,
    label: Phaser.GameObjects.Text,
    highlighted: boolean,
    depth: number,
    layout: BubbleLayout,
  ): void {
    const width = label.displayWidth + layout.nameBubblePadX * 2;
    const height = label.displayHeight + layout.nameBubblePadY * 2;
    const x = label.x - width / 2;
    const y = label.y - height / 2;
    const shadowOffset = 1.3;
    const sheenHeight = Math.max(3, height * 0.45);

    bubble.setVisible(true).setDepth(depth).clear();
    bubble.fillStyle(0x000000, 0.18);
    bubble.fillRoundedRect(
      x + shadowOffset,
      y + shadowOffset,
      width,
      height,
      layout.nameBubbleRadius,
    );
    bubble.fillStyle(highlighted ? 0x283d62 : 0x172a46, 0.52);
    bubble.fillRoundedRect(x, y, width, height, layout.nameBubbleRadius);
    bubble.fillStyle(0xffffff, highlighted ? 0.13 : 0.09);
    bubble.fillRoundedRect(
      x + 1,
      y + 1,
      Math.max(1, width - 2),
      Math.max(2, sheenHeight),
      layout.nameBubbleRadius,
    );
    bubble.lineStyle(1.2, highlighted ? 0xfad37e : 0x9fc3ff, highlighted ? 0.74 : 0.5);
    bubble.strokeRoundedRect(x, y, width, height, layout.nameBubbleRadius);
  }

  private renderDialogueBubble(
    bubble: Phaser.GameObjects.Graphics,
    label: Phaser.GameObjects.Text,
    highlighted: boolean,
    depth: number,
    layout: BubbleLayout,
  ): void {
    const width = label.displayWidth + layout.dialogueBubblePadX * 2;
    const height = label.displayHeight + layout.dialogueBubblePadY * 2;
    const x = label.x - width / 2;
    const y = label.y - label.displayHeight - layout.dialogueBubblePadY;
    const bubbleBottomY = y + height;
    const tailHalf = layout.dialogueBubbleTailWidth / 2;
    const tailHeight = layout.dialogueBubbleTailHeight;
    const shadowOffset = 1.6;
    const sheenHeight = Math.max(4, height * 0.42);

    bubble.setVisible(true).setDepth(depth).clear();
    bubble.fillStyle(0x000000, 0.2);
    bubble.fillRoundedRect(
      x + shadowOffset,
      y + shadowOffset,
      width,
      height,
      layout.dialogueBubbleRadius,
    );
    bubble.fillTriangle(
      label.x - tailHalf + shadowOffset,
      bubbleBottomY + shadowOffset,
      label.x + tailHalf + shadowOffset,
      bubbleBottomY + shadowOffset,
      label.x + shadowOffset,
      bubbleBottomY + tailHeight + shadowOffset,
    );

    bubble.fillStyle(highlighted ? 0x243f67 : 0x162d4a, 0.54);
    bubble.fillRoundedRect(x, y, width, height, layout.dialogueBubbleRadius);
    bubble.fillStyle(0xffffff, highlighted ? 0.11 : 0.08);
    bubble.fillRoundedRect(
      x + 1,
      y + 1,
      Math.max(1, width - 2),
      Math.max(2, sheenHeight),
      layout.dialogueBubbleRadius,
    );
    bubble.fillTriangle(
      label.x - tailHalf,
      bubbleBottomY,
      label.x + tailHalf,
      bubbleBottomY,
      label.x,
      bubbleBottomY + tailHeight,
    );

    bubble.lineStyle(1.2, highlighted ? 0xf8d482 : 0x9fc9ff, highlighted ? 0.72 : 0.52);
    bubble.strokeRoundedRect(x, y, width, height, layout.dialogueBubbleRadius);
    bubble.lineBetween(
      label.x - tailHalf,
      bubbleBottomY,
      label.x,
      bubbleBottomY + tailHeight,
    );
    bubble.lineBetween(
      label.x + tailHalf,
      bubbleBottomY,
      label.x,
      bubbleBottomY + tailHeight,
    );
  }

  private ensureBubbleLayout(): BubbleLayout {
    const { layout, signature } = this.computeBubbleLayout();
    if (this.bubbleLayout && this.bubbleLayoutSignature === signature) {
      return this.bubbleLayout;
    }

    this.bubbleLayout = layout;
    this.bubbleLayoutSignature = signature;
    this.applyBubbleLayout(this.bubbleLayout);
    return this.bubbleLayout;
  }

  private computeBubbleLayout(): { layout: BubbleLayout; signature: string } {
    const canvasBounds = this.scene.sys.game.canvas.getBoundingClientRect();
    const cameraZoom = this.scene.cameras.main.zoom || 1;
    const displayScale = Math.max(
      Math.min(
        canvasBounds.width / WORLD_CONFIG.width,
        canvasBounds.height / WORLD_CONFIG.height,
      ) * cameraZoom,
      0.01,
    );
    const readabilityScale = Phaser.Math.Clamp(1 / displayScale, 0.9, 1.6);
    const scale = (value: number): number => Math.round(value * readabilityScale);
    const scaleFloat = (value: number): number =>
      Number((value * readabilityScale).toFixed(2));

    const layout = {
      npcNameFont: scale(14),
      npcNameOffsetY: 74,
      npcNameStrokeThickness: 1,
      nameBubblePadX: scaleFloat(4),
      nameBubblePadY: scaleFloat(1.8),
      nameBubbleRadius: scale(9),
      npcDialogueFont: scale(13),
      npcDialoguePaddingX: scaleFloat(4.5),
      npcDialoguePaddingY: scaleFloat(2.2),
      npcDialogueWrapWidth: scale(176),
      npcDialogueOffsetY: 100,
      dialogueBubblePadX: scaleFloat(4.5),
      dialogueBubblePadY: scaleFloat(2),
      dialogueBubbleRadius: scale(10),
      dialogueBubbleTailWidth: scale(12),
      dialogueBubbleTailHeight: scale(7),
      edgeMargin: scale(8),
    };

    const signature = [
      Math.round(canvasBounds.width),
      Math.round(canvasBounds.height),
      Math.round(cameraZoom * 100),
    ].join(":");

    return { layout, signature };
  }

  private applyBubbleLayout(layout: BubbleLayout): void {
    for (const npcView of Object.values(this.npcViews)) {
      npcView.nameLabel
        ?.setFontSize(layout.npcNameFont)
        .setStroke("#0e1a1e", layout.npcNameStrokeThickness);

      npcView.dialogueLabel
        ?.setFontSize(layout.npcDialogueFont)
        .setPadding(
          layout.npcDialoguePaddingX,
          layout.npcDialoguePaddingY,
          layout.npcDialoguePaddingX,
          layout.npcDialoguePaddingY,
        )
        .setWordWrapWidth(layout.npcDialogueWrapWidth, true)
        .setLineSpacing(-1.5);
    }
  }
}
