# syntax=docker/dockerfile:1
#
# workers/web — the Phase 7 Playwright/BullMQ consumer, built for Railway.
#
# Two stages:
#   1. build   — a plain Node/Debian image with the full pnpm workspace,
#                which bundles workers/web (and every @qavio/* workspace
#                package it imports) into one self-contained CommonJS file.
#   2. runtime — Microsoft's official Playwright image, version-matched to
#                the exact `playwright` version below, with Chromium and
#                every OS/font dependency it needs already baked in.
#
# Build context MUST be the repository root — pnpm needs to see every
# workspace package.json to resolve the dependency graph, even though this
# Dockerfile lives under workers/web/. On Railway: Root Directory = repo
# root, Dockerfile Path = workers/web/Dockerfile.
#
# Why bundle instead of just `tsc`: every @qavio/* package (config, types,
# database, queue) ships raw TypeScript as its package.json "main" — there
# is no dist/ for any of them. That's fine for apps/web (Next.js's own
# bundler resolves .ts directly) and for local dev (`tsx watch` does the
# same), but a plain `tsc`-compiled dist/index.js run with plain `node`
# cannot resolve those workspace imports at all (confirmed: it throws
# ERR_UNSUPPORTED_DIR_IMPORT trying to `require` a workspace package's
# source directly). esbuild inlines all first-party (@qavio/*) source into
# one file, so the runtime stage never needs the workspace's node_modules
# or its symlinks — only `playwright` itself stays external, since it
# resolves its own driver/browser paths relative to its package directory
# and cannot be bundled.

# ---- 1. build -----------------------------------------------------------
FROM node:20-bookworm-slim AS build

# This stage never launches a browser — skip Playwright's postinstall
# download here; the runtime stage's base image already has the matching
# Chromium build baked in.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN corepack enable

WORKDIR /repo

# Needs the whole workspace (every package.json + the lockfile), not just
# workers/web — pnpm resolves the full dependency graph before installing
# anything. .dockerignore keeps this from also pulling in node_modules,
# .git, dist/, .env*, etc.
COPY . .

RUN corepack prepare pnpm@9.15.0 --activate \
  && pnpm install --frozen-lockfile

RUN pnpm --filter @qavio/worker-web build

# ---- 2. runtime -----------------------------------------------------------
# Pinned to match workers/web/package.json's `playwright` version exactly
# (currently 1.56.0). Playwright's own compatibility guarantee is between
# the npm package version and this image tag — bump both together on any
# future Playwright upgrade, never independently.
FROM mcr.microsoft.com/playwright:v1.56.0-noble AS runtime

ENV NODE_ENV=production
# Documents the dependency explicitly rather than relying on the base
# image's own default (which already points here).
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# The `playwright` package installed below is for its Node API only — the
# browser binary it needs is already baked into this image.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

# The bundle already inlined every @qavio/* workspace package — this is
# the only build artifact the runtime image needs.
COPY --from=build /repo/workers/web/dist ./dist

# `playwright` is the one dependency esbuild left external (see the build
# stage's comment above), so it's installed fresh here rather than copied
# out of the build stage's pnpm store (whose isolated node_modules layout
# is symlink-based and not reliably `COPY --from`-safe).
RUN echo '{"name":"qavio-worker-web-runtime","private":true}' > package.json \
  && npm install --no-save playwright@1.56.0

# tini reaps the zombie processes a killed/crashed Chromium leaves behind
# and forwards signals (the SIGTERM Railway sends on stop/redeploy)
# directly to the worker process — worker.ts's own SIGTERM/SIGINT handler
# then closes the BullMQ Worker (which waits for any in-flight job, and
# that job's own `withBrowserContext` finally-block, before exiting) —
# see docs/test-run-engine.md's Cancellation section.
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/*

# No EXPOSE: this is a BullMQ consumer, not an HTTP service — see
# docs/railway-deployment.md's "Health / public networking" section for
# why a public domain and health endpoint are both deliberately omitted.

# Deliberately no USER switch: Chromium's own sandbox needs either
# additional Linux capabilities Railway does not expose to a deployed
# container, or the `--no-sandbox` launch flag (which would mean changing
# browser-manager.ts's already-tested launch options solely for this
# environment) to run as a non-root user. Running as the image's default
# (root) is the officially documented default for this Playwright image
# and was verified locally (see docs/railway-deployment.md) — the
# container itself, not an in-container user boundary, is the isolation
# unit here.
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]
