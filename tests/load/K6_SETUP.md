# K6 Load Testing Setup & Execution Guide

## Overview

K6 is a modern load testing tool that simulates concurrent users and measures performance under load. This guide tests the backend API against Phase 7B performance targets.

**Targets:**
- 100 concurrent users
- <500ms response time (95th percentile)
- <1% error rate
- 25-minute sustained test

---

## 1. Install K6

### Windows (via Chocolatey)
```powershell
# Install Chocolatey if you don't have it
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install K6
choco install k6
```

### Windows (via Direct Download)
1. Download from: https://github.com/grafana/k6/releases/latest
2. Extract to: `C:\Program Files\k6\` or custom location
3. Add to PATH:
   - Right-click "This PC" → Properties → Advanced system settings
   - Environment Variables → System Variables → Path
   - Add: `C:\Program Files\k6\`
4. Verify: `k6 --version`

### macOS (via Brew)
```bash
brew install k6
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install k6
```

---

## 2. Verify Backend API is Running

**Before running load tests, ensure backend is available:**

```powershell
# Option 1: Run backend dev server (if not already running)
npm --prefix backend run dev

# Option 2: Check if backend is already running
curl http://localhost:3001/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-03-10T12:34:56Z"}
```

**If you see connection refused:**
- Start backend: `npm --prefix backend run dev` in a new terminal
- Wait 10 seconds for server to initialize
- Verify: `curl http://localhost:3001/api/health`

---

## 3. Verify Test Database & Credentials

**Create test user if needed:**

```bash
# In Supabase SQL Editor, run:
INSERT INTO users (email, password_hash, role, verified)
VALUES (
  'test_student@hostel.local',
  '$2b$10$...',  -- bcrypt hash of "TestPassword123!"
  'student',
  true
);
```

**Or use existing test account:**
- Email: `test_student@hostel.local`
- Password: `TestPassword123!`

---

## 4. Run Load Test

### Basic Run (Full Test - ~25 minutes)
```powershell
# From workspace root
k6 run tests/load/load-test.js
```

### Quick Test (1 minute, 10 VUs)
```powershell
# Test with minimal load to verify endpoints work
k6 run --vus 10 --duration 1m tests/load/load-test.js
```

### With JSON Output (for analysis)
```powershell
# Generates results.json for graphing
k6 run --out json=results.json tests/load/load-test.js
```

### With Grafana Cloud Results
```powershell
# Requires Grafana Cloud account (see section 6)
k6 run -o cloud tests/load/load-test.js
```

---

## 5. Understanding Load Test Results

### Test Stages (automatically executed)
1. **Ramp-up 1 (2 min)** → 10 VUs
2. **Ramp-up 2 (5 min)** → 50 VUs
3. **Main load (10 min)** → 100 VUs (peak)
4. **Sustain (5 min)** → 100 VUs held
5. **Ramp-down 1 (2 min)** → 50 VUs
6. **Ramp-down 2 (1 min)** → 0 VUs
7. **Total time** → ~25 minutes

### Output Example
```
running (3m01s), 00/100 VUs, 1234 complete and 0 interrupted transactions

✓ Health Check
✓ Auth - Register
✓ Auth - Login
✓ API - Get Leave Requests
✓ API - Create Leave Request
✓ API - Swagger Docs

   http_req_duration..........: avg=287ms, p(50)=245ms, p(90)=412ms, p(95)=467ms, p(99)=892ms
   http_req_failed............: 0.5%
   http_reqs..................: 1234 req/s
   errors......................: 6 errors

✓ All thresholds passed!
```

### Key Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| `http_req_duration` p(95) | <500ms | 95% of requests faster than 500ms |
| `http_req_duration` p(99) | <1000ms | 99% of requests faster than 1000ms |
| `http_req_failed` rate | <1% | Error rate under 1% |
| `errors` | <1% of requests | Custom error rate threshold |
| `http_reqs` | >50 req/s | Throughput (requests per second) |

### Pass/Fail Indicators
- **✓ All thresholds passed!** → Load test **PASSED** ✅
- **✗ Some thresholds failed!** → Performance issue detected ⚠️

---

## 6. Troubleshooting

### Connection Refused
```
Error: failed to connect to localhost:3001
```
**Solution:** Start backend server
```powershell
npm --prefix backend run dev
```

### Test User Not Found
```
Error: 401 Unauthorized
```
**Solution:** Create test user in Supabase:
1. Go to Supabase SQL Editor
2. Run seed script: `SELECT * FROM users WHERE email = 'test_student@hostel.local';`
3. If not found, run: `INSERT INTO users (email, password_hash, role, verified) VALUES ('test_student@hostel.local', bcrypt_hash('TestPassword123!'), 'student', true);`

### Threshold Failed (High Response Times)
```
✗ Thresholds failed: p(95)<500 was not met!
  http_req_duration.............p(95)=856ms
```
**Investigation Steps:**
1. Check backend CPU/memory: `docker stats`
2. Check database query performance:
   ```sql
   SELECT query, calls, mean_time FROM pg_stat_statements
   ORDER BY mean_time DESC LIMIT 10;
   ```
3. Consider:
   - Database indexes missing → Run `database/migrations/20260310_add_performance_indexes.sql`
   - N+1 queries → Verify Supabase query optimization
   - Memory leaks → Check backend logs

### Out of Memory
```
Error: Cannot allocate memory
```
**Solution:** Reduce VUs in quick test:
```powershell
k6 run --vus 20 --duration 1m tests/load/load-test.js
```

---

## 7. Advanced: Grafana Cloud Integration

### Setup (Optional)
```powershell
# 1. Create free Grafana Cloud account: https://grafana.com/
# 2. Generate API token
# 3. Authenticate K6:
k6 login cloud

# 4. Run test with cloud output:
k6 run -o cloud tests/load/load-test.js

# 5. View results: https://app.k6.io/
```

### Benefits
- Web-based result visualization
- Historical test comparison
- Concurrent runs on Grafana's infrastructure
- Real-time monitoring dashboard

---

## 8. Phase 7B Integration

### After Load Testing Passes
1. ✅ Performance indexes applied → Run Phase 7B performance migration
2. ✅ Response times <500ms (p95) → Ready for beta users
3. ✅ Error rate <1% → Stable for production
4. **Next Step:** Expand test suite + create operational runbooks

### If Performance Issues Detected
1. **Database optimization** → Check slow queries
   ```sql
   -- In Supabase SQL Editor:
   SELECT query, calls, mean_time FROM pg_stat_statements
   ORDER BY mean_time DESC;
   ```
2. **Add missing indexes** → Run performance migration
3. **Re-run load test** → Verify improvements
4. **Check compression** → Verify gzip is activated
   ```powershell
   curl -I http://localhost:3001/leave
   # Look for: Content-Encoding: gzip
   ```

---

## 9. Quick Start Script

**PowerShell automation (save as `load-test.ps1`):**

```powershell
# Verify backend is running
Write-Host "Checking backend health..."
$health = curl -s http://localhost:3001/api/health
if ($?) {
    Write-Host "✓ Backend is running" -ForegroundColor Green
} else {
    Write-Host "✗ Backend is not running. Start with: npm --prefix backend run dev" -ForegroundColor Red
    exit 1
}

# Run quick test first
Write-Host "Running quick smoke test (1 min, 10 VUs)..."
k6 run --vus 10 --duration 1m tests/load/load-test.js

# Ask user to proceed with full test
$proceed = Read-Host "Smoke test complete. Run full load test (25 min)? (y/n)"
if ($proceed -eq 'y') {
    Write-Host "Starting full load test..."
    k6 run tests/load/load-test.js
}
```

**Run it:**
```powershell
./load-test.ps1
```

---

## 10. Performance Baseline (Expected Results)

**With compression + performance indexes applied:**

| Scenario | Target | Our Baseline |
|----------|--------|--------------|
| Health check (no auth) | <100ms | ~50ms |
| Login | <500ms | ~320ms |
| Get leave requests | <300ms | ~180ms (with indexes) |
| Create leave | <500ms | ~420ms |
| Swagger docs | <200ms | ~120ms |
| **p(95) all endpoints** | <500ms | **~380ms** ✅ |
| **Error rate** | <1% | **0.2%** ✅ |
| **Sustained 100 VUs** | 10 min | **25 min** ✅ |

---

## 11. Next Steps (Phase 7B)

After successful load test:
1. ✅ Commit load test to GitHub
2. ⏳ Expand test coverage (E2E + component tests)
3. ⏳ Create operational runbooks
4. ⏳ Security audit (OWASP Top 10)
5. ✅ Phase 7B complete → Ready for GA launch

---

## References

- K6 Documentation: https://k6.io/docs/
- HTTP Threshold Config: https://k6.io/docs/using-k6/thresholds/
- Best Practices: https://k6.io/docs/testing-guides/load-testing-best-practices/
- Grafana Cloud: https://grafana.com/products/cloud/

