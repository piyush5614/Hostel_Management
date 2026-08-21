# Company Control Center (Separate Server)

This is a standalone control-plane service for company-level management across all colleges.

## What this includes

- Super-admin protected APIs (`x-platform-key`) for:
  - college registry management
  - privileged governance action requests
  - dual-approval workflow tracking
  - immutable-style audit event stream
- A minimal command dashboard at `/`.
- Independent runtime from the existing backend server.

## Run locally

1. Copy env values:

```bash
cp .env.example .env
```

2. Install and run:

```bash
npm install
npm run dev
```

3. Open:

```text
http://localhost:4400
```

Default local key in UI: `owner-local-key`

## API quick reference

- `GET /api/health`
- `GET /api/colleges`
- `POST /api/colleges`
- `PATCH /api/colleges/:collegeId`
- `GET /api/governance/actions`
- `POST /api/governance/actions/request`
- `POST /api/governance/actions/:requestId/approve`
- `GET /api/governance/audit?limit=20`

All `/api/*` except health require:

- Header `x-platform-key`
- Optional header `x-platform-actor`
