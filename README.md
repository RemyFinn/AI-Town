# 赛博小镇 - Godot 分支

这是 `Helloagents-AI-Town` 的 Godot 客户端分支。当前分支保留原 Godot 4.x 项目和共用 FastAPI 后端，适合继续维护桌面端/原生 Godot 版本。

## 项目结构

- `helloagents-ai-town/`：Godot 4.x 工程目录，包含场景、脚本和游戏资源。
- `backend/`：FastAPI 后端，负责 NPC 状态、对话、记忆和好感度接口。
- `docs/`：项目架构和维护文档。

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

默认后端地址：

- API: `http://127.0.0.1:8000`
- 文档: `http://127.0.0.1:8000/docs`

### 2. 打开 Godot 项目

1. 启动 Godot 4.x。
2. 点击“导入”。
3. 选择 `helloagents-ai-town/project.godot`。
4. 打开项目后按 `F5` 运行。

## 操作

- `WASD`：移动玩家
- `E`：与 NPC 交互
- `Enter`：发送消息
- `Esc`：关闭对话框

## 相关文档

- [安装配置指南](SETUP_GUIDE.md)
- [对话日志系统](DIALOGUE_LOG_GUIDE.md)
- [好感度系统](AFFINITY_SYSTEM_GUIDE.md)
- [记忆系统](MEMORY_SYSTEM_GUIDE.md)
- [Code Wiki](docs/code-wiki/README.md)

## 分支说明

- `godot`：Godot 4.x 客户端 + FastAPI 后端。
- `phaser`：Phaser + TypeScript + Vite Web 客户端 + FastAPI 后端。
