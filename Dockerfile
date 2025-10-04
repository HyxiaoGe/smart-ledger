# 生产镜像构建（多阶段，包含构建与运行时）

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json
COPY next.config.mjs ./next.config.mjs
COPY .next ./.next
COPY public ./public
CMD ["npm", "run", "start"]

