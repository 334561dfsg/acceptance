import { reactive } from "vue";
import {
  decimal,
  balanceDecimal,
  units,
  validAmount,
  purposes,
  confirmIssue,
  type Coin,
} from "./payfi-rules";
export interface BankAccount {
  no: string;
  sn: string;
  status: string;
  relationship: string;
  country: string;
  routing: string;
  accountName: string;
  accountNo: string;
  bankName: string;
  fields: Record<string, string>;
  material: { name: string; size: number; fileNo: string; sample: boolean };
  reason: string;
  created?: number;
  updated?: number;
}
export type Direction = "SELL";
export interface ExchangeOrder {
  id: string;
  sn: string;
  payeeNo: string;
  orderType: "WITHDRAW" | "PAYOUT";
  direction: Direction;
  coin: Coin;
  amount: string;
  fee: string;
  platformFee: string;
  collaboratorFee: string;
  proofUrls: string[];
  remark: string;
  payoutChannel: string | null;
  updated: number;
  net: string;
  receive: string;
  actualReceive: string | null;
  rate: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCEL" | "TERMINATED";
  created: number;
  expires: number;
  completed: number | null;
  purpose: string;
  account: string;
}
export const mvp = reactive({
  merchant: { no: "", name: "", status: "", channel: "" },
  payee: {
    no: "",
    status: "",
    relationship: "SELF",
    accountName: "",
    accountNo: "",
    bankName: "",
  },
  balances: { USDT: "0.00", USDC: "0.00" } as Record<Coin, string>,
  frozen: { USDT: "0.00", USDC: "0.00" } as Record<Coin, string>,
  orders: [] as ExchangeOrder[],
  banks: [] as BankAccount[],
});
export function estimate(amount: string, direction: Direction) {
  if (!validAmount(amount))
    return {
      fee: "0.00",
      net: "0.00",
      receive: "0.00",
      rate: direction === "SELL" ? "0.9990" : "1.0010",
    };
  const fee = decimal(units(amount) / 200n, 2),
    net = decimal(units(amount) - units(fee), 2);
  const rate = direction === "SELL" ? "0.9990" : "1.0010";
  return {
    fee,
    net,
    rate,
    receive: decimal(
      (units(net) * (direction === "SELL" ? 9990n : 10010n)) / 10000n,
      2,
    ),
  };
}
export function makeQuote(
  direction: Direction,
  coin: Coin,
  amount: string,
  account: string,
  payeeId?: string,
) {
  if (direction !== "SELL") throw new Error("参考汇率接口不能创建兑换订单");
  if (!validAmount(amount)) throw new Error("请输入大于 0、最多两位小数的金额");
  if (units(estimate(amount, direction).receive) === 0n)
    throw new Error("金额过小，预计到账不足 0.01，请增加金额");
  if (direction === "SELL" && units(amount) > units(mvp.balances[coin]))
    throw new Error("可用余额不足，请减少金额或先收款");
  if (direction === "SELL" && !account)
    throw new Error("请选择已审核的美元银行账户");
  if (mvp.merchant.status !== "ACTIVE") throw new Error("企业账户状态不可用");
  const payee = payeeId ? mvp.banks.find((b) => b.no === payeeId) : mvp.payee;
  if (!payee) throw new Error("请选择有效收款账户");
  const issue = confirmIssue(
    mvp.merchant.channel,
    payee.status,
    Date.now() + 300000,
    amount,
    mvp.balances[coin],
  );
  if (issue) throw new Error(issue);
  const q: ExchangeOrder = {
    sn: "DEMO_" + crypto.randomUUID().replaceAll("-", ""),
    payeeNo: payee.no,
    orderType: payee.relationship === "SELF" ? "WITHDRAW" : "PAYOUT",
    id: "DEMO_" + crypto.randomUUID().slice(0, 8).toUpperCase(),
    direction,
    coin,
    amount: decimal(units(amount), 2),
    ...estimate(amount, direction),
    platformFee: estimate(amount, direction).fee,
    collaboratorFee: "0.00",
    proofUrls: [],
    remark: "",
    payoutChannel: null,
    updated: Date.now(),
    status: "PENDING",
    created: Date.now(),
    expires: Date.now() + 300000,
    completed: null,
    actualReceive: null,
    purpose: "",
    account,
  };
  mvp.orders.unshift(q);
  return mvp.orders[0]!;
}
export function confirmOrder(
  q: ExchangeOrder,
  purpose: string,
  now = Date.now(),
) {
  if (q.status !== "PENDING") throw new Error("该订单已处理，请勿重复提交");
  if (now >= q.expires) throw new Error("报价已过期，请取消后重新询价");
  if (q.direction === "SELL") {
    if (!purposes.includes(purpose)) throw new Error("请选择有效的结算用途");
    if (mvp.merchant.status !== "ACTIVE") throw new Error("企业账户状态不可用");
    const livePayee =
      mvp.banks.find((b) => b.no === q.payeeNo) ||
      (mvp.payee.no === q.payeeNo ? mvp.payee : undefined);
    const issue = confirmIssue(
      mvp.merchant.channel,
      livePayee?.status || "",
      q.expires,
      q.amount,
      mvp.balances[q.coin],
      now,
    );
    if (issue) throw new Error(issue);
    if (units(q.amount) > units(mvp.balances[q.coin]))
      throw new Error("余额已变化，当前可用余额不足");
    mvp.balances[q.coin] = balanceDecimal(
      units(mvp.balances[q.coin]) - units(q.amount),
    );
    mvp.frozen[q.coin] = balanceDecimal(
      units(mvp.frozen[q.coin]) + units(q.amount),
    );
    q.status = "PROCESSING";
  }
  q.purpose = purpose;
  q.updated = now;
}
export function advanceDemo(q: ExchangeOrder) {
  if (q.status === "PROCESSING") {
    mvp.frozen[q.coin] = balanceDecimal(
      units(mvp.frozen[q.coin]) - units(q.amount),
    );
    q.status = "COMPLETED";
    q.actualReceive = q.receive;
  } else return;
  q.completed = Date.now();
  q.updated = q.completed;
}
export const statusText = (q: ExchangeOrder, now = Date.now()) =>
  ({
    PENDING: q.expires <= now ? "报价已过期" : "待确认报价",
    PROCESSING: "银行付款中",
    COMPLETED: "已完成",
    CANCEL: "已取消",
    TERMINATED: "已终止",
  })[q.status];

export function cancelOrder(q: ExchangeOrder) {
  if (q.status !== "PENDING") return;
  q.status = "CANCEL";
  q.completed = Date.now();
  q.updated = q.completed;
}
