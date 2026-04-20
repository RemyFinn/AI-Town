# 赛博小镇 - AI NPC对话系统

基于HelloAgents框架的AI小镇模拟游戏,展示多智能体系统在游戏中的应用。

当前仓库已经补充了一个 `Phaser + TypeScript + Vite` Web 客户端,并继续复用原有 FastAPI 后端。原 `Godot` 项目文件保留在 `helloagents-ai-town/` 中,作为资源和场景参考来源。

## 🎮 功能特性

- ✅ 3个AI NPC (张三、李四、王五)
- ✅ 智能对话系统
- ✅ 记忆系统 (短期+长期记忆)
- ✅ 好感度系统 (5个等级)
- ✅ NPC自主行为 (闲逛、工作)
- ✅ 完整的日志系统

## 🛠️ 技术栈

- **Web客户端:** Phaser 4 + TypeScript + Vite
- **原始客户端资源来源:** Godot 4.x
- **后端框架:** FastAPI + Python 3.10+
- **AI框架:** HelloAgents
- **LLM:** OpenAI GPT-4 (可配置其余的LLM服务)

## 📦 快速开始

### 1. 启动后端

```bash
cd backend
./venv/bin/python main.py
```

如果没有配置 `LLM_API_KEY`, 后端会自动进入模拟/预设对话模式,项目仍可运行。

### 2. 启动 Phaser 前端

```bash
npm install
npm run dev
```

默认访问地址:

- Web客户端: `http://127.0.0.1:5173`
- 后端接口: `http://127.0.0.1:8000`

更多说明详见 [SETUP_GUIDE.md](SETUP_GUIDE.md)

## 📚 文档

- [安装配置指南](SETUP_GUIDE.md)
- [对话日志系统](DIALOGUE_LOG_GUIDE.md)
- [好感度系统](AFFINITY_SYSTEM_GUIDE.md)
- [记忆系统](MEMORY_SYSTEM_GUIDE.md)
- [Code Wiki（拆分版入口）](docs/code-wiki/README.md)
- [Phaser迁移分析](docs/phaser-migration.md)

## 📖 教程

本项目是《Hello-agents》教材第15章的配套案例。

## 📄 许可证

CC BY-NC-SA 4.0
