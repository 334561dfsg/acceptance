import { reactive } from "vue";
import { mvp } from "./mvp";
import { onboarding } from "./onboarding";
import { deposits } from "./deposit-mvp";
import { seedMockData } from "./mock-data";
export interface AdminEvent {
  id: string;
  at: number;
  actor: string;
  email: string;
  action: string;
  note: string;
}
export const adminState = reactive({ revision: 0, events: [] as AdminEvent[] });
try {
  const saved = JSON.parse(
    sessionStorage.getItem("acceptance.admin.events.v1") || "[]",
  );
  if (Array.isArray(saved))
    adminState.events = saved.filter(
      (e) =>
        typeof e.id === "string" &&
        typeof e.action === "string" &&
        typeof e.email === "string" &&
        Number.isFinite(e.at),
    );
} catch {
  /* Fresh local activity log. */
}
export function recordAdminAction(email: string, action: string, note: string) {
  adminState.events.unshift({
    id: crypto.randomUUID(),
    at: Date.now(),
    actor: "系统管理员",
    email,
    action,
    note,
  });
  adminState.revision++;
  try {
    sessionStorage.setItem(
      "acceptance.admin.events.v1",
      JSON.stringify(adminState.events),
    );
  } catch {
    /* In-memory activity remains visible. */
  }
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function emptySnapshot() {
  const state = clone(mvp),
    company = clone(onboarding);
  state.merchant = { no: "", name: "", status: "", channel: "" };
  state.banks = [];
  state.orders = [];
  state.balances = { USDT: "0.00", USDC: "0.00" };
  state.frozen = { USDT: "0.00", USDC: "0.00" };
  company.owner = "";
  company.company = {};
  company.legal = {};
  company.ubos = [{}];
  company.materials = {};
  company.isForeignOwned = false;
  return { mvp: state, onboarding: company, deposits: [] as typeof deposits };
}
// Build a detached fixture; viewing a customer must never switch the client session.
const seeded = emptySnapshot();
seedMockData("demo@acceptance.example", Date.now(), seeded);
export function customerSnapshot(email: string) {
  if (onboarding.owner === email) return { mvp, onboarding, deposits };
  return email === "demo@acceptance.example" ? seeded : emptySnapshot();
}
