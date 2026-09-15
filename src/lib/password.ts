// Local prototype account only. Production account provisioning and password checks belong on the backend.
const accounts = ["demo@acceptance.example", "empty@acceptance.example"];
interface Credential {
  salt: Uint8Array<ArrayBuffer>;
  hash: string;
  failures: number;
  blockedUntil: number;
}
const credentials = new Map<string, Credential>();
const normalize = (email: string) => email.trim().toLowerCase();
async function hash(password: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
const storageKey = "acceptance.credentials.v1";
function persistCredential(email: string) {
  const account = normalize(email);
  const c = credentials.get(account);
  if (!c) return;
  try {
    sessionStorage.setItem(
      account === accounts[0] ? storageKey : storageKey + ":" + account,
      JSON.stringify({ ...c, salt: Array.from(c.salt) }),
    );
  } catch {
    /* Retain in-memory behavior. */
  }
}
const ready = Promise.all(
  accounts.map(async (account) => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(
          account === accounts[0] ? storageKey : storageKey + ":" + account,
        ) || "null",
      );
      if (
        saved &&
        /^[a-f0-9]{64}$/.test(saved.hash) &&
        Array.isArray(saved.salt) &&
        saved.salt.length === 16 &&
        saved.salt.every(
          (n: number) => Number.isInteger(n) && n >= 0 && n <= 255,
        ) &&
        Number.isFinite(saved.failures) &&
        Number.isFinite(saved.blockedUntil)
      ) {
        credentials.set(account, {
          ...saved,
          salt: new Uint8Array(saved.salt),
        });
        return;
      }
    } catch {
      /* Initialize prototype credentials when storage is absent. */
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    credentials.set(account, {
      salt,
      hash: await hash("Acceptance@2026", salt),
      failures: 0,
      blockedUntil: 0,
    });
  }),
);
export function passwordIssue(password: string) {
  return password.length < 12 ||
    password.length > 128 ||
    !/[A-Za-z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9\s]/.test(password)
    ? "密码须为12–128位，并包含字母、数字和符号。"
    : "";
}
export async function checkPassword(email: string, password: string) {
  await ready;
  const c = credentials.get(normalize(email));
  if (c && c.blockedUntil > Date.now())
    throw new Error("尝试次数过多，请一分钟后重试。");
  if (!c || (await hash(password, c.salt)) !== c.hash) {
    if (c && ++c.failures >= 5) {
      c.failures = 0;
      c.blockedUntil = Date.now() + 60000;
    }
    persistCredential(email);
    throw new Error("账号或密码不正确。");
  }
  c.failures = 0;
  persistCredential(email);
}
export async function changePassword(
  email: string,
  current: string,
  next: string,
) {
  const issue = passwordIssue(next);
  if (issue) throw new Error(issue);
  if (current === next) throw new Error("新密码不能与当前密码相同。");
  await checkPassword(email, current);
  const c = credentials.get(normalize(email))!;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nextHash = await hash(next, salt);
  c.salt = salt;
  c.hash = nextHash;
  persistCredential(email);
}
