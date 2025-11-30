/**
 * Next.js 基础配置
 * 如需自定义 headers/rewrites，可按需扩展。
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: false,
  experimental: {
    typedRoutes: true
  },
  eslint: {
    // 构建时忽略 ESLint 警告（仅用于开发阶段快速验证）
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
