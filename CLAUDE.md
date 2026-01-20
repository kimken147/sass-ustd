# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                    # Start all services
pnpm dev:api                # Start only API services (platform-api + tenant-api)
pnpm dev:web                # Start only frontend services
pnpm dev:test002            # Start test002 tenant development (platform-api + tenant-api + tenant-admin)

# Run single package
pnpm --filter @saas-platform/<package-name> dev

# Run tenant-admin with custom tenant host
TENANT_HOST=http://demo.test:5174 pnpm --filter @saas-platform/tenant-admin dev

# Build
pnpm build                  # Build all projects

# Test
pnpm test                   # Run all tests
pnpm --filter @saas-platform/<app-name> test:watch   # Watch mode for single app

# Lint & Format
pnpm lint                   # Lint all code
pnpm format                 # Format code with Prettier

# Database migrations
pnpm migration:platform     # Run platform-api migrations
pnpm migration:tenant       # Run tenant-api migrations

# Local environment setup
pnpm setup:local            # Auto-setup local environment
```

## Architecture Overview

**Monorepo Stack**: Turborepo + pnpm workspaces
**Package Manager**: pnpm 9.15.0 (required)
**Node.js**: >= 20.0.0

### Multi-Tenant Architecture

This is a multi-tenant SaaS platform for cryptocurrency investment (TRON/USDT):

- **Platform-level** (`platform-api`): Manages all tenants, system wallets, global configuration
- **Tenant-level** (`tenant-api`): **Shared deployment** with dynamic database connection per tenant
  - Uses `X-Tenant-ID` header to identify tenant
  - Each tenant has isolated PostgreSQL database (`tenant_<tenant_slug>`)
  - Connection pooling with LRU eviction for multiple tenants
- Each tenant has its own: domain/subdomain, database, branding

#### Local Development Setup

For local multi-tenant development, use `.test` domain (avoid `.local` which causes DNS delays on macOS):

1. Add to `/etc/hosts`:
   ```
   127.0.0.1 test002.test
   ```

2. Run development server:
   ```bash
   pnpm dev:test002
   ```

3. Access tenant admin at `http://test002.test:5174`

### Apps

| App | Port | Stack | Purpose |
|-----|------|-------|---------|
| `platform-api` | 3000 | NestJS + MikroORM | Platform management API |
| `tenant-api` | 3001 | NestJS + MikroORM + TronWeb | Shared multi-tenant business API |
| `platform-admin` | 5173 | Vite + React + Refine + shadcn/ui | Platform superadmin dashboard |
| `tenant-admin` | 5174 | Vite + React + Refine + shadcn/ui | Tenant management dashboard |
| `agent-portal` | 5175 | Vite + React + Refine + shadcn/ui | Agent/reseller dashboard |
| `customer-web` | 3002 | Next.js + shadcn/ui | End-user frontend (SEO-optimized) |

### Key Packages

| Package | Purpose |
|---------|---------|
| `database` | MikroORM entities and configurations |
| `shared` | NestJS shared utilities and DTOs |
| `shared-types` | Cross-project TypeScript type definitions |
| `ui` | Shared shadcn/ui component library |
| `auth` | JWT service, password encryption, token management |
| `api-client` | Unified API clients with interceptors |
| `config` | Shared ESLint, TypeScript, Tailwind, Prettier configs |

## Key Domain Concepts

### Agent Hierarchy
- Tree-structure with unlimited depth (uses `path` and `level` for tracking)
- Self-referential relationships in Agent entity
- Commission calculation with upward profit sharing

### Revenue Distribution
Three types of financial records:
- `RevenueDistribution`: Tenant revenue sharing
- `CommissionPayout`: Agent commissions
- `SystemFeeDistribution`: Platform fees

### DeFi Integration
- TRON blockchain support (testnet/mainnet)
- USDT token integration via TronWeb
- Contract execution wallets and automatic revenue distribution

## Frontend Development Notes

### shadcn/ui Components
All shadcn/ui components must be installed via official CLI, not manually created:

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component-name> --yes --overwrite
```

After installation:
1. Fix import paths - ensure `cn` uses relative paths (`../../lib/utils`)
2. Export new components in `src/index.ts`

### Admin Apps (Refine Framework)
The admin dashboards (platform-admin, tenant-admin, agent-portal) use Refine framework with:
- TanStack Query for data fetching
- React Hook Form + Zod for form validation
- shadcn/ui for components

## Backend Development Notes

### NestJS APIs
- Use MikroORM for database operations
- JWT authentication with multi-level access control
- Swagger documentation at `/api` endpoint

### Database
- Platform DB: `saas_platform`
- Tenant DBs: `tenant_<tenant_id>` (auto-created per tenant)
- Migrations managed separately per API

## Documentation

Key design documents in `/docs`:
- `AUTH_ARCHITECTURE.md` - Authentication system design
- `COMMISSION_MECHANISM_FINAL.md` - Commission calculation logic
- `DATABASE_ER_DIAGRAM.md` - Entity relationship diagrams
- `MULTI_SITE_ARCHITECTURE_FINAL.md` - Multi-site design
