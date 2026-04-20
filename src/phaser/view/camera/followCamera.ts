import * as Phaser from "phaser";

export const configureFollowCamera = (
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Components.Transform,
  worldWidth: number,
  worldHeight: number,
  zoom: number,
): void => {
  const camera = scene.cameras.main;
  camera.setBounds(0, 0, worldWidth, worldHeight);
  camera.startFollow(target, true, 0.08, 0.08);
  camera.setZoom(zoom);
  camera.setRoundPixels(false);
};
