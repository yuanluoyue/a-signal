#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/deploy.config"

PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER="$SERVER_USER@$SERVER_HOST"

echo "=========================================="
echo "上传环境配置到服务器"
echo "=========================================="

if [ ! -f "$PROJECT_ROOT/apps/backend/.env" ]; then
    echo "错误: apps/backend/.env 文件不存在"
    exit 1
fi

echo ">>> 上传 .env 文件到 docker 目录..."
ssh $SERVER "mkdir -p $DEPLOY_PATH/docker"
scp "$PROJECT_ROOT/apps/backend/.env" $SERVER:$DEPLOY_PATH/docker/.env

echo ">>> 上传 docker-compose 配置..."
scp "$PROJECT_ROOT/docker/docker-compose.server.yml" $SERVER:$DEPLOY_PATH/docker/docker-compose.yml

echo "=========================================="
echo "环境配置上传完成!"
echo "=========================================="
