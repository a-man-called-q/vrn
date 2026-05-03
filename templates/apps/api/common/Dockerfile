FROM oven/bun:1-alpine AS builder
WORKDIR /workspace

COPY package.json bun.lock ./
COPY apps/api-{{dashCase name}}/package.json ./apps/api-{{dashCase name}}/
RUN bun install

COPY apps/api-{{dashCase name}}/src ./apps/api-{{dashCase name}}/src

WORKDIR /workspace/apps/api-{{dashCase name}}
RUN bun build src/index.ts --outdir .output --target bun

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /workspace/apps/api-{{dashCase name}}/.output ./
EXPOSE {{apiPort}}
CMD ["bun", "run", "index.js"]
