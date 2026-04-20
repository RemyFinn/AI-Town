import * as Phaser from "phaser";

import { NO_MOVE_INTENT, type MoveIntent } from "./actions";

const isTypingIntoField = (): boolean => {
  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  );
};

type TouchDirection = "up" | "down" | "left" | "right";

export class KeyboardBindings {
  private readonly scene: Phaser.Scene;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private readonly interact: Phaser.Input.Keyboard.Key;
  private readonly confirm: Phaser.Input.Keyboard.Key;
  private readonly close: Phaser.Input.Keyboard.Key;
  private readonly touchDirectionPresses: Record<TouchDirection, number> = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
  };
  private touchInteractQueued = false;
  private touchCloseQueued = false;
  private readonly disposers: Array<() => void> = [];

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

    this.setupTouchControls();
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dispose());
    this.scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.dispose());
  }

  readMoveIntent(): MoveIntent {
    if (isTypingIntoField()) {
      return NO_MOVE_INTENT;
    }

    let x = 0;
    let y = 0;

    if (
      this.touchDirectionPresses.left > 0 ||
      this.cursors.left.isDown ||
      this.wasd.left.isDown
    ) {
      x -= 1;
    }
    if (
      this.touchDirectionPresses.right > 0 ||
      this.cursors.right.isDown ||
      this.wasd.right.isDown
    ) {
      x += 1;
    }
    if (
      this.touchDirectionPresses.up > 0 ||
      this.cursors.up.isDown ||
      this.wasd.up.isDown
    ) {
      y -= 1;
    }
    if (
      this.touchDirectionPresses.down > 0 ||
      this.cursors.down.isDown ||
      this.wasd.down.isDown
    ) {
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

    const touchPressed = this.touchInteractQueued;
    this.touchInteractQueued = false;

    return (
      touchPressed ||
      Phaser.Input.Keyboard.JustDown(this.interact) ||
      Phaser.Input.Keyboard.JustDown(this.confirm)
    );
  }

  consumeClosePressed(): boolean {
    const touchPressed = this.touchCloseQueued;
    this.touchCloseQueued = false;
    return touchPressed || Phaser.Input.Keyboard.JustDown(this.close);
  }

  private setupTouchControls(): void {
    const directionByAction: Record<string, TouchDirection> = {
      "move-up": "up",
      "move-down": "down",
      "move-left": "left",
      "move-right": "right",
    };

    const controls = document.querySelectorAll<HTMLButtonElement>("[data-touch-control]");
    controls.forEach((button) => {
      const action = button.dataset.touchControl;
      if (!action) {
        return;
      }

      const direction = directionByAction[action];
      const activePointers = new Set<number>();

      const releasePointer = (pointerId: number): void => {
        if (!activePointers.has(pointerId)) {
          return;
        }

        activePointers.delete(pointerId);
        button.classList.toggle("is-active", activePointers.size > 0);
        if (direction && this.touchDirectionPresses[direction] > 0) {
          this.touchDirectionPresses[direction] -= 1;
        }

        if (button.hasPointerCapture(pointerId)) {
          button.releasePointerCapture(pointerId);
        }
      };

      const onPointerDown = (event: PointerEvent): void => {
        event.preventDefault();
        if (activePointers.has(event.pointerId)) {
          return;
        }

        activePointers.add(event.pointerId);
        button.setPointerCapture(event.pointerId);
        button.classList.add("is-active");

        if (direction) {
          this.touchDirectionPresses[direction] += 1;
          return;
        }

        if (action === "interact") {
          this.touchInteractQueued = true;
        }

        if (action === "close") {
          this.touchCloseQueued = true;
        }
      };

      const onPointerUp = (event: PointerEvent): void => {
        releasePointer(event.pointerId);
      };

      button.addEventListener("pointerdown", onPointerDown, { passive: false });
      button.addEventListener("pointerup", onPointerUp);
      button.addEventListener("pointercancel", onPointerUp);
      button.addEventListener("lostpointercapture", onPointerUp);

      this.disposers.push(() => {
        button.removeEventListener("pointerdown", onPointerDown);
        button.removeEventListener("pointerup", onPointerUp);
        button.removeEventListener("pointercancel", onPointerUp);
        button.removeEventListener("lostpointercapture", onPointerUp);
      });
    });
  }

  private dispose(): void {
    while (this.disposers.length > 0) {
      const cleanup = this.disposers.pop();
      cleanup?.();
    }
  }
}
