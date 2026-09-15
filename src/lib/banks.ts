import countries from "./countries.json";
import { mvp, type BankAccount } from "./mvp";
import {
  bankFields,
  type Entry,
  type LocalMaterial,
  fieldsIssue,
  materialIssue,
} from "./onboarding";
export function bankTemplate(
  country: string,
  route: string,
  relationship: string,
): Entry[] {
  const all: Record<string, Entry> = Object.fromEntries(
    bankFields.map((f) => [f.key, f]),
  );
  Object.assign(all, {
    "p.company_name": {
      key: "p.company_name",
      label: "收款企业名称",
      max: 255,
    },
    "p.payee_country": {
      key: "p.payee_country",
      label: "收款企业国家 / 地区",
      max: 2,
      options: countries,
    },
    "p.street_address": {
      key: "p.street_address",
      label: "收款企业详细地址",
      max: 512,
    },
    "b.routing_value": {
      key: "b.routing_value",
      label: "美国 Routing Number",
      max: 9,
    },
    "b.bank_code": { key: "b.bank_code", label: "银行代码", max: 32 },
    "b.branch_code": { key: "b.branch_code", label: "分行代码", max: 32 },
  });
  if (
    !["SWIFT", "RTGS"].includes(route) ||
    !["HK", "US"].includes(country) ||
    !["SELF", "THIRD_PARTY"].includes(relationship) ||
    (country === "US" && route !== "SWIFT")
  )
    return [];
  const self = relationship === "SELF";
  let required = [
      "b.account_name",
      "b.account_no",
      "b.bank_name",
      "b.swift_code",
    ],
    optional: string[] = [];
  if (route === "RTGS") {
    required.push(
      "b.branch_code",
      ...(self
        ? ["p.city", "b.bank_code"]
        : ["p.company_name", "p.payee_country", "p.street_address"]),
    );
    optional = self
      ? ["b.bank_address", "b.city"]
      : [
          "p.province",
          "p.city",
          "p.post_code",
          "b.bank_address",
          "b.province",
          "b.city",
        ];
  } else {
    required.push("p.province", "p.city", "p.post_code", "b.province");
    if (!self)
      required.push("p.company_name", "p.payee_country", "p.street_address");
    if (country === "US") {
      required.push("b.routing_value");
      if (!self) required.push("b.city");
    }
    if (country === "HK" || self) optional = ["b.bank_address", "b.city"];
  }
  return [...required, ...optional].map((k) => ({
    ...all[k]!,
    optional: optional.includes(k),
  }));
}
export function submitAccount(
  country: string,
  routing: string,
  relationship: string,
  fields: Record<string, string>,
  material: LocalMaterial | undefined,
  existing?: BankAccount,
) {
  if (country !== "HK") throw new Error("目前仅支持中国香港的银行账户");
  if (mvp.merchant.channel !== "AVAILABLE")
    throw new Error("请先完成企业认证并开通支付通道");
  if (existing && existing.status !== "DECLINED")
    throw new Error("仅被驳回的银行账户可以修改");
  if (
    existing &&
    (existing.country !== country ||
      existing.routing !== routing ||
      existing.relationship !== relationship)
  )
    throw new Error("修改时不可变更银行场景");
  if (
    existing &&
    mvp.orders.some(
      (q) =>
        q.payeeNo === existing.no &&
        ["PENDING", "PROCESSING"].includes(q.status),
    )
  )
    throw new Error("此账户关联未完成付款，请先处理付款订单");
  fields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value.trim()]),
  );
  const template = bankTemplate(country, routing, relationship);
  if (!template.length) throw new Error("不支持的银行场景");
  const issue = fieldsIssue(fields, template);
  if (issue) throw new Error(issue);
  if (
    !(country === "HK" && routing === "RTGS" && relationship === "SELF") &&
    !/^[A-Za-z0-9]{3,33}$/.test(fields["b.account_no"] || "")
  )
    throw new Error("账号应为3至33位字母或数字（实际规则以服务端模板为准）");
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(fields["b.swift_code"] || ""))
    throw new Error("请填写8或11位SWIFT代码");
  if (!material) throw new Error("请添加银行账户证明");
  const fileError = materialIssue(material, "BANK");
  if (fileError) throw new Error(fileError);
  if (
    mvp.banks.some(
      (b) =>
        b.no !== existing?.no &&
        b.status !== "DELETED" &&
        b.accountNo === fields["b.account_no"] &&
        b.relationship === relationship,
    )
  )
    throw new Error("该账号及收款人类型已存在");
  const record = {
    no: existing?.no || "PE_DEMO_" + crypto.randomUUID().slice(0, 8),
    sn: existing?.sn || "DEMO_" + crypto.randomUUID().replaceAll("-", ""),
    status: "PENDING",
    relationship,
    country,
    routing,
    accountName: fields["b.account_name"]!,
    accountNo: fields["b.account_no"]!,
    bankName: fields["b.bank_name"]!,
    fields: Object.fromEntries(
      template.filter((f) => fields[f.key]).map((f) => [f.key, fields[f.key]!]),
    ),
    material,
    reason: "",
    created: existing?.created || Date.now(),
    updated: Date.now(),
  };
  if (existing) Object.assign(existing, record);
  else mvp.banks.unshift(record);
}
export function reviewAccount(b: BankAccount, approved: boolean) {
  if (b.status !== "PENDING") return;
  b.status = approved ? "APPROVED" : "DECLINED";
  b.reason = approved
    ? ""
    : "审核意见：银行资料与证明文件不一致，请修改后重新提交。";
}
export function removeAccount(b: BankAccount) {
  if (!["APPROVED", "DECLINED"].includes(b.status))
    throw new Error("此状态不可删除");
  if (
    mvp.orders.some(
      (q) => q.payeeNo === b.no && ["PENDING", "PROCESSING"].includes(q.status),
    )
  )
    throw new Error("此账户关联未完成付款，请先处理付款订单");
  b.status = "DELETING";
  b.updated = Date.now();
}
export const accountPayload = (b: BankAccount) => ({
  merchant_no: mvp.merchant.no,
  payee_sn: b.sn,
  payee_type: b.relationship,
  country: b.country,
  currency: "USD",
  holder_type: "COMPANY",
  payment_method: "BANK_ACCOUNT",
  routing_type: b.routing,
  payee_info: Object.fromEntries(
    Object.entries(b.fields)
      .filter(([k]) => k.startsWith("p."))
      .map(([k, v]) => [k.slice(2), v]),
  ),
  bank_account_info: Object.fromEntries(
    Object.entries(b.fields)
      .filter(([k]) => k.startsWith("b."))
      .map(([k, v]) => [k.slice(2), v]),
  ),
  payee_document_file_no: b.material.fileNo,
});
