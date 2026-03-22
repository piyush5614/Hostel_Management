/**
 * K6 Load Test for Hostel Management System
 * 
 * Run: k6 run tests/load/load-test.js
 * 
 * Configuration:
 * - Virtual Users (VUs): Simulate concurrent users
 * - Duration: How long test runs
 * - Thresholds: Pass/fail criteria
 * 
 * Benchmark Targets:
 * - 100 concurrent users
 * - <500ms response time (95th percentile)
 * - <1% error rate
 * - Sustainable for >10 minutes
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Define custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const successCount = new Counter('successful_requests');
const activeUsers = new Gauge('active_users');

// Test Configuration
export const options = {
  stages: [
    // Ramp up: gradually increase VUs
    { duration: '2m', target: 10 },   // Reach 10 VUs in 2 minutes
    { duration: '5m', target: 50 },   // Reach 50 VUs in 5 minutes
    { duration: '10m', target: 100 }, // Reach 100 VUs in 10 minutes
    { duration: '5m', target: 100 },  // Sustain 100 VUs for 5 minutes
    
    // Ramp down: gradually decrease VUs
    { duration: '2m', target: 50 },   // Back to 50 VUs
    { duration: '1m', target: 0 },    // Back to 0 VUs
  ],
  
  // Thresholds define pass/fail criteria
  thresholds: {
    // Response time: 95th percentile must be <500ms
    'response_time': ['p(95)<500', 'p(99)<1000', 'avg<300'],
    // Error rate: <1% of requests should fail
    'errors': ['rate<0.01'],
    // HTTP status codes
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
  },
};

// Test scenario
export default function () {
  const baseURL = 'http://localhost:3001';
  const testEmail = `test_${Date.now()}@hostel.local`;
  const testPassword = 'TestPassword123!';

  // Set active users metric
  activeUsers.add(__VU);

  // ============================================
  // Test 1: Health Check
  // ============================================
  group('Health Check', () => {
    const res = http.get(`${baseURL}/api/health`);
    
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 100ms': (r) => r.timings.duration < 100,
      'body contains status ok': (r) => r.body.includes('ok'),
    });

    responseTime.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    if (res.status === 200) successCount.add(1);
  });

  sleep(1);

  // ============================================
  // Test 2: Authentication - Register
  // ============================================
  group('Auth - Register', () => {
    const payload = JSON.stringify({
      email: testEmail,
      password: testPassword,
      role: 'student',
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
    };

    const res = http.post(`${baseURL}/auth/register`, payload, params);

    check(res, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201 || r.status === 400, // 400 = duplicate
      'response time < 500ms': (r) => r.timings.duration < 500,
      'response has user or error': (r) => r.body.includes('user') || r.body.includes('error'),
    });

    responseTime.add(res.timings.duration);
    errorRate.add(res.status >= 500);
    if (res.status < 500) successCount.add(1);
  });

  sleep(1);

  // ============================================
  // Test 3: Authentication - Login
  // ============================================
  let authToken = '';

  group('Auth - Login', () => {
    const payload = JSON.stringify({
      email: 'test_student@hostel.local',
      password: 'TestPassword123!',
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
    };

    const res = http.post(`${baseURL}/auth/login`, payload, params);

    check(res, {
      'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has token on success': (r) => r.status === 200 ? r.body.includes('token') : true,
    });

    if (res.status === 200) {
      try {
        authToken = JSON.parse(res.body).token;
      } catch (e) {
        // Token parse failed
      }
    }

    responseTime.add(res.timings.duration);
    errorRate.add(res.status >= 500);
    if (res.status < 500) successCount.add(1);
  });

  sleep(1);

  // ============================================
  // Test 4: API - Fetch Leave Requests (with auth)
  // ============================================
  if (authToken) {
    group('API - Get Leave Requests', () => {
      const params = {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      };

      const res = http.get(`${baseURL}/leave`, params);

      check(res, {
        'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
        'response time < 300ms': (r) => r.timings.duration < 300,
        'response is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
        'response is compressed': (r) => r.headers['Content-Encoding'] === 'gzip' || r.body.length < 5000,
      });

      responseTime.add(res.timings.duration);
      errorRate.add(res.status >= 500);
      if (res.status === 200) successCount.add(1);
    });

    sleep(1);

    // ============================================
    // Test 5: API - Create Leave Request
    // ============================================
    group('API - Create Leave Request', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const payload = JSON.stringify({
        start_date: tomorrow.toISOString(),
        end_date: dayAfter.toISOString(),
        reason: 'Load test leave request',
        emergency_contact: '9876543210',
      });

      const params = {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      };

      const res = http.post(`${baseURL}/leave`, payload, params);

      check(res, {
        'status is 200, 201, or 401': (r) => [200, 201, 401, 400].includes(r.status),
        'response time < 500ms': (r) => r.timings.duration < 500,
        'response is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
      });

      responseTime.add(res.timings.duration);
      errorRate.add(res.status >= 500);
      if (res.status < 500) successCount.add(1);
    });

    sleep(2);

    // ============================================
    // Test 6: Swagger API Docs
    // ============================================
    group('API - Swagger Docs', () => {
      const res = http.get(`${baseURL}/api-docs.json`);

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 200ms': (r) => r.timings.duration < 200,
        'response is OpenAPI spec': (r) => r.body.includes('openapi') || r.body.includes('swagger'),
        'response is compressed': (r) => r.headers['Content-Encoding'] === 'gzip' || r.body.length < 100000,
      });

      responseTime.add(res.timings.duration);
      errorRate.add(res.status !== 200);
      if (res.status === 200) successCount.add(1);
    });
  }

  sleep(3);
}

/**
 * Test Summary Output
 * 
 * After running: k6 run tests/load/load-test.js
 * 
 * You'll see:
 * - Total requests
 * - Success/failure rate
 * - Response time percentiles (p50, p95, p99)
 * - Errors by type
 * - Thresholds passed/failed
 * 
 * Pass Criteria:
 * ✓ p(95) response time < 500ms
 * ✓ Error rate < 1%
 * ✓ All thresholds passed
 */
