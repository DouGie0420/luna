import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 1. 忽略构建与 Lint 错误 (保留原有配置)
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. 核心修复：解决 Web3/ethers 依赖在客户端打包时的原生模块缺失问题
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 强制告诉 Webpack 忽略这些仅限 Node.js 环境的原生 C++ 模块
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "utf-8-validate": false,
        "bufferutil": false,
        "encoding": false, // 额外增加对 encoding 的处理，防止 ethers v6 报错
      };
    }
    return config;
  },

  // 3. 图片配置 (保留所有 14 个远程模式)
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'api.dicebear.com', pathname: '/**' },
      { protocol: 'https', hostname: 'nft-cdn.alchemy.com', pathname: '/**' },
      { protocol: 'https', hostname: 'ipfs.io', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'witchesnft.xyz', pathname: '/**' },
      { protocol: 'https', hostname: 'api.marshmallowmob.com', pathname: '/**' },
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'media.giphy.com', pathname: '/**' },
      { protocol: 'https', hostname: 'goop-img.com', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
    ],
  },

  // 4. 路由重写逻辑 (保留原有配置)
  async rewrites() {
    return [
      {
        source: '/@:loginId',
        destination: '/u/:loginId',
      },
      {
        source: '/@:loginId/:path*',
        destination: '/u/:loginId/:path*',
      },
    ];
  },
};

export default nextConfig;