# Phaser 迁移分析

迁移前的项目有一个很清晰的职责边界：

- Godot 客户端负责移动、交互、UI 展示和 HTTP 调用。
- FastAPI 后端负责 `/chat`、`/npcs/status`、记忆系统、好感度系统和批量状态生成。

基于这个结构，这次 Phaser 迁移没有去重写后端，而是把原来的 Godot 客户端替换成一个 `Phaser + TypeScript + Vite` Web 客户端，并继续复用现有后端接口。

## 迁移后的结构

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

## 迁移后的 Web 资源

- 角色精灵：`src/game/assets/files/characters/character_1.png` 到 `character_4.png`
- 场景底图：`src/game/assets/files/interiors/Japanese_Home_1_preview_48x48.png`
- 装饰图：`src/game/assets/files/interiors/小鲸鱼.png`
- 音频：`src/game/assets/files/audio/BGM.ogg`、`Running.mp3`、`interact.mp3`

这些资源从原 Godot 工程中迁移而来；Phaser 分支不再依赖 `helloagents-ai-town/` 目录，运行时资源由 manifest 统一注册。

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
