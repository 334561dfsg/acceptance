import { reactive } from "vue";
export const paymentActions = reactive({ deposit: 0, payout: 0 });
export function openDeposit() {
  paymentActions.deposit++;
}
export function openPayout() {
  paymentActions.payout++;
}
