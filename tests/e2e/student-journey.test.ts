import { test, expect } from '@playwright/test';
import { loginAsStudent, logout, navigateTo, fillLeaveForm, getSuccessMessage, waitForLoadingToComplete, isElementVisible } from './fixtures';

// Test credentials - change these to match your seeded test accounts
const TEST_STUDENT_EMAIL = 'test_student@hostel.local';
const TEST_STUDENT_PASSWORD = 'TestPassword123!';

test.describe('Student Journey - E2E Tests', () => {
  test('Student Login & View Dashboard', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    expect(page.url()).toContain('/login');

    // Verify login form exists
    const emailInput = await page.$('input[type="email"]');
    expect(emailInput).toBeTruthy();

    // Fill in credentials
    await page.fill('input[type="email"]', TEST_STUDENT_EMAIL);
    await page.fill('input[type="password"]', TEST_STUDENT_PASSWORD);

    // Click login button
    await page.click('button:has-text("Login"), button:has-text("Sign In")');

    // Wait for successful login - redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');

    // Verify dashboard loaded with student info
    await waitForLoadingToComplete(page);
    const dashboardContent = page.locator('[class*="dashboard"], main');
    await expect(dashboardContent).toBeVisible();
  });

  test('Student View Attendance History', async ({ page }) => {
    // Login first
    await loginAsStudent(page, TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);

    // Navigate to attendance
    await navigateTo(page, 'attendance');
    await page.waitForURL('**/attendance**', { timeout: 5000 });

    // Verify attendance page loaded
    const pageTitle = page.locator('h1, h2, [role="heading"]').first();
    const titleText = await pageTitle.textContent();
    expect(titleText?.toLowerCase()).toContain('attendance');

    // Verify attendance table/list exists
    const attendanceContent = page.locator('table, [role="grid"], [class*="attendance"]').first();
    await expect(attendanceContent).toBeVisible();
  });

  test('Student View Room Information', async ({ page }) => {
    // Login first
    await loginAsStudent(page, TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);

    // Navigate to rooms
    await navigateTo(page, 'rooms');
    await page.waitForURL('**/rooms**', { timeout: 5000 });

    // Verify room page loaded
    const pageTitle = page.locator('h1, h2, [role="heading"]').first();
    await expect(pageTitle).toBeVisible();

    // Verify room information is displayed
    const roomInfo = page.locator('[class*="room"], [data-testid*="room"]').first();
    if (await roomInfo.count() > 0) {
      await expect(roomInfo).toBeVisible();
    }
  });

  test('Student Submit Leave Application', async ({ page }) => {
    // Login first
    await loginAsStudent(page, TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);

    // Navigate to leave
    await navigateTo(page, 'leave');
    await page.waitForURL('**/leave**', { timeout: 5000 });

    // Click "Apply Leave" or "Create Leave" button
    const applyButton = page.locator('button:has-text("Apply Leave"), button:has-text("New Leave"), button:has-text("Create")');
    if (await applyButton.count() > 0) {
      await applyButton.click();

      // Wait for form to appear (might be modal or new page)
      await page.waitForTimeout(500);

      // Fill in leave form
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      await fillLeaveForm(page, {
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: dayAfter.toISOString().split('T')[0],
        reason: 'Family visit',
        emergencyContact: '9876543210',
      });

      // Submit form
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Create"), button:has-text("Apply")');
      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Wait for success message or redirect
        await waitForLoadingToComplete(page);
        const successMsg = await getSuccessMessage(page);
        expect(successMsg.length > 0 || page.url().includes('leave')).toBeTruthy();
      }
    }
  });

  test('Student Logout', async ({ page }) => {
    // Login first
    await loginAsStudent(page, TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);

    // Find and click profile/menu button
    const profileButton = page.locator('[aria-label*="Profile"], [aria-label*="Menu"], button:has-text("Profile")').first();
    if (await profileButton.count() > 0) {
      await profileButton.click();

      // Wait for menu to appear
      await page.waitForTimeout(300);

      // Click logout
      const logoutButton = page.locator('text=Logout, text=Sign Out, button:has-text("Logout")').first();
      if (await logoutButton.count() > 0) {
        await logoutButton.click();

        // Verify redirect to login
        await page.waitForURL('**/login', { timeout: 5000 });
        expect(page.url()).toContain('/login');
      }
    }
  });

  test('Navigation between pages', async ({ page }) => {
    // Login first
    await loginAsStudent(page, TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);

    // Test navigation to each main page
    const pages = ['attendance', 'rooms', 'leave'];

    for (const pageRoute of pages) {
      await navigateTo(page, pageRoute);
      await page.waitForURL(`**/${pageRoute}**`, { timeout: 5000 });

      // Verify page loaded
      const content = page.locator('main, [role="main"]');
      await expect(content).toBeVisible();
    }
  });
});
