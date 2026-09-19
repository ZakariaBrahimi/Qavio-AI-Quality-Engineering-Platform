/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@qavio/ui', '@qavio/types', '@qavio/database', '@qavio/integrations', '@qavio/queue'],
  experimental: {
    // BullMQ (imported only by server-only code — src/lib/queue.ts, Server
    // Actions) has an optional dependency, @valkey/valkey-glide, that isn't
    // installed since this app uses BullMQ's default ioredis backend.
    // Bundling bullmq into the webpack server build makes it try to
    // statically resolve that optional require and warn "module not
    // found" — harmless (bullmq handles the missing module at runtime),
    // but excluding it from bundling avoids the warning and lets Node
    // resolve it (and ioredis) natively instead.
    serverComponentsExternalPackages: ['bullmq'],
  },
};

export default nextConfig;
