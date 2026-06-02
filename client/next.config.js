const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../'),
  images: { remotePatterns: [] },
  experimental: {},

  // Security headers for all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control',     value: 'on' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },

  // Extend serverless timeout for complex salary calculation routes
  // (Vercel default is 10s; multi-DB-round-trip routes may need more)
  // Note: free plan is capped at 10s; upgrade to increase
  webpack(config, { isServer }) {
    if (config.cache && typeof config.cache === 'object') {
      config.cache.version = `v2-${isServer ? 'server' : 'client'}`
    }
    return config
  },
}

module.exports = nextConfig
