/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [
            {
              type: 'query',
              key: 'rewrite',
              value: 'true',
            },
          ],
          destination: '/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
  // Ensure proper handling of static files
  images: {
    domains: ['mockello.com'],
  },
}

module.exports = nextConfig
