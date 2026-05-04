FROM oven/bun:1-alpine AS builder
WORKDIR /workspace

# Install workspace deps (monorepo-aware)
COPY package.json bun.lock ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/{{dashCase name}}-service-client/package.json ./packages/{{dashCase name}}-service-client/
COPY apps/{{dashCase name}}-service/package.json ./apps/{{dashCase name}}-service/
COPY apps/portal-{{dashCase name}}/package.json ./apps/portal-{{dashCase name}}/
RUN bun install

# Copy source
COPY packages/ui/ ./packages/ui/
COPY packages/{{dashCase name}}-service-client/ ./packages/{{dashCase name}}-service-client/
COPY apps/{{dashCase name}}-service/src/ ./apps/{{dashCase name}}-service/src/
COPY apps/{{dashCase name}}-service/tsconfig.json ./apps/{{dashCase name}}-service/
COPY apps/portal-{{dashCase name}}/ ./apps/portal-{{dashCase name}}/

# Build
WORKDIR /workspace/apps/portal-{{dashCase name}}
RUN bun run build

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /workspace/apps/portal-{{dashCase name}}/.output ./.output
EXPOSE {{portalPort}}
CMD ["bun", "run", ".output/server/index.mjs"]
