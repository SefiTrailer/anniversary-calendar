/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure we can handle Hebrew text and CORS for iCal feeds
  async headers() {
    return [
      {
        source: '/api/calendar/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Content-Type', value: 'text/calendar; charset=utf-8' },
        ],
      },
    ];
  },
};

export default nextConfig;
