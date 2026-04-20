# 05. 数据与状态模型

## 7. 核心数据与状态模型

## 7.1 NPC角色静态配置

`backend/agents.py` 中 `NPC_ROLES` 定义每个 NPC 的：

- 职位/位置/活动
- 性格/专长/风格/爱好

并通过 `create_system_prompt()` 注入 Agent 系统提示词，形成稳定人格。

## 7.2 对话请求/响应模型（Pydantic）

- `ChatRequest`：`npc_name` + `message`
- `ChatResponse`：`npc_name`、`npc_title`、`message`、`success`、`timestamp`
- `NPCStatusResponse`：`dialogues`、`last_update`、`next_update_in`

## 7.3 记忆条目元数据（写入时）

每轮对话会分别写入“玩家消息”和“NPC回复”，并记录：

- `speaker`、`player_id`、`session_id`
- `timestamp`
- `affinity`、`affinity_change`
- `sentiment`
- `context.interaction_type = dialogue`

## 7.4 好感度区间语义

- `0~20`: 陌生
- `20~40`: 熟悉
- `40~60`: 友好
- `60~80`: 亲密
- `80~100`: 挚友

并映射到不同“语气修饰词”影响后续回复风格。

---

