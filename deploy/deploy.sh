#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  DEPLOY_HOST
  DEPLOY_USER
  SSH_PRIVATE_KEY
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required environment variable: ${var_name}" >&2
    exit 1
  fi
done

DEPLOY_PORT="${DEPLOY_PORT:-22}"
APP_DIR="${APP_DIR:-/opt/ai-town}"
MEMORY_STORAGE_PATH="${MEMORY_STORAGE_PATH:-${APP_DIR}/shared/memory_data}"
RELOAD_SYSTEM_NGINX="${RELOAD_SYSTEM_NGINX:-false}"
SYNC_ONEPANEL_SITE="${SYNC_ONEPANEL_SITE:-true}"
ONEPANEL_SITE_DIR="${ONEPANEL_SITE_DIR:-/opt/1panel/apps/openresty/openresty/www/sites/ai-town/index}"
RELEASE_ID="${CNB_COMMIT:-$(date +%Y%m%d%H%M%S)}"
PACKAGE_PATH="/tmp/ai-town-${RELEASE_ID}.tar.gz"
REMOTE_PACKAGE="/tmp/ai-town-${RELEASE_ID}.tar.gz"

if [[ ! -d dist ]]; then
  echo "dist/ does not exist. Run npm run build before deploy." >&2
  exit 1
fi

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
key_file="$(mktemp)"
backend_env_file=""
trap 'rm -f "$key_file" "$PACKAGE_PATH" ${backend_env_file:+"$backend_env_file"}' EXIT
printf '%s\n' "$SSH_PRIVATE_KEY" > "$key_file"
chmod 600 "$key_file"

if [[ -n "${SSH_KNOWN_HOSTS:-}" ]]; then
  printf '%s\n' "$SSH_KNOWN_HOSTS" > "$HOME/.ssh/known_hosts"
else
  ssh-keyscan -p "$DEPLOY_PORT" "$DEPLOY_HOST" > "$HOME/.ssh/known_hosts"
fi
chmod 644 "$HOME/.ssh/known_hosts"

tar -czf "$PACKAGE_PATH" \
  dist \
  backend/*.py \
  backend/requirements.txt

REMOTE_BACKEND_ENV="/tmp/ai-town-backend-${RELEASE_ID}.env"

if [[ -n "${LLM_API_KEY:-}${QDRANT_URL:-}${QDRANT_API_KEY:-}${EMBED_API_KEY:-}" ]]; then
  backend_env_file="$(mktemp)"
  chmod 600 "$backend_env_file"
  {
    printf 'LLM_MODEL_ID=%s\n' "${LLM_MODEL_ID:-qwen-plus}"
    printf 'LLM_API_KEY=%s\n' "${LLM_API_KEY:-}"
    printf 'LLM_BASE_URL=%s\n' "${LLM_BASE_URL:-https://dashscope.aliyuncs.com/compatible-mode/v1}"
    printf '\n'
    printf 'QDRANT_URL=%s\n' "${QDRANT_URL:-http://localhost:6333}"
    printf 'QDRANT_API_KEY=%s\n' "${QDRANT_API_KEY:-}"
    printf 'QDRANT_COLLECTION=%s\n' "${QDRANT_COLLECTION:-hello_agents_vectors}"
    printf 'QDRANT_VECTOR_SIZE=%s\n' "${QDRANT_VECTOR_SIZE:-384}"
    printf 'QDRANT_DISTANCE=%s\n' "${QDRANT_DISTANCE:-cosine}"
    printf 'QDRANT_TIMEOUT=%s\n' "${QDRANT_TIMEOUT:-30}"
    printf '\n'
    printf 'EMBED_MODEL_TYPE=%s\n' "${EMBED_MODEL_TYPE:-dashscope}"
    printf 'EMBED_MODEL_NAME=%s\n' "${EMBED_MODEL_NAME:-text-embedding-v3}"
    printf 'EMBED_API_KEY=%s\n' "${EMBED_API_KEY:-}"
    printf 'EMBED_BASE_URL=%s\n' "${EMBED_BASE_URL:-https://dashscope.aliyuncs.com/compatible-mode/v1}"
  } > "$backend_env_file"
fi

SSH_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"
SSH_OPTS=(-i "$key_file" -o IdentitiesOnly=yes -p "$DEPLOY_PORT" -o StrictHostKeyChecking=yes)
SCP_OPTS=(-i "$key_file" -o IdentitiesOnly=yes -P "$DEPLOY_PORT" -o StrictHostKeyChecking=yes)

scp "${SCP_OPTS[@]}" "$PACKAGE_PATH" "${SSH_TARGET}:${REMOTE_PACKAGE}"
if [[ -n "$backend_env_file" ]]; then
  scp "${SCP_OPTS[@]}" "$backend_env_file" "${SSH_TARGET}:${REMOTE_BACKEND_ENV}"
fi

ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "APP_DIR='${APP_DIR}' RELEASE_ID='${RELEASE_ID}' REMOTE_PACKAGE='${REMOTE_PACKAGE}' REMOTE_BACKEND_ENV='${REMOTE_BACKEND_ENV}' PYTHON_BIN='${PYTHON_BIN:-}' MEMORY_STORAGE_PATH='${MEMORY_STORAGE_PATH}' RELOAD_SYSTEM_NGINX='${RELOAD_SYSTEM_NGINX}' SYNC_ONEPANEL_SITE='${SYNC_ONEPANEL_SITE}' ONEPANEL_SITE_DIR='${ONEPANEL_SITE_DIR}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

release_dir="${APP_DIR}/releases/${RELEASE_ID}"
mkdir -p "${release_dir}" "${APP_DIR}/shared/assets/files" "${APP_DIR}/shared/memory_data"
tar -xzf "${REMOTE_PACKAGE}" -C "${release_dir}"
rm -f "${REMOTE_PACKAGE}"

if [[ -f "${REMOTE_BACKEND_ENV}" ]]; then
  install -m 600 "${REMOTE_BACKEND_ENV}" "${APP_DIR}/shared/backend.env"
  rm -f "${REMOTE_BACKEND_ENV}"
fi

touch "${APP_DIR}/shared/backend.env"
if grep -q '^MEMORY_STORAGE_PATH=' "${APP_DIR}/shared/backend.env"; then
  sed -i "s|^MEMORY_STORAGE_PATH=.*|MEMORY_STORAGE_PATH=${MEMORY_STORAGE_PATH}|" "${APP_DIR}/shared/backend.env"
else
  printf '\nMEMORY_STORAGE_PATH=%s\n' "${MEMORY_STORAGE_PATH}" >> "${APP_DIR}/shared/backend.env"
fi
chmod 600 "${APP_DIR}/shared/backend.env"

if [[ ! -d "${APP_DIR}/venv" ]]; then
  if [[ -n "${PYTHON_BIN:-}" ]]; then
    "${PYTHON_BIN}" -m venv "${APP_DIR}/venv"
  elif command -v python3.12 >/dev/null 2>&1; then
    python3.12 -m venv "${APP_DIR}/venv"
  elif command -v python3.8 >/dev/null 2>&1; then
    python3.8 -m venv "${APP_DIR}/venv"
  else
    python3 -m venv "${APP_DIR}/venv"
  fi
fi

"${APP_DIR}/venv/bin/pip" install --upgrade pip
"${APP_DIR}/venv/bin/pip" install -r "${release_dir}/backend/requirements.txt"

ln -sfn "${release_dir}" "${APP_DIR}/current"

if [[ "${SYNC_ONEPANEL_SITE}" == "true" ]]; then
  if [[ -d "${ONEPANEL_SITE_DIR}" ]]; then
    if [[ "${ONEPANEL_SITE_DIR}" != /opt/1panel/apps/openresty/openresty/www/sites/*/index ]]; then
      echo "Refusing to sync outside 1Panel site index: ${ONEPANEL_SITE_DIR}" >&2
      exit 1
    fi

    if command -v rsync >/dev/null 2>&1; then
      rsync -a --delete "${release_dir}/dist/" "${ONEPANEL_SITE_DIR}/"
      mkdir -p "${ONEPANEL_SITE_DIR}/assets/files"
      rsync -a --delete "${APP_DIR}/shared/assets/files/" "${ONEPANEL_SITE_DIR}/assets/files/"
    else
      echo "rsync not found; install rsync or set SYNC_ONEPANEL_SITE=false." >&2
      exit 1
    fi
  else
    echo "1Panel site directory not found, skipping frontend sync: ${ONEPANEL_SITE_DIR}" >&2
  fi
fi

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart ai-town-backend
  if [[ "${RELOAD_SYSTEM_NGINX}" == "true" ]] && systemctl is-active --quiet nginx; then
    sudo systemctl reload nginx
  fi
else
  echo "systemctl not found; restart the backend manually." >&2
fi
REMOTE_SCRIPT

echo "Deployed ${RELEASE_ID} to ${DEPLOY_HOST}:${APP_DIR}"
