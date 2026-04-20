import * as Phaser from "phaser";

import { NO_MOVE_INTENT, type MoveIntent } from "./actions";

const isTypingIntoField = (): boolean => {
  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  );
};

export class KeyboardBindings {
  private readonly scene: Phaser.Scene;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private readonly interact: Phaser.Input.Keyboard.Key;
  private readonly confirm: Phaser.Input.Keyboard.Key;
  private readonly close: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.interact = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.confirm = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.close = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  readMoveIntent(): MoveIntent {
    if (!this.scene.input.keyboard || isTypingIntoField()) {
      return NO_MOVE_INTENT;
    }

    let x = 0;
    let y = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      x -= 1;
    }
    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      x += 1;
    }
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      y -= 1;
    }
    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      y += 1;
    }

    if (x === 0 && y === 0) {
      return NO_MOVE_INTENT;
    }

    return { x, y };
  }

  consumeInteractPressed(): boolean {
    if (isTypingIntoField()) {
      return false;
    }

    return (
      Phaser.Input.Keyboard.JustDown(this.interact) ||
      Phaser.Input.Keyboard.JustDown(this.confirm)
    );
  }

  consumeClosePressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.close);
  }
}
