# TC Hostel Connect — Monorepo Architecture

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
