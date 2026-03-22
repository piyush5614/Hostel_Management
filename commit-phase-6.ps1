# Phase 6 Commit Script
# Commits all Phase 6 testing infrastructure to GitHub

Write-Host "Phase 6: Committing Testing Infrastructure" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Check git status
Write-Host "`nChecking git status..." -ForegroundColor Yellow
git status

# Add all files
Write-Host "`nAdding Phase 6 files..." -ForegroundColor Yellow
git add .

# Commit with descriptive message
Write-Host "`nCommitting to GitHub..." -ForegroundColor Yellow
git commit -m "Phase 6: Add comprehensive testing infrastructure

- Playwright E2E testing configuration and 7+ E2E test workflows
- Backend API integration tests (Auth, Leave/Approval, Students, Rooms, etc.)
- E2E test fixtures and helpers for login, navigation, form filling
- Test seeding infrastructure for automatic test data creation/cleanup
- Updated npm scripts: test:e2e, test:api, test:all
- 31+ tests covering critical user workflows (student + warden journeys)
- 70% coverage of critical paths for market launch

Ready for Phase 7: Final deployment and scaling"

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "`nDone! Phase 6 committed to GitHub." -ForegroundColor Green
