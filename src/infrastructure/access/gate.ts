const ACCESS_COOKIE = "ey-site-access";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function secret() {
  return process.env.SITE_ACCESS_SECRET || process.env.SITE_ACCESS_PASSWORD || "";
}

export function accessGateConfigured() {
  return Boolean(process.env.SITE_ACCESS_PASSWORD?.trim());
}

async function signature(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

export async function createAccessToken(now = Date.now()) {
  const payload = `v1.${Math.floor(now / 1000)}`;
  return `${payload}.${await signature(payload)}`;
}

export async function isValidAccessToken(token: string | undefined, now = Date.now()) {
  if (!accessGateConfigured() || !token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "v1") return false;
    const issuedAt = Number(parts[1]);
    if (!Number.isInteger(issuedAt)) return false;
    const age = Math.floor(now / 1000) - issuedAt;
    if (age < 0 || age > MAX_AGE_SECONDS) return false;
    const expected = await signature(`${parts[0]}.${parts[1]}`);
    const actualBytes = fromBase64Url(parts[2]);
    const expectedBytes = fromBase64Url(expected);
    if (actualBytes.length !== expectedBytes.length) return false;
    let different = 0;
    for (let i = 0; i < actualBytes.length; i += 1) different |= actualBytes[i] ^ expectedBytes[i];
    return different === 0;
  } catch {
    return false;
  }
}

export { ACCESS_COOKIE, MAX_AGE_SECONDS };
