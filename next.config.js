/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/:path*',
      },
    ]
  },
  // Ensure proper handling of static files
  images: {
    domains: ['mockello.com'],
  },
}

module.exports = nextConfig
