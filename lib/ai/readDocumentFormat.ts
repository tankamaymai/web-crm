import Anthropic from "@anthropic-ai/sdk";
import { FORMAT_READING_PROMPT } from "@/lib/ai/formatPrompt";
import {
  DOCUMENT_LAYOUT_JSON_SCHEMA,
  normalizeLayout,
  type DocumentLayout,
} from "@/lib/documentFormat";



export class DocumentFormatError extends Error {}

/** PDFの見た目を読み取り、書式（DocumentLayout）を返す */
export async function readDocumentFormat(
  pdf: Buffer,
  apiKey: string
): Promise<{ layout: DocumentLayout }> {
  const client = new Anthropic({ apiKey });

  let message;
  try {
    // PDFの読み取りと推論で時間がかかるため、ストリーミングで受けてタイムアウトを避ける
    message = await client.beta.messages
      .stream({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        // 安全判定で断られた場合はサーバー側で別モデルに自動で切り替える
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: FORMAT_READING_PROMPT,
        output_config: {
          format: { type: "json_schema", schema: DOCUMENT_LAYOUT_JSON_SCHEMA },
        },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdf.toString("base64"),
                },
              },
              {
                type: "text",
                text: "このPDFの1ページ目の書式を読み取ってください。",
              },
            ],
          },
        ],
      })
      .finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      throw new DocumentFormatError(
        "APIキーが無効です。設定画面でAPIキーを確認してください。"
      );
    }
    if (e instanceof Anthropic.RateLimitError) {
      throw new DocumentFormatError(
        "AIの利用上限に達しました。少し時間をおいて再度お試しください。"
      );
    }
    if (e instanceof Anthropic.APIError) {
      console.error("readDocumentFormat failed", e.status, e.message);
      throw new DocumentFormatError(
        `AIでの読み取りに失敗しました（${e.status ?? "通信エラー"}）。`
      );
    }
    throw e;
  }

  if (message.stop_reason === "refusal") {
    throw new DocumentFormatError(
      "このPDFはAIで読み取れませんでした。別のPDFでお試しください。"
    );
  }
  if (message.stop_reason === "max_tokens") {
    throw new DocumentFormatError(
      "読み取り結果が長すぎて途中で切れました。もう一度お試しください。"
    );
  }

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DocumentFormatError(
      "読み取り結果を解釈できませんでした。もう一度お試しください。"
    );
  }
  return { layout: normalizeLayout(parsed) };
}
