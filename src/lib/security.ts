const encoder = new TextEncoder();

export function generateRandomBytes(length: number): Uint8Array {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("Crypto API is not available");
  }
  return crypto.getRandomValues(new Uint8Array(length));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const bin = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join("");
  const base64 = btoa(bin);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateToken(length = 32): string {
  return bytesToBase64Url(generateRandomBytes(length));
}

export async function hashToken(token: string): Promise<string> {
  const data = encoder.encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateMailboxToken(): { plaintext: string; hash: Promise<string> } {
  const plaintext = `mbt_${generateToken(32)}`;
  return { plaintext, hash: hashToken(plaintext) };
}

export function generateApiKey(): { plaintext: string; prefix: string; hash: Promise<string> } {
  const prefix = "tmp_live_";
  const random = generateToken(32);
  const plaintext = `${prefix}${random}`;
  return { plaintext, prefix: plaintext.slice(0, 11), hash: hashToken(plaintext) };
}

export function scorePassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, Math.floor(score / 1.5));
}

export function passwordStrengthLabel(score: number): { label: string; color: string } {
  switch (score) {
    case 0:
    case 1:
      return { label: "Lemah", color: "#f13a2c" };
    case 2:
      return { label: "Sedang", color: "#f59e0b" };
    case 3:
      return { label: "Kuat", color: "#03904a" };
    case 4:
      return { label: "Sangat Kuat", color: "#03904a" };
    default:
      return { label: "", color: "#969696" };
  }
}
