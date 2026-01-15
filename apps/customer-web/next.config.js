/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@saas-platform/ui', '@saas-platform/theme'],
  env: {
    PLATFORM_API_URL: process.env.PLATFORM_API_URL || 'http://localhost:3000',
    TENANT_API_URL: process.env.TENANT_API_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
