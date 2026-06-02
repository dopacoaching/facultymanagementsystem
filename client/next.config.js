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
    const clientModules = path.join(__dirname, 'node_modules')
    config.resolve.alias = {
      ...config.resolve.alias,
      '@server': path.join(__dirname, '../server/src'),
      // Server files live outside client/ and have no local node_modules on
      // Vercel. Explicit aliases take highest webpack priority and resolve
      // every package those files import to client/node_modules.
      'mongoose':     path.join(clientModules, 'mongoose'),
      'jsonwebtoken': path.join(clientModules, 'jsonwebtoken'),
      'bcryptjs':     path.join(clientModules, 'bcryptjs'),
      'zod':          path.join(clientModules, 'zod'),
    }
    return config
  },
}

module.exports = nextConfig
