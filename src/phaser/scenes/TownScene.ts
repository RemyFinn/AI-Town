import * as Phaser from "phaser";

import { ACTOR_SPRITES, STATIC_ASSETS } from "../../game/assets/manifest";
import { NPC_DEFINITIONS } from "../../game/content/npcs";
import { WORLD_CONFIG } from "../../game/content/world";
import { KeyboardBindings } from "../../game/input/bindings";
import { TownSimulation } from "../../game/simulation/systems/TownSimulation";
import { TownSceneBridge, type ActorView } from "../adapters/sceneBridge";
import { configureFollowCamera } from "../view/camera/followCamera";
import { getAnimationName } from "../view/sprites/animationFactory";

const AUDIO_DEFAULT_VOLUMES = {
  bgm: 0.24,
  interact: 0.46,
  running: 0.2,
} as const;

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
    const textResolution = Math.min(window.devicePixelRatio || 1, 2);

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
            color: "#fdf4cf",
            fontFamily: '"Avenir Next", "PingFang SC", sans-serif',
            fontSize: "18px",
            fontStyle: "700",
            align: "center",
          })
          .setResolution(textResolution)
          .setOrigin(0.5);

        const dialogueLabel = this.add
          .text(npcState.position.x, npcState.position.y - 118, "", {
            color: "#ecf4f2",
            fontFamily: '"Avenir Next", "PingFang SC", sans-serif',
            fontSize: "14px",
            align: "left",
            padding: {
              x: 10,
              y: 8,
            },
            wordWrap: {
              width: 140,
              useAdvancedWrap: true,
            },
          })
          .setResolution(textResolution)
          .setOrigin(0.5, 1)
          .setVisible(false);

        const nameBubble = this.add.graphics().setDepth(npcState.position.y + 999);
        const dialogueBubble = this.add
          .graphics()
          .setDepth(npcState.position.y + 1001)
          .setVisible(false);

        return [
          npcDefinition.id,
          {
            actorKey: spriteDefinition.key,
            sprite,
            nameBubble,
            nameLabel,
            dialogueBubble,
            dialogueLabel,
          } satisfies ActorView,
        ];
      }),
    ) as Record<string, ActorView>;

    this.bindings = new KeyboardBindings(this);
    this.bridge = new TownSceneBridge(this, this.simulation, playerView, npcViews);

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
      volume: AUDIO_DEFAULT_VOLUMES.bgm,
    });
    this.interactSound = this.sound.add(STATIC_ASSETS.interact.key, {
      volume: AUDIO_DEFAULT_VOLUMES.interact,
    });
    this.runningSound = this.sound.add(STATIC_ASSETS.running.key, {
      loop: true,
      volume: AUDIO_DEFAULT_VOLUMES.running,
    });

    const unlockAudio = (): void => {
      if (this.bgm && !this.bgm.isPlaying) {
        this.bgm.play();
      }
    };

    if (this.sound.locked) {
      this.input.once("pointerdown", unlockAudio);
      this.input.keyboard?.once("keydown", unlockAudio);
      window.addEventListener("pointerdown", unlockAudio, { once: true });
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
