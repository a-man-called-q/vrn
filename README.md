# create-vrn

CLI scaffolding tool to generate production-ready SaaS monorepo projects. Opinionated stack with Bun, Elysia, React 19, TanStack Router, Drizzle ORM, and Tailwind CSS 4.

## Usage

```bash
bun create vrn
# or
npx create-vrn
```

No flags needed — the CLI will guide you through interactive prompts.

## What Gets Generated

### Generation Types

| Type | What you get |
|------|-------------|
| **Full Suite** | Service + Database + Portal + Backoffice |
| **Service Only** | Service + Database + typed client |
| **Portal Only** | React frontend for end users |
| **Backoffice Only** | React admin dashboard |

### Stack

**Service**
- [Elysia.js](https://elysiajs.com) — lightweight HTTP framework for Bun
- PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)
- Auto-generated TypeScript API client via `@elysiajs/eden`

**Frontend (Portal & Backoffice)**
- React 19 + [TanStack Router](https://tanstack.com/router) + [TanStack Start](https://tanstack.com/start)
- Tailwind CSS 4 + Vite 7 + Nitro server
- Backoffice extras: ECharts, TanStack Table, dnd-kit, Sonner, Zod

**Shared**
- `@workspace/ui` — shared component library
- `@workspace/{name}-service-client` — typed service client
- `@workspace/db-{name}` — database schema & client

**Monorepo Tooling**
- [Moon](https://moonrepo.dev) — task runner & workspace orchestrator
- [Biome](https://biomejs.dev) — linting & formatting
- Bun workspaces

## Authentication

Two providers to choose from:

- **Zitadel** — OIDC-based, enterprise-grade, with Redis session caching
- **Better Auth** — self-hosted email/password authentication

## Requirements

- Bun 1.3.10+
- Node 20+
- Docker (for PostgreSQL and other services)

## After Scaffolding

```bash
cd your-project

# install dependencies
bun install

# start all services
bun dev

# build for production
bun build
```

Docker Compose is included with pre-configured services for PostgreSQL, the Service, Portal, and Backoffice — along with Zitadel if you chose that auth provider.

## Project Structure

```
your-project/
├── apps/
│   ├── {name}-service/          # Elysia backend
│   ├── portal-{name}/       # End-user frontend
│   └── backoffice-{name}/   # Admin dashboard
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── {name}-service-client/   # Generated service client
│   └── db-{name}/           # Drizzle schema & client
├── docker-compose.yml
└── .moon/                   # Moon workspace config
```
