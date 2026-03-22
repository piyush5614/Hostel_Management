# Deployment Guide - TC Hostel Connect

This guide provides instructions for deploying the TC Hostel Connect application in development and production environments.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Container Deployment](#docker-container-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Supabase Setup](#supabase-setup)
5. [Health Checks & Monitoring](#health-checks--monitoring)
6. [Troubleshooting](#troubleshooting)

---

## Local Development

### Quick Start with docker-compose

The easiest way to run the entire stack locally:

```bash
# 1. Clone the repository
git clone <repo-url>
cd Hostel_Comp

# 2. Copy environment template
cp .env.docker .env

# 3. Update .env with your Supabase credentials
# Edit .env and add:
# SUPABASE_URL=https://your-project-id.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 4. Start all services
docker-compose up --build

# 5. Access services
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
# API Docs: http://localhost:3001/api-docs
# Health: http://localhost:3001/api/health
```

**What's running:**
- Backend Express server on port 3001
- Frontend Vite dev server on port 5173
- Both services on same Docker network for inter-service communication
- Hot-reload enabled for both services

### Traditional Local Development (without Docker)

```bash
# Terminal 1: Frontend
npm install
npm run dev
# Runs on http://localhost:5173

# Terminal 2: Backend
cd backend
npm install
npm run dev
# Runs on http://localhost:3001
```

---

## Docker Container Deployment

### Building the Docker Image

```bash
# Build backend image
docker build -t hostel-backend:latest backend/

# Tag for registry (e.g., Docker Hub)
docker tag hostel-backend:latest your-registry/hostel-backend:latest

# Push to registry
docker push your-registry/hostel-backend:latest
```

### Running a Single Container

```bash
docker run -d \
  --name hostel-backend \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e SUPABASE_URL="https://your-project.supabase.co" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-key" \
  -e JWT_SECRET="your-secret-min-32-chars" \
  -e LOG_LEVEL=info \
  --health-cmd='node -e "require(\"http\").get(\"http://localhost:3001/api/health\", (r) => {if(r.statusCode !== 200) throw new Error(r.statusCode)})"' \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  hostel-backend:latest
```

### Production docker-compose

For production deployment, create a `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: your-registry/hostel-backend:latest
    container_name: hostel-backend-prod
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      JWT_SECRET: ${JWT_SECRET}
      LOG_LEVEL: info
      ALLOWED_ORIGINS: https://yourdomain.com
    restart: always
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/health', (r) => {if(r.statusCode !== 200) throw new Error(r.statusCode)})"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

Run with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Environment Configuration

### Production Environment File

Create `.env.production` with:

```bash
# ==========================================
# ENVIRONMENT
# ==========================================
NODE_ENV=production
PORT=3001

# ==========================================
# SECURITY
# ==========================================
JWT_SECRET=your-production-secret-min-32-chars-very-secure

# CORS - Only allow your domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# ==========================================
# LOGGING
# ==========================================
LOG_LEVEL=info

# ==========================================
# SUPABASE
# ==========================================
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key...

# ==========================================
# FRONTEND (for CORS)
# ==========================================
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...
```

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `PORT` | No | 3001 | Port to run backend service |
| `JWT_SECRET` | **Yes** | — | Secret for JWT token signing (min 32 chars) |
| `SUPABASE_URL` | **Yes** | — | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | — | Supabase admin/service role key |
| `LOG_LEVEL` | No | `info` | Logging level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `ALLOWED_ORIGINS` | No | `http://localhost:*` | CORS whitelist (comma-separated) |

---

## Supabase Setup

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Sign in or create account
3. Create new project
   - Name: `TC Hostel Connect` (or your choice)
   - Choose region closest to your users
   - Set strong database password
4. Wait for project to initialize (~2 minutes)

### 2. Get Credentials

From your Supabase project dashboard:

1. Go to **Settings** → **API**
   - Copy `Project URL` → `SUPABASE_URL`
   - Copy `Service Role Key` → `SUPABASE_SERVICE_ROLE_KEY`
   - Copy `Anon Public Key` → `VITE_SUPABASE_ANON_KEY`

2. Add to `.env`:
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...very-long-key...
VITE_SUPABASE_ANON_KEY=eyJhbGc...public-key...
```

### 3. Run Database Migrations

Migrations create all tables, indexes, and seed data.

#### Option A: Using Supabase SQL Editor

1. In Supabase dashboard, go to **SQL Editor**
2. Create new query
3. Copy-paste content from `database/migrations/20250718130540_damp_glade.sql`
4. Click "RUN"
5. Repeat for remaining migration files in order:
   - `20250719025329_holy_flame.sql`
   - `20250720063520_jade_truth.sql`
   - `20251201095933_20251201_seed_users_and_staff.sql`
   - etc.

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase projects list
supabase link --project-ref your-project-ref

# Run migrations
supabase migration up
```

### 4. Verify Database

After migrations:

1. Go to **Table Editor** in Supabase dashboard
2. Verify tables exist:
   - `users`
   - `students`
   - `rooms`
   - `attendance`
   - `leave_requests`
   - etc.

3. Check seed data:
   - Click `users` table
   - Should see: admin@tchostel.edu, warden@tchostel.edu, staff accounts

---

## Health Checks & Monitoring

### Health Endpoint

```bash
# Check if backend is healthy
curl http://localhost:3001/api/health

# Response
{
  "status": "ok",
  "timestamp": "2026-03-22T10:00:00Z",
  "uptime": 3600
}
```

### Container Health Check

Docker containers include a built-in health check:

```bash
# View container health
docker ps

# Should show "health: starting" → "health: healthy"

# Inspect health status
docker inspect hostel-backend --format='{{.State.Health.Status}}'
```

### Kubernetes Readiness/Liveness Probes

If deploying to Kubernetes:

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3001
  initialDelaySeconds: 40
  periodSeconds: 30
  timeoutSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 5
  failureThreshold: 3
```

---

## API Documentation

### Swagger/OpenAPI Documentation

Available at `http://localhost:3001/api-docs` (after backend starts)

Features:
- Interactive endpoint explorer
- Request/response schemas
- Try-it-out functionality
- Authentication examples
- Error code documentation

### Endpoints Reference

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/signup` | Create new account | None |
| POST | `/api/auth/login` | Login and get JWT | None |
| GET | `/api/auth/me` | Get current user | Required |
| GET | `/api/students` | List students | Required |
| POST | `/api/students` | Create student | Required |
| GET | `/api/rooms` | List rooms | Required |
| POST | `/api/rooms` | Create room | Required |
| GET | `/api/attendance` | Get attendance records | Required |
| POST | `/api/leave-requests` | Submit leave request | Required |

---

## Troubleshooting

### Backend won't start

Check logs:
```bash
# If running in Docker
docker logs hostel-backend

# Look for errors like:
# - "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"
# - "Failed to connect to Supabase"
# - Port already in use
```

**Solutions:**
1. Verify all required env vars are set
2. Check Supabase credentials are correct
3. Try different port: `PORT=3002 npm run dev`
4. Kill process on port: `lsof -i :3001` then `kill -9 <PID>`

### Database connection errors

```
Error: Failed to connect to Supabase
```

**Solutions:**
1. Verify `SUPABASE_URL` format: `https://xxx.supabase.co`
2. Check `SUPABASE_SERVICE_ROLE_KEY` is valid (starts with `eyJhbGc`)
3. Verify migrations have run (check table count in Supabase)
4. Test connection: `curl https://xxx.supabase.co/rest/v1/` (should return 401 or data)

### Docker build fails

```bash
# Clean build (remove cache)
docker build --no-cache -t hostel-backend:latest backend/

# Check for errors in build output
# Common issues: missing .env, dependency install failed
```

### Health check failing

```bash
# Test health endpoint directly
curl -v http://localhost:3001/api/health

# Should return 200 with JSON response
# If 503 or timeout, backend isn't ready yet
# Wait 40+ seconds for startup (see HEALTHCHECK in Dockerfile)
```

### CORS errors from frontend

Frontend can't call backend API:

```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution:** Update `ALLOWED_ORIGINS` in backend `.env`:

```bash
# Current
ALLOWED_ORIGINS=http://localhost:5173

# Add your domain
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
```

---

## Next Steps

1. **Monitoring**: Set up error tracking (e.g., Sentry, LogRocket)
2. **Backup**: Configure Supabase automated backups
3. **SSL/TLS**: Use Let's Encrypt for HTTPS in production
4. **CI/CD**: GitHub Actions pipeline runs on every push
5. **Load Testing**: Test with production-like load
6. **Logging**: Aggregate logs with ELK, Datadog, or Splunk

---

## Support

For issues:
1. Check logs: `docker logs hostel-backend`
2. Review [Troubleshooting](#troubleshooting) section
3. Open GitHub issue with error details
4. Contact Supabase support if database-related
