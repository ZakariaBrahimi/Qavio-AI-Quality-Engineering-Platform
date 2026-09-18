/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@qavio/ui', '@qavio/types', '@qavio/database'],
};

export default nextConfig;
