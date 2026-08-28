// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
import type { NextConfig } from "next";

// Public object URLs are served from https://<bucket>.s3.<region>.amazonaws.com/<key>
const s3Bucket = process.env.AWS_S3_BUCKET_NAME;
const s3Region = process.env.AWS_REGION;
const s3Hostname = s3Bucket && s3Region
  ? `${s3Bucket}.s3.${s3Region}.amazonaws.com`
  : '**.amazonaws.com';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  serverExternalPackages: ["@prisma/client", "prisma"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.youtube.com',
      },
      {
        protocol: 'https',
        hostname: '**.vimeo.com',
      },
      {
        protocol: 'https',
        hostname: 'player.vimeo.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        // Profile pictures imported from Google sign-in.
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'sdgs.un.org',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'sample-storage.example.com',
      },
      {
        protocol: 'https',
        hostname: s3Hostname,
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/vote',
        destination: 'https://rate.bestweb.lk/voting-categories/voting-websites/26/213',
        permanent: false,
      },
      {
        source: '/student',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/student/:path*',
        destination: '/dashboard/:path*',
        permanent: false,
      },
      {
        source: '/submit',
        destination: '/dashboard/submit',
        permanent: false,
      },
      {
        source: '/submit/:path*',
        destination: '/dashboard/submit/:path*',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://api.psycodelabs.lk https://*.psycodelabs.lk http://localhost:3001; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.psycodelabs.lk http://localhost:3001; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.psycodelabs.lk https://*.psycodelabs.lk wss://api.psycodelabs.lk wss://*.psycodelabs.lk http://localhost:3001 ws://localhost:3001; frame-src 'self' https://www.youtube.com https://player.vimeo.com https://vimeo.com https://api.psycodelabs.lk https://*.psycodelabs.lk http://localhost:3001; worker-src 'self' blob:; frame-ancestors 'none';"
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
