// パスワードのハッシュ化とセッションCookieの署名・検証。
// ログイン情報はDB(Settings)に保存する。環境変数の設定は不要。

export const SESSION_COOKIE = "web_crm_session";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000;

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function randomHex(byteLength: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export function generateSalt(): string {
  return randomHex(16);
}

export function generateSessionSecret(): string {
  return randomHex(32);
}

/** パスワードをPBKDF2-SHA256でハッシュ化する */
export async function hashPassword(
  password: string,
  salt: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: fromHex(salt) as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256
  );
  return toHex(new Uint8Array(bits));
}

/** ハッシュ同士を定数時間で比較する */
export function hashesMatch(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length && i < b.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
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
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** `有効期限.署名` 形式のトークンを作る */
export async function createSessionToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expiresAt);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    encoder.encode(payload)
  );
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string
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
    await signingKey(secret),
    signatureBytes as unknown as BufferSource,
    encoder.encode(payload)
  );
}

export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;
