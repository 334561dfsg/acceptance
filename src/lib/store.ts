import { reactive } from "vue";
import { onboarding, resetOnboarding } from "./onboarding";
import { seedMockData } from "./mock-data";
import { deposits } from "./deposit-mvp";
export const demo = reactive({
  email: "",
});
export function enterDemo(email: string) {
  if (onboarding.owner && onboarding.owner !== email) {
    resetOnboarding();
    deposits.length = 0;
  }
  seedMockData(email);
  demo.email = email;
}
export function leaveDemo() {
  demo.email = "";
}
export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}
