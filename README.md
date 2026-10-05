# Hostel Connect — Monorepo Architecture

A modern, full-stack, enterprise-grade Hostel Management Platform built as a scalable Monorepo utilizing **npm Workspaces**, **Turborepo**, **React 18 + Vite**, **Express.js**, and **Capacitor Mobile**.

---

## 🏗️ Repository Architecture

```text
hostel-connect/
├── apps/
│   ├── web/                    # Main Portal: Student, Staff, Warden & Admin (React + Vite)
│   │   ├── src/                # Clean source root
│   │   ├── public/             # Static web assets
│   │   ├── index.html          # Standard HTML entry point
│   │   ├── vite.config.ts      # Vite configuration & Rollup chunking
│   │   └── package.json        # @hostel-connect/web
│   ├── control-center/         # Company Super Admin & Multi-Tenant Control Center
│   │   ├── src/                # Server & governance engine
│   │   └── package.json        # @hostel-connect/control-center
│   └── mobile-android/         # Capacitor Android wrapper & native bridge
│       ├── android/            # Native Android Studio project
│       ├── capacitor.config.ts # Capacitor configuration
│       └── package.json        # @hostel-connect/mobile-android
├── services/
│   └── api/                    # Node.js / Express REST & WebSocket API Service
│       ├── src/                # Modular controllers, middleware & routes
│       ├── database/           # Schema migrations & SQL definitions
│       ├── Dockerfile          # Production multi-stage Docker build
│       └── package.json        # @hostel-connect/api
├── packages/
│   ├── config/                 # Shared ESLint, TypeScript & build configurations
│   └── types/                  # Shared domain contracts & TypeScript interfaces
├── tests/
│   ├── e2e/                    # Playwright end-to-end test suites
│   └── load/                   # k6 performance test suites
├── scripts/                    # Maintenance & report generation scripts
├── .env.example                # Unified root environment template
├── docker-compose.yml          # Multi-container local orchestration
├── package.json                # Workspace root
├── turbo.json                  # Turborepo task pipeline configuration
└── README.md                   # System documentation
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Install All Workspace Dependencies
```bash
npm install
```

Do not zip or share `node_modules`; it contains OS-specific native binaries. On every new machine or operating system, remove any existing dependency directory and run `npm install` again.

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

### 3. Run Development Servers
```bash
# Concurrently start Web Portal (port 5173) and Backend API (port 3001)
npm run dev

# Or run individual workspaces:
npm run dev:web            # Start React Vite frontend
npm run dev:api            # Start Express backend
npm run dev:control-center # Start Company Control Center
```

### First-Time Admin Setup

There is no public account-registration route. Create the first administrator from the API workspace using the developer-only seed script. It provisions the Supabase Auth user and its matching application profile; it refuses a second administrator for the same college.

In PowerShell, run:

```powershell
$env:ADMIN_EMAIL = Read-Host "Administrator email"
$securePassword = Read-Host "Administrator password" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
npm --prefix services/api run create:admin
Remove-Item Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
Remove-Variable securePassword
```

The API environment must already contain `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the target `DEFAULT_COLLEGE_ID`. Do not put the administrator password in a source file, commit it, or pass it as a command-line argument. The script can also link an existing Supabase Auth user to the application profile and set the developer-provided password.

Only an authenticated administrator can provision accounts. The API endpoints are:

```text
POST /api/admin/students
POST /api/admin/staff
Authorization: Bearer <administrator JWT>
Content-Type: application/json
```

Both endpoints accept `password`, `name`, `generatedId`, and a `profile` object. An email may be supplied for contact purposes, but it is optional: Staff and Student log in with the generated ID and the password entered by the Admin. Student profiles require `course`, `year`, `gender`, `date_of_birth`, `contact_number`, `address`, `guardian_name`, `guardian_contact`, and `emergency_contact`. Staff profiles require `position`, `department`, `contact_number`, and `address`. Passwords must be at least eight characters. A successful response is `201` and contains `userId`, `id`, `email`, `role`, `college_id`, and `profile`; it never contains the password. Duplicate IDs return `409`, invalid profile data returns `400`, and non-admin callers receive `403`.

Only the Admin is created in Supabase Auth. Staff and Student credentials are stored as bcrypt hashes in the application database and are linked to their generated ID and profile in one database transaction. Apply all files in `services/api/database/migrations/` to the Supabase project before using the Admin forms, including `20261005210000_local_managed_credentials.sql`.

The administrator UI displays the password entered for a newly provisioned account once so it can be shared with the student or staff member. It is cleared from the form state after provisioning and is not returned by the API or persisted by the application.

---

## 🛠️ Workspaces & Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Backend API and Web Portal concurrently |
| `npm run dev:web` | Starts `@hostel-connect/web` dev server |
| `npm run dev:api` | Starts `@hostel-connect/api` dev server |
| `npm run dev:control-center` | Starts `@hostel-connect/control-center` |
| `npm run build` | Builds all packages and applications in topological order |
| `npm run build:web` | Builds the web application for production |
| `npm run build:api` | Compiles the backend TypeScript service |
| `npm run build:control-center` | Compiles the control center TypeScript service |
| `npm run lint` | Runs ESLint flat config validation across all packages |
| `npm run test` | Executes unit and component tests with Vitest |
| `npm run test:api` | Executes backend API route integration tests |
| `npm run test:e2e` | Runs Playwright end-to-end browser tests |
| `npm run test:load` | Executes k6 performance and stress tests |
| `npm run test:all` | Runs the full verification test suite |
| `npm run cap:sync` | Syncs web assets to the Android Capacitor project |

---

## 🐳 Docker Deployment

To launch all services in isolated Docker containers:

```bash
docker-compose up --build
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **API Health Check**: `http://localhost:3001/api/health`

---

## 📱 Mobile Hybrid App (Android)

Build and sync web assets to Capacitor Android:
```bash
npm run build:web
npm run cap:sync
```

To open in Android Studio:
```bash
npm run cap:open
```

---

## 🔒 Security & Quality Standards

- **Zero Breaking Changes**: All API routes, data structures, and database migrations remain backwards-compatible.
- **Type Safety**: Unified types shared across frontend and backend via `@hostel-connect/types`.
- **Linting & Formatting**: Single ESLint flat configuration for the entire monorepo.
- **Automated Testing**: 100+ automated unit, API integration, and E2E browser tests.
