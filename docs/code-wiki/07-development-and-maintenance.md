# 07. 扩展开发与维护注意事项

## 10. 扩展与二次开发指南

## 10.1 新增 NPC（后端 + 前端）

1. 后端：在 `backend/agents.py` 的 `NPC_ROLES` 增加角色配置
2. 前端：在 `main.tscn` 实例化 `npc.tscn` 并设置 `npc_name`/`npc_title`
3. 前端：更新 `scripts/main.gd` 的 `get_npc_node()` 映射
4. 如需批量状态一致性，确保批量提示词覆盖新 NPC

## 10.2 新增 API

1. 在 `backend/models.py` 定义请求/响应模型
2. 在 `backend/main.py` 增加路由
3. 在 `helloagents-ai-town/scripts/api_client.gd` 增加请求方法和 signal
4. 在对应 UI 或场景脚本接收 signal 并渲染

## 10.3 调整 NPC 行为刷新策略

- 后端批量生成频率：`Settings.NPC_UPDATE_INTERVAL`
- 前端轮询频率：`Config.NPC_STATUS_UPDATE_INTERVAL`
- 建议两端保持一致（避免 UI 拉取过快或过慢）

---

## 11. 维护观察与注意事项

1. **HelloAgents 路径与安装策略并存**：
   `agents.py`/`batch_generator.py`/`relationship_manager.py` 存在 `sys.path.insert('../HelloAgents')`，但仓库中未见 `HelloAgents/` 目录，实际通常依赖 `pip install hello-agents`。

2. **文档与代码存在少量漂移**：
   说明文档提到 `test_api.py`、`test_memory.py` 等脚本，但当前仓库未包含。

3. **Python版本说明不一致**：
   - 顶层 `pyproject.toml`：`>=3.12`
   - 文档说明：`>=3.10`
   建议团队统一最低版本并更新文档。

4. **资源路径大小写风险（跨平台）**：
   `player.tscn` 内音频路径为 `assets/Audio/...`，实际目录是 `assets/audio/...`；在大小写敏感文件系统（如 Linux）可能导致资源加载失败。

5. **运行产物已在仓库中**：
   `backend/venv`、`backend/memory_data/*.db`、`.godot/` 等属于运行期文件，建议根据团队规范决定是否纳入版本管理。

---

## 12. 快速索引（关键文件）

- 后端入口：`backend/main.py`
- Agent 核心：`backend/agents.py`
- 好感度系统：`backend/relationship_manager.py`
- 批量状态更新：`backend/state_manager.py` + `backend/batch_generator.py`
- 数据模型：`backend/models.py`
- 日志：`backend/logger.py` + `backend/view_logs.py`
- 客户端入口：`helloagents-ai-town/scenes/main.tscn`
- 客户端脚本：`helloagents-ai-town/scripts/*.gd`
- 工程设置：`helloagents-ai-town/project.godot`

