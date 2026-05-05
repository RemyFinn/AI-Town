# 赛博小镇 - Phaser 分支

这是 `Helloagents-AI-Town` 的 Phaser Web 客户端分支。当前分支保留 `Phaser + TypeScript + Vite` 客户端和共用 FastAPI 后端。

## 项目结构

- `src/`：Phaser Web 客户端、游戏状态、输入和 HUD。
- `src/game/assets/files/`：Web 客户端运行需要的贴图和音频资源。
- `backend/`：FastAPI 后端，负责 NPC 状态、对话、记忆和好感度接口。
- `docs/phaser-migration.md`：Phaser 迁移说明。

## 快速启动

### 1. 启动后端

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

如果没有配置 `LLM_API_KEY`，后端会自动进入模拟/预设对话模式，项目仍可运行。

### 2. 启动 Phaser 前端

```bash
npm install
npm run dev
```

默认访问地址：

- Web 客户端: `http://127.0.0.1:5173`
- 后端接口: `http://127.0.0.1:8000`
- 后端文档: `http://127.0.0.1:8000/docs`

## 常用命令

```bash
npm run dev
npm run build
npm run preview
```

## 相关文档

- [安装配置指南](SETUP_GUIDE.md)
- [Phaser 迁移分析](docs/phaser-migration.md)
- [对话日志系统](DIALOGUE_LOG_GUIDE.md)
- [好感度系统](AFFINITY_SYSTEM_GUIDE.md)
- [记忆系统](MEMORY_SYSTEM_GUIDE.md)

## 当前分支

当前分支专注维护 Phaser + TypeScript + Vite Web 客户端和 FastAPI 后端。
