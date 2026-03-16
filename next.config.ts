import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: [
    "localhost",
    "192.168.2.12",
  ],
};

export default nextConfig;