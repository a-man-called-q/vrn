FROM oven/bun:1-alpine AS builder
WORKDIR /workspace

# Install workspace deps (monorepo-aware)
COPY package.json bun.lock ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/api-client-{{dashCase name}}/package.json ./packages/api-client-{{dashCase name}}/
COPY apps/api-{{dashCase name}}/package.json ./apps/api-{{dashCase name}}/
COPY apps/portal-{{dashCase name}}/package.json ./apps/portal-{{dashCase name}}/
RUN bun install

# Copy source
COPY packages/ui/ ./packages/ui/
COPY packages/api-client-{{dashCase name}}/ ./packages/api-client-{{dashCase name}}/
COPY apps/api-{{dashCase name}}/src/ ./apps/api-{{dashCase name}}/src/
COPY apps/api-{{dashCase name}}/tsconfig.json ./apps/api-{{dashCase name}}/
COPY apps/portal-{{dashCase name}}/ ./apps/portal-{{dashCase name}}/

# Build
WORKDIR /workspace/apps/portal-{{dashCase name}}
RUN bun run build

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /workspace/apps/portal-{{dashCase name}}/.output ./.output
EXPOSE {{portalPort}}
CMD ["bun", "run", ".output/server/index.mjs"]
