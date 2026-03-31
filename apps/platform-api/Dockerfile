# --------------------------------------------------
# Stage 1: Install dependencies & build
# --------------------------------------------------
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ && \
    corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package manifests first for better Docker layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/platform-api/package.json ./apps/platform-api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/platform-api/ ./apps/platform-api/
COPY apps/tenant-api/src/migrations/ ./apps/tenant-api/src/migrations/
COPY packages/ ./packages/

# Build (nest build compiles app + referenced workspace packages into dist/)
RUN pnpm --filter @saas-platform/platform-api build

# Transpile tenant-api migrations TS→JS (production has no ts-node)
# Locate typescript via pnpm's store, then use transpileModule (no type-checking)
RUN TS_LIB=$(find /app/node_modules -path "*/typescript/lib/typescript.js" | head -1) && \
    node -e " \
      const ts = require('$TS_LIB'.replace('/lib/typescript.js','')); \
      const fs = require('fs'); const path = require('path'); \
      const dir = 'apps/tenant-api/src/migrations'; \
      fs.readdirSync(dir).filter(f => f.endsWith('.ts')).forEach(f => { \
        const src = fs.readFileSync(path.join(dir, f), 'utf8'); \
        const out = ts.transpileModule(src, { compilerOptions: { \
          target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true \
        }}).outputText; \
        fs.writeFileSync(path.join(dir, f.replace('.ts', '.js')), out); \
        console.log('Compiled:', f); \
      });" && \
    rm -f apps/tenant-api/src/migrations/*.ts

# nest build outputs to dist/ with structure:
#   dist/apps/platform-api/src/  (compiled app)
#   dist/packages/*/src/         (compiled workspace packages)
# But compiled JS still has require("@saas-platform/auth") etc.
# Create symlinks so Node.js module resolution finds the compiled JS.
RUN mkdir -p apps/platform-api/dist/node_modules/@saas-platform && \
    for pkg in auth database shared shared-types utils; do \
      ln -sf ../../packages/$pkg/src apps/platform-api/dist/node_modules/@saas-platform/$pkg; \
    done

# --------------------------------------------------
# Stage 2: Production image
# --------------------------------------------------
FROM node:20-alpine

RUN apk add --no-cache python3 make g++ && \
    corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package manifests for production dependency installation
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/platform-api/package.json ./apps/platform-api/
COPY --from=builder /app/packages/auth/package.json ./packages/auth/
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/packages/utils/package.json ./packages/utils/
COPY --from=builder /app/packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile --prod && \
    apk del python3 make g++

# Copy built artifacts (includes compiled app + packages + symlinks)
COPY --from=builder /app/apps/platform-api/dist ./apps/platform-api/dist

# Copy tenant-api migration files (needed by TenantMigrationService to init new tenant DBs)
# Path must match: path.resolve(__dirname, "../../../../../", "apps/tenant-api/src/migrations")
# where __dirname at runtime = /app/apps/platform-api/dist/apps/platform-api/src/modules/tenants/
# resolves to: /app/apps/platform-api/dist/apps/tenant-api/src/migrations
COPY --from=builder /app/apps/tenant-api/src/migrations ./apps/platform-api/dist/apps/tenant-api/src/migrations

# Remove pnpm's workspace symlinks (point to TypeScript source).
# Our dist/node_modules/@saas-platform/* symlinks (point to compiled JS) take over.
RUN rm -rf apps/platform-api/node_modules/@saas-platform

WORKDIR /app/apps/platform-api
EXPOSE 3000

# Allow compiled workspace packages in dist/ to resolve transitive dependencies
# from pnpm's virtual store (e.g. jsonwebtoken required by @saas-platform/auth)
ENV NODE_PATH=/app/node_modules/.pnpm/node_modules

CMD ["node", "dist/apps/platform-api/src/main.js"]
