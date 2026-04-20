import * as Phaser from "phaser";

import { ACTOR_SPRITES, STATIC_ASSETS } from "../../game/assets/manifest";
import { registerSpriteDefinitions } from "../view/sprites/animationFactory";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    const textResolution = Math.min(window.devicePixelRatio || 1, 2);
    const loadingText = this.add
      .text(640, 360, "正在加载 Phaser 客户端…", {
        color: "#f2efe8",
        fontFamily: '"Avenir Next", "PingFang SC", sans-serif',
        fontSize: "28px",
      })
      .setResolution(textResolution)
      .setOrigin(0.5);

    this.load.on("progress", (value: number) => {
      loadingText.setText(`正在加载 Phaser 客户端… ${Math.round(value * 100)}%`);
    });

    this.load.image(STATIC_ASSETS.background.key, STATIC_ASSETS.background.source);
    this.load.image(STATIC_ASSETS.whale.key, STATIC_ASSETS.whale.source);
    this.load.audio(STATIC_ASSETS.bgm.key, STATIC_ASSETS.bgm.source);
    this.load.audio(STATIC_ASSETS.interact.key, STATIC_ASSETS.interact.source);
    this.load.audio(STATIC_ASSETS.running.key, STATIC_ASSETS.running.source);

    for (const definition of Object.values(ACTOR_SPRITES)) {
      this.load.image(definition.textureKey, definition.source);
    }
  }

  create(): void {
    registerSpriteDefinitions(this);
    this.scene.start("TownScene");
  }
}
