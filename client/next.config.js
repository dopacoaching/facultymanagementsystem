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
}

module.exports = nextConfig
