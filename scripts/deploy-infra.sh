#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/deploy.config"

SERVER="$SERVER_USER@$SERVER_HOST"

echo "=========================================="
echo "部署基础设施服务到服务器"
echo "=========================================="

echo ">>> 保存镜像到 tar 文件..."
docker save postgres:15-alpine -o /tmp/postgres.tar
docker save redis:8.6.3-alpine -o /tmp/redis.tar
docker save chromadb/chroma -o /tmp/chromadb.tar

echo ">>> 上传镜像到服务器..."
ssh $SERVER "mkdir -p $DEPLOY_PATH/images"
scp /tmp/postgres.tar $SERVER:$DEPLOY_PATH/images/
scp /tmp/redis.tar $SERVER:$DEPLOY_PATH/images/
scp /tmp/chromadb.tar $SERVER:$DEPLOY_PATH/images/

echo ">>> 上传 docker-compose 配置..."
ssh $SERVER "mkdir -p $DEPLOY_PATH/docker"
scp docker/docker-compose.server.yml $SERVER:$DEPLOY_PATH/docker/docker-compose.yml
scp .env.production $SERVER:$DEPLOY_PATH/.env 2>/dev/null || echo "注意: .env.production 文件不存在，请手动创建 .env 文件"

echo ">>> 在服务器上加载镜像并启动..."
ssh $SERVER "cd $DEPLOY_PATH && \
    echo '加载镜像...' && \
    docker load -i images/postgres.tar && \
    docker load -i images/redis.tar && \
    docker load -i images/chromadb.tar && \
    echo '清理镜像文件...' && \
    rm -f images/*.tar && \
    echo '创建数据目录...' && \
    mkdir -p data/postgres data/redis data/chromadb && \
    echo '启动服务...' && \
    cd docker && docker compose up -d postgres redis chromadb && \
    echo '等待服务启动...' && \
    sleep 10 && \
    echo '服务状态:' && \
    docker compose ps"

echo ">>> 清理本地临时文件..."
rm -f /tmp/postgres.tar /tmp/redis.tar /tmp/chromadb.tar

echo "=========================================="
echo "基础设施部署完成!"
echo "=========================================="
