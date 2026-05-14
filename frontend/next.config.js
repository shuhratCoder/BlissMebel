/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend =
      process.env.BACKEND_API_URL ?? 'http://192.168.8.222:3008'
    return [
      {
        source: '/mebel/:path*',
        destination: `${backend}/mebel/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
