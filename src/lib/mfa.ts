import { reactive } from "vue";
// Prototype only: tab-scoped storage retains MFA across reloads. Production secrets belong on the server.
interface AccountMfa {
  secret: string;
  boundAt: number;
  lastStep: number;
  failures: number;
  blockedUntil: number;
}
const accounts = new Map<string, AccountMfa>();
const storageKey = "acceptance.mfa.v1";
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
  if (Array.isArray(saved))
    for (const [email, value] of saved) {
      if (
        typeof email === "string" &&
        /^[A-Z2-7]{32}$/.test(value?.secret) &&
        [
          value.boundAt,
          value.lastStep,
          value.failures,
          value.blockedUntil,
        ].every(Number.isFinite)
      )
        accounts.set(email, value);
    }
} catch {
  /* Invalid storage never creates a binding. */
}
function persistMfa() {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify([...accounts]));
  } catch {
    /* Retain in-memory behavior. */
  }
}
export const mfaVersion = reactive({ value: 0 });
const key = (email: string) => email.trim().toLowerCase();
export function mfaInfo(email: string) {
  void mfaVersion.value;
  const a = accounts.get(key(email));
  return a ? { boundAt: a.boundAt } : undefined;
}
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function createSecret() {
  let bits = 0,
    value = 0,
    result = "";
  for (const b of crypto.getRandomValues(new Uint8Array(20))) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += alphabet[(value >>> bits) & 31];
    }
  }
  return result;
}
function decode(s: string) {
  let bits = 0,
    value = 0;
  const bytes = [];
  for (const c of s) {
    value = (value << 5) | alphabet.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 255);
    }
  }
  return new Uint8Array(bytes);
}
export async function totp(secret: string, time = Date.now()) {
  const counter = new ArrayBuffer(8);
  new DataView(counter).setBigUint64(0, BigInt(Math.floor(time / 30000)));
  const k = await crypto.subtle.importKey(
    "raw",
    decode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", k, counter));
  const offset = bytes[19]! & 15;
  const n =
    ((bytes[offset]! & 127) << 24) |
    (bytes[offset + 1]! << 16) |
    (bytes[offset + 2]! << 8) |
    bytes[offset + 3]!;
  return String(n % 1000000).padStart(6, "0");
}
async function validStep(secret: string, code: string) {
  if (!/^\d{6}$/.test(code)) return -1;
  const step = Math.floor(Date.now() / 30000);
  for (const delta of [0, -1, 1])
    if ((await totp(secret, (step + delta) * 30000)) === code)
      return step + delta;
  return -1;
}
export async function bindMfa(email: string, secret: string, code: string) {
  const step = await validStep(secret, code);
  if (step < 0) throw new Error("验证码不正确或已过期，请检查后重试。");
  accounts.set(key(email), {
    secret,
    boundAt: Date.now(),
    lastStep: step,
    failures: 0,
    blockedUntil: 0,
  });
  persistMfa();
  mfaVersion.value++;
}
export async function verifyMfa(email: string, code: string) {
  const a = accounts.get(key(email));
  if (!a) throw new Error("请先绑定身份验证器。");
  if (a.blockedUntil > Date.now())
    throw new Error("尝试次数过多，请一分钟后重试。");
  let valid = false;
  const step = await validStep(a.secret, code);
  if (step >= 0 && step > a.lastStep) {
    a.lastStep = step;
    valid = true;
  }
  if (!valid) {
    a.failures++;
    if (a.failures >= 5) {
      a.blockedUntil = Date.now() + 60000;
      a.failures = 0;
    }
    persistMfa();
    throw new Error("验证码不正确、已过期或已使用，请使用新的验证码。");
  }
  a.failures = 0;
  persistMfa();
}
export function removeMfa(email: string) {
  accounts.delete(key(email));
  persistMfa();
  mfaVersion.value++;
}
export const challenge = reactive({
  email: "",
  title: "",
  open: false,
});
let resolveChallenge: ((ok: boolean) => void) | undefined;
export function requestMfa(email: string, title: string): Promise<boolean> {
  if (!mfaInfo(email)) return Promise.resolve(true);
  if (challenge.open) return Promise.resolve(false);
  Object.assign(challenge, { email, title, open: true });
  return new Promise((resolve) => {
    resolveChallenge = resolve;
  });
}
export function finishChallenge(ok: boolean) {
  challenge.open = false;
  resolveChallenge?.(ok);
  resolveChallenge = undefined;
}
