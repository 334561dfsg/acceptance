import { reactive } from "vue";
import {
  units,
  decimal,
  balanceDecimal,
  validAmount,
  supportedNetwork,
  type Coin,
} from "./payfi-rules";
import { mvp } from "./mvp";
export interface DepositFlow {
  id: string;
  fromAddress: string;
  amount: string;
  status?: "RECEIVED" | "RETURNED";
  refundStatus?: "REFUNDABLE" | "REFUNDING" | "REFUND_SUCCEED";
  riskLevel: string;
  created: number;
  txHash: string;
}
export interface Deposit {
  id: string;
  sn: string;
  coin: Coin;
  network: string;
  amount: string;
  net: string;
  fee: string;
  platformFee: string;
  collaboratorFee: string;
  address: string | null;
  flows: DepositFlow[];
  refundableFlows: DepositFlow[];
  updated: number;
  received: string;
  status: "PENDING" | "PARTIAL" | "COMPLETED" | "TERMINATED";
  created: number;
  trouble: string;
  completed: number | null;
}
export const deposits = reactive<Deposit[]>([]);
export function createDeposit(amount: string, coin: Coin, network: string) {
  if (!validAmount(amount) || !supportedNetwork(coin, network))
    throw new Error("请输入有效金额并选择支持的网络");
  if (mvp.merchant.status !== "ACTIVE")
    throw new Error("企业账户状态不允许收款");
  const fee = decimal(units(amount) / 200n, 2);
  const d: Deposit = {
    id: "PAY_DEMO_" + crypto.randomUUID().slice(0, 8),
    sn: "DEMO_" + crypto.randomUUID().replaceAll("-", ""),
    coin,
    network,
    amount,
    fee,
    platformFee: fee,
    collaboratorFee: "0.00",
    address: null,
    flows: [],
    refundableFlows: [],
    updated: Date.now(),
    net: decimal(units(amount) - units(fee), 2),
    received: "0.00000000",
    status: "PENDING",
    created: Date.now(),
    trouble: "0.00000000",
    completed: null,
  };
  deposits.unshift(d);
  return deposits[0]!;
}
export function receiveDeposit(d: Deposit) {
  if (!["PENDING", "PARTIAL"].includes(d.status)) return;
  d.received = decimal(units(d.amount));
  d.status = "COMPLETED";
  d.completed = Date.now();
  mvp.balances[d.coin] = balanceDecimal(
    units(mvp.balances[d.coin]) + units(d.net),
  );
  d.updated = d.completed;
}

export function closeDeposit(d: Deposit) {
  if (d.status === "TERMINATED") return;
  if (!["PENDING", "PARTIAL"].includes(d.status))
    throw new Error("已完成的充值订单不能终止");
  d.status = "TERMINATED";
  d.completed = Date.now();
  d.updated = d.completed;
}
