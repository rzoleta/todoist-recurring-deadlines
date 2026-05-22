FROM oven/bun:1.3.9

WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY README.md ./README.md

CMD ["bun", "run", "src/cli/index.ts"]
