# create-vrn

CLI scaffolding tool to generate production-ready SaaS monorepo projects. Opinionated stack with Bun, Elysia, React 19, TanStack Router, Drizzle ORM, and Tailwind CSS 4.

## Usage

```bash
bun create vrn
# or
npx create-vrn
```

No flags needed — the CLI will guide you through interactive prompts.

## CLI Commands

| Command | Description |
|---------|-------------|
| `bun create vrn [name]` | Create a new project |
| `bunx vrn gen [service\|portal\|backoffice]` | Add an app to an existing project |
| `bunx vrn link <source> <target>` | Link two services together |
| `bunx vrn doctor` | Check system requirements |

## What Gets Generated

### App Types

| Type | What you get |
|------|-------------|
| **Service** | API backend + database + typed client package |
| **Portal** | React frontend for end users |
| **Backoffice** | React admin dashboard |

You can mix and match — add any combination of apps to a single monorepo.

### Stack

**Service (Elysia — TypeScript)**
- [Elysia.js](https://elysiajs.com) — lightweight HTTP framework for Bun
- PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)
- Auto-generated TypeScript API client via `@elysiajs/eden`

**Service (Litestar — Python)**
- [Litestar](https://litestar.dev) — async Python web framework
- PostgreSQL + SQLAlchemy
- Managed with [uv](https://docs.astral.sh/uv/)

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

Two authentication modes to choose from:

- **Zitadel** — OIDC-based, enterprise-grade identity provider
- **Local auth** — self-hosted email/password authentication

## Requirements

- Bun 1.3.10+
- Node 20+
- Docker (for PostgreSQL and other services)
- Python 3.12+ + [uv](https://docs.astral.sh/uv/) _(only if using Litestar services)_
- [Moonrepo](https://moonrepo.dev) + [Proto](https://moonrepo.dev/proto)

Run `bunx vrn doctor` to verify your environment.

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
│   ├── {name}-service/          # Elysia or Litestar backend
│   ├── portal-{name}/           # End-user frontend
│   └── backoffice-{name}/       # Admin dashboard
├── packages/
│   ├── ui/                      # Shared UI components
│   ├── {name}-service-client/   # Generated service client
│   └── db-{name}/               # Drizzle schema & client
├── docker-compose.yml
├── vrn.yaml                     # Project manifest
└── .moon/                       # Moon workspace config
```

## Adding Apps Later

```bash
# add a new service
bunx vrn gen service

# add a portal
bunx vrn gen portal

# add a backoffice
bunx vrn gen backoffice

# link two services so one can call the other
bunx vrn link payments users
```
