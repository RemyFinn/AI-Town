# Phaser 架构说明

当前 Phaser 分支有一个很清晰的职责边界：

- Phaser + TypeScript + Vite 客户端负责移动、交互、UI 展示和 HTTP 调用。
- FastAPI 后端负责 `/chat`、`/npcs/status`、记忆系统、好感度系统和批量状态生成。

Phaser 客户端继续复用现有后端接口，前端侧专注处理游戏渲染、输入、HUD 和本地交互状态。

## 客户端结构

- `src/game/simulation/systems/TownSimulation.ts`
  - 负责玩家/NPC 状态、四向移动、闲逛、交互距离、状态轮询和对话流程。
- `src/phaser/scenes/BootScene.ts`
  - 负责资源预加载。
- `src/phaser/scenes/TownScene.ts`
  - 负责 Phaser 场景、相机、音频和渲染循环。
- `src/phaser/adapters/sceneBridge.ts`
  - 负责把 simulation 状态映射到 Phaser 精灵、名字标签和头顶气泡。
- `src/ui/hud/domHud.ts`
  - 负责 DOM 版对话面板和顶部状态栏。

## Web 资源

- 角色精灵：`src/game/assets/files/characters/character_1.png` 到 `character_4.png`
- 场景底图：`src/game/assets/files/interiors/Japanese_Home_1_preview_48x48.png`
- 装饰图：`src/game/assets/files/interiors/小鲸鱼.png`
- 音频：`src/game/assets/files/audio/BGM.ogg`、`Running.mp3`、`interact.mp3`

这些资源由 Phaser 分支直接维护，运行时资源由 manifest 统一注册。

## 保留的玩法行为

- `W/A/S/D` 四向移动
- 靠近 NPC 后按 `E` 开始对话
- 底部对话框发送消息
- NPC 周期从 `/npcs/status` 获取状态
- NPC 自主闲逛

## 对 Phaser 架构的取舍

为了遵循 `phaser-2d-game` skill 的建议，玩法状态没有直接堆在 `Scene.update()` 里，而是做成了独立 simulation：

- Scene 只负责渲染、输入和相机
- simulation 负责移动、碰撞、对话和 NPC 逻辑
- DOM HUD 负责密集文字 UI

这样后续如果继续扩展地图、增加 NPC 或替换后端接口，改动范围会更清晰。
