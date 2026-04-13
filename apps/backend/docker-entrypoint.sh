#!/bin/sh
set -e

echo "Starting backend initialization..."

wait_for_db() {
  echo "Waiting for database to be ready..."
  max_attempts=30
  attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if PGPASSWORD=${DB_PASSWORD:-password} psql -h ${DB_HOST:-postgres} -p ${DB_PORT:-5432} -U ${DB_USER:-admin} -d ${DB_NAME:-a_signal} -c "SELECT 1" > /dev/null 2>&1; then
      echo "Database is ready!"
      return 0
    fi
    attempt=$((attempt + 1))
    echo "Waiting for database... (attempt $attempt/$max_attempts)"
    sleep 2
  done
  
  echo "Error: Database is not ready after $max_attempts attempts"
  return 1
}

run_migrations() {
  echo "Running database migrations..."
  node dist/scripts/migrate.js
  echo "Migrations completed!"
}

run_seed() {
  echo "Running database seed..."
  node dist/scripts/seed.js
  echo "Seed completed!"
}

wait_for_db
run_migrations
run_seed

echo "Starting NestJS application..."
exec node dist/src/main.js
