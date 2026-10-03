import { Font } from "@react-pdf/renderer";
import path from "path";

const fontDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: path.join(fontDir, "NotoSansJP-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(fontDir, "NotoSansJP-Bold.ttf"), fontWeight: "bold" },
  ],
});

// 単語内で折り返すとreact-pdfがハイフンを挿入するため、単語単位を維持する。
// 長文は表示側で行を分けること。
Font.registerHyphenationCallback((word) => [word]);
