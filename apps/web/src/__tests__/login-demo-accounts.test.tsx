import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const { login } = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('../store/auth-store', () => ({
  useAuthStore: () => ({
    login,
    resetPassword: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    isAuthenticated: false,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { LoginPage } from '../pages/login';

describe('LoginPage demo accounts', () => {
  beforeEach(() => {
    login.mockReset();
    login.mockResolvedValue(undefined);
    localStorage.clear();
  });

  it('signs in with each demo account and selects its college', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const accounts = [
      ['Admin', 'demo.admin@tchostel.edu', 'DemoAdmin@2026!', 'college-demo'],
      ['Warden', 'demo.warden@tchostel.edu', 'DemoWarden@2026!', 'college-default'],
      ['Staff', 'demo.staff@tchostel.edu', 'DemoStaff@2026!', 'college-default'],
      ['Student', 'demo.student@tchostel.edu', 'DemoStudent@2026!', 'college-default'],
    ];

    for (const [label, email, password, collegeId] of accounts) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(login).toHaveBeenLastCalledWith(email, password);
      expect(localStorage.getItem('tc-hostel-active-college-id')).toBe(collegeId);
    }
  });
});
