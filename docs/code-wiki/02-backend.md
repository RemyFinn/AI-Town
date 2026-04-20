# 02. 后端设计（FastAPI）

## 4. 后端设计（FastAPI）

## 4.1 启动与生命周期

`backend/main.py` 使用 `lifespan` 在启动时完成：

1. 配置校验（`settings.validate()`）
2. 初始化 NPC 管理器（`get_npc_manager()`）
3. 初始化并启动状态管理器（`get_state_manager(...).start()`）

关闭时停止状态管理器后台任务。

## 4.2 模块职责一览

| 模块 | 职责 | 核心对象 |
|---|---|---|
| `config.py` | 全局配置与环境变量读取 | `Settings` |
| `models.py` | API 数据模型定义 | `ChatRequest`、`ChatResponse` 等 |
| `main.py` | FastAPI 路由、生命周期、管理器装配 | `app`、`lifespan` |
| `agents.py` | NPC 对话编排、记忆检索/写入、好感度联动 | `NPCAgentManager` |
| `relationship_manager.py` | 对话情感分析并更新好感度 | `RelationshipManager` |
| `batch_generator.py` | 一次 LLM 调用批量生成所有 NPC 状态文本 | `NPCBatchGenerator` |
| `state_manager.py` | 定时任务循环、状态缓存、对外查询 | `NPCStateManager` |
| `logger.py` | 对话日志落盘与控制台输出 | `dialogue_logger` |
| `view_logs.py` | tail/view/list 日志工具 | `tail_log_file` 等 |

## 4.3 关键类与函数说明

### A) `NPCAgentManager`（`backend/agents.py`）

- `chat(npc_name, message, player_id)`：后端核心链路函数
  - 获取好感度上下文
  - 检索记忆（working + episodic）
  - 构造增强提示并调用 Agent
  - 执行情感分析并更新好感度
  - 持久化本轮对话到记忆系统
- `_create_memory_manager(npc_name)`：为每个 NPC 建立独立记忆存储
- `_save_conversation_to_memory(...)`：写入玩家消息 + NPC回复，附带情感/好感度元数据
- `get_npc_info/get_all_npcs`：提供 NPC 基础信息
- `get_npc_memories/clear_npc_memory`：记忆查询与清理
- `get_npc_affinity/get_all_affinities/set_npc_affinity`：好感度接口封装

### B) `RelationshipManager`（`backend/relationship_manager.py`）

- `analyze_and_update_affinity(...)`：调用分析 Agent 产出 JSON，更新 `0~100` 好感度
- `_parse_analysis(response)`：多策略解析（直接 JSON / 截取 JSON / 正则兜底）
- `get_affinity_level(affinity)`：好感度分级（陌生/熟悉/友好/亲密/挚友）
- `get_affinity_modifier(affinity)`：将分级映射成“对话风格修饰词”

### C) `NPCBatchGenerator`（`backend/batch_generator.py`）

- `generate_batch_dialogues(context=None)`：批量生成所有 NPC 状态文案
- `_build_batch_prompt(context)`：构造严格 JSON 输出约束的提示词
- `_parse_response(response)`：解析 LLM 返回，失败时回落预设文案
- `_get_current_context()`：按当前时段生成场景语境

### D) `NPCStateManager`（`backend/state_manager.py`）

- `start()/stop()`：启动/停止后台自动更新任务
- `_auto_update_loop()`：按 `update_interval` 循环更新状态
- `_update_npc_states()`：调用批量生成器并刷新缓存
- `get_current_state()`：提供当前对话、上次更新时间、下次倒计时
- `force_update()`：手动触发一次刷新

## 4.4 API 设计（main.py）

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/` | 服务信息与功能摘要 |
| GET | `/health` | 健康检查 |
| POST | `/chat` | 与指定NPC对话 |
| GET | `/npcs` | NPC列表 |
| GET | `/npcs/status` | 批量NPC当前状态 |
| POST | `/npcs/status/refresh` | 强制刷新NPC状态 |
| GET | `/npcs/{npc_name}` | 单个NPC详细信息 |
| GET | `/npcs/{npc_name}/memories` | 获取NPC记忆 |
| DELETE | `/npcs/{npc_name}/memories` | 清空NPC记忆 |
| GET | `/npcs/{npc_name}/affinity` | 获取NPC好感度 |
| GET | `/affinities` | 获取所有NPC好感度 |
| PUT | `/npcs/{npc_name}/affinity` | 设置好感度（测试/调试） |

---

