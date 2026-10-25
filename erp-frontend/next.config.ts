import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // بیلد با خطای TypeScript یا ESLint متوقف می‌شود تا خطاها پنهان نمانند
  reactStrictMode: false,
  
  // تنظیم Rewrites برای مواقعی که از داخل کانتینر SSR انجام می‌شود
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://backend:5000'}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;