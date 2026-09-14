# Deployment Guide

## Prerequisites
- Docker and Docker Compose
- Domain name (for production)
- SSL certificate (for HTTPS)

## Quick Start (Development)
```bash
# Clone the repository
git clone git@github.com-personal:hussain-ahmed2/typepress.git
cd typepress

# Install dependencies
pnpm install

# Start infrastructure
pnpm docker:up

# Set up database
cp .env.example .env
pnpm db:generate
pnpm db:migrate

# Start all apps
pnpm dev
```

## Production Deployment

### 1. Environment Setup
```bash
# Copy and configure environment
cp .env.example .env.production

# Set strong secrets
SESSION_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
```

### 2. Docker Compose
```bash
# Build and start all services
docker compose -f docker/docker-compose.prod.yml up -d

# Check status
docker compose -f docker/docker-compose.prod.yml ps
```

### 3. Database Setup
```bash
# Run migrations
docker compose -f docker/docker-compose.prod.yml exec api pnpm db:migrate

# Seed admin user
docker compose -f docker/docker-compose.prod.yml exec api pnpm db:seed
```

### 4. Reverse Proxy (Nginx)
Configure nginx to proxy requests to the appropriate services:
- `/` → renderer (port 4001)
- `/admin` → admin (port 4000)
- `/api` → API (port 8000)
- `/socket.io` → API (WebSocket)

### 5. SSL Certificate
Use Let's Encrypt or your preferred certificate provider:
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com
```

## Backup Strategy
```bash
# Create backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh ./backups/typepress_20240101_120000.sql.gz
```

## Monitoring
- Health endpoint: `GET /health`
- GraphQL playground: `GET /api/graphql`
- API docs: `GET /docs` (Swagger UI)

## Scaling
- API: Stateless, scale horizontally behind load balancer
- Admin: Static build, serve via CDN
- Renderer: ISR-enabled, cache at edge
- Database: Connection pooling, read replicas
- Redis: Cluster mode for high availability
