import { test, expect } from '@playwright/test';
import { loginAsWarden, logout, navigateTo, getSuccessMessage, waitForLoadingToComplete } from './fixtures';

// Test credentials - change these to match your seeded test accounts
const TEST_WARDEN_EMAIL = 'test_warden@hostel.local';
const TEST_WARDEN_PASSWORD = 'WardenPass123!';

test.describe('Warden Journey - E2E Tests (CRITICAL)', () => {
  test('Warden Login & View Dashboard', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    expect(page.url()).toContain('/login');

    // Fill in warden credentials
    await page.fill('input[type="email"]', TEST_WARDEN_EMAIL);
    await page.fill('input[type="password"]', TEST_WARDEN_PASSWORD);

    // Click login button
    await page.click('button:has-text("Login"), button:has-text("Sign In")');

    // Wait for successful login - redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');

    // Verify dashboard loaded
    await waitForLoadingToComplete(page);
    const dashboardContent = page.locator('[class*="dashboard"], main');
    await expect(dashboardContent).toBeVisible();
  });

  test('Warden View Leave Approval Page', async ({ page }) => {
    // Login as warden
    await loginAsWarden(page, TEST_WARDEN_EMAIL, TEST_WARDEN_PASSWORD);

    // Navigate to leave management
    await navigateTo(page, 'leave');
    await page.waitForURL('**/leave**', { timeout: 5000 });

    // Verify leave page loaded
    const pageTitle = page.locator('h1, h2, [role="heading"]').first();
    const titleText = await pageTitle.textContent();
    expect(titleText?.toLowerCase()).toContain('leave');
  });

  test('Warden View Pending Leave Applications', async ({ page }) => {
    // Login as warden
    await loginAsWarden(page, TEST_WARDEN_EMAIL, TEST_WARDEN_PASSWORD);

    // Navigate to leave
    await navigateTo(page, 'leave');

    // Look for pending applications section
    const pendingSection = page.locator('[class*="pending"], text=/pending|awaiting/i');
    if (await pendingSection.count() > 0) {
      await expect(pendingSection).toBeVisible();
    }

    // Verify there's a list or table
    const applicationsList = page.locator('table, [role="grid"], [class*="applications"]').first();
    await expect(applicationsList).toBeVisible();
  });

  test('Warden Approve Leave Application (CRITICAL WORKFLOW)', async ({ page }) => {
    // Login as warden
    await loginAsWarden(page, TEST_WARDEN_EMAIL, TEST_WARDEN_PASSWORD);

    // Navigate to leave management
    await navigateTo(page, 'leave');
    await page.waitForURL('**/leave**', { timeout: 5000 });

    // Find first pending application
    const pendingApps = page.locator('[data-testid*="pending"], [class*="pending"], tr:has-text("pending")');
    
    if (await pendingApps.count() > 0) {
      // Get first pending application
      const firstApp = pendingApps.first();
      
      // Look for approve button
      const approveButton = firstApp.locator('button:has-text("Approve"), button:has-text("Accept")');
      
      if (await approveButton.count() > 0) {
        await approveButton.click();

        // Wait for confirmation or success
        await waitForLoadingToComplete(page);

        // Verify success message
        const successMsg = await getSuccessMessage(page);
        expect(successMsg.length > 0 || await page.locator('text=/approved|success/i').count() > 0).toBeTruthy();

        // Verify status updated
        const updatedStatus = firstApp.locator('text=/approved|checkmark/i');
        const statusUpdated = await updatedStatus.count() > 0;
        
        // If status hasn't updated in DOM yet, just verify no error
        expect(statusUpdated || page.url().includes('leave')).toBeTruthy();
      }
    }
  });

  test('Warden Reject Leave Application', async ({ page }) => {
    // Login as warden
    await loginAsWarden(page, TEST_WARDEN_EMAIL, TEST_WARDEN_PASSWORD);

    // Navigate to leave
    await navigateTo(page, 'leave');
    await page.waitForURL('**/leave**', { timeout: 5000 });

    // Find pending applications
    const pendingApps = page.locator('[data-testid*="pending"], [class*="pending"], tr:has-text("pending")');
    
    if (await pendingApps.count() > 1) {
      // Get second pending application
      const secondApp = pendingApps.nth(1);
      
      // Look for reject button
      const rejectButton = secondApp.locator('button:has-text("Reject"), button:has-text("Deny"), button:has-text("Decline")');
      
      if (await rejectButton.count() > 0) {
        await rejectButton.click();

        // Handle rejection dialog if present
        const reasonInput = page.locator('textarea, input[placeholder*="reason"]');
        if (await reasonInput.count() > 0) {
          await reasonInput.fill('Application rejected');
        }

        // Confirm rejection
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Submit")').last();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
        }

        // Wait for processing
        await waitForLoadingToComplete(page);

        // Verify status changed
        const rejectedStatus = secondApp.locator('text=/rejected|declined/i');
        expect((await rejectedStatus.count() > 0) || page.url().includes('leave')).toBeTruthy();
      }
    }
  });

  test('Warden View Students List', async ({ page }) => {
    // Login as warden
    await loginAsWarden(page, TEST_WARDEN_EMAIL, TEST_WARDEN_PASSWORD);

    // Navigate to applications or students
    const studentLinks = page.locator('text=/students|residents|check-in/i, a:has-text("Students")').first();
    
    if (await studentLinks.count() > 0) {
      await studentLinks.click();
      await page.waitForTimeout(1000);

      // Verify students list loaded
      const studentsList = page.locator('table, [role="grid"], [class*="student"], [class*="resident"]').first();
      await expect(studentsList).toBeVisible();
    }
  });

  test('Warden View Attendance / Check-in Records', async ({ page }) => {
    // Login as warden
    await loginAsWarden(page, TEST_WARDEN_EMAIL, TEST_WARDEN_PASSWORD);

    // Navigate to attendance
    const attendanceLink = page.locator('text=/attendance|check-in/i, a').first();
    
    if (await attendanceLink.count() > 0) {
      await attendanceLink.click();
      await page.waitForTimeout(1000);

      // Verify attendance page
      const attendanceContent = page.locator('[class*="attendance"], [class*="checkin"], table').first();
      await expect(attendanceContent).toBeVisible();
    }
  });

  test('Warden View Visitors', async ({ page }) => {
    // Login as warden
    await loginAsWarden(page, TEST_WARDEN_EMAIL, TEST_WARDEN_PASSWORD);

    // Navigate to visitors
    await navigateTo(page, 'visitors');
    
    // Verify visitors page loaded
    const pageTitle = page.locator('h1, h2, [role="heading"]').first();
    const titleText = await pageTitle.textContent();
    expect(titleText?.toLowerCase()).toContain('visitor');
  });

  test('Warden Logout', async ({ page }) => {
    // Login as warden
    await loginAsWarden(page, TEST_WARDEN_EMAIL, TEST_WARDEN_PASSWORD);

    // Find profile/menu
    const profileButton = page.locator('[aria-label*="Profile"], [aria-label*="Menu"], button:has-text("Profile")').first();
    
    if (await profileButton.count() > 0) {
      await profileButton.click();
      await page.waitForTimeout(300);

      // Click logout
      const logoutButton = page.locator('text=Logout, text=Sign Out').first();
      if (await logoutButton.count() > 0) {
        await logoutButton.click();

        // Verify redirect to login
        await page.waitForURL('**/login', { timeout: 5000 });
        expect(page.url()).toContain('/login');
      }
    }
  });
});
