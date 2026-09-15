import { reactive } from "vue";
import countries from "./countries.json";
import { mvp } from "./mvp";
export interface Entry {
  key: string;
  label: string;
  type?: string;
  max?: number;
  options?: Array<{ value: string; label: string }>;
  optional?: boolean;
}
export interface LocalMaterial {
  name: string;
  size: number;
  fileNo: string;
  sample: boolean;
}
export const addressFields = (prefix: string): Entry[] => [
  { key: prefix + "country", label: "国家 / 地区", max: 2, options: countries },
  { key: prefix + "state", label: "州 / 省 / 行政区", max: 32 },
  { key: prefix + "city", label: "城市", max: 32 },
  { key: prefix + "postcode", label: "邮编", max: 16 },
  { key: prefix + "line1", label: "详细地址", max: 256 },
];
export const companyFields: Entry[] = [
  {
    key: "company_type",
    label: "企业类型",
    options: [
      { value: "CORPORATION", label: "股份有限公司" },
      { value: "PARTNERSHIP", label: "合伙企业" },
      { value: "LIMITED_COMPANY", label: "有限公司" },
      { value: "OTHER", label: "其他" },
    ],
  },
  { key: "company_name", label: "企业官方名称", max: 256 },
  { key: "company_name_en", label: "企业英文名称", max: 64 },
  { key: "company_registration_no", label: "企业注册号", max: 64 },
  { key: "company_registration_date", label: "注册日期", type: "date" },
  {
    key: "company_license_effective_date",
    label: "执照起始日期",
    type: "date",
  },
  { key: "company_license_expiry_date", label: "执照失效日期", type: "date" },
  {
    key: "business_site_url",
    label: "企业官网（不填写则须上传业务证明）",
    type: "url",
    max: 512,
    optional: true,
  },
];
export const personFields: Entry[] = [
  { key: "name", label: "姓名", max: 64 },
  { key: "name_en", label: "英文姓名", max: 64 },
  { key: "document_number", label: "护照号码", max: 64 },
  { key: "date_of_birth", label: "出生日期", type: "date" },
  { key: "document_issue_date", label: "证件签发日期", type: "date" },
  { key: "document_expiry_date", label: "证件到期日期", type: "date" },
  ...addressFields("residential_"),
];
export const bankFields: Entry[] = [
  { key: "p.province", label: "收款人州 / 省", max: 128 },
  { key: "p.city", label: "收款人城市", max: 128 },
  { key: "p.post_code", label: "收款人邮编", max: 32 },
  { key: "b.account_name", label: "银行账户名称（英文）", max: 255 },
  { key: "b.account_no", label: "银行账号", max: 64 },
  { key: "b.bank_name", label: "银行名称（英文）", max: 255 },
  { key: "b.swift_code", label: "SWIFT / BIC", max: 16 },
  { key: "b.province", label: "银行州 / 省", max: 128 },
  { key: "b.bank_address", label: "银行地址", max: 512, optional: true },
  { key: "b.city", label: "银行城市", max: 128, optional: true },
];
export const onboarding = reactive({
  owner: "",
  merchantSn: "",
  company: {} as Record<string, string>,
  legal: {} as Record<string, string>,
  ubos: [{}] as Record<string, string>[],
  industry: "Electronics",
  isListed: false,
  isStateOwned: false,
  isForeignOwned: false,
  materials: {} as Record<string, LocalMaterial>,
  bank: {} as Record<string, string>,
  bankMaterial: undefined as LocalMaterial | undefined,
  kycReason: "",
  bankReason: "",
  kycSubmitted: null as null | Record<string, unknown>,
  bankSubmitted: null as null | Record<string, unknown>,
  bankAction: "CREATE",
});
export const materialNames: Record<string, string> = {
  BR: "商业登记证",
  CI: "公司注册证书",
  NNC1: "法团成立表格",
  NAR: "周年申报表",
  BAP: "经营场所照片",
  SSC: "股权结构图",
  BUSINESS_DOCUMENT: "业务证明",
  LEGAL_PP: "法人护照",
  EXTRA: "补充材料",
  BANK: "银行账户证明",
};
export const materialKeys = () => [
  "BR",
  "CI",
  "NNC1",
  "NAR",
  "BAP",
  ...(onboarding.isForeignOwned ? ["SSC"] : []),
  ...(!onboarding.company.business_site_url ? ["BUSINESS_DOCUMENT"] : []),
  "LEGAL_PP",
  ...onboarding.ubos.map((_, i) => `UBO_${i}_PP`),
];
export const extensions = (kind: string) =>
  kind === "BANK"
    ? ["pdf", "jpg", "jpeg", "png"]
    : ["NNC1", "NAR"].includes(kind)
      ? ["pdf", "jpg", "zip", "rar"]
      : ["SSC", "EXTRA"].includes(kind)
        ? ["xls", "xlsx", "doc", "docx", "pdf", "jpg", "zip", "rar"]
        : kind === "BUSINESS_DOCUMENT"
          ? ["pdf", "jpg", "jpeg", "png", "bmp", "zip", "rar"]
          : ["jpg", "jpeg", "png", "bmp"];
export function materialIssue(
  file: { name: string; size: number },
  kind: string,
) {
  if (!file.size) return "文件不能为空";
  if (kind === "BANK" ? file.size > 10485760 : file.size >= 10485760)
    return kind === "BANK" ? "文件不能超过 10 MB" : "KYC 文件必须小于 10 MB";
  if (
    !extensions(kind).includes(file.name.split(".").pop()?.toLowerCase() || "")
  )
    return "文件格式不符合要求";
  return "";
}
export const localMaterial = (
  name: string,
  size: number,
  sample = false,
): LocalMaterial => ({
  name,
  size,
  sample,
  fileNo: "MOCK_FILE_" + crypto.randomUUID().replaceAll("-", ""),
});
export function createMerchant(name: string, email: string) {
  if (mvp.merchant.no) return;
  if (!name.trim()) throw new Error("请填写企业名称");
  if (name.trim().length > 256) throw new Error("企业名称不能超过 256 个字符");
  onboarding.owner = email;
  onboarding.merchantSn = "DEMO_" + crypto.randomUUID().replaceAll("-", "");
  mvp.merchant.no = "M_DEMO_" + crypto.randomUUID().slice(0, 8);
  mvp.merchant.name = name.trim();
  mvp.merchant.status = "ACTIVE";
  mvp.merchant.channel = "UNAVAILABLE";
  onboarding.company.company_name = name.trim();
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function validWebsite(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !!url.hostname;
  } catch {
    return false;
  }
}
export function fieldsIssue(data: Record<string, string>, fields: Entry[]) {
  for (const f of fields) {
    const v = (data[f.key] || "").trim();
    if (!f.optional && !v.trim()) return "请填写" + f.label;
    if (f.max && v.length > f.max) return f.label + "超出长度限制";
    if (f.type === "date" && v && !validDate(v)) return f.label + "格式不正确";
    if (f.options && v && !f.options.some((o) => o.value === v))
      return "请选择" + f.label;
    if (f.key.endsWith("country") && v && !/^[A-Z]{2}$/.test(v))
      return "国家 / 地区请填写两位大写代码";
  }
  return "";
}
function address(data: Record<string, string>, prefix: string) {
  return Object.fromEntries(
    ["country", "state", "city", "postcode", "line1"].map((k) => [
      k,
      data[prefix + k]?.trim(),
    ]),
  );
}
function person(data: Record<string, string>, key: string) {
  return {
    name: data.name,
    name_en: data.name_en,
    document_number: data.document_number,
    date_of_birth: data.date_of_birth?.replaceAll("-", ""),
    document_issue_date: data.document_issue_date?.replaceAll("-", ""),
    document_expiry_date: data.document_expiry_date?.replaceAll("-", ""),
    residential_address: address(data, "residential_"),
    [key === "LEGAL_PP" ? "legal_attachments" : "ubo_attachments"]: [
      { file_type: "PP", file_no: onboarding.materials[key]?.fileNo },
    ],
  };
}
export function kycIssue() {
  const c = onboarding.company;
  let issue = fieldsIssue(c, [
    ...companyFields,
    ...addressFields("register_"),
    ...addressFields("operation_"),
  ]);
  if (issue) return issue;
  if (c.register_country !== "HK")
    return "目前仅支持香港企业，注册国家代码请填写 HK";
  if (c.business_site_url && !validWebsite(c.business_site_url))
    return "官网须为完整 http 或 https 地址";
  issue = fieldsIssue(onboarding.legal, personFields);
  if (issue) return "法人：" + issue;
  if (onboarding.ubos.length < 1 || onboarding.ubos.length > 10)
    return "需填写 1 至 10 名最终受益人";
  for (let i = 0; i < onboarding.ubos.length; i++) {
    issue = fieldsIssue(onboarding.ubos[i]!, personFields);
    if (issue) return `受益人 ${i + 1}：${issue}`;
  }
  for (const key of materialKeys())
    if (!onboarding.materials[key])
      return "请添加" + (materialNames[key] || key);
  return "";
}
export function kycPayload() {
  const c = onboarding.company;
  const company = Object.fromEntries(
    companyFields.map((f) => [
      f.key,
      f.type === "date" ? c[f.key]?.replaceAll("-", "") : c[f.key],
    ]),
  );
  return {
    merchant_no: mvp.merchant.no,
    kyc_type: "HK_ENTERPRISE",
    industry: [onboarding.industry],
    sync_to_psp: true,
    company_info: {
      ...company,
      is_listed: onboarding.isListed,
      is_state_owned: onboarding.isStateOwned,
      is_foreign_owned: onboarding.isForeignOwned,
      register_address: address(c, "register_"),
      operation_address: address(c, "operation_"),
      company_attachments: materialKeys()
        .filter((k) => !k.endsWith("_PP"))
        .map((k) => ({
          file_type: k,
          file_no: onboarding.materials[k]?.fileNo,
        })),
      legal_info: person(onboarding.legal, "LEGAL_PP"),
      ubo_list: onboarding.ubos.map((u, i) => person(u, `UBO_${i}_PP`)),
    },
    ...(onboarding.materials.EXTRA
      ? { extra_document: { file_no: onboarding.materials.EXTRA.fileNo } }
      : {}),
  };
}
export function submitKyc() {
  if (!mvp.merchant.no || mvp.merchant.channel !== "UNAVAILABLE")
    throw new Error("当前状态不允许提交 KYC");
  const issue = kycIssue();
  if (issue) throw new Error(issue);
  onboarding.kycSubmitted = JSON.parse(JSON.stringify(kycPayload()));
  mvp.merchant.channel = "UNDER_REVIEW";
  onboarding.kycReason = "";
}
export function reviewKyc(approved: boolean) {
  if (mvp.merchant.channel !== "UNDER_REVIEW") return;
  mvp.merchant.channel = approved ? "AVAILABLE" : "UNAVAILABLE";
  onboarding.kycReason = approved
    ? ""
    : "审核意见：经营场所照片不清晰，请重新选择材料并提交。";
}
export function bankIssue() {
  let issue = fieldsIssue(onboarding.bank, bankFields);
  if (issue) return issue;
  const b = onboarding.bank;
  if (!/^[A-Za-z0-9]{3,33}$/.test(b["b.account_no"] || ""))
    return "银行账号应为 3–33 位英文字母或数字";
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(b["b.swift_code"] || ""))
    return "SWIFT 应为 8 或 11 位有效格式";
  if (!onboarding.bankMaterial) return "请添加银行账户证明";
  return "";
}
export function bankPayload() {
  const p: Record<string, string> = {},
    b: Record<string, string> = {};
  for (const f of bankFields) {
    const value = onboarding.bank[f.key];
    if (value) (f.key.startsWith("p.") ? p : b)[f.key.slice(2)] = value;
  }
  return {
    merchant_no: mvp.merchant.no,
    payee_sn: "DEMO_BANK_" + onboarding.merchantSn,
    country: "HK",
    currency: "USD",
    payee_type: "SELF",
    holder_type: "COMPANY",
    payment_method: "BANK_ACCOUNT",
    routing_type: "SWIFT",
    payee_info: p,
    bank_account_info: b,
    payee_document_file_no: onboarding.bankMaterial?.fileNo,
  };
}
export function submitBank() {
  if (
    mvp.merchant.channel !== "AVAILABLE" ||
    !["", "DECLINED"].includes(mvp.payee.status)
  )
    throw new Error("请先等待通道开通，且银行账户须未提交或已驳回");
  const issue = bankIssue();
  if (issue) throw new Error(issue);
  const payload = bankPayload();
  onboarding.bankAction = mvp.payee.status === "DECLINED" ? "UPDATE" : "CREATE";
  onboarding.bankSubmitted = JSON.parse(
    JSON.stringify(
      onboarding.bankAction === "UPDATE"
        ? {
            payee_no: mvp.payee.no,
            payee_info: payload.payee_info,
            bank_account_info: payload.bank_account_info,
            payee_document_file_no: payload.payee_document_file_no,
          }
        : payload,
    ),
  );
  mvp.payee.no ||= "PE_DEMO_" + crypto.randomUUID().slice(0, 8);
  mvp.payee.status = "PENDING";
  onboarding.bankReason = "";
  mvp.payee.relationship = "SELF";
  mvp.payee.accountName = onboarding.bank["b.account_name"]!;
  mvp.payee.accountNo = onboarding.bank["b.account_no"]!;
  mvp.payee.bankName = onboarding.bank["b.bank_name"]!;
}
export function reviewBank(approved: boolean) {
  if (mvp.payee.status !== "PENDING") return;
  mvp.payee.status = approved ? "APPROVED" : "DECLINED";
  onboarding.bankReason = approved
    ? ""
    : "审核意见：银行账户名称与证明材料不一致，请修改后重新提交。";
}
export function sampleKyc() {
  const c = onboarding.company;
  Object.assign(c, {
    company_type: "LIMITED_COMPANY",
    company_name: mvp.merchant.name,
    company_name_en: "DEMO TRADING LIMITED",
    company_registration_no: "DEMO123456",
    company_registration_date: "2020-01-01",
    company_license_effective_date: "2026-01-01",
    company_license_expiry_date: "2030-01-01",
    business_site_url: "https://example.com",
  });
  for (const prefix of ["register_", "operation_"])
    for (const [k, v] of Object.entries({
      country: "HK",
      state: "Hong Kong",
      city: "Hong Kong",
      postcode: "000000",
      line1: "DEMO ADDRESS ONLY",
    }))
      c[prefix + k] = v;
  const p = {
    name: "演示人员",
    name_en: "DEMO PERSON",
    document_number: "DEMO123456",
    date_of_birth: "1990-01-01",
    document_issue_date: "2020-01-01",
    document_expiry_date: "2030-01-01",
    residential_country: "HK",
    residential_state: "Hong Kong",
    residential_city: "Hong Kong",
    residential_postcode: "000000",
    residential_line1: "DEMO ADDRESS ONLY",
  };
  Object.assign(onboarding.legal, p);
  onboarding.ubos = [{ ...p }];
  for (const key of materialKeys())
    onboarding.materials[key] = localMaterial(
      "演示_" + key + "." + extensions(key)[0],
      1024,
      true,
    );
}
export function sampleBank() {
  Object.assign(onboarding.bank, {
    "p.province": "Hong Kong",
    "p.city": "Hong Kong",
    "p.post_code": "000000",
    "b.account_name": "DEMO TRADING LIMITED",
    "b.account_no": "DEMO1001001",
    "b.bank_name": "DEMO BANK",
    "b.swift_code": "DEMOHKHH",
    "b.province": "Hong Kong",
  });
  onboarding.bankMaterial = localMaterial("演示银行证明.pdf", 1024, true);
}

export function resetOnboarding() {
  Object.assign(onboarding, {
    owner: "",
    merchantSn: "",
    company: {},
    legal: {},
    ubos: [{}],
    industry: "Electronics",
    isListed: false,
    isStateOwned: false,
    isForeignOwned: false,
    materials: {},
    bank: {},
    bankMaterial: undefined,
    kycReason: "",
    bankReason: "",
    kycSubmitted: null,
    bankSubmitted: null,
    bankAction: "CREATE",
  });
  Object.assign(mvp.merchant, { no: "", name: "", status: "", channel: "" });
  Object.assign(mvp.payee, {
    no: "",
    status: "",
    relationship: "SELF",
    accountName: "",
    accountNo: "",
    bankName: "",
  });
  mvp.balances.USDT = "0.00";
  mvp.balances.USDC = "0.00";
  mvp.frozen.USDT = "0.00";
  mvp.frozen.USDC = "0.00";
  mvp.orders.length = 0;
  mvp.banks.length = 0;
}
