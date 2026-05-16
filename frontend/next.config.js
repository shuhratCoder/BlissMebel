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
      {
        // Proxy to notify.eskiz.uz to bypass browser CORS.
        // Server-to-server requests don't need CORS headers.
        source: '/eskiz/:path*',
        destination: 'https://notify.eskiz.uz/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
