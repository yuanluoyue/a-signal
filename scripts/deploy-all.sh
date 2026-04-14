#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/deploy.config"

echo "=========================================="
echo "部署全部服务到服务器"
echo "=========================================="

echo ">>> 部署基础设施..."
"$SCRIPT_DIR/deploy-infra.sh"

echo ">>> 部署后端..."
"$SCRIPT_DIR/deploy-backend.sh"

echo ">>> 部署前端..."
"$SCRIPT_DIR/deploy-frontend.sh"

echo "=========================================="
echo "全部部署完成!"
echo "=========================================="
