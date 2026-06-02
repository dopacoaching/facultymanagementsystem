const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../'),

  // Allow images from any HTTPS origin (adjust in production to specific domains)
  images: {
    remotePatterns: [],
  },

  // Silence the "missing suspense boundary" hydration warning in development.
  // Remove this once all data-fetching components have proper Suspense wrappers.
  experimental: {},

  // Webpack alias so that @server/* resolves from the monorepo server/src/ directory.
  // This is needed because Next.js only auto-resolves paths inside the project root.
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@server': path.join(__dirname, '../server/src'),
    }
    // Server source files (imported via @server/*) live outside client/ and
    // have no local node_modules. Point webpack at client/node_modules so that
    // imports like 'mongoose', 'jsonwebtoken', etc. inside server/src/ resolve.
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      'node_modules',
    ]
    return config
  },
}

module.exports = nextConfig
