export interface RectObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const centeredRect = (
  id: string,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): RectObstacle => ({
  id,
  x: centerX - width / 2,
  y: centerY - height / 2,
  width,
  height,
});

export const WORLD_CONFIG = {
  width: 1280,
  height: 720,
  playerSpawn: { x: 453, y: 492 },
  playerSpeed: 200,
  interactionDistance: 80,
  dialogueBubbleDurationMs: 10_000,
  npcStatusRefreshIntervalMs: 30_000,
  playerFootprint: { width: 26, height: 18 },
  npcFootprint: { width: 24, height: 16 },
  cameraZoom: 1,
  background: {
    x: 644.49994,
    y: 371.25,
    scaleX: 1.4747808,
    scaleY: 1.1394081,
  },
  whale: {
    x: 787.0000006,
    y: 120.0000086,
    scaleX: 0.1362661032,
    scaleY: 0.1443237537,
  },
  obstacles: [
    centeredRect("top-wall-main", 396, 86, 712, 20),
    centeredRect("top-wall-right", 1034, 86, 414.5, 20),
    centeredRect("top-door", 787, 113, 75.5, 20),
    centeredRect("top-door-left", 747, 112.75, 14.5, 18.5),
    centeredRect("top-door-right", 827, 113, 14.5, 18.5),
    centeredRect("bottom-wall", 641, 567, 1258, 20),
    centeredRect("left-wall", 26.75, 328, 23.5, 484),
    centeredRect("right-wall", 1260, 332, 23.5, 484),
    centeredRect("middle-wall-left", 428.5, 268.5, 779, 75),
    centeredRect("middle-wall-right", 907, 368.5, 302, 67),
    centeredRect("meeting-room-wall", 1197.5, 369.5, 107, 65),
  ] satisfies RectObstacle[],
} as const;
