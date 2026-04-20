import * as Phaser from "phaser";

import { ACTOR_SPRITES, type ActorAnimationKey } from "../../../game/assets/manifest";

const getFrameName = (spriteKey: string, animationKey: ActorAnimationKey, index: number) =>
  `${spriteKey}:${animationKey}:${index}`;

export const getAnimationName = (spriteKey: string, animationKey: ActorAnimationKey) =>
  `${spriteKey}:${animationKey}`;

export const resolveRenderableAnimation = (
  scene: Phaser.Scene,
  spriteKey: string,
  animationKey: ActorAnimationKey,
): string => {
  const preferredAnimation = getAnimationName(spriteKey, animationKey);
  if (scene.anims.exists(preferredAnimation)) {
    return preferredAnimation;
  }

  const defaultAnimation = getAnimationName(spriteKey, "default");
  if (scene.anims.exists(defaultAnimation)) {
    return defaultAnimation;
  }

  return getAnimationName(spriteKey, "idle");
};

export const registerSpriteDefinitions = (scene: Phaser.Scene): void => {
  for (const definition of Object.values(ACTOR_SPRITES)) {
    const texture = scene.textures.get(definition.textureKey);

    for (const animation of definition.animations) {
      animation.frames.forEach((frame, index) => {
        const frameName = getFrameName(definition.key, animation.key, index);
        if (!texture.has(frameName)) {
          texture.add(frameName, 0, frame.x, frame.y, frame.width, frame.height);
        }
      });

      const animationName = getAnimationName(definition.key, animation.key);
      if (scene.anims.exists(animationName)) {
        continue;
      }

      scene.anims.create({
        key: animationName,
        frames: animation.frames.map((_, index) => ({
          key: definition.textureKey,
          frame: getFrameName(definition.key, animation.key, index),
        })),
        frameRate: animation.frameRate,
        repeat: animation.repeat ?? -1,
      });
    }
  }
};
