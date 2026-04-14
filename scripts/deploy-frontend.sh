#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/deploy.config"

SERVER="$SERVER_USER@$SERVER_HOST"
IMAGE_NAME="a-signal/frontend"
IMAGE_TAG="${1:-latest}"

echo "=========================================="
echo "部署前端到服务器"
echo "=========================================="

echo ">>> 构建前端..."
cd apps/frontend
pnpm install
pnpm build
cd ../..

echo ">>> 构建前端 Docker 镜像..."
docker build -t $IMAGE_NAME:$IMAGE_TAG -f apps/frontend/Dockerfile .

echo ">>> 保存镜像到 tar 文件..."
docker save $IMAGE_NAME:$IMAGE_TAG -o /tmp/frontend.tar

echo ">>> 上传镜像到服务器..."
ssh $SERVER "mkdir -p $DEPLOY_PATH/images"
scp /tmp/frontend.tar $SERVER:$DEPLOY_PATH/images/

echo ">>> 在服务器上加载镜像并重启服务..."
ssh $SERVER "cd $DEPLOY_PATH && \
    echo '加载镜像...' && \
    docker load -i images/frontend.tar && \
    echo '清理镜像文件...' && \
    rm -f images/frontend.tar && \
    echo '重启前端服务...' && \
    cd docker && \
    docker compose stop frontend || true && \
    docker compose rm -f frontend || true && \
    docker compose up -d frontend && \
    echo '等待服务启动...' && \
    sleep 5 && \
    echo '服务状态:' && \
    docker compose ps frontend"

echo ">>> 清理本地临时文件..."
rm -f /tmp/frontend.tar

echo "=========================================="
echo "前端部署完成!"
echo "=========================================="
