# CNB 自动部署说明

这个项目使用 CNB 构建 Phaser/Vite 前端、检查 FastAPI 后端，并把应用部署到阿里云 ECS。

当前部署流程是：

```text
CNB Runner
  -> 获取当前 Runner 的公网 IP
  -> 调用阿里云 API，临时放行这个 IP 访问 SSH
  -> 通过 SSH/SCP 执行 deploy/deploy.sh
  -> 部署结束后撤销临时安全组规则
```

这样可以避免长期把 SSH 22 端口开放给 `0.0.0.0/0`。

## 1. 服务器初始化

服务器使用 Alibaba Cloud Linux 或 Ubuntu 均可。首次部署前，把仓库复制到服务器，或者只复制 `deploy/server-bootstrap.sh`，然后执行：

```bash
sudo DEPLOY_USER=root APP_DIR=/opt/ai-town SERVER_NAME=_ bash deploy/server-bootstrap.sh
```

默认模式适配 1Panel/OpenResty：这个脚本只创建 `ai-town-backend` systemd 服务，并准备 `/opt/ai-town` 目录，不安装、不配置、不重载系统 Nginx。

如果不用 1Panel/OpenResty，而是希望继续由脚本管理系统 Nginx，需要显式启用：

```bash
sudo MANAGE_SYSTEM_NGINX=true DEPLOY_USER=root APP_DIR=/opt/ai-town SERVER_NAME=_ bash deploy/server-bootstrap.sh
```

游戏资源文件不进 Git，需要手动上传到服务器共享静态目录：

```bash
rsync -av src/game/assets/files/ root@your-server-ip:/opt/ai-town/shared/assets/files/
```

NPC 记忆数据会持久化到：

```text
/opt/ai-town/shared/memory_data
```

## 2. 服务器运行结构

生产服务器应保持这个结构：

```text
1Panel/OpenResty 公开端口 :80/:443，提供前端页面，并把 /api 转发给后端
FastAPI/Uvicorn  本机端口 127.0.0.1:8000
Qdrant           本机端口 127.0.0.1:6333
```

1Panel/OpenResty 站点按下面方式创建：

```text
类型: 静态网站
主域名: your-server-ip:18020
代号: ai-town
/api/ 反代: http://127.0.0.1:8000/
```

1Panel 会创建站点目录 `/opt/1panel/apps/openresty/openresty/www/sites/ai-town/index`。部署脚本默认会把 `dist/` 和 `/assets/files/` 自动同步到这个目录，所以不要手动修改其他 1Panel 站点。

阿里云安全组不要开放这些内部端口：

```text
8000  FastAPI
6333  Qdrant HTTP
6334  Qdrant gRPC
7687  Neo4j
7474  Neo4j Browser
```

SSH 22 可以只放行你自己的 IP。CNB 部署时会临时放行当前 Runner 的 `/32` IP，部署结束后自动撤销。

## 3. CNB 密钥仓库配置

生产环境变量放在 CNB 密钥仓库中，由 `.cnb.yml` 通过 `imports` 引入。示例：

```yaml
DEPLOY_ENABLED: "true"
DEPLOY_HOST: "your-server-ip"
DEPLOY_PORT: "22"
DEPLOY_USER: "root"
APP_DIR: "/opt/ai-town"
PYTHON_BIN: "/usr/bin/python3.12"
RELOAD_SYSTEM_NGINX: "false"
SYNC_ONEPANEL_SITE: "true"
ONEPANEL_SITE_DIR: "/opt/1panel/apps/openresty/openresty/www/sites/ai-town/index"

VITE_API_BASE_URL: "/api"
VITE_ASSET_BASE_URL: "/assets/files"

SSH_PRIVATE_KEY: |
  -----BEGIN ...-----
  ...

ALIBABA_CLOUD_ACCESS_KEY_ID: "your-ram-access-key-id"
ALIBABA_CLOUD_ACCESS_KEY_SECRET: "your-ram-access-key-secret"
ALIBABA_CLOUD_REGION_ID: "cn-hangzhou"
ALIBABA_CLOUD_SECURITY_GROUP_ID: "sg-xxxxxxxx"

LLM_MODEL_ID: "qwen-plus"
LLM_API_KEY: "your-llm-api-key"
LLM_BASE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1/"
MEMORY_STORAGE_PATH: "/opt/ai-town/shared/memory_data"

QDRANT_URL: "http://localhost:6333"
QDRANT_API_KEY: ""
QDRANT_COLLECTION: "hello_agents_vectors"
QDRANT_VECTOR_SIZE: "384"
QDRANT_DISTANCE: "cosine"
QDRANT_TIMEOUT: "30"

EMBED_MODEL_TYPE: "dashscope"
EMBED_MODEL_NAME: "text-embedding-v3"
EMBED_API_KEY: "your-embedding-api-key"
EMBED_BASE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
```

可选但推荐：

```yaml
SSH_KNOWN_HOSTS: "ssh-keyscan -p 22 your-server-ip 的输出"
ALIYUN_SECURITY_GROUP_PROPAGATION_SECONDS: "8"
```

阿里云 AccessKey 应属于专用 RAM 用户，只授予临时加删安全组规则所需权限：

```text
ecs:AuthorizeSecurityGroup
ecs:RevokeSecurityGroup
```

不要使用阿里云主账号 AccessKey。

## 4. 部署流程

推送到 CNB 后，流水线会执行：

```bash
npm ci
npm run build
python -m compileall backend/*.py
bash deploy/with-aliyun-ssh-access.sh
```

`deploy/with-aliyun-ssh-access.sh` 负责临时放行 CNB Runner 的 SSH 访问，然后调用 `deploy/deploy.sh`。

`deploy/deploy.sh` 会打包并部署这些内容：

```text
dist/
backend/*.py
backend/requirements.txt
```

部署后的访问路径：

```text
前端页面: http://your-domain-or-ip:18020/
后端 API: http://your-domain-or-ip:18020/api/
静态资源: http://your-domain-or-ip:18020/assets/files/
```

如果使用 1Panel/OpenResty 的静态网站，部署脚本默认会同步：

```text
dist/ -> /opt/1panel/apps/openresty/openresty/www/sites/ai-town/index/
/opt/ai-town/shared/assets/files/ -> /opt/1panel/apps/openresty/openresty/www/sites/ai-town/index/assets/files/
```

部署脚本默认只重启 `ai-town-backend`。如果使用 1Panel/OpenResty，不要把 `RELOAD_SYSTEM_NGINX` 设为 `true`。只有在使用脚本管理系统 Nginx 时才需要设置：

```yaml
RELOAD_SYSTEM_NGINX: "true"
```

## 5. 运维注意事项

- `DEPLOY_ENABLED=false` 可以跳过部署阶段，只跑构建检查。
- 后端环境变量会写入服务器 `${APP_DIR}/shared/backend.env`，权限为 `600`。
- `MEMORY_STORAGE_PATH` 会写入 `${APP_DIR}/shared/backend.env`，默认值为 `${APP_DIR}/shared/memory_data`，避免 NPC 记忆数据库落在每个 release 目录里。
- `SYNC_ONEPANEL_SITE=true` 会把前端构建产物和游戏资源同步到 `ONEPANEL_SITE_DIR`。如果临时不想改 1Panel 站点目录，可以设为 `false`。
- `SSH_PRIVATE_KEY`、阿里云 AccessKey、LLM Key、Embedding Key 只能放在 CNB 密钥仓库，不要提交到主仓库。
- 如果 CNB 任务被强制中断，清理脚本可能来不及执行。可以在阿里云安全组里检查是否残留描述以 `ai-town-cnb-` 开头的临时规则。
- HTTP 部署稳定后，在 1Panel/OpenResty 里配置域名和 HTTPS。
