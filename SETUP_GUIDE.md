# Phaser 分支安装配置指南

## 系统要求

- Node.js 20+
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

## 2. 启动 Phaser Web 客户端

```bash
npm install
npm run dev
```

Vite 默认会输出本地访问地址，通常是：

```text
http://127.0.0.1:5173
```

Phaser 客户端默认连接：

```text
http://127.0.0.1:8000
```

如果需要修改后端地址，请编辑：

```text
src/game/api/TownBackendClient.ts
```

## 3. 生产构建

```bash
npm run build
npm run preview
```

## 4. 游戏操作

- `WASD` 或方向键：移动玩家
- `E` 或空格：与 NPC 交互
- `Enter`：发送消息
- `Esc`：关闭对话框

## 常见问题

- 前端空白：先运行 `npm run build` 检查 TypeScript 和 Vite 构建错误。
- 无法对话：确认后端正在运行，并访问 `http://127.0.0.1:8000/docs` 检查接口是否可用。
- 资源加载失败：确认 `src/game/assets/files/` 下存在 `audio/`、`characters/` 和 `interiors/` 三个目录。
