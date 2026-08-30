// セッションCookieの署名・検証。
// proxy.ts からも import するため、next/headers などには依存させない。

export const SESSION_COOKIE = "web_crm_session";
const SESSION_DAYS = 30;

const encoder = new TextEncoder();

/** ログインパスワード（未設定なら null = 未セットアップ） */
export function getAppPassword(): string | null {
  const value = process.env.APP_PASSWORD;
  return value && value.length > 0 ? value : null;
}

// 署名鍵はパスワードから導出する。環境変数を1つに保てるうえ、
// パスワードを変えると既存のセッションが自動的に無効になる。
async function signingKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(`web-crm/session/${password}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** `有効期限.署名` 形式のトークンを作る */
export async function createSessionToken(password: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expiresAt);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(password),
    encoder.encode(payload)
  );
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  password: string
): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const signatureBytes = fromBase64Url(signature);
  if (!signatureBytes) return false;

  // crypto.subtle.verify は定数時間で比較される
  return crypto.subtle.verify(
    "HMAC",
    await signingKey(password),
    signatureBytes as unknown as BufferSource,
    encoder.encode(payload)
  );
}

/** パスワード照合（ダイジェスト同士を定数時間で比較する） */
export async function passwordMatches(
  input: string,
  expected: string
): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(input)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length && i < y.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;
