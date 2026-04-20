export interface NpcDefinition {
  id: string;
  name: string;
  title: string;
  spriteKey: string;
  initialPosition: { x: number; y: number };
  moveSpeed: number;
  wander: {
    enabled: boolean;
    range: number;
    intervalMinMs: number;
    intervalMaxMs: number;
  };
  defaultAnimation: "idle" | "default";
}

export const NPC_DEFINITIONS: NpcDefinition[] = [
  {
    id: "zhang",
    name: "张三",
    title: "Python工程师",
    spriteKey: "npcZhang",
    initialPosition: { x: 367, y: 172 },
    moveSpeed: 50,
    wander: {
      enabled: true,
      range: 200,
      intervalMinMs: 3000,
      intervalMaxMs: 8000,
    },
    defaultAnimation: "idle",
  },
  {
    id: "li",
    name: "李四",
    title: "产品经理",
    spriteKey: "npcLi",
    initialPosition: { x: 1071, y: 164 },
    moveSpeed: 20,
    wander: {
      enabled: true,
      range: 200,
      intervalMinMs: 3000,
      intervalMaxMs: 8000,
    },
    defaultAnimation: "idle",
  },
  {
    id: "wang",
    name: "王五",
    title: "UI设计师",
    spriteKey: "npcWang",
    initialPosition: { x: 206, y: 423 },
    moveSpeed: 0,
    wander: {
      enabled: false,
      range: 0,
      intervalMinMs: 6000,
      intervalMaxMs: 10_000,
    },
    defaultAnimation: "default",
  },
];

export const NPC_DEFINITIONS_BY_ID = Object.fromEntries(
  NPC_DEFINITIONS.map((npc) => [npc.id, npc]),
) as Record<string, NpcDefinition>;

export const NPC_DEFINITIONS_BY_NAME = Object.fromEntries(
  NPC_DEFINITIONS.map((npc) => [npc.name, npc]),
) as Record<string, NpcDefinition>;
