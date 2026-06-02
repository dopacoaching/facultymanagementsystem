const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../'),
  images: { remotePatterns: [] },
  experimental: {},

  webpack(config, { isServer }) {
    // Bump cache version to bypass any stale Vercel build cache
    if (config.cache && typeof config.cache === 'object') {
      config.cache.version = `v2-${isServer ? 'server' : 'client'}`
    }
    return config
  },
}

module.exports = nextConfig
