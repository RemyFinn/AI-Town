#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root, for example: sudo bash deploy/server-bootstrap.sh" >&2
  exit 1
fi

DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
APP_DIR="${APP_DIR:-/opt/ai-town}"
SERVER_NAME="${SERVER_NAME:-_}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y --no-install-recommends nginx python3 python3-venv python3-pip rsync ca-certificates sudo
elif command -v dnf >/dev/null 2>&1; then
  dnf module enable -y python38 || true
  dnf install -y nginx python38 python38-pip python3 python3-pip rsync ca-certificates sudo
elif command -v yum >/dev/null 2>&1; then
  yum module enable -y python38 || true
  yum install -y nginx python38 python38-pip python3 python3-pip rsync ca-certificates sudo
else
  echo "No supported package manager found. Install nginx, python3, pip, rsync, ca-certificates, and sudo manually." >&2
  exit 1
fi

id "$DEPLOY_USER" >/dev/null

PYTHON_BIN="${PYTHON_BIN:-}"
if [[ -z "${PYTHON_BIN}" ]]; then
  if command -v python3.12 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3.12)"
  elif command -v python3.8 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3.8)"
  else
    PYTHON_BIN="$(command -v python3)"
  fi
fi

mkdir -p "${APP_DIR}/releases" "${APP_DIR}/shared/assets/files"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

if [[ ! -f "${APP_DIR}/shared/backend.env" ]]; then
  cat > "${APP_DIR}/shared/backend.env" <<'ENV_FILE'
# Fill these values on the server. The service still starts in fallback mode
# when LLM_API_KEY is empty.
LLM_MODEL_ID=qwen-plus
LLM_API_KEY=
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ENV_FILE
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}/shared/backend.env"
  chmod 600 "${APP_DIR}/shared/backend.env"
fi

cat > /etc/systemd/system/ai-town-backend.service <<SERVICE_FILE
[Unit]
Description=AI Town FastAPI backend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${DEPLOY_USER}
WorkingDirectory=${APP_DIR}/current/backend
EnvironmentFile=-${APP_DIR}/shared/backend.env
ExecStart=${APP_DIR}/venv/bin/uvicorn main:app --host 127.0.0.1 --port ${BACKEND_PORT}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE_FILE

cat > /etc/sudoers.d/ai-town-deploy <<SUDOERS_FILE
${DEPLOY_USER} ALL=(root) NOPASSWD: /bin/systemctl restart ai-town-backend, /bin/systemctl reload nginx
${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl restart ai-town-backend, /usr/bin/systemctl reload nginx
SUDOERS_FILE
chmod 440 /etc/sudoers.d/ai-town-deploy
visudo -cf /etc/sudoers.d/ai-town-deploy

if [[ -d /etc/nginx/sites-available ]]; then
  nginx_conf_path="/etc/nginx/sites-available/ai-town.conf"
  nginx_enable_path="/etc/nginx/sites-enabled/ai-town.conf"
else
  mkdir -p /etc/nginx/conf.d
  nginx_conf_path="/etc/nginx/conf.d/ai-town.conf"
  nginx_enable_path=""
fi

cat > "${nginx_conf_path}" <<NGINX_FILE
server {
    listen 80;
    server_name ${SERVER_NAME};

    root ${APP_DIR}/current/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /assets/files/ {
        alias ${APP_DIR}/shared/assets/files/;
        try_files \$uri =404;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_FILE

if [[ -n "${nginx_enable_path}" ]]; then
  ln -sfn "${nginx_conf_path}" "${nginx_enable_path}"
  rm -f /etc/nginx/sites-enabled/default
fi

systemctl daemon-reload
systemctl enable ai-town-backend
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo "Server bootstrap complete."
echo "Edit ${APP_DIR}/shared/backend.env, then push to CNB to deploy the first release."
