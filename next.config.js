/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'www.clio.com',
      'www.mycase.com',
      'www.lawpay.com',
      'oaidalleapicontent.blob.core.windows.net'
    ],
  },
  experimental: {
    serverActions: true,
  },
  env: {
    VERCEL_ENV: process.env.VERCEL_ENV || 'development',
  },
  // Combine ESLint settings here instead of separate file
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src'],
  },
  // PostCSS config
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  }
}

module.exports = nextConfig 