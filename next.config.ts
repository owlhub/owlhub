import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [new URL('https://gitlab.pixelvide.com/uploads/**')],
  },
};

export default nextConfig;
