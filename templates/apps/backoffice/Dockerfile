FROM oven/bun:1-alpine AS builder
WORKDIR /workspace

# Install workspace deps (monorepo-aware)
COPY package.json bun.lock ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/{{dashCase name}}-service-client/package.json ./packages/{{dashCase name}}-service-client/
COPY apps/{{dashCase name}}-service/package.json ./apps/{{dashCase name}}-service/
COPY apps/backoffice-{{dashCase name}}/package.json ./apps/backoffice-{{dashCase name}}/
RUN bun install

# Copy source
COPY packages/ui/ ./packages/ui/
COPY packages/{{dashCase name}}-service-client/ ./packages/{{dashCase name}}-service-client/
COPY apps/{{dashCase name}}-service/src/ ./apps/{{dashCase name}}-service/src/
COPY apps/{{dashCase name}}-service/tsconfig.json ./apps/{{dashCase name}}-service/
COPY apps/backoffice-{{dashCase name}}/ ./apps/backoffice-{{dashCase name}}/

# Build
WORKDIR /workspace/apps/backoffice-{{dashCase name}}
RUN bun run build

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /workspace/apps/backoffice-{{dashCase name}}/.output ./.output
EXPOSE {{backofficePort}}
CMD ["bun", "run", ".output/server/index.mjs"]
