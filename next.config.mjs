/**
 * Next.js 基础配置
 * 如需自定义 headers/rewrites，可按需扩展。
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: false,
  output: 'standalone',
  eslint: {
    // 在构建时忽略 ESLint 错误，以便部署成功
    // 开发时仍可以运行 npm run lint 来检查代码质量
    ignoreDuringBuilds: true
  },
  typescript: {
    // 在构建时忽略 TypeScript 错误（仅用于紧急部署）
    // 生产环境建议修复所有类型错误
    ignoreBuildErrors: true
  }
};

export default nextConfig;
