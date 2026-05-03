FROM oven/bun:1-alpine AS builder
WORKDIR /workspace

# Install workspace deps (monorepo-aware)
COPY package.json bun.lock ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/api-client-{{dashCase name}}/package.json ./packages/api-client-{{dashCase name}}/
COPY apps/api-{{dashCase name}}/package.json ./apps/api-{{dashCase name}}/
COPY apps/backoffice-{{dashCase name}}/package.json ./apps/backoffice-{{dashCase name}}/
RUN bun install

# Copy source
COPY packages/ui/ ./packages/ui/
COPY packages/api-client-{{dashCase name}}/ ./packages/api-client-{{dashCase name}}/
COPY apps/api-{{dashCase name}}/src/ ./apps/api-{{dashCase name}}/src/
COPY apps/api-{{dashCase name}}/tsconfig.json ./apps/api-{{dashCase name}}/
COPY apps/backoffice-{{dashCase name}}/ ./apps/backoffice-{{dashCase name}}/

# Build
WORKDIR /workspace/apps/backoffice-{{dashCase name}}
RUN bun run build

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /workspace/apps/backoffice-{{dashCase name}}/.output ./.output
EXPOSE {{backofficePort}}
CMD ["bun", "run", ".output/server/index.mjs"]
