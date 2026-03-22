# Phase 7A: Soft Launch Deployment Guide

**Timeline:** 1-2 days | **Effort:** 4 hours focused work | **Goal:** Internal beta launch

---

## ✅ Pre-Deployment Checklist

### Step 1: Verify All Tests Pass [30 min]

```bash
cd c:\Users\asus4\Desktop\Hostel_Comp

# Run full test suite
npm run test:all

# Expected output:
# Test Files 3+ passed
# Tests 40+ passed (frontend + backend + E2E)
# Coverage: >30%
```

**If tests fail:**
- Check error messages in terminal
- Run individual tests: `npm test`, `npm run test:api`, `npm run test:e2e`
- Review test files in `backend/src/tests/routes/` and `tests/e2e/`

---

### Step 2: Verify Backend Builds [15 min]

```bash
cd backend
npm install  # Ensure new compression dependency installed
npm run build

# Expected: No TypeScript errors
# Output file: backend/dist/index.js
```

**If build fails:**
```bash
# Check for dependency issues
npm ls

# Verify all middleware files exist
ls src/middleware/
```

---

### Step 3: Verify Docker Build [15 min]

```bash
# Build Docker image
docker build -t hostel-backend:soft-launch backend/

# List images
docker images | grep hostel-backend

# Expected: Successfully tagged as hostel-backend:soft-launch
```

**If Docker build fails:**
- Check `backend/Dockerfile` exists
- Verify `.dockerignore` is correct
- Run: `docker build --no-cache -t hostel-backend:soft-launch backend/`

---

### Step 4: Local Staging Test [30 min]

```bash
# Start full stack locally
docker-compose up --build

# Wait for services to start (30-60 seconds)
# Check logs for errors
```

**Verify each endpoint:**

1. **Frontend loads:**
   ```
   http://localhost:5173
   -> Should see login page
   ```

2. **Backend API health:**
   ```
   curl http://localhost:3001/api/health
   -> Should return { "status": "ok" }
   ```

3. **Compression working:**
   ```
   curl -H "Accept-Encoding: gzip" http://localhost:3001/api/health
   -> Should show "Content-Encoding: gzip" in response headers
   ```

4. **Swagger UI:**
   ```
   http://localhost:3001/api-docs
   -> Should show interactive API documentation
   ```

5. **Database connected:**
   ```
   Login with test account:
   Email: test@hostel.local
   Password: TestPassword123!
   -> Should redirect to dashboard
   ```

---

## 🚀 Deployment Options

Choose ONE based on your infrastructure preference:

### **Option A: Vercel + Railway (Recommended for MVP)**

**Frontend (Vercel):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd c:\Users\asus4\Desktop\Hostel_Comp
vercel --prod

# Follow prompts:
# - Link project name: hostel-comp
# - Use default settings
# - Set environment variables:
#   VITE_SUPABASE_URL=https://your-project.supabase.co
#   VITE_SUPABASE_ANON_KEY=... (from Supabase dashboard)
```

**Backend (Railway):**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up

# Set environment variables in Railway dashboard:
# NODE_ENV=production
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=... (from Supabase settings)
# JWT_SECRET=$(openssl rand -base64 32)
# ALLOWED_ORIGINS=https://yourdomain.vercel.app

# Get backend URL
railway link
railway open
# Note the generated backend URL
```

**Update Frontend .env:**
```
VITE_API_URL=https://your-backend.railway.app
```

---

### **Option B: Docker Compose on VPS**

**On your server (AWS EC2, DigitalOcean, Azure VM):**

```bash
# 1. SSH into server
ssh ubuntu@your-server-ip

# 2. Install Docker + Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Clone repository
git clone https://github.com/Akuma09-create/Final_Hostel.git
cd Final_Hostel

# 4. Create .env file with production values
cat > .env <<EOF
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=$(openssl rand -base64 32)
ALLOWED_ORIGINS=https://yourdomain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
EOF

# 5. Start services
sudo docker-compose up -d

# 6. Verify services running
sudo docker ps
sudo docker-compose logs -f
```

**Setup domain + SSL:**
```bash
# Install Certbot for SSL
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update docker-compose to use SSL
# Modify services.backend.ports to include 443
```

---

### **Option C: GitHub Codespaces (Quick Testing)**

```bash
# Open repo in Codespaces
# https://github.com/Akuma09-create/Final_Hostel/codespaces

# Install and run
npm install
npm run dev  # Frontend
cd backend && npm run dev  # Backend (in new terminal)

# Share port publicly (GitHub Codespaces feature)
# Right-click port 5173 → "Make public"
# Right-click port 3001 → "Make public"
```

---

## 🧪 Beta Testing Checklist

### Invite Beta Users (5-10 people)

**Send email:**
```
Subject: You're invited to test Hostel Management System Beta!

Hi [Name],

We're launching a new hostel management system and need your help test it.

🎯 What we need:
1. Try logging in with your account (or we'll provide test account)
2. Test the main workflows:
   - View your room and attendance
   - Submit a leave application
   - Check application status
3. Report any issues: note errors, screenshots, steps to reproduce

🔗 Access: https://yourdomain.vercel.app (or your deployment URL)

⏰ Timeline: January 15-29, 2026
📧 Report bugs: bugs@hostel.local

Thank you!
```

### Feedback Collection

**Create Google Form:**
```
1. What is your role? (Student / Warden / Admin)
2. What worked well? (Free text)
3. What needs improvement? (Free text)
4. Did you encounter any errors? (Yes/No)
   - If yes: Screenshot/description
5. Rate overall experience: (1-5 stars)
6. Would you recommend? (Yes/No)
```

Pass form link to beta users daily.

---

## 📊 Monitoring During Soft Launch

### Daily Checks (2 weeks)

1. **Errors:** Check Sentry/Winston logs for new errors
   ```bash
   tail -f docker-compose logs backend
   ```

2. **Performance:** Check response times
   ```bash
   # Monitor Docker resource usage
   docker stats
   # Expected: CPU <50%, Memory <500MB
   ```

3. **Availability:** Verify uptime
   ```bash
   curl -I https://yourdomain.com/api/health
   # Expected: 200 OK
   ```

4. **User Activity:** Check login attempts
   ```bash
   # Review logs for failed logins
   grep "login" backend-logs.txt | grep -i "error\|fail"
   ```

### Weekly Summary

- Total users: 0-10
- Error rate: <1% expected
- Response time: <500ms avg
- Uptime: >99%
- User feedback: Collect + prioritize

---

## 🐛 Soft Launch Issues & Fixes

### Common Problems

| Issue | Cause | Fix |
|-------|-------|-----|
| **Blank login page** | Frontend can't connect to backend | Update `VITE_API_URL` env var |
| **"Connection refused"** | Backend not running | Check `docker ps`, restart service |
| **"Invalid token"** | JWT_SECRET mismatch | Ensure same JWT_SECRET frontend+backend |
| **"CORS error"** | Frontend URL not in ALLOWED_ORIGINS | Add domain to .env ALLOWED_ORIGINS |
| **"Database error"** | Supabase credentials invalid | Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |
| **Slow responses** | Compression not working | Verify compression middleware loaded |
| **SSL errors** | Certificate expired/invalid | Run `certbot renew --force-renewal` |

---

## ✅ Phase 7A Complete Checklist

- [ ] All tests passing (40+ tests)
- [ ] Backend builds without errors
- [ ] Docker image builds successfully
- [ ] docker-compose up runs all services
- [ ] Frontend loads at localhost:5173
- [ ] API responds at localhost:3001/health
- [ ] Compression middleware active (gzip)
- [ ] Swagger UI accessible
- [ ] Test login works with Supabase
- [ ] Choose deployment platform (Vercel/Railway/VPS)
- [ ] Deploy frontend + backend to staging
- [ ] Verify endpoints work in staging
- [ ] Create beta user list (5-10 people)
- [ ] Send invite emails with test credentials
- [ ] Set up feedback collection
- [ ] Monitor logs daily

---

## 🎉 Phase 7A Launch!

Once all checkboxes ✅, you're **soft-launch ready**.

**Next: Phase 7B (GA Launch)** — Run in parallel:
- Add Sentry error tracking
- Expand API test coverage (60+ tests)
- Add database performance indexes
- Setup load testing

**Estimated Time:**
- Phase 7A: 4 hours (now)
- Phase 7B: 7 days (parallel with soft launch)
- **Total to GA**: ~2 weeks

Ready to deploy? 🚀
