FROM node:22.23.2-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run prisma:generate && npm run build && npm prune --omit=dev --ignore-scripts

FROM node:22.23.2-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN mkdir -p storage && chown node:node storage
USER node
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
