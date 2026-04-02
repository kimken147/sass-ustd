# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                    # Start all services
pnpm dev:api                # Start only API services (platform-api + tenant-api)
pnpm dev:web                # Start only frontend services (platform-admin + tenant-admin + agent-portal)
pnpm dev:test002            # Start test002 tenant development (platform-api + tenant-api + tenant-admin)

# Run single package
pnpm --filter @saas-platform/<package-name> dev

# Run tenant-admin with custom tenant host
TENANT_HOST=http://demo.test:5174 pnpm --filter @saas-platform/tenant-admin dev

# Build
pnpm build                  # Build all projects

# Test
pnpm test                   # Run all tests
pnpm --filter @saas-platform/<app-name> test           # Test single app
pnpm --filter @saas-platform/<app-name> test:watch     # Watch mode for single app
pnpm --filter @saas-platform/<app-name> test:cov       # Coverage for single app

# Type Check & Lint
pnpm type-check             # TypeScript type check all packages
pnpm lint                   # Lint all code
pnpm format                 # Format code with Prettier

# Clean
pnpm clean                  # Remove all build artifacts and node_modules

# Database migrations (per-API, run separately)
pnpm migration:platform                                           # Run platform-api migrations
pnpm migration:tenant                                             # Run tenant-api migrations
pnpm --filter @saas-platform/platform-api migration:create        # Create new platform migration
pnpm --filter @saas-platform/tenant-api migration:create          # Create new tenant migration

# Local environment setup (creates Docker PostgreSQL, generates .env files)
pnpm setup:local

# Initialize platform admin user
pnpm script:init-platform-user

# Tenant management scripts
pnpm deploy:tenant          # Deploy a tenant (node scripts/deploy-tenant.js)
pnpm create:tenant          # Create a new tenant (node scripts/create-tenant.js)
```

## Architecture Overview

**Monorepo Stack**: Turborepo + pnpm workspaces (`apps/*` + `packages/*`)
**Package Manager**: pnpm 9.15.0 (required)
**Node.js**: >= 20.0.0

### Multi-Tenant Architecture

This is a multi-tenant SaaS platform for cryptocurrency investment (TRON/USDT). The critical architectural concept is the **two-level split**:

- **Platform-level** (`platform-api`): Single instance managing all tenants, system wallets, global configuration. Uses one database: `saas_platform`.
- **Tenant-level** (`tenant-api`): **Shared deployment** serving all tenants through a single process with dynamic database routing:
  - `TenantContextMiddleware` extracts `X-Tenant-ID` header on every request
  - `TenantContextService` stores tenant slug in Node.js `AsyncLocalStorage` (flows through entire request lifecycle)
  - `ConnectionManagerService` maintains an LRU cache of MikroORM connections (max 100 tenants, pool: min=2/max=20 per tenant)
  - `TenantEntityManagerProvider` (REQUEST-scoped) forks an isolated EntityManager per request
  - Each tenant has isolated PostgreSQL database (`tenant_<tenant_slug>`)

**Request flow in tenant-api:**
```
Request → TenantContextMiddleware (validate X-Tenant-ID)
        → AsyncLocalStorage (set tenant context)
        → JwtAuthGuard (verify token + match tenantSlug)
        → Controller → Service (inject TENANT_ENTITY_MANAGER)
        → TransformInterceptor (wrap response)
```

### Apps

| App | Port | Stack | Purpose |
|-----|------|-------|---------|
| `platform-api` | 3000 | NestJS 11 + MikroORM 6 | Platform management API |
| `tenant-api` | 3001 | NestJS 11 + MikroORM 6 + TronWeb | Shared multi-tenant business API |
| `platform-admin` | 5173 | Vite + React 18 + Refine 5 + shadcn/ui | Platform superadmin dashboard |
| `tenant-admin` | 5174 | Vite + React 18 + Refine 5 + shadcn/ui | Tenant management dashboard |
| `agent-portal` | 5175 | Vite + React 18 + Refine 5 + shadcn/ui | Agent/reseller dashboard |
| `customer-web` | 3002 | Next.js 15 (App Router) + shadcn/ui | End-user frontend (SEO-optimized) |

### Key Packages

| Package | Purpose |
|---------|---------|
| `database` | MikroORM entities (BaseEntity, BaseUser, Tenant, Agent, Customer, etc.) |
| `shared` | `TransformInterceptor`, `LoggingInterceptor`, `HttpExceptionFilter`, `HealthController`, `ApiResponseDto`, `PaginatedResponseDto` |
| `shared-types` | Cross-project TypeScript types (wallet, customer, revenue, commission) |
| `ui` | shadcn/ui components + Refine-specific layout/views/buttons/data-table |
| `auth` | `JwtService`, `PasswordService`, `TokenBlacklistService`, `BaseAuthService` |
| `api-client` | `PlatformApiClient`, `TenantApiClient` (singleton Axios wrappers with token management) |
| `config` | Shared ESLint, TypeScript, Tailwind, Prettier configs |
| `theme` | White-label theming system |
| `utils` | Shared utility functions (dayjs, lodash wrappers) |
| `scripts` | Platform user initialization, test environment setup |

## Backend Patterns

### Authentication Architecture

The `auth` package provides a template-method-based `BaseAuthService` with configurable `AuthConfig`:
- `tenantMode: 'none'` — platform-api (PLATFORM_ADMIN only, no tenant association)
- `tenantMode: 'skip'` — tenant-api (TENANT_ADMIN, AGENT, CUSTOMER; entire DB is one tenant)

**Tenant-api JWT validation** checks that the token's `tenantSlug` matches the request's `X-Tenant-ID` header (`TenantTokenGuard`).

Token blacklist: `InMemoryTokenBlacklistService` (dev) or `RedisTokenBlacklistService` (production, with fallback).

### Entity Design

Entities live in `packages/database/src/entities/`:
- `BaseEntity` (abstract): `id`, `createdAt`, `updatedAt`, `deletedAt` (soft delete)
- `BaseUser` (abstract, extends BaseEntity): `username`, `email`, `password`, `role`, `status`, security fields
- `PlatformUser` extends BaseUser (platform DB)
- `TenantUser` extends BaseUser (tenant DBs)
- Complex fields (wallets, stats, config, branding) stored as JSON columns
- Agent entity is self-referential with `path` (e.g., "root/1/5/12") and `level` for tree hierarchy

### NestJS Conventions

- **Global interceptors**: `LoggingInterceptor` (request logging, skips ELB health checks) + `TransformInterceptor` (wraps all responses in `{ success, data, timestamp }` format)
- **Global exception filter**: `HttpExceptionFilter` logs all 4xx (WARN) and 5xx (ERROR) with request body and tenant context
- **Global validation pipe**: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- **Guards**: `JwtAuthGuard` (+ `@Public()` bypass), `TenantAdminGuard`, `AgentGuard`, `TenantAdminOrAgentGuard`, `TenantTokenGuard`
- **Decorators**: `@Public()` skips JWT auth, `@CurrentUser()` extracts request.user
- **Global modules**: `TenantContextModule`, `DatabaseModule` (both `@Global()`)
- **DI for tenant DB**: `@Inject(TENANT_ENTITY_MANAGER)` for REQUEST-scoped EntityManager
- **Health endpoint**: `GET /api/health` (shared `HealthController`, excluded from `TenantContextMiddleware` in tenant-api)
- Swagger documentation available at `/api/docs` endpoint on both APIs

## Frontend Patterns

### Refine Admin Apps (platform-admin, tenant-admin, agent-portal)

Standard structure per app:
```
src/
├── App.tsx           # Refine setup with routes, providers
├── providers/
│   ├── authProvider.tsx   # Refine AuthProvider (uses api-client for auth)
│   └── dataProvider.tsx   # Refine DataProvider (CRUD via api-client)
├── layouts/
│   └── DashboardLayout.tsx
└── pages/              # Resource pages (list, create, edit)
```

**Tenant initialization** (tenant-admin, agent-portal only): On mount, `TenantContext.init(platformApiUrl)` identifies tenant by current domain, then `createTenantApiClient()` configures the API client. The client interceptor auto-injects `X-Tenant-ID` on every request.

**Token storage**: localStorage keys — `platform_access_token`/`platform_refresh_token` or `tenant_access_token`/`tenant_refresh_token`.

### Customer Web (Next.js App Router)

- **Middleware** (`middleware.ts`): Detects tenant from URL path (dev) or custom domain (production), caches tenant config (5-min TTL), injects `x-tenant-slug` and `x-tenant-config` headers
- **Route group** `app/(tenant)/`: All tenant-scoped pages, layout reads headers and wraps with `TenantProvider`
- **Wallet integrations**: `shared/lib/wallets/` contains wallet provider implementations
- **Hooks**: `useTenant()`, `useWallet()`, `useReferral()`, `useApprove()` in `shared/hooks/`

### shadcn/ui Components

All shadcn/ui components must be installed via official CLI, not manually created:

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component-name> --yes --overwrite
```

After installation:
1. Fix import paths — ensure `cn` uses relative paths (`../../lib/utils`)
2. Export new components in `packages/ui/src/index.ts`

The `ui` package also contains Refine-specific wrappers in `src/components/refine-ui/` (layout, buttons, views, data-table) — these use Refine hooks like `useMenu()`, `useNavigation()`.

## Key Domain Concepts

### Agent Hierarchy
- Tree-structure with unlimited depth (uses `path` and `level` for tracking)
- Self-referential `parentAgent` relationship in Agent entity
- Commission calculation with upward profit sharing through the tree

### Revenue Distribution
Three types of financial records:
- `RevenueDistribution`: Tenant revenue sharing
- `CommissionPayout`: Agent commissions
- `SystemFeeDistribution`: Platform fees

### DeFi Integration
- TRON blockchain support (testnet/mainnet) via TronWeb
- USDT token integration (contract addresses in env config)
- Contract execution wallets with encrypted private keys (`ENCRYPTION_KEY` env var)

## Local Development Setup

For local multi-tenant development, use `.test` domain (avoid `.local` which causes DNS delays on macOS):

1. Run `pnpm setup:local` (creates Docker PostgreSQL + `.env` files)
2. Add to `/etc/hosts`: `127.0.0.1 test002.test`
3. Run `pnpm dev:test002`
4. Access tenant admin at `http://test002.test:5174`

Each app has its own `.env.example` — refer to these for required environment variables.

## Deployment (AWS)

**CI/CD**: GitHub Actions (`.github/workflows/`) triggered on `master` and `dev` branches with path filters.

- **Backend APIs**: Docker → ECR → Elastic Beanstalk (ap-southeast-1)
  - `platform-api` → `saas-platform-api-env.eba-vbk5hy2a.ap-southeast-1.elasticbeanstalk.com`
  - `tenant-api` → `saas-tenant-api-env.eba-4kqn5gpn.ap-southeast-1.elasticbeanstalk.com`
- **Frontend Apps**: AWS Amplify (auto-build from GitHub)
  - Each app has its own `amplify.yml` build spec
  - Custom domains configured per-tenant via Amplify domain associations

**EB Environment Notes**:
- `.ebextensions/cloudwatch-logs.config` enables CloudWatch log streaming (included in deploy zip via GitHub Actions)
- Health check path: `/api/health` (configured via EB option settings, NOT reliably set by `.ebextensions` on Docker platform — may need CLI update)
- This AWS account has **Launch Configurations disabled** — only Launch Templates work. Never use `rebuild-environment` if CF stack is broken; use terminate + create-environment instead
- New EB environments need: HTTPS listener (port 443 with ACM cert) + ALB SG port 443 inbound + RDS SG inbound rule for EB instance SG (TCP 5432)
- AWS CLI profile: `cn`, region: `ap-southeast-1`

**Domain routing** (production): Tenants get custom domains pointing to Amplify CloudFront distributions. DNS managed in Route 53. Tenant `customDomain` (admin panel) and `customUrl` (customer site) stored in both `saas_platform.tenants` and per-tenant `tenant_config` tables.

## Documentation

Key design documents in `/docs`:
- `AUTH_ARCHITECTURE.md` — Authentication system design
- `COMMISSION_MECHANISM_FINAL.md` — Commission calculation logic
- `DATABASE_ER_DIAGRAM.md` — Entity relationship diagrams
- `MULTI_SITE_ARCHITECTURE_FINAL.md` — Multi-site design
- `DEPLOYMENT_ARCHITECTURE_CLARIFICATION.md` — Deployment strategy
- `REVENUE_SHARING_CALCULATION_EXAMPLE.md` — Financial calculation examples
- `DATABASE_MIGRATION_GUIDE.md` — Migration workflow
- `QUICK_START_LOCAL.md` — Quick start guide
- `SYSTEM_WALLET_SYNC_STRATEGY.md` — Wallet sync design
