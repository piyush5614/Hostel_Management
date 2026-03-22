import { Page } from '@playwright/test';

export async function loginAsStudent(page: Page, email: string, password: string) {
  // Navigate to login page
  await page.goto('/login');

  // Fill in credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit form
  await page.click('button:has-text("Login")');

  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

export async function loginAsWarden(page: Page, email: string, password: string) {
  await loginAsStudent(page, email, password);
}

export async function logout(page: Page) {
  // Click on profile/menu
  await page.click('button:has-text("Profile"), button:has-text("Menu"), [aria-label="Menu"]');

  // Click logout
  await page.click('text=Logout, text=Sign Out');

  // Wait for redirect to login
  await page.waitForURL('/login', { timeout: 5000 });
}

export async function navigateTo(page: Page, route: string) {
  const navigation = {
    'dashboard': '/dashboard',
    'leave': '/leave-management-page',
    'attendance': '/attendance-page',
    'rooms': '/rooms-page',
    'visitors': '/visitor-management-page',
    'applications': '/applications-page',
    'settings': '/settings-page',
  } as Record<string, string>;

  const url = navigation[route] || route;
  await page.goto(url);
}

export async function fillLeaveForm(
  page: Page,
  options: {
    startDate?: string;
    endDate?: string;
    reason?: string;
    emergencyContact?: string;
  }
) {
  if (options.startDate) {
    await page.fill('input[placeholder*="Start"], input[placeholder*="From"]', options.startDate);
  }

  if (options.endDate) {
    await page.fill('input[placeholder*="End"], input[placeholder*="To"]', options.endDate);
  }

  if (options.reason) {
    await page.fill('textarea, input[placeholder*="Reason"]', options.reason);
  }

  if (options.emergencyContact) {
    await page.fill('input[placeholder*="Contact"], input[placeholder*="Phone"]', options.emergencyContact);
  }
}

export async function getErrorMessage(page: Page): Promise<string> {
  try {
    const errorElement = await page.$('[role="alert"], .error, .toast-error, [class*="error"]');
    if (errorElement) {
      return await errorElement.textContent() || '';
    }
  } catch (error) {
    // Element not found
  }
  return '';
}

export async function getSuccessMessage(page: Page): Promise<string> {
  try {
    const successElement = await page.$('[role="status"], .success, .toast-success, [class*="success"]');
    if (successElement) {
      return await successElement.textContent() || '';
    }
  } catch (error) {
    // Element not found
  }
  return '';
}

export async function waitForLoadingToComplete(page: Page) {
  try {
    await page.waitForSelector('[class*="loading"], [class*="spinner"]', { state: 'hidden', timeout: 5000 });
  } catch (error) {
    // Loading indicator might not be present
  }
}

export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.$(selector);
    if (!element) return false;
    return element.isVisible();
  } catch (error) {
    return false;
  }
}

export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().getTime();
  await page.screenshot({ path: `./test-results/screenshots/${timestamp}-${name}.png` });
}
