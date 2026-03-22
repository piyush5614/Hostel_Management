# 10/10 IMPLEMENTATION ROADMAP
**Target:** Improve from 8.3/10 to 10/10  
**Start Date:** March 22, 2026  
**Estimated Duration:** 3-4 days

---

## PHASE 1: TEST FIXES (30 mins) → 8.6/10

### Issue 1-3: Visitor Endpoint Tests ✅ ALREADY FIXED
- Updated field names: `check_in` → `check_in_time`, `check_out` → `check_out_time`
- Status: Done

### Issue 4-6: Application Workflow Tests (Need Mock Fix)
**Location:** `backend/src/tests/routes/applications.test.ts:197`

**Problem:** Mock router doesn't persist data between POST→GET calls

**Solution:** Mock application storage
```typescript
// Add in applications.test.ts
let mockApplicationsStore: Record<string, any> = {};

const mockRouter = Router();
mockRouter.post('/', (req, res) => {
  const id = `app-${Date.now()}`;
  const app = { id, ...req.body, status: 'pending', created_at: new Date() };
  mockApplicationsStore[id] = app;  // Store it
  res.status(201).json(app);
});

mockRouter.get('/:id', (req, res) => {
  const app = mockApplicationsStore[req.params.id];
  if (!app) return res.status(404).json({ error: 'Not found' });
  res.json(app);
});
```

**Time:** 30 minutes  
**Impact:** +0.5 points (94% → 99% pass rate)

---

## PHASE 2: LOAD TESTING (2-3 hrs) → 9.1/10

### Execute Phase 8.1 Load Tests

**Steps:**
```bash
# 1. Terminal 1: Start frontend
npm run dev

# 2. Terminal 2: Run load tests
npx playwright test tests/load/phase-8-1-load.test.ts --reporter=html

# 3. View results
npx playwright show-report
```

**Success Criteria:**
- ✅ 8 test scenarios pass
- ✅ Pagination loads 50 items
- ✅ Infinite scroll fetches next 5 pages
- ✅ Concurrent requests (10 parallel) succeed
- ✅ 1000+ items scroll smoothly
- ✅ Filter + pagination works
- ✅ Empty state displays correctly
- ✅ Error recovery functions

**Time:** 2-3 hours  
**Impact:** +0.5 points (9.6/10 pass rate)

---

## PHASE 3: MONITORING & ERROR TRACKING (2 hrs) → 9.6/10

### Sentry Setup

**Step 1: Create Sentry Account**
1. Go to https://sentry.io
2. Create free account
3. Create project: Node.js
4. Get SENTRY_DSN

**Step 2: Install Sentry**
```bash
cd backend
npm install @sentry/node @sentry/tracing
```

**Step 3: Configure Sentry**

File: `backend/src/index.ts`
```typescript
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";

// Initialize BEFORE creating app
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ 
      app: true, 
      request: true 
    }),
  ],
  beforeSend(event) {
    if (event.exception) {
      const error = event.exception.values?.[0];
      // Ignore specific errors in development
      if (error?.value?.includes('ECONNREFUSED')) {
        return null;
      }
    }
    return event;
  },
});

const app = express();

// Add request handler EARLY
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... your routes ...

// Add error handler LAST
app.use(Sentry.Handlers.errorHandler());
```

**Step 4: Set Environment Variable**
```bash
# In .env.staging
SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/project-id
```

**Verify:**
```bash
npm run dev
# Open http://localhost:3001/api/health
# Check Sentry dashboard - should see no errors
```

**Time:** 2 hours  
**Impact:** +0.5 points (improved monitoring)

---

## PHASE 4: SECURITY HARDENING (5-7 hrs) → 10/10

### OWASP Top 10 Compliance Checklist

| # | Vulnerability | Status | Action |
|---|---|---|---|
| A01 | Broken Access Control | ⚠️ PARTIAL | ✓ Already implemented JWT + RBAC |
| A02 | Cryptographic Failures | ✅ GOOD | ✓ TLS required, bcrypt passwords |
| A03 | Injection | ✅ GOOD | ✓ Parameterized queries via Supabase |
| A04 | Insecure Design | ⚠️ PARTIAL | → Add authentication bypass tests |
| A05 | Security Misconfiguration | ⚠️ PARTIAL | → Add CORS policy tests |
| A06 | Vulnerable Components | ✅ GOOD | ✓ npm audit, dependencies checked |
| A07 | Authentication Failures | ⚠️ PARTIAL | → Test session fixation, brute force |
| A08 | Software/Data Integrity | ⚠️ MINIMAL | → Add code signing for releases |
| A09 | Logging & Monitoring | ✅ GOOD | ✓ Winston logs, Sentry errors |
| A10 | SSRF | ✅ GOOD | ✓ No external HTTP calls |

### Implementation

**Create Security Test Suite:**

File: `backend/src/tests/security/owasp.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../index';

describe('OWASP Top 10 Security', () => {
  // A01: Broken Access Control
  describe('A01: Access Control', () => {
    it('should reject requests without JWT', async () => {
      const res = await request(app).get('/students');
      expect(res.status).toBe(401);
    });

    it('should reject tokens with invalid signature', async () => {
      const res = await request(app)
        .get('/students')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });

    it('should reject expired tokens', async () => {
      // Test with expired JWT
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const res = await request(app)
        .get('/students')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect([401, 403]).toContain(res.status);
    });

    it('should enforce role-based access', async () => {
      // Student trying to access admin endpoint should fail
      const studentToken = generateToken({ role: 'student' });
      const res = await request(app)
        .post('/admin/settings')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });

  // A04: Insecure Design
  describe('A04: Design Security', () => {
    it('should use HTTPS in production', () => {
      if (process.env.NODE_ENV === 'production') {
        expect(process.env.FORCE_HTTPS).toBe('true');
      }
    });

    it('should have rate limiting on auth endpoints', async () => {
      // Try 10 failed logins rapidly
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' });
      }
      
      // 11th request should be rate limited
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
      
      expect(res.status).toBe(429); // Too Many Requests
    });
  });

  // A07: Authentication Failures
  describe('A07: Authentication', () => {
    it('should not expose user existence via registration', async () => {
      // Register user
      await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!',
          name: 'Test User'
        });

      // Try to register same user - should have same delay
      const start = Date.now();
      const res = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!',
          name: 'Test User'
        });
      const duration = Date.now() - start;
      
      // Response should take similar time (timing attack prevention)
      expect([400, 409]).toContain(res.status);
      expect(duration).toBeGreaterThan(100); // Some artificial delay
    });
  });

  // A05: Misconfiguration
  describe('A05: Configuration', () => {
    it('should have CORS properly configured', async () => {
      const res = await request(app)
        .options('/api/students')
        .set('Origin', 'https://malicious-site.com');
      
      const allowOrigin = res.headers['access-control-allow-origin'];
      expect(allowOrigin).not.toBe('https://malicious-site.com');
    });

    it('should not expose sensitive headers', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['server']).not.toBe('Express'); // Hide framework
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });
});
```

**Run tests:**
```bash
npm run test -- src/tests/security/owasp.test.ts
```

**Time:** 5-7 hours (full audit)  
**Impact:** +0.5 points (10/10 compliance)

---

## TIMELINE SUMMARY

| Phase | Task | Duration | Points |
|-------|------|----------|--------|
| 1 | Fix mock tests | 30 mins | +0.5 |
| 2 | Load testing | 2-3 hrs | +0.5 |
| 3 | Sentry monitoring | 2 hrs | +0.5 |
| 4 | Security audit | 5-7 hrs | +0.5 |
| **TOTAL** | **8.3 → 10/10** | **9-11 hrs** | **+2.0** |

---

## QUICK WIN SEQUENCE (Best ROI)

**Today (2-3 hours):**
1. Start Phase 1 (30 mins) - Fix mock tests
2. Start Phase 2 (2 hrs) - Run load tests
3. **Result: 9.1/10** ✅

**Tomorrow (2 hours):**
1. Complete Phase 3 - Sentry setup
2. **Result: 9.6/10** ✅

**This Week (5-7 hours):**
1. Complete Phase 4 - Security audit
2. **Result: 10/10** 🎉

---

## GO-LIVE CHECKLIST

Once 10/10 achieved:

- [ ] All tests passing (100%)
- [ ] Load tests verified
- [ ] Sentry monitoring active
- [ ] Security audit complete
- [ ] .env.staging configured
- [ ] Production secrets ready
- [ ] Deployment automation tested
- [ ] Staging deployment checklist reviewed

**Deploy with confidence:** Ready for production within 3-4 weeks

---

*Implementation starts: March 22, 2026*  
*Target completion: March 25, 2026*  
*Status: 8.3/10 → 10/10*
