import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  output: 'standalone',
}

export default nextConfig
