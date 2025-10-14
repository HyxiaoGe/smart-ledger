/**
 * Next.js 基础配置
 * 如需自定义 headers/rewrites，可按需扩展。
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: false,
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
