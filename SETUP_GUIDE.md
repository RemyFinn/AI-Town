# Godot 分支安装配置指南

## 系统要求

- Godot 4.2+，推荐 4.3 或更新版本
- Python 3.10+
- Git

## 1. 启动后端

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

`.env` 中可以配置真实模型服务：

```env
API_HOST=0.0.0.0
API_PORT=8000
LLM_API_KEY=sk-your-api-key-here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4
NPC_UPDATE_INTERVAL=30
```

如果不配置 `LLM_API_KEY`，后端会使用模拟回复，方便本地开发。

## 2. 打开 Godot 客户端

1. 启动 Godot。
2. 选择“导入”。
3. 选择 `helloagents-ai-town/project.godot`。
4. 打开项目后按 `F5` 运行。

Godot 客户端默认连接 `http://127.0.0.1:8000`。如果需要修改接口地址，请编辑：

```text
helloagents-ai-town/scripts/config.gd
```

## 3. 游戏操作

- `WASD`：移动玩家
- `E`：与 NPC 交互
- `Enter`：发送消息
- `Esc`：关闭对话框

## 常见问题

- 后端启动失败：确认 Python 版本为 3.10+，并已安装 `backend/requirements.txt`。
- Godot 无法打开项目：确认导入的是 `helloagents-ai-town/project.godot`，不是单个 `.tscn` 场景文件。
- 无法对话：确认后端正在运行，并访问 `http://127.0.0.1:8000/docs` 检查接口是否可用。
