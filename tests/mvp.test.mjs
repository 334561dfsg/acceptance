import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
function compile(file, imports = {}) {
  let source = fs.readFileSync(file, "utf8");
  for (const [key, value] of Object.entries(imports))
    source = source
      .replaceAll(`from "${key}"`, `from "${value}"`)
      .replaceAll(`from '${key}'`, `from '${value}'`);
  return (
    "data:text/javascript;base64," +
    Buffer.from(
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    ).toString("base64")
  );
}
const countriesUrl =
  "data:text/javascript;base64," +
  Buffer.from(
    "export default " + fs.readFileSync("src/lib/countries.json", "utf8"),
  ).toString("base64");
const rulesUrl = compile("src/lib/payfi-rules.ts");
const mvpUrl = compile("src/lib/mvp.ts", {
  vue: pathToFileURL(require.resolve("vue")).href,
  "./payfi-rules": rulesUrl,
});
const depositUrl = compile("src/lib/deposit-mvp.ts", {
  vue: pathToFileURL(require.resolve("vue")).href,
  "./payfi-rules": rulesUrl,
  "./mvp": mvpUrl,
});
const { mvp, makeQuote, confirmOrder, advanceDemo } = await import(mvpUrl);
const { createDeposit, receiveDeposit } = await import(depositUrl);
const { units, decimal, supportedNetwork } = await import(rulesUrl);
test.beforeEach(() => {
  Object.assign(mvp.merchant, {
    no: "M_TEST",
    name: "TEST",
    status: "ACTIVE",
    channel: "AVAILABLE",
  });
  Object.assign(mvp.payee, {
    no: "P_TEST",
    status: "APPROVED",
    relationship: "SELF",
  });
  mvp.orders.length = 0;
  mvp.banks.length = 0;
  mvp.balances.USDT = "0.00";
  mvp.frozen.USDT = "0.00";
});
test("仅允许文档支持的币种网络，保留8位链上精度", () => {
  assert.equal(decimal(units("125.12345678")), "125.12345678");
  assert.equal(supportedNetwork("USDC", "TRON"), false);
  assert.throws(() => createDeposit("10", "USDC", "TRON"));
  assert.throws(() => createDeposit("1e3", "USDT", "TRON"));
});
test("正常收款扣除示例费用后入账，重复完成不会重复入账，终止不可到账", () => {
  mvp.balances.USDT = "0.00";
  const d = createDeposit("1000.00", "USDT", "TRON");
  assert.equal(d.status, "PENDING");
  assert.equal(d.completed, null);
  receiveDeposit(d);
  receiveDeposit(d);
  assert.equal(d.status, "COMPLETED");
  assert.equal(d.received, "1000.00000000");
  assert.equal(mvp.balances.USDT, "995.00");
  const closed = createDeposit("100", "USDT", "TRON");
  closed.status = "TERMINATED";
  receiveDeposit(closed);
  assert.equal(mvp.balances.USDT, "995.00");
});
test("询价不扣余额，确认冻结，完成扣冻结；重复操作无重复扣款", () => {
  mvp.balances.USDT = "1000.00";
  mvp.frozen.USDT = "0.00";
  const q = makeQuote("SELL", "USDT", "100", "approved bank");
  assert.equal(mvp.balances.USDT, "1000.00");
  assert.equal(q.receive, "99.40");
  confirmOrder(q, "PURCHASING");
  assert.equal(mvp.balances.USDT, "900.00");
  assert.equal(mvp.frozen.USDT, "100.00");
  assert.equal(q.completed, null);
  assert.throws(() => confirmOrder(q, "PURCHASING"));
  advanceDemo(q);
  advanceDemo(q);
  assert.equal(mvp.frozen.USDT, "0.00");
  assert.equal(mvp.balances.USDT, "900.00");
  assert.equal(q.status, "COMPLETED");
  assert.ok(q.completed);
});
test("报价过期、余额变化、缺少用途及取消后的订单不能确认", () => {
  mvp.balances.USDT = "1000.00";
  const q = makeQuote("SELL", "USDT", "100", "approved bank");
  assert.throws(() => confirmOrder(q, "PURCHASING", q.expires), /过期/);
  assert.throws(() => confirmOrder(q, ""), /用途/);
  mvp.balances.USDT = "50.00";
  assert.throws(() => confirmOrder(q, "PURCHASING"), /余额/);
  mvp.balances.USDT = "1000.00";
  q.status = "CANCEL";
  assert.throws(() => confirmOrder(q, "PURCHASING"));
});

test("确认时重新校验商户、通道与收款人，并依据SELF确定WITHDRAW", () => {
  mvp.balances.USDT = "1000.00";
  const q = makeQuote("SELL", "USDT", "100", "approved bank");
  assert.equal(q.orderType, "WITHDRAW");
  mvp.payee.status = "PENDING";
  assert.throws(() => confirmOrder(q, "PURCHASING"), /审核/);
  mvp.payee.status = "APPROVED";
  mvp.merchant.channel = "UNDER_REVIEW";
  assert.throws(() => confirmOrder(q, "PURCHASING"), /通道/);
  mvp.merchant.channel = "AVAILABLE";
  mvp.merchant.status = "PLATFORM_FROZEN";
  assert.throws(() => confirmOrder(q, "PURCHASING"), /账户/);
  mvp.merchant.status = "ACTIVE";
  assert.throws(() => confirmOrder(q, "INVALID"), /用途/);
  assert.equal(q.status, "PENDING");
  assert.equal(mvp.balances.USDT, "1000.00");
});

const onboardUrl = compile("src/lib/onboarding.ts", {
  "./countries.json": countriesUrl,
  vue: pathToFileURL(require.resolve("vue")).href,
  "./mvp": mvpUrl,
});
const ob = await import(onboardUrl);
test("开户→KYC→银行审核→收款→美元结算完整闭环，payload遵循文档", () => {
  Object.assign(mvp.merchant, { no: "", status: "", channel: "" });
  Object.assign(mvp.payee, { no: "", status: "" });
  ob.createMerchant("测试企业", "demo@example.com");
  assert.equal(mvp.merchant.status, "ACTIVE");
  assert.equal(mvp.merchant.channel, "UNAVAILABLE");
  assert.throws(() => ob.submitBank(), /通道/);
  assert.throws(() => ob.submitKyc(), /填写/);
  ob.sampleKyc();
  const kyc = ob.kycPayload();
  assert.equal(kyc.sync_to_psp, true);
  assert.equal(kyc.company_info.company_registration_date, "20200101");
  assert.equal(
    kyc.company_info.legal_info.legal_attachments[0].file_type,
    "PP",
  );
  assert.equal(kyc.company_info.ubo_list[0].ubo_attachments[0].file_type, "PP");
  ob.submitKyc();
  assert.equal(mvp.merchant.channel, "UNDER_REVIEW");
  assert.throws(() => ob.submitKyc(), /状态/);
  ob.reviewKyc(false);
  assert.ok(ob.onboarding.kycReason);
  ob.submitKyc();
  ob.reviewKyc(true);
  assert.equal(mvp.merchant.channel, "AVAILABLE");
  ob.sampleBank();
  ob.submitBank();
  assert.equal(ob.onboarding.bankSubmitted.payee_type, "SELF");
  assert.equal(ob.onboarding.bankSubmitted.routing_type, "SWIFT");
  assert.equal(mvp.payee.status, "PENDING");
  ob.reviewBank(false);
  ob.submitBank();
  assert.equal(ob.onboarding.bankAction, "UPDATE");
  assert.equal(ob.onboarding.bankSubmitted.payee_no, mvp.payee.no);
  assert.equal(ob.onboarding.bankSubmitted.payee_sn, undefined);
  ob.reviewBank(true);
  const d = createDeposit("1000", "USDT", "TRON");
  receiveDeposit(d);
  assert.equal(mvp.balances.USDT, "995.00");
  const q = makeQuote("SELL", "USDT", "900", mvp.payee.accountName);
  confirmOrder(q, "PURCHASING");
  advanceDemo(q);
  assert.equal(q.status, "COMPLETED");
  assert.equal(q.actualReceive, "894.60");
  assert.equal(mvp.balances.USDT, "95.00");
});
test("KYC与银行材料大小边界不同，必须提供条件证明", () => {
  assert.match(
    ob.materialIssue({ name: "a.jpg", size: 10485760 }, "BR"),
    /小于/,
  );
  assert.equal(ob.materialIssue({ name: "a.pdf", size: 10485760 }, "BANK"), "");
  assert.match(ob.materialIssue({ name: "a.pdf", size: 123 }, "BR"), /格式/);
  assert.match(ob.materialIssue({ name: "a.jpg", size: 0 }, "BR"), /不能为空/);
  ob.onboarding.isForeignOwned = true;
  ob.onboarding.company.business_site_url = "";
  assert.ok(ob.materialKeys().includes("SSC"));
  assert.ok(ob.materialKeys().includes("BUSINESS_DOCUMENT"));
});
test("重置开户数据不会让下一位演示用户继承资料或余额", () => {
  ob.onboarding.owner = "first@example.com";
  mvp.balances.USDT = "100";
  ob.resetOnboarding();
  assert.equal(ob.onboarding.owner, "");
  assert.equal(mvp.merchant.no, "");
  assert.equal(mvp.payee.status, "");
  assert.equal(mvp.balances.USDT, "0.00");
  assert.equal(mvp.orders.length, 0);
});

const banks = await import(
  compile("src/lib/banks.ts", {
    "./countries.json": countriesUrl,
    "./mvp": mvpUrl,
    "./onboarding": onboardUrl,
  })
);
function addBank(
  relationship = "SELF",
  number = "DEMO123",
  country = "HK",
  routing = "SWIFT",
) {
  const fields = Object.fromEntries(
    banks
      .bankTemplate(country, routing, relationship)
      .map((f) => [f.key, "Demo"]),
  );
  Object.assign(fields, {
    "b.account_no": number,
    "b.swift_code": "DEMOHKHH",
    "b.routing_value": "123456789",
    "p.payee_country": "HK",
  });
  banks.submitAccount(
    country,
    routing,
    relationship,
    fields,
    ob.localMaterial("proof.pdf", 100),
  );
  return mvp.banks[0];
}
test("六种对公银行场景，拒绝不支持的通道并过滤非模板字段", () => {
  for (const [country, routing] of [
    ["HK", "SWIFT"],
    ["HK", "RTGS"],
    ["US", "SWIFT"],
  ]) {
    for (const relationship of ["SELF", "THIRD_PARTY"]) {
      const b = addBank(relationship, country + routing, country, routing);
      const payload = banks.accountPayload(b);
      assert.equal(payload.holder_type, "COMPANY");
      assert.equal(payload.payee_type, relationship);
      assert.equal(
        payload.bank_account_info.routing_value,
        country === "US" ? "123456789" : undefined,
      );
    }
  }
  assert.equal(mvp.banks.length, 6);
  assert.deepEqual(banks.bankTemplate("US", "RTGS", "SELF"), []);
  assert.deepEqual(banks.bankTemplate("HK", "OTHER", "SELF"), []);
});
test("多银行付款关联正确，审核变更阻止确认，活动付款阻止删除", () => {
  mvp.balances.USDT = "1000.00";
  const own = addBank();
  assert.throws(() => makeQuote("SELL", "USDT", "100", "own", own.no));
  banks.reviewAccount(own, true);
  const third = addBank("THIRD_PARTY");
  banks.reviewAccount(third, true);
  const withdrawal = makeQuote("SELL", "USDT", "100", "own snapshot", own.no);
  const payout = makeQuote("SELL", "USDT", "100", "third snapshot", third.no);
  assert.equal(withdrawal.orderType, "WITHDRAW");
  assert.equal(payout.orderType, "PAYOUT");
  assert.equal(payout.payeeNo, third.no);
  assert.throws(() => banks.removeAccount(third), /未完成/);
  third.status = "DECLINED";
  assert.throws(() => confirmOrder(payout, "PURCHASING"), /审核/);
  third.status = "APPROVED";
  confirmOrder(payout, "PURCHASING");
  advanceDemo(payout);
  third.bankName = "Changed";
  assert.equal(payout.account, "third snapshot");
  banks.removeAccount(third);
  assert.equal(third.status, "DELETING");
});
test("重复账号与类型不能添加，驳回可全量更新且保留编号", () => {
  const b = addBank();
  assert.throws(() => addBank(), /已存在/);
  assert.throws(
    () => banks.submitAccount("HK", "SWIFT", "SELF", b.fields, b.material, b),
    /驳回/,
  );
  banks.reviewAccount(b, false);
  const no = b.no,
    sn = b.sn;
  banks.submitAccount(
    "HK",
    "SWIFT",
    "SELF",
    { ...b.fields, "b.bank_name": "New Bank", hidden: "drop" },
    b.material,
    b,
  );
  assert.equal(b.no, no);
  assert.equal(b.sn, sn);
  assert.equal(b.status, "PENDING");
  assert.equal(b.fields.hidden, undefined);
});

test("充值及付款不能截断已有的8位余额", () => {
  mvp.balances.USDT = "1000.12345678";
  mvp.frozen.USDT = "0.00000001";
  const order = makeQuote("SELL", "USDT", "100", "approved bank");
  confirmOrder(order, "PURCHASING");
  assert.equal(mvp.balances.USDT, "900.12345678");
  assert.equal(mvp.frozen.USDT, "100.00000001");
  advanceDemo(order);
  assert.equal(mvp.frozen.USDT, "0.00000001");
  receiveDeposit(createDeposit("100", "USDT", "TRON"));
  assert.equal(mvp.balances.USDT, "999.62345678");
});
test("关闭或未知通道不能映射为已开通", async () => {
  const { accountStage } = await import(rulesUrl);
  for (const status of ["CLOSED", "", "FUTURE_STATUS"])
    assert.equal(accountStage("M_TEST", status), -1);
  assert.equal(accountStage("M_TEST", "AVAILABLE"), 4);
  assert.equal(accountStage("M_TEST", "STABLE"), 4);
});
test("KYC日期、网址和国家字典拒绝非法输入", () => {
  assert.equal(ob.validDate("2026-02-30"), false);
  assert.equal(ob.validDate("2024-02-29"), true);
  assert.equal(ob.validWebsite("https://"), false);
  assert.equal(ob.validWebsite("https://example.com"), true);
  assert.ok(
    ob.fieldsIssue(
      { register_country: "ZZ" },
      ob.addressFields("register_").slice(0, 1),
    ),
  );
});
test("关联有效结算单的驳回账户不能更新", () => {
  const b = addBank();
  banks.reviewAccount(b, true);
  mvp.balances.USDT = "1000";
  makeQuote("SELL", "USDT", "100", "bank", b.no);
  b.status = "DECLINED";
  assert.throws(
    () => banks.submitAccount("HK", "SWIFT", "SELF", b.fields, b.material, b),
    /未完成付款/,
  );
});

const mock = await import(
  compile("src/lib/mock-data.ts", {
    "./mvp": mvpUrl,
    "./deposit-mvp": depositUrl,
    "./onboarding": onboardUrl,
    "./payfi-rules": rulesUrl,
    "./banks": compile("src/lib/banks.ts", {
      "./countries.json": countriesUrl,
      "./mvp": mvpUrl,
      "./onboarding": onboardUrl,
    }),
  })
);
test("Mock按账户初始化一次，金额对账且未创建真实充值地址", async () => {
  const { deposits } = await import(depositUrl);
  ob.resetOnboarding();
  deposits.length = 0;
  mock.seedMockData("another@example.invalid", 1800000000000);
  assert.equal(deposits.length, 0);
  mock.seedMockData("demo@acceptance.example", 1800000000000);
  assert.equal(deposits.length, 24);
  assert.equal(mvp.orders.length, 8);
  assert.equal(mvp.banks.length, 4);
  assert.ok(deposits.every((d) => d.address === null));
  const incoming = deposits.reduce(
    (sum, d) =>
      sum +
      (units(d.received) > units(d.fee)
        ? units(d.received) - units(d.fee)
        : 0n),
    0n,
  );
  const settled = mvp.orders
    .filter((q) => q.status === "COMPLETED")
    .reduce((sum, q) => sum + units(q.amount), 0n);
  const frozen = mvp.orders
    .filter((q) => q.status === "PROCESSING")
    .reduce((sum, q) => sum + units(q.amount), 0n);
  assert.equal(
    units(mvp.balances.USDT) + units(mvp.frozen.USDT) + settled,
    incoming,
  );
  assert.equal(units(mvp.frozen.USDT), frozen);
  mock.seedMockData("demo@acceptance.example");
  assert.equal(deposits.length, 24);
});
