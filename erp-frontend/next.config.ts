import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // در پروداکشن برای جلوگیری از توقف بیلد
  },
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