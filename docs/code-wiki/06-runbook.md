# 06. 运行与配置（Runbook）

## 8. 项目运行方式（推荐）

## 8.1 后端启动

```bash
cd /Users/remy/Desktop/Helloagents-AI-Town/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 填写 LLM_API_KEY 等
python main.py
```

启动后访问：

- API 文档：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/health`

## 8.2 客户端启动（Godot）

1. 用 Godot 导入项目：`/Users/remy/Desktop/Helloagents-AI-Town/helloagents-ai-town/project.godot`
2. 运行主场景（默认已配置为 `scenes/main.tscn`）
3. 游戏内：`W/A/S/D` 移动，`E` 交互，`Enter` 发送，`ESC` 关闭对话框

## 8.3 联调验证

- 先启动后端，再运行 Godot
- 观察 Godot 控制台是否出现 `GET /npcs/status` 周期调用
- 与 NPC 对话后查看后端 `logs/dialogue_YYYY-MM-DD.log`

---

## 9. 配置说明

## 9.1 后端配置（`backend/config.py` + `.env`）

关键项：

- `API_HOST` / `API_PORT`
- `NPC_UPDATE_INTERVAL`（默认 30 秒）
- `LLM_MODEL_ID`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `CORS_ORIGINS`

## 9.2 前端配置（`helloagents-ai-town/scripts/config.gd`）

关键项：

- `API_BASE_URL`（默认 `http://localhost:8000`）
- `PLAYER_SPEED`
- `INTERACTION_DISTANCE`
- `NPC_STATUS_UPDATE_INTERVAL`
- `DEBUG_MODE`

---

