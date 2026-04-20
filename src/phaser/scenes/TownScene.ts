import * as Phaser from "phaser";

import { ACTOR_SPRITES, STATIC_ASSETS } from "../../game/assets/manifest";
import { NPC_DEFINITIONS } from "../../game/content/npcs";
import { WORLD_CONFIG } from "../../game/content/world";
import { KeyboardBindings } from "../../game/input/bindings";
import { TownSimulation } from "../../game/simulation/systems/TownSimulation";
import { TownSceneBridge, type ActorView } from "../adapters/sceneBridge";
import { configureFollowCamera } from "../view/camera/followCamera";
import { getAnimationName } from "../view/sprites/animationFactory";

export class TownScene extends Phaser.Scene {
  private readonly simulation: TownSimulation;
  private bindings?: KeyboardBindings;
  private bridge?: TownSceneBridge;
  private runningSound?: Phaser.Sound.BaseSound;
  private interactSound?: Phaser.Sound.BaseSound;
  private bgm?: Phaser.Sound.BaseSound;

  constructor(simulation: TownSimulation) {
    super("TownScene");
    this.simulation = simulation;
  }

  create(): void {
    this.add
      .image(
        WORLD_CONFIG.background.x,
        WORLD_CONFIG.background.y,
        STATIC_ASSETS.background.key,
      )
      .setScale(WORLD_CONFIG.background.scaleX, WORLD_CONFIG.background.scaleY)
      .setDepth(0);

    this.add
      .image(WORLD_CONFIG.whale.x, WORLD_CONFIG.whale.y, STATIC_ASSETS.whale.key)
      .setScale(WORLD_CONFIG.whale.scaleX, WORLD_CONFIG.whale.scaleY)
      .setDepth(1);

    const state = this.simulation.getState();
    const playerDefinition = ACTOR_SPRITES.player;
    const playerSprite = this.add
      .sprite(
        state.player.position.x,
        state.player.position.y,
        playerDefinition.textureKey,
      )
      .setOrigin(playerDefinition.origin.x, playerDefinition.origin.y)
      .setDepth(100)
      .play(getAnimationName(playerDefinition.key, playerDefinition.defaultAnimation));

    const playerView: ActorView = {
      actorKey: playerDefinition.key,
      sprite: playerSprite,
    };

    const npcViews = Object.fromEntries(
      NPC_DEFINITIONS.map((npcDefinition) => {
        const spriteDefinition = ACTOR_SPRITES[npcDefinition.spriteKey];
        const npcState = state.npcs[npcDefinition.id];
        const sprite = this.add
          .sprite(npcState.position.x, npcState.position.y, spriteDefinition.textureKey)
          .setOrigin(spriteDefinition.origin.x, spriteDefinition.origin.y)
          .setDepth(npcState.position.y)
          .play(
            getAnimationName(
              spriteDefinition.key,
              spriteDefinition.defaultAnimation,
            ),
          );

        const nameLabel = this.add
          .text(npcState.position.x, npcState.position.y - 76, npcState.name, {
            color: "#f8e8a2",
            fontFamily: '"Avenir Next", "PingFang SC", sans-serif',
            fontSize: "18px",
            fontStyle: "700",
            stroke: "#0d1418",
            strokeThickness: 5,
            align: "center",
          })
          .setOrigin(0.5);

        const dialogueLabel = this.add
          .text(npcState.position.x - 56, npcState.position.y - 118, "", {
            color: "#ecf4f2",
            backgroundColor: "rgba(7, 15, 18, 0.84)",
            fontFamily: '"Avenir Next", "PingFang SC", sans-serif',
            fontSize: "14px",
            padding: {
              x: 10,
              y: 8,
            },
            wordWrap: {
              width: 140,
              useAdvancedWrap: true,
            },
          })
          .setVisible(false);

        return [
          npcDefinition.id,
          {
            actorKey: spriteDefinition.key,
            sprite,
            nameLabel,
            dialogueLabel,
          } satisfies ActorView,
        ];
      }),
    ) as Record<string, ActorView>;

    const promptText = this.add
      .text(WORLD_CONFIG.width / 2, WORLD_CONFIG.height - 40, "", {
        color: "#f7ecd5",
        backgroundColor: "rgba(10, 20, 24, 0.82)",
        fontFamily: '"Avenir Next", "PingFang SC", sans-serif',
        fontSize: "18px",
        padding: {
          x: 12,
          y: 8,
        },
      })
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(5000)
      .setVisible(false);

    this.bindings = new KeyboardBindings(this);
    this.bridge = new TownSceneBridge(
      this,
      this.simulation,
      playerView,
      npcViews,
      promptText,
    );

    configureFollowCamera(
      this,
      playerSprite,
      WORLD_CONFIG.width,
      WORLD_CONFIG.height,
      WORLD_CONFIG.cameraZoom,
    );

    this.createAudio();
    this.bridge.render();
  }

  update(_time: number, delta: number): void {
    if (!this.bindings || !this.bridge) {
      return;
    }

    if (this.bindings.consumeClosePressed()) {
      this.simulation.closeDialogue();
    }

    const dialogueWasOpen = this.simulation.getState().dialogue.open;

    if (this.bindings.consumeInteractPressed()) {
      this.simulation.startDialogueWithNearbyNpc();
    }

    this.simulation.setMoveIntent(this.bindings.readMoveIntent());
    this.simulation.update(delta);
    this.bridge.render();
    this.updateFootstepAudio();

    const dialogueIsOpen = this.simulation.getState().dialogue.open;
    if (!dialogueWasOpen && dialogueIsOpen) {
      this.interactSound?.play();
    }
  }

  private createAudio(): void {
    this.bgm = this.sound.add(STATIC_ASSETS.bgm.key, {
      loop: true,
      volume: 0.42,
    });
    this.interactSound = this.sound.add(STATIC_ASSETS.interact.key, {
      volume: 0.65,
    });
    this.runningSound = this.sound.add(STATIC_ASSETS.running.key, {
      loop: true,
      volume: 0.32,
    });

    const unlockAudio = (): void => {
      if (this.bgm && !this.bgm.isPlaying) {
        this.bgm.play();
      }
    };

    if (this.sound.locked) {
      this.input.once("pointerdown", unlockAudio);
      this.input.keyboard?.once("keydown", unlockAudio);
    } else {
      unlockAudio();
    }
  }

  private updateFootstepAudio(): void {
    if (!this.runningSound) {
      return;
    }

    const { player, dialogue } = this.simulation.getState();
    const moving =
      !dialogue.open &&
      (Math.abs(player.velocity.x) > 1 || Math.abs(player.velocity.y) > 1);

    if (moving) {
      if (!this.runningSound.isPlaying) {
        this.runningSound.play();
      }
      return;
    }

    if (this.runningSound.isPlaying) {
      this.runningSound.stop();
    }
  }
}
