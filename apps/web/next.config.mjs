/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@qavio/ui', '@qavio/types', '@qavio/database', '@qavio/integrations'],
};

export default nextConfig;
