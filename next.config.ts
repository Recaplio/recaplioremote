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
  // Removed webpack configuration for WASM
  // webpack: (config, { isServer }) => {
  //   config.experiments = {
  //     ...config.experiments,
  //     asyncWebAssembly: true,
  //     layers: true,
  //   };

  //   config.output.webassemblyModuleFilename = isServer
  //     ? '../static/wasm/[modulehash].wasm'
  //     : 'static/wasm/[modulehash].wasm';

  //   return config;
  // },
  // Removed outputFileTracingIncludes for tiktoken
  // outputFileTracingIncludes: {
  //   '/api/**/*': ['./node_modules/tiktoken/tiktoken_bg.wasm'],
  // },
};

export default nextConfig;
