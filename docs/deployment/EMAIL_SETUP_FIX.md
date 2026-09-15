# Email & Backend Setup Guide

## Problem
Backend won't start due to invalid Supabase URL in `.env`

## Solution: Two Options

### Option 1: Use Real Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Copy your project URL and API key from Settings → API
4. Update `backend/.env`:
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-api-key
```

### Option 2: Use Local SQLite Database
1. Modify `backend/src/db/init.ts` to use SQLite instead of Supabase
2. Use the existing `hostel.db` file in the backend folder

---

## Email Configuration (Gmail)
Configure Gmail credentials locally in the ignored `.env` file. Never commit or document a real Gmail address or app password.
- GMAIL_USER: your_email@gmail.com
- GMAIL_APP_PASSWORD: xxxx-xxxx-xxxx-xxxx
- APP_URL: http://localhost:5173

**Note:** Once the backend starts, emails will send via the `/api/email/task-notify` endpoint.

---

## Next Steps
1. Set up Supabase OR switch to local SQLite
2. Restart backend: `npm run dev` (from backend folder)
3. Frontend will stay running at http://localhost:5173
4. Backend will run at http://localhost:3001
5. Email notifications will work when tasks are assigned
