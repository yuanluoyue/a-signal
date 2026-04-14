#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/deploy.config"

SERVER="$SERVER_USER@$SERVER_HOST"
IMAGE_NAME="a-signal/backend"
IMAGE_TAG="${1:-latest}"

echo "=========================================="
echo "部署后端到服务器"
echo "=========================================="

echo ">>> 安装依赖..."
pnpm install

echo ">>> 构建后端..."
cd apps/backend
pnpm build
cd ../..

echo ">>> 构建后端 Docker 镜像..."
docker build -t $IMAGE_NAME:$IMAGE_TAG -f apps/backend/Dockerfile .

echo ">>> 保存镜像到 tar 文件..."
docker save $IMAGE_NAME:$IMAGE_TAG -o /tmp/backend.tar

echo ">>> 上传镜像到服务器..."
ssh $SERVER "mkdir -p $DEPLOY_PATH/images"
scp /tmp/backend.tar $SERVER:$DEPLOY_PATH/images/

echo ">>> 在服务器上加载镜像并重启服务..."
ssh $SERVER "cd $DEPLOY_PATH && \
    echo '加载镜像...' && \
    docker load -i images/backend.tar && \
    echo '清理镜像文件...' && \
    rm -f images/backend.tar && \
    echo '重启后端服务...' && \
    cd docker && \
    docker compose stop backend || true && \
    docker compose rm -f backend || true && \
    docker compose up -d backend && \
    echo '等待服务启动...' && \
    sleep 10 && \
    echo '查看后端日志...' && \
    docker compose logs --tail=50 backend && \
    echo '服务状态:' && \
    docker compose ps backend"

echo ">>> 清理本地临时文件..."
rm -f /tmp/backend.tar

echo "=========================================="
echo "后端部署完成!"
echo "=========================================="
