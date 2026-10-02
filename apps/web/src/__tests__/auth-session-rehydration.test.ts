import { beforeEach, describe, expect, it } from 'vitest';
import { getUserProfile } from '../lib/supabase';

describe('real-user session rehydration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads a real profile from the persisted session without MOCK_USERS', async () => {
    const profile = {
      id: 'real-user-id',
      auth_id: 'real-user-id',
      name: 'Real User',
      email: 'real-user@example.com',
      role: 'staff',
      college_id: 'college-default',
      profile_image: '',
      is_active: true,
      last_login: new Date().toISOString(),
    };

    localStorage.setItem('tc-hostel-enhanced-session', JSON.stringify({
      access_token: 'backend-token',
      expires_at: Date.now() + 60_000,
      profile,
      user: { id: profile.id, email: profile.email },
    }));

    await expect(getUserProfile(profile.id)).resolves.toEqual(profile);
  });
});