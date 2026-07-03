import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ネイティブ依存(fontkit等)を含むため、サーバーレス関数バンドルから除外する
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
