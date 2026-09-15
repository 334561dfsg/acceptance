// Local prototype account only. Production account provisioning and password checks belong on the backend.
const defaults = ["demo@acceptance.example", "empty@acceptance.example"];
export interface CustomerAccount {
  id: string;
  email: string;
  contact: string;
  enabled: boolean;
  created: number;
  mustChangePassword: boolean;
}
export const customerAccounts: CustomerAccount[] = defaults.map((email, i) => ({
  id: `CU1000${i + 1}`,
  email,
  contact: i === 0 ? "星澜客户" : "",
  enabled: true,
  created: new Date("2026-09-01T09:00:00+08:00").getTime() + i * 86400000,
  mustChangePassword: false,
}));
try {
  const saved = JSON.parse(
    sessionStorage.getItem("acceptance.customers.v1") || "null",
  );
  if (
    Array.isArray(saved) &&
    saved.every(
      (c) =>
        typeof c.id === "string" &&
        typeof c.email === "string" &&
        typeof c.enabled === "boolean" &&
        typeof c.mustChangePassword === "boolean" &&
        Number.isFinite(c.created),
    ) &&
    defaults.every((email) => saved.some((c) => c.email === email))
  )
    customerAccounts.splice(0, customerAccounts.length, ...saved);
} catch {
  /* Keep initial local accounts. */
}
export const findCustomer = (email: string) =>
  customerAccounts.find((c) => c.email === email.trim().toLowerCase());
function persistCustomers() {
  try {
    sessionStorage.setItem(
      "acceptance.customers.v1",
      JSON.stringify(customerAccounts),
    );
  } catch {
    /* Match credentials: retain the local in-memory account when storage is unavailable. */
  }
}
const accounts = customerAccounts.map((c) => c.email);
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
      account === defaults[0] ? storageKey : storageKey + ":" + account,
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
          account === defaults[0] ? storageKey : storageKey + ":" + account,
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
    if (!defaults.includes(account)) return;
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
  if (findCustomer(email)?.enabled === false)
    throw new Error("该账号已停用，请联系管理员。");
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
  const customer = findCustomer(email);
  if (customer) customer.mustChangePassword = false;
  try {
    persistCustomers();
  } catch {
    /* Local memory stays updated. */
  }
  persistCredential(email);
}

export async function createCustomer(
  email: string,
  contact: string,
  password: string,
) {
  await ready;
  email = normalize(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 128)
    throw new Error("请输入有效的邮箱账号。");
  if (findCustomer(email)) throw new Error("该账号已存在。");
  const issue = passwordIssue(password);
  if (issue) throw new Error(issue);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nextHash = await hash(password, salt);
  if (findCustomer(email)) throw new Error("该账号已存在。");
  const customer = {
    id: "CU" + crypto.randomUUID().slice(0, 8).toUpperCase(),
    email,
    contact: contact.trim(),
    enabled: true,
    created: Date.now(),
    mustChangePassword: true,
  };
  credentials.set(email, {
    salt,
    hash: nextHash,
    failures: 0,
    blockedUntil: 0,
  });
  customerAccounts.unshift(customer);
  persistCredential(email);
  persistCustomers();
  return customer;
}
export function setCustomerEnabled(email: string, enabled: boolean) {
  const customer = findCustomer(email);
  if (!customer) throw new Error("客户不存在。");
  customer.enabled = enabled;
  persistCustomers();
}
export async function resetCustomerPassword(email: string, password: string) {
  await ready;
  const customer = findCustomer(email);
  if (!customer) throw new Error("客户不存在。");
  const issue = passwordIssue(password);
  if (issue) throw new Error(issue);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  credentials.set(normalize(email), {
    salt,
    hash: await hash(password, salt),
    failures: 0,
    blockedUntil: 0,
  });
  customer.mustChangePassword = true;
  persistCredential(email);
  persistCustomers();
}

export function generateInitialPassword() {
  const pick = (chars: string) => {
    const limit = Math.floor(0x100000000 / chars.length) * chars.length;
    let value: number;
    do {
      value = crypto.getRandomValues(new Uint32Array(1))[0]!;
    } while (value >= limit);
    return chars[value % chars.length]!;
  };
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnpqrstuvwxyz",
    "23456789",
    "!@#$%&*?",
  ];
  const result = groups.map(pick);
  const all = groups.join("");
  while (result.length < 16) result.push(pick(all));
  // Shuffle the required character groups into random positions.
  for (let i = result.length - 1; i > 0; i--) {
    const index = parseInt(pick("0123456789abcdef".slice(0, i + 1)), 16);
    [result[i], result[index]] = [result[index]!, result[i]!];
  }
  return result.join("");
}
