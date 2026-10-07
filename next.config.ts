import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ネイティブ依存(fontkit等)を含むため、サーバーレス関数バンドルから除外する
  serverExternalPackages: ["@react-pdf/renderer", "exceljs"],
  experimental: {
    serverActions: {
      // 書式取り込みでPDF（5MBまで）を受け取るため
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
