import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  // Geliştirme göstergesi harita panellerini örtüyordu
  devIndicators: false,
};

export default nextConfig;
