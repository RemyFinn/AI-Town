#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  ALIBABA_CLOUD_ACCESS_KEY_ID
  ALIBABA_CLOUD_ACCESS_KEY_SECRET
  ALIBABA_CLOUD_SECURITY_GROUP_ID
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required environment variable: ${var_name}" >&2
    exit 1
  fi
done

REGION_ID="${ALIBABA_CLOUD_REGION_ID:-${ALIBABA_CLOUD_REGION:-cn-hangzhou}}"
SECURITY_GROUP_ID="${ALIBABA_CLOUD_SECURITY_GROUP_ID}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
RUNNER_IP_SERVICES=(
  "https://api.ipify.org"
  "https://ifconfig.me/ip"
  "https://icanhazip.com"
)

ensure_aliyun_cli() {
  if command -v aliyun >/dev/null 2>&1; then
    return
  fi

  if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required to install Alibaba Cloud CLI." >&2
    exit 1
  fi

  /bin/bash -c "$(curl -fsSL https://aliyuncli.alicdn.com/install.sh)"
}

detect_runner_ip() {
  local service ip
  for service in "${RUNNER_IP_SERVICES[@]}"; do
    ip="$(curl -fsSL --max-time 10 "$service" | tr -d '[:space:]' || true)"
    if [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
      printf '%s\n' "$ip"
      return
    fi
  done

  echo "Unable to detect runner public IPv4 address." >&2
  exit 1
}

configure_aliyun_cli() {
  aliyun configure set \
    --profile ai-town-deploy \
    --mode AK \
    --region "$REGION_ID" \
    --access-key-id "$ALIBABA_CLOUD_ACCESS_KEY_ID" \
    --access-key-secret "$ALIBABA_CLOUD_ACCESS_KEY_SECRET" >/dev/null
}

authorize_ssh_access() {
  local cidr="$1"
  local description="ai-town-cnb-${CNB_COMMIT:-manual}-$(date +%s)"
  local output status

  set +e
  output="$(
    aliyun ecs AuthorizeSecurityGroup \
      --profile ai-town-deploy \
      --RegionId "$REGION_ID" \
      --SecurityGroupId "$SECURITY_GROUP_ID" \
      --IpProtocol tcp \
      --PortRange "${DEPLOY_PORT}/${DEPLOY_PORT}" \
      --SourceCidrIp "$cidr" \
      --Description "$description" 2>&1
  )"
  status=$?
  set -e

  if [[ $status -eq 0 ]]; then
    echo "Temporary SSH access granted for ${cidr}."
    return 0
  fi

  if grep -qi "Duplicate" <<<"$output"; then
    echo "Temporary SSH access already exists for ${cidr}; leaving it unchanged."
    return 2
  fi

  echo "$output" >&2
  return "$status"
}

revoke_ssh_access() {
  local cidr="$1"

  aliyun ecs RevokeSecurityGroup \
    --profile ai-town-deploy \
    --RegionId "$REGION_ID" \
    --SecurityGroupId "$SECURITY_GROUP_ID" \
    --IpProtocol tcp \
    --PortRange "${DEPLOY_PORT}/${DEPLOY_PORT}" \
    --SourceCidrIp "$cidr" >/dev/null || {
      echo "Warning: failed to revoke temporary SSH access for ${cidr}." >&2
      return 0
    }

  echo "Temporary SSH access revoked for ${cidr}."
}

ensure_aliyun_cli
configure_aliyun_cli

RUNNER_IP="${CNB_RUNNER_PUBLIC_IP:-$(detect_runner_ip)}"
RUNNER_CIDR="${RUNNER_IP}/32"
RULE_ADDED=false

if authorize_ssh_access "$RUNNER_CIDR"; then
  RULE_ADDED=true
else
  authorize_status=$?
  if [[ $authorize_status -ne 2 ]]; then
    exit "$authorize_status"
  fi
fi

cleanup() {
  if [[ "$RULE_ADDED" == "true" ]]; then
    revoke_ssh_access "$RUNNER_CIDR"
  fi
}
trap cleanup EXIT

sleep "${ALIYUN_SECURITY_GROUP_PROPAGATION_SECONDS:-8}"

bash deploy/deploy.sh
