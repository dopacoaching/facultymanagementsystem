const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../'),
  images: { remotePatterns: [] },
  experimental: {},
}

module.exports = nextConfig
