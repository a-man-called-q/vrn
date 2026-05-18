FROM oven/bun:1-alpine AS builder
WORKDIR /workspace

COPY package.json bun.lock ./
COPY apps/{{dashCase name}}-service/package.json ./apps/{{dashCase name}}-service/
RUN bun install --frozen-lockfile

COPY apps/{{dashCase name}}-service/src ./apps/{{dashCase name}}-service/src

WORKDIR /workspace/apps/{{dashCase name}}-service
RUN bun build src/index.ts --outdir .output --target bun

FROM oven/bun:1-alpine
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app
WORKDIR /app
COPY --from=builder /workspace/apps/{{dashCase name}}-service/.output ./
USER app
EXPOSE {{apiPort}}
CMD ["bun", "run", "index.js"]
