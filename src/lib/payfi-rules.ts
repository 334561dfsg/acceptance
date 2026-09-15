export type Coin = "USDT" | "USDC";
export const units = (value: string): bigint => {
  if (!/^\d+(\.\d{1,8})?$/.test(value)) throw new Error("金额格式不正确");
  const [a = "0", b = ""] = value.split(".");
  return BigInt(a) * 100000000n + BigInt(b.padEnd(8, "0"));
};
export function decimal(value: bigint, places = 8): string {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  return (
    sign +
    String(abs / 100000000n) +
    "." +
    String(abs % 100000000n)
      .padStart(8, "0")
      .slice(0, places)
  );
}
export const validAmount = (s: string) =>
  /^\d+(\.\d{1,2})?$/.test(s) && units(s) > 0n;
export const validSn = (s: string) => /^[A-Za-z0-9_-]{1,64}$/.test(s);
export const supportedNetwork = (coin: string, network: string) =>
  coin === "USDT"
    ? ["ETHEREUM", "TRON"].includes(network)
    : coin === "USDC" && network === "ETHEREUM";
export function confirmIssue(
  channel: string,
  status: string,
  expires: number,
  amount: string,
  balance: string,
  now = Date.now(),
) {
  if (!["AVAILABLE", "STABLE"].includes(channel))
    return "当前通道状态不允许结算";
  if (status !== "APPROVED") return "收款人尚未审核通过";
  if (now >= expires) return "报价已过期，请重新询价";
  if (!validAmount(amount) || units(amount) > units(balance))
    return "正常可用余额不足";
  return "";
}
export const purposes = [
  "PROFESSIONAL_SERVICE",
  "IT_SERVICE",
  "TAX",
  "EDUCATION_TRAINING",
  "LOGISTIC",
  "WAREHOUSE",
  "ADVERTISEMENT",
  "AIRLINE",
  "SALARY",
  "PAY_TO_ASSOCIATED_ENTITY",
  "PURCHASING",
  "OTHER",
];
export const purposeLabels = [
  "专业服务",
  "信息技术服务",
  "税费",
  "教育培训",
  "物流",
  "仓储",
  "广告",
  "航空",
  "工资",
  "关联企业付款",
  "采购",
  "其他",
];

export function balanceDecimal(value: bigint): string {
  const [whole, fraction = ""] = decimal(value).split(".");
  return whole + "." + fraction.replace(/0+$/, "").padEnd(2, "0");
}
export const channelLabels: Record<string, string> = {
  UNAVAILABLE: "待完成认证",
  UNDER_REVIEW: "认证审核中",
  AVAILABLE: "已开通",
  STABLE: "稳定运行",
  CLOSED: "通道已关闭",
};
export const merchantLabels: Record<string, string> = {
  PENDING: "待处理",
  ACTIVE: "正常",
  ABNORMAL: "账户异常",
  PLATFORM_FROZEN: "平台冻结",
  CLOSED: "已关闭",
};
export const accountStage = (no: string, channel: string) =>
  !no
    ? 0
    : channel === "UNAVAILABLE"
      ? 1
      : channel === "UNDER_REVIEW"
        ? 2
        : ["AVAILABLE", "STABLE"].includes(channel)
          ? 4
          : -1;
