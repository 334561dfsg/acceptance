/** Frontend fixtures only. No PayFi request, live wallet address, or actual funds.
 * Kept independent from views so the API adapter can replace this data source.
 */
import { mvp, type BankAccount, type ExchangeOrder } from "./mvp";
import { deposits, type Deposit } from "./deposit-mvp";
import {
  onboarding,
  materialKeys,
  extensions,
  type LocalMaterial,
} from "./onboarding";
import { bankTemplate } from "./banks";
import { units, decimal, balanceDecimal } from "./payfi-rules";
const material = (name: string): LocalMaterial => ({
  name,
  size: 245760,
  fileNo: "FL_MOCK_" + name,
  sample: true,
});
export function seedMockData(email: string, now = Date.now()) {
  if (
    email !== "demo@acceptance.example" ||
    mvp.merchant.no ||
    onboarding.owner
  )
    return;
  const hour = 3600000;
  Object.assign(mvp.merchant, {
    no: "MT260901A7C9E2",
    name: "星澜国际贸易有限公司",
    status: "ACTIVE",
    channel: "AVAILABLE",
  });
  onboarding.owner = email;
  onboarding.merchantSn = "AC-MERCHANT-10001";
  Object.assign(onboarding.company, {
    company_type: "LIMITED_COMPANY",
    company_name: mvp.merchant.name,
    company_name_en: "STARLANE INTERNATIONAL TRADING LIMITED",
    company_registration_no: "76543210",
    company_registration_date: "2021-06-18",
    company_license_effective_date: "2026-06-18",
    company_license_expiry_date: "2027-06-17",
    business_site_url: "https://starlane.example",
    register_country: "HK",
    register_state: "Kowloon",
    register_city: "Kwun Tong",
    register_postcode: "000000",
    register_line1: "Unit 1208, Example Trade Centre",
    operation_country: "HK",
    operation_state: "Kowloon",
    operation_city: "Kwun Tong",
    operation_postcode: "000000",
    operation_line1: "Unit 1208, Example Trade Centre",
  });
  onboarding.industry = "Electronics";
  const person = {
    name: "陈星",
    name_en: "CHAN SING",
    document_number: "MOCK-PASSPORT-001",
    date_of_birth: "1988-04-12",
    document_issue_date: "2022-01-20",
    document_expiry_date: "2032-01-19",
    residential_country: "HK",
    residential_state: "Hong Kong",
    residential_city: "Kowloon",
    residential_postcode: "000000",
    residential_line1: "Example Residence, Kowloon",
  };
  Object.assign(onboarding.legal, person);
  onboarding.ubos = [{ ...person }];
  for (const key of materialKeys())
    onboarding.materials[key] = material(`${key}.${extensions(key)[0]}`);
  const specs = [
    [
      "SELF",
      "HK",
      "SWIFT",
      "APPROVED",
      "STARLANE INTERNATIONAL TRADING LIMITED",
      "香港商业银行",
      "100088662345",
    ],
    [
      "THIRD_PARTY",
      "HK",
      "SWIFT",
      "APPROVED",
      "NORTHSTAR TECHNOLOGY LIMITED",
      "海港商业银行",
      "200055667890",
    ],
    [
      "SELF",
      "HK",
      "RTGS",
      "PENDING",
      "STARLANE INTERNATIONAL TRADING LIMITED",
      "港湾企业银行",
      "300012345678",
    ],
    [
      "THIRD_PARTY",
      "HK",
      "SWIFT",
      "DECLINED",
      "HORIZON LOGISTICS LIMITED",
      "远景商业银行",
      "400076543210",
    ],
  ];
  for (const [i, spec] of specs.entries()) {
    const [
      relationship,
      country,
      routing,
      status,
      accountName,
      bankName,
      accountNo,
    ] = spec as [string, string, string, string, string, string, string];
    const values: Record<string, string> = {
      "p.company_name": accountName,
      "p.payee_country": country,
      "p.province": country === "US" ? "California" : "Hong Kong",
      "p.city": country === "US" ? "San Francisco" : "Kowloon",
      "p.post_code": country === "US" ? "94105" : "000000",
      "p.street_address": "120 Example Business Avenue",
      "b.account_name": accountName,
      "b.account_no": accountNo,
      "b.bank_name": country === "US" ? bankName : "Example Commercial Bank",
      "b.swift_code": country === "US" ? "EXAMUS33" : "EXAMHKHH",
      "b.province": country === "US" ? "California" : "Hong Kong",
      "b.city": country === "US" ? "San Francisco" : "Hong Kong",
      "b.routing_value": "000000000",
      "b.bank_address": "88 Example Finance Avenue",
      "b.bank_code": "000",
      "b.branch_code": "001",
    };
    const b: BankAccount = {
      no: `PY260901B${i + 1}D8F0`,
      sn: `AC-PAYEE-1000${i + 1}`,
      status,
      relationship,
      country,
      routing,
      accountName,
      accountNo,
      bankName,
      fields: Object.fromEntries(
        bankTemplate(country, routing, relationship).map((f) => [
          f.key,
          values[f.key] || "",
        ]),
      ),
      material: material("银行账户证明.pdf"),
      reason:
        status === "DECLINED"
          ? "银行账户证明中的企业名称与申请资料不一致，请核对后重新提交。"
          : "",
      created: now - (240 - i * 24) * hour,
      updated: now - (48 - i * 6) * hour,
    };
    mvp.banks.push(b);
  }
  let credited = 0n;
  for (let i = 0; i < 24; i++) {
    const status = (
      [
        "PENDING",
        "PARTIAL",
        "COMPLETED",
        "COMPLETED",
        "TERMINATED",
        "COMPLETED",
      ] as const
    )[i % 6]!;
    const amount = [
      "15000.00",
      "8000.00",
      "12500.00",
      "5000.00",
      "20000.00",
      "3500.00",
    ][i % 6]!;
    const platformFee = decimal((units(amount) * 3n) / 1000n, 2),
      collaboratorFee = decimal((units(amount) * 2n) / 1000n, 2);
    const fee = decimal(units(platformFee) + units(collaboratorFee), 2);
    const received =
      status === "COMPLETED"
        ? decimal(units(amount))
        : status === "PARTIAL"
          ? "2000.12345678"
          : "0.00000000";
    const created = now - (i * 9 + 1) * hour;
    const d: Deposit = {
      id: `PM260915D${String(i + 1).padStart(3, "0")}C2`,
      sn: `AC-IN-202609-${String(i + 1).padStart(4, "0")}`,
      coin: "USDT",
      network: i % 2 ? "ETHEREUM" : "TRON",
      amount,
      net: decimal(units(amount) - units(fee), 2),
      fee,
      platformFee,
      collaboratorFee,
      received,
      trouble: i === 2 ? "120.50000000" : "0.00000000",
      status,
      created,
      updated: created + 1800000,
      completed: ["COMPLETED", "TERMINATED"].includes(status)
        ? created + 1800000
        : null,
      address: null,
      flows:
        units(received) > 0n
          ? [
              {
                id: `PF260915${i}A`,
                fromAddress: "链上来源地址未提供",
                amount: received,
                status: "RECEIVED",
                riskLevel: "LOW",
                created: created + 900000,
                txHash: (i + 1).toString(16).padStart(64, "0"),
              },
            ]
          : [],
      refundableFlows:
        i === 2
          ? [
              {
                id: "PF260915EXTRA",
                fromAddress: "链上来源地址未提供",
                amount: "120.50000000",
                refundStatus: "REFUNDABLE",
                riskLevel: "LOW",
                created: created + 2400000,
                txHash: "a".repeat(64),
              },
            ]
          : [],
    };
    credited +=
      units(received) > units(fee) ? units(received) - units(fee) : 0n;
    deposits.push(d);
  }
  let settled = 0n,
    frozen = 0n;
  for (let i = 0; i < 8; i++) {
    const status = (
      [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "COMPLETED",
        "CANCEL",
        "TERMINATED",
        "PROCESSING",
        "COMPLETED",
      ] as const
    )[i]!;
    const amount = [
      "2500.00",
      "8600.00",
      "12800.00",
      "3200.00",
      "1800.00",
      "4500.00",
      "1200.00",
      "6000.00",
    ][i]!;
    const fee = decimal(units(amount) / 200n, 2),
      net = decimal(units(amount) - units(fee), 2),
      receive = decimal((units(net) * 9990n) / 10000n, 2);
    const bank = mvp.banks[i % 2]!;
    const created =
      status === "PENDING" ? now - 60000 : now - (i * 13 + 2) * hour;
    const q: ExchangeOrder = {
      id: `ST260915E${String(i + 1).padStart(3, "0")}F8`,
      sn: `AC-OUT-202609-${String(i + 1).padStart(4, "0")}`,
      payeeNo: bank.no,
      orderType: bank.relationship === "SELF" ? "WITHDRAW" : "PAYOUT",
      direction: "SELL",
      coin: "USDT",
      amount,
      fee,
      platformFee: decimal((units(amount) * 3n) / 1000n, 2),
      collaboratorFee: decimal((units(amount) * 2n) / 1000n, 2),
      net,
      receive,
      actualReceive: status === "COMPLETED" ? receive : null,
      rate: "0.9990",
      status,
      created,
      updated: created + (status === "PENDING" ? 0 : 3600000),
      expires: created + 300000,
      completed: ["COMPLETED", "CANCEL", "TERMINATED"].includes(status)
        ? created + 3600000
        : null,
      purpose:
        status === "PENDING"
          ? ""
          : i % 2
            ? "PURCHASING"
            : "PAY_TO_ASSOCIATED_ENTITY",
      account: `${bank.accountName} · ${bank.bankName} · ${bank.accountNo} · USD / ${bank.routing}`,
      proofUrls: [],
      payoutChannel: ["COMPLETED", "PROCESSING"].includes(status)
        ? "PAYMENT_CHANNEL"
        : null,
      remark:
        status === "TERMINATED"
          ? "银行退回：收款信息需要核实。本次付款已终止。"
          : "",
    };
    mvp.orders.push(q);
    if (status === "COMPLETED") settled += units(amount);
    if (status === "PROCESSING") frozen += units(amount);
  }
  mvp.balances.USDT = balanceDecimal(credited - settled - frozen);
  mvp.frozen.USDT = balanceDecimal(frozen);
}
