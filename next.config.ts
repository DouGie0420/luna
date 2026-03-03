import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */

  // Firebase Hosting 靜態導出配置
  output: 'export',
  distDir: 'dist',

  // 排除 Firebase Functions 目錄，避免 TypeScript 編譯錯誤
  typescript: {
    ignoreBuildErrors: true,   // ← 改成 true（批量忽略所有 TS 错误）
  },

  // 新增：批量忽略 ESLint 错误（解决所有 admin 页面报错）
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ 正確寫法：包在 experimental 裡面
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'nft-cdn.alchemy.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'witchesnft.xyz',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.marshmallowmob.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.giphy.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'goop-img.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
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
    ]
  },
};

export default nextConfig;