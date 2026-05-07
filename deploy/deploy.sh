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
RELEASE_ID="${CNB_COMMIT:-$(date +%Y%m%d%H%M%S)}"
PACKAGE_PATH="/tmp/ai-town-${RELEASE_ID}.tar.gz"
REMOTE_PACKAGE="/tmp/ai-town-${RELEASE_ID}.tar.gz"

if [[ ! -d dist ]]; then
  echo "dist/ does not exist. Run npm run build before deploy." >&2
  exit 1
fi

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
printf '%s\n' "$SSH_PRIVATE_KEY" > "$HOME/.ssh/id_ed25519"
chmod 600 "$HOME/.ssh/id_ed25519"

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

SSH_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"
SSH_OPTS=(-p "$DEPLOY_PORT" -o StrictHostKeyChecking=yes)

scp "${SSH_OPTS[@]}" "$PACKAGE_PATH" "${SSH_TARGET}:${REMOTE_PACKAGE}"

ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "APP_DIR='${APP_DIR}' RELEASE_ID='${RELEASE_ID}' REMOTE_PACKAGE='${REMOTE_PACKAGE}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

release_dir="${APP_DIR}/releases/${RELEASE_ID}"
mkdir -p "${release_dir}" "${APP_DIR}/shared"
tar -xzf "${REMOTE_PACKAGE}" -C "${release_dir}"
rm -f "${REMOTE_PACKAGE}"

if [[ ! -d "${APP_DIR}/venv" ]]; then
  python3 -m venv "${APP_DIR}/venv"
fi

"${APP_DIR}/venv/bin/pip" install --upgrade pip
"${APP_DIR}/venv/bin/pip" install -r "${release_dir}/backend/requirements.txt"

ln -sfn "${release_dir}" "${APP_DIR}/current"

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart ai-town-backend
  sudo systemctl reload nginx
else
  echo "systemctl not found; restart the backend and web server manually." >&2
fi
REMOTE_SCRIPT

echo "Deployed ${RELEASE_ID} to ${DEPLOY_HOST}:${APP_DIR}"

