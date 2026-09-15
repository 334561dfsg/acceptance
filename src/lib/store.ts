import { reactive } from "vue";
import { onboarding, resetOnboarding } from "./onboarding";
import { seedMockData } from "./mock-data";
import { deposits } from "./deposit-mvp";
export const demo = reactive({
  email: "",
});
const sessionKey = "acceptance.session.v1";
export function restoreSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey) || "null");
    if (
      ["demo@acceptance.example", "empty@acceptance.example"].includes(
        saved?.email,
      ) &&
      Number.isFinite(saved.expires) &&
      saved.expires > Date.now()
    ) {
      seedMockData(saved.email);
      onboarding.owner = saved.email;
      demo.email = saved.email;
    } else sessionStorage.removeItem(sessionKey);
  } catch {
    /* Unavailable or invalid storage leaves the user signed out. */
  }
}
export function enterDemo(email: string) {
  if (onboarding.owner && onboarding.owner !== email) {
    resetOnboarding();
    deposits.length = 0;
  }
  seedMockData(email);
  onboarding.owner = email;
  demo.email = email;
  try {
    sessionStorage.setItem(
      sessionKey,
      JSON.stringify({ email, expires: Date.now() + 8 * 60 * 60 * 1000 }),
    );
  } catch {
    /* In-memory session remains usable. */
  }
}
export function leaveDemo() {
  demo.email = "";
  try {
    sessionStorage.removeItem(sessionKey);
  } catch {
    /* Storage may be unavailable. */
  }
}
export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}
