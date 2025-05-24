import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Temporarily disabled for diagnostics
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        port: '',
        pathname: '/random/**',
      },
    ],
  },
};

export default nextConfig;
