// Skill content — long-form instructions returned by `vrn skill <name>`
// and the `get_skill` MCP tool. Pure data, kept separate from the entry
// so callers can import the registry without pulling in render code.

export const SKILLS: Record<string, string> = {
  "add-route": `
Read the paths from the \`vrn context\` output injected above, then follow the correct path.

### Elysia service
1. Create or update the route file in the routes dir shown in vrn context
   - Export a \`new Elysia({ prefix: '/{feature}' })\` instance
   - Add \`.get / .post / .put / .delete\` handlers with typed body/params
   - For protected routes: import the guard from \`lib/auth.ts\` and chain \`.use(guard)\` before the handler
2. Open the entry file and mount: \`app.use({feature}Routes)\`
3. The Eden client in the service-client package auto-reflects changes — no manual update needed

### Litestar service
1. Create or update the route file in the routes dir shown in vrn context
   - Define a \`Router\` with the path prefix
   - Decorate handlers with \`@get\`, \`@post\`, \`@put\`, \`@delete\`
   - For protected routes: use the guard from \`auth.py\` as a \`dependencies\` argument
2. Open \`main.py\` and add the router to \`route_handlers\`

### Auth modes
- **local**: guard checks a signed session cookie — use \`authGuard\` middleware
- **zitadel**: guard validates a JWT via JWKS — use \`zitadelGuard\` middleware
`.trim(),

  "add-page": `
Read the paths from the \`vrn context\` output injected above, then place files in the pages dir.

### TanStack Router file naming
| File | Route |
|---|---|
| \`index.tsx\` | \`/\` |
| \`about.tsx\` | \`/about\` |
| \`users/index.tsx\` | \`/users\` |
| \`users/$id.tsx\` | \`/users/:id\` |
| \`users/$id.edit.tsx\` | \`/users/:id/edit\` |
| \`_auth/dashboard.tsx\` | \`/dashboard\` (behind auth guard) |

\`__root.tsx\` is the root layout — do not recreate it.

### Adding a public page
1. Create the file using the naming rules above
2. Export a Route using \`createFileRoute('/<path>')\`
3. Export a default React component as the page content

### Adding a protected page
Place the file under \`_auth/\` — it inherits the auth guard automatically.
Use \`useRouteContext()\` to access the current user if needed.

### Calling an API
Use the api client listed in vrn context for this app.
The client is fully typed via Eden — no manual type definitions needed.

### Backoffice extras
TanStack Table, ECharts, dnd-kit, Sonner toasts, Zod — use these before reaching for external packages.
`.trim(),

  "add-model": `
Read the paths from the \`vrn context\` output injected above, then follow the correct path.

### Elysia + Drizzle
1. Open the db schema file shown in vrn context
2. Add the table:
   \`\`\`ts
   export const products = pgTable('products', {
     id: uuid('id').primaryKey().defaultRandom(),
     name: text('name').notNull(),
     createdAt: timestamp('created_at').defaultNow().notNull(),
   })
   \`\`\`
3. Add relations with \`relations()\` in the same file if needed
4. Generate and run the migration:
   \`\`\`bash
   cd packages/db-{name}
   bun run db:generate
   bun run db:migrate
   \`\`\`
5. Import the table in route files from the db package shown in vrn context

### Litestar + SQLAlchemy
1. Create a new model file in the models dir shown in vrn context
2. Define the model:
   \`\`\`python
   from .base import Base
   class Product(Base):
       __tablename__ = "products"
       id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
       name: Mapped[str] = mapped_column(String(255), nullable=False)
   \`\`\`
3. Import the model in \`models/__init__.py\`
4. Generate and apply migration:
   \`\`\`bash
   uv run alembic revision --autogenerate -m "add {model}"
   uv run alembic upgrade head
   \`\`\`
`.trim(),

  "add-env-var": `
Adding an env var touches multiple files. Read vrn context above to know which apps exist, then update all of them.

### Files to update
1. **\`.env.example\`** (project root) — add the var with a placeholder value and a comment explaining what it's for
2. **\`docker-compose.yml\`** — add it under the relevant service's \`environment:\` block
3. **Service config / types** (framework-specific):
   - Elysia: add to \`apps/{service}/src/config.ts\` or wherever env vars are typed/validated
   - Litestar: add to \`apps/{service}/src/config.py\` (Settings class)
4. **\`.env\`** (local dev, if it exists) — add with a real dev value; this file is gitignored

### Rules
- Never hardcode secrets — always reference \`process.env.VAR\` (TS) or \`settings.VAR\` (Python)
- Add a comment on the var explaining its purpose
- If the var is required (no default), make the app fail fast on startup when it's missing
`.trim(),

  "link-services": `
Read vrn context above to confirm both services exist, then use the \`link_apps\` MCP tool.
After linking, use the typed client in the source service:

### Elysia source
\`\`\`ts
import { treaty } from '@elysiajs/eden'
import type { App } from '@workspace/{target}-service-client'

const client = treaty<App>('http://localhost:{target-port}')
const { data, error } = await client.users({ id: userId }).get()
\`\`\`

### Litestar source
\`\`\`python
import httpx
async with httpx.AsyncClient(base_url="http://localhost:{target-port}") as client:
    response = await client.get(f"/users/{user_id}")
\`\`\`

The target port is listed in vrn context. The target service URL should come from an env var in production — check \`.env.example\` for the variable name.
`.trim(),
}
