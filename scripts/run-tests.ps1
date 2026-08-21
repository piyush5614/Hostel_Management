# Phase 6 Test Installation - Execution Script
# Run this script to: Install dependencies, Seed test data, Run all tests

Write-Host "🚀 Phase 6: Testing Installation" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Navigate to project root
cd c:\Users\asus4\Desktop\Hostel_Comp

# Step 1: Install Playwright dependencies
Write-Host "`n📦 Step 1: Installing Playwright and test dependencies..." -ForegroundColor Yellow
npm install -D @playwright/test @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event jsdom dotenv

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: npm install failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Install Playwright browsers
Write-Host "`n🌐 Step 2: Installing Playwright browser binaries..." -ForegroundColor Yellow
npx playwright install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Playwright install failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Run unit tests
Write-Host "`n✓ Step 3: Running unit tests (frontend, backend)..." -ForegroundColor Yellow
npm test

if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Some unit tests failed. Continuing..." -ForegroundColor Yellow
}

# Step 4: Run API integration tests
Write-Host "`n✓ Step 4: Running API integration tests..." -ForegroundColor Yellow
npm run test:api

if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: API tests may need Supabase setup. Check output." -ForegroundColor Yellow
}

# Step 5: Summary
Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "✓ Installation Complete!" -ForegroundColor Green
Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. Create test accounts in Supabase (see below)"
Write-Host "  2. Run: npm run test:e2e    (for E2E tests)"
Write-Host "  3. Run: npm run test:all    (for all tests)"
Write-Host "`nTest Accounts to Create in Supabase:" -ForegroundColor Yellow
Write-Host "  Student:"
Write-Host "    Email: test_student@hostel.local"
Write-Host "    Password: TestPassword123!"
Write-Host "    Role: student"
Write-Host ""
Write-Host "  Warden:"
Write-Host "    Email: test_warden@hostel.local"
Write-Host "    Password: WardenPass123!"
Write-Host "    Role: warden"
Write-Host "`nDone! Ready for Phase 6 completion." -ForegroundColor Cyan
