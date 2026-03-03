import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

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
