import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 0. 解决 alchemy-sdk (axios CJS) 在 Next.js webpack 下的 "cannot read 'call'" 报错
  transpilePackages: ['alchemy-sdk'],

  // 1. 忽略构建与 Lint 错误 (保留原有配置)
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. 核心修复：解决 Web3/ethers 依赖在客户端打包时的原生模块缺失问题
  // 同时修复 Windows 路径大小写不一致导致模块重复加载的问题（"invariant expected layout router to be mounted"）
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "utf-8-validate": false,
        "bufferutil": false,
        "encoding": false,
      };
    }
    // Windows 路径大小写修复：
    // Next.js 内部 loader 使用 fs.realpathSync.native() 获取路径（如 F:\Website），
    // 而用户代码路径为小写（F:\website），webpack 视为不同模块导致 LayoutRouterContext 加载两次。
    // 解决方案：将 webpack context 设置为 NTFS 规范路径（realpathSync.native），确保全局一致。
    if (process.platform === 'win32') {
      const fs = require('fs') as typeof import('fs');
      const canonicalRoot = fs.realpathSync.native(config.context || process.cwd());
      config.context = canonicalRoot;
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
      { protocol: 'https', hostname: 'pub-563454730e4e4c28b110bd6674052.r2.dev', pathname: '/**' },
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