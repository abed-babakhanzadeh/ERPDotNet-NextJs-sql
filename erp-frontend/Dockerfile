# erp-frontend/Dockerfile

# استفاده از نود جی‌اس نسخه LTS
FROM node:20-alpine AS base

# مرحله وابستگی‌ها
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# مرحله بیلد
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# غیرفعال کردن تله‌متری نکست برای سرعت بیشتر
ENV NEXT_TELEMETRY_DISABLED 1

# بیلد کردن پروژه
RUN npm run build

# مرحله اجرا (Production)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# کپی فایل‌های ساخته شده
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]