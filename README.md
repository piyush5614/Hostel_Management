# HostelHub

A comprehensive hostel management system for student housing built with React, TypeScript, and Vite.

## Features

- **Dashboard & Analytics** — Real-time occupancy charts, stats, and recent activity tracking
- **Student Management** — Register, view, and manage student profiles and hostel records
- **Room Allocation** — Room management with auto-assign, manual allocation, and occupancy tracking
- **Leave Management** — Student leave requests with parent approval workflow
- **Attendance Tracking** — Daily attendance monitoring for hostel residents
- **Staff & Task Management** — Staff profiles, role-based access, and task assignment
- **Maintenance Requests** — Track and manage hostel maintenance issues
- **Visitor Management** — Log and monitor visitor entries
- **Credential Management** — Manage user roles and access credentials
- **Events & Announcements** — Hostel events and announcement system
- **Messaging** — In-app messaging between students, staff, and wardens
- **Reports & Export** — Generate and export reports (PDF/Excel)
- **PWA Support** — Installable progressive web app with offline capabilities

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite 5 |
| **Styling** | Tailwind CSS, tailwindcss-animate |
| **State** | Zustand |
| **Forms** | React Hook Form, Zod validation |
| **Charts** | Chart.js, react-chartjs-2 |
| **Routing** | React Router v6 |
| **Icons** | Lucide React |
| **Backend** | Express, SQLite3, JWT auth |
| **Database** | Supabase (optional), SQLite |
| **Notifications** | Sonner (toast) |

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v9+

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Akuma09-create/HostelHub.git
cd HostelHub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` as needed. By default, mock mode is enabled for local development with demo accounts:

| Account | Email | Password |
|---------|-------|----------|
| Admin | admin@tchostel.edu | password |
| Warden | warden@tchostel.edu | password |
| Staff | staff@tchostel.edu | password |
| Student | student@tchostel.edu | password |

### 4. Start the development server

```bash
npm run dev
```

The app will be available at **http://localhost:5173**

### 5. (Optional) Start the backend server

```bash
cd server
npm install
npm run dev
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
├── public/               # Static assets & PWA manifest
├── server/               # Express backend (SQLite, JWT)
│   └── src/
│       ├── db/           # Database init & schema
│       ├── middleware/    # Auth middleware
│       ├── routes/       # API routes (auth, rooms, students)
│       └── utils/        # Utilities
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── dashboard/    # Dashboard widgets & charts
│   │   ├── forms/        # Form components (rooms, students, staff)
│   │   ├── layout/       # Header, sidebar, main layout
│   │   ├── leave/        # Leave management components
│   │   └── ui/           # Base UI components
│   ├── pages/            # Route pages
│   │   ├── attendance/   # Attendance tracking
│   │   ├── dashboard/    # Dashboard page
│   │   ├── leave/        # Leave management
│   │   ├── maintenance/  # Maintenance requests
│   │   ├── rooms/        # Room management
│   │   ├── staff/        # Staff management
│   │   ├── students/     # Student management
│   │   └── visitors/     # Visitor management
│   ├── services/         # API & business logic services
│   ├── store/            # Zustand state management
│   ├── types/            # TypeScript type definitions
│   ├── lib/              # Supabase client & utilities
│   └── utils/            # Shared utilities
├── supabase/             # Supabase migrations & functions
├── .env.example          # Environment configuration template
├── index.html            # Entry HTML
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Supabase Setup (Optional)

To use Supabase instead of mock data:

1. Create a project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from **Settings > API**
3. Update `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_MOCK_MODE=false
   ```
4. Run migrations from `supabase/migrations/`
5. Restart the dev server
