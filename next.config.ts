import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // для сервера: минимальная сборка в .next/standalone (см. Dockerfile)
  output: "standalone",
};

export default nextConfig;
