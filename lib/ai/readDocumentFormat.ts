import Anthropic from "@anthropic-ai/sdk";
import {
  DOCUMENT_LAYOUT_JSON_SCHEMA,
  normalizeLayout,
  type DocumentLayout,
} from "@/lib/documentFormat";

const SYSTEM_PROMPT = `あなたは日本の請求書・見積書などのビジネス書類のレイアウトを読み取る専門家です。
渡されたPDFの「見た目（書式）」を、指定のJSONスキーマに沿って記述してください。
このJSONはWebアプリが自社の請求データ（宛先・明細・金額など）を流し込んで、同じ見た目の書類を再現するために使います。
PDFに書かれている具体的な値（会社名・金額・日付・品目など）は書き写さず、レイアウト・ラベル文言・色・並び順だけを読み取ってください。

各項目の意味:
- documentTitle: 書類のタイトル文言（例: 御請求書, 請求書, INVOICE）。titleStyle: plain=文字のみ / underline=下線 / band=色帯の上に白抜き / boxed=枠囲み。titleLetterSpacing は字間(pt, 0〜24)。
- accentColor: 見出しセルや帯の背景色、accentTextColor: その上の文字色、borderColor: 罫線の色、textColor: 本文の色。すべて #RRGGBB。
- baseFontSize: 本文の文字サイズ(pt, 7〜12)。pageMargin: 用紙の余白(pt, 20〜80)。
- sections: 上から順に並ぶブロック。title=タイトル / header=宛名と発行者の2カラム領域 / greeting=挨拶文 / total=ご請求金額 / payment=支払期限・振込先 / items=明細表 / summary=小計・消費税・合計の欄 / notes=備考。PDFに無いブロックは入れないでください。
- header.recipientSide: 宛名が左右どちらか。header.recipientColumn: 宛名側のカラムに縦に並ぶもの（recipient=宛名, greeting, total, payment）。header.issuerColumn: 反対側のカラムに並ぶもの（meta=発行日・請求番号など, issuer=発行者の名前・住所など, seal=押印欄）。ヘッダー内に置いたものは sections に重複して入れないでください。
- recipientStyle: 宛名の装飾（underline=下線 / plain / boxed=枠）。
- metaFields: 発行日・請求番号・支払期限の表示順とラベル文言（issueDate / invoiceNumber / dueDate）。
- greetingText: 挨拶文の文言（例: 下記のとおりご請求申し上げます。）。無ければ空文字。
- total: ご請求金額欄のラベル・装飾・金額の後ろに付く文字（例: 円(税込), (税込)）。
- payment: 支払期限・振込先のラベル文言、表形式(labeled-table)か文章形式(plain)か、振込手数料などの注記（無ければ空文字）。
- issuer: 発行者情報の揃え位置、登録番号(T+13桁)の欄があるか、そのラベル文言。
- table.columns: 明細表の列（左から順）。key は no=行番号 / description=品名・摘要 / quantity=数量 / unitPriceExcl=税抜単価 / unitPriceIncl=税込単価 / amountExcl=税抜金額 / amountIncl=税込金額。税込・税抜が明記されていない単価・金額は unitPriceExcl / amountExcl とみなしてください。width は列幅の相対比、label は見出し文言。単位列など対応するデータが無い列は省いてください。
- table.headerStyle: filled=見出し行に背景色 / outlined=枠のみ / underline=下線のみ。minRows: 空行を含めた明細表の行数(0〜20)。zebra: 1行おきに背景色があるか。
- summary: 小計・消費税・合計欄の位置(左右)、装飾（filled-label=ラベルセルに背景色 / plain / boxed）、行の並び順とラベル文言（subtotal / tax / adjustment / total）。adjustment は値引き行で、PDFに無くても末尾付近に「調整値引き」として入れてください（必要な時だけ表示されます）。showTaxBreakdown: 税率別内訳の表があるか。
- notes: 備考欄のラベルと装飾（boxed=枠 / plain / header-band=色帯の見出し＋枠）。`;

export class DocumentFormatError extends Error {}

/** PDFの見た目を読み取り、書式（DocumentLayout）を返す */
export async function readDocumentFormat(pdf: Buffer): Promise<{
  layout: DocumentLayout;
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new DocumentFormatError(
      "AI読み取り用のAPIキー（ANTHROPIC_API_KEY）が設定されていません。Vercelの環境変数に追加してください。"
    );
  }
  const client = new Anthropic();

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
        system: SYSTEM_PROMPT,
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
        "APIキーが無効です。ANTHROPIC_API_KEY を確認してください。"
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
