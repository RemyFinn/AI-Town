export type ActorAnimationKey =
  | "idle"
  | "walk_down"
  | "walk_left"
  | "walk_right"
  | "walk_up"
  | "default";

export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationDefinition {
  key: ActorAnimationKey;
  frames: FrameRect[];
  frameRate: number;
  repeat?: number;
}

export interface ActorSpriteDefinition {
  key: string;
  textureKey: string;
  source: string;
  origin: { x: number; y: number };
  defaultAnimation: ActorAnimationKey;
  animations: AnimationDefinition[];
}

const rect = (x: number, y: number, width: number, height: number): FrameRect => ({
  x,
  y,
  width,
  height,
});

const strip = (
  y: number,
  startX: number,
  count: number,
  width: number,
  height: number,
): FrameRect[] =>
  Array.from({ length: count }, (_, index) =>
    rect(startX + index * width, y, width, height),
  );

const ASSET_BASE_URL = (import.meta.env.VITE_ASSET_BASE_URL ?? "/assets/files").replace(/\/$/, "");
const assetUrl = (path: string): string => `${ASSET_BASE_URL}/${path}`;

export const STATIC_ASSETS = {
  background: {
    key: "office-background",
    source: assetUrl("interiors/Japanese_Home_1_preview_48x48.png"),
  },
  whale: {
    key: "office-whale",
    source: assetUrl("interiors/小鲸鱼.png"),
  },
  bgm: {
    key: "town-bgm",
    source: assetUrl("audio/BGM.ogg"),
  },
  interact: {
    key: "player-interact",
    source: assetUrl("audio/interact.mp3"),
  },
  running: {
    key: "player-running",
    source: assetUrl("audio/Running.mp3"),
  },
} as const;

export const ACTOR_SPRITES: Record<string, ActorSpriteDefinition> = {
  player: {
    key: "player",
    textureKey: "actor-player",
    source: assetUrl("characters/character_1.png"),
    origin: { x: 0.5, y: 0.86 },
    defaultAnimation: "idle",
    animations: [
      { key: "idle", frames: strip(697, 0, 12, 48, 76), frameRate: 12, repeat: -1 },
      { key: "walk_down", frames: strip(794, 864, 6, 48, 70), frameRate: 10, repeat: -1 },
      { key: "walk_left", frames: strip(794, 576, 6, 48, 70), frameRate: 10, repeat: -1 },
      { key: "walk_right", frames: strip(794, 0, 6, 48, 70), frameRate: 10, repeat: -1 },
      { key: "walk_up", frames: strip(794, 288, 6, 48, 70), frameRate: 12, repeat: -1 },
    ],
  },
  npcZhang: {
    key: "npc-zhang",
    textureKey: "actor-npc-zhang",
    source: assetUrl("characters/character_2.png"),
    origin: { x: 0.5, y: 0.88 },
    defaultAnimation: "idle",
    animations: [
      { key: "idle", frames: strip(595, 0, 12, 48, 80), frameRate: 8, repeat: -1 },
      { key: "walk_down", frames: strip(792, 864, 6, 48, 70), frameRate: 12, repeat: -1 },
      { key: "walk_left", frames: strip(792, 576, 6, 48, 70), frameRate: 12, repeat: -1 },
      { key: "walk_right", frames: strip(792, 0, 6, 48, 70), frameRate: 12, repeat: -1 },
      { key: "walk_up", frames: strip(792, 288, 6, 48, 70), frameRate: 12, repeat: -1 },
    ],
  },
  npcLi: {
    key: "npc-li",
    textureKey: "actor-npc-li",
    source: assetUrl("characters/character_3.png"),
    origin: { x: 0.5, y: 0.88 },
    defaultAnimation: "idle",
    animations: [
      { key: "idle", frames: strip(1086, 2016, 14, 48, 70), frameRate: 8, repeat: -1 },
      { key: "walk_down", frames: strip(792, 864, 6, 48, 70), frameRate: 10, repeat: -1 },
      { key: "walk_left", frames: strip(792, 576, 6, 48, 70), frameRate: 10, repeat: -1 },
      { key: "walk_right", frames: strip(792, 0, 6, 48, 70), frameRate: 10, repeat: -1 },
      { key: "walk_up", frames: strip(792, 288, 6, 48, 70), frameRate: 10, repeat: -1 },
    ],
  },
  npcWang: {
    key: "npc-wang",
    textureKey: "actor-npc-wang",
    source: assetUrl("characters/character_4.png"),
    origin: { x: 0.5, y: 0.88 },
    defaultAnimation: "default",
    animations: [
      { key: "default", frames: strip(410, 288, 6, 48, 70), frameRate: 8, repeat: -1 },
    ],
  },
};
