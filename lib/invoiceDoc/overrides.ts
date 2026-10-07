// 請求書プレビューで書き換えた内容（請求書ごとに保存する）。
// - text:  ラベルや挨拶文など、データではない文言の差し替え（キー → 文字列）
// - style: 文字の大きさ・太字・色・揃え（キー → 書式）
// 品目・数量・単価・備考・日付は請求書のデータそのものを更新するので、ここには入らない。

export type CellStyle = {
  fontSize?: number;
  bold?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
};

export type DocOverrides = {
  text: Record<string, string>;
  style: Record<string, CellStyle>;
};

export const EMPTY_OVERRIDES: DocOverrides = { text: {}, style: {} };

export const FONT_SIZE_MIN = 6;
export const FONT_SIZE_MAX = 40;

const ALIGNS = ["left", "center", "right"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** DBやクライアントから来た値を安全な形にそろえる */
export function normalizeOverrides(input: unknown): DocOverrides {
  const v = isRecord(input) ? input : {};
  const text: Record<string, string> = {};
  const style: Record<string, CellStyle> = {};
  if (isRecord(v.text)) {
    for (const [k, t] of Object.entries(v.text)) {
      if (typeof t === "string" && k.length <= 120) text[k] = t.slice(0, 2000);
    }
  }
  if (isRecord(v.style)) {
    for (const [k, s] of Object.entries(v.style)) {
      if (!isRecord(s) || k.length > 120) continue;
      const out: CellStyle = {};
      if (typeof s.fontSize === "number" && Number.isFinite(s.fontSize)) {
        out.fontSize = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, s.fontSize));
      }
      if (typeof s.bold === "boolean") out.bold = s.bold;
      if (typeof s.color === "string" && /^#[0-9a-fA-F]{6}$/.test(s.color)) {
        out.color = s.color;
      }
      if (ALIGNS.includes(s.align as never)) out.align = s.align as CellStyle["align"];
      if (Object.keys(out).length > 0) style[k] = out;
    }
  }
  return { text, style };
}
