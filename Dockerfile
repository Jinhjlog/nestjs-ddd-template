# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# bcrypt 네이티브 빌드에 필요한 패키지
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

# ============================================
# Stage 2: Build application
# ============================================
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client 생성 (output: ../generated/prisma → /app/generated/prisma)
RUN npx prisma generate

# NestJS 빌드
RUN npm run build

# 프로덕션 의존성만 재설치
RUN apk add --no-cache python3 make g++ \
    && npm ci --omit=dev \
    && npx prisma generate \
    && npm cache clean --force \
    && apk del python3 make g++

# ============================================
# Stage 3: Production runtime
# ============================================
FROM node:22-alpine AS production

# dumb-init: PID 1 시그널 핸들링 (Graceful Shutdown)
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
WORKDIR /app

# 빌드 결과물만 복사
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/generated ./generated
COPY --chown=node:node --from=build /app/package.json ./

# Prisma 마이그레이션 파일 + 설정 (prisma migrate deploy 용)
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node --from=build /app/prisma.config.ts ./

# 비루트 사용자 실행
USER node

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
