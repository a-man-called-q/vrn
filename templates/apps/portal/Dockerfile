FROM oven/bun:1-alpine AS builder
WORKDIR /workspace

# Install workspace deps (monorepo-aware)
COPY package.json bun.lock ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/{{dashCase apiSource}}-service-client/package.json ./packages/{{dashCase apiSource}}-service-client/
{{#if (eq serviceFramework "elysia")}}
COPY apps/{{dashCase apiSource}}-service/package.json ./apps/{{dashCase apiSource}}-service/
{{/if}}
COPY apps/portal-{{dashCase name}}/package.json ./apps/portal-{{dashCase name}}/
RUN bun install

# Copy source
COPY packages/ui/ ./packages/ui/
COPY packages/{{dashCase apiSource}}-service-client/ ./packages/{{dashCase apiSource}}-service-client/
{{#if (eq serviceFramework "elysia")}}
COPY apps/{{dashCase apiSource}}-service/src/ ./apps/{{dashCase apiSource}}-service/src/
COPY apps/{{dashCase apiSource}}-service/tsconfig.json ./apps/{{dashCase apiSource}}-service/
{{/if}}
COPY apps/portal-{{dashCase name}}/ ./apps/portal-{{dashCase name}}/

# Build
WORKDIR /workspace/apps/portal-{{dashCase name}}
RUN bun run build

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /workspace/apps/portal-{{dashCase name}}/.output ./.output
EXPOSE {{portalPort}}
CMD ["bun", "run", ".output/server/index.mjs"]
