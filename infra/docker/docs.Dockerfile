# Astro static-site build image. Produces a static dist and serves via nginx.
# Phase 0: plain Starlight site with sample course.

FROM node:22-alpine AS builder

RUN corepack enable pnpm

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* /app/
COPY turbo.json tsconfig.base.json /app/
COPY apps/docs/package.json /app/apps/docs/
COPY packages/components/package.json /app/packages/components/
COPY packages/config/package.json /app/packages/config/
COPY packages/packagers/package.json /app/packages/packagers/
COPY packages/tracker/package.json /app/packages/tracker/

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile=false

# Copy source
COPY apps/docs /app/apps/docs
COPY packages /app/packages
COPY biome.json /app/biome.json

# Build workspace deps first so apps/docs's astro check can resolve the
# `dist/` outputs of @lernkit/components / @lernkit/tracker / @lernkit/packagers.
RUN pnpm --filter=@lernkit/components --filter=@lernkit/tracker --filter=@lernkit/packagers build

# Build the docs app
RUN pnpm --filter=@lernkit/docs build


# --- runtime stage ---
FROM nginx:1.29-alpine AS runtime

COPY --from=builder /app/apps/docs/dist /usr/share/nginx/html

# A minimal nginx config with sensible defaults for a static site.
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost/ || exit 1
