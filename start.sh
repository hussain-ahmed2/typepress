#!/bin/bash
# Typepress — Start everything with one command
# Usage: ./start.sh

set -e

echo "🚀 Starting Typepress..."

# Start infrastructure
echo "📦 Starting Docker services..."
docker compose -f docker/docker-compose.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services..."
sleep 3

# Start all apps
echo "🎯 Starting apps..."
pnpm dev

echo ""
echo "✅ Typepress is running!"
echo ""
echo "   Admin:    http://localhost:8001"
echo "   Renderer: http://localhost:8002"
echo "   API:      http://localhost:8000"
echo ""
echo "   Login: admin@typepress.dev / test"
