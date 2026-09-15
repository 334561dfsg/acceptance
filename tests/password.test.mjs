import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const js = ts.transpileModule(fs.readFileSync("src/lib/password.ts", "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const p = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
test("password login rejects unknown accounts and wrong passwords; changes invalidate previous password", async () => {
  await assert.rejects(
    p.checkPassword("other@example.com", "Acceptance@2026"),
    /账号或密码/,
  );
  await assert.rejects(
    p.checkPassword("demo@acceptance.example", "wrong"),
    /账号或密码/,
  );
  await p.checkPassword("DEMO@acceptance.example", "Acceptance@2026");
  await assert.rejects(
    p.changePassword("demo@acceptance.example", "Acceptance@2026", "short"),
    /12/,
  );
  await assert.rejects(
    p.changePassword("demo@acceptance.example", "wrong", "NewPassword@2026"),
    /账号或密码/,
  );
  await assert.rejects(
    p.changePassword(
      "demo@acceptance.example",
      "Acceptance@2026",
      "Acceptance@2026",
    ),
    /相同/,
  );
  await p.changePassword(
    "demo@acceptance.example",
    "Acceptance@2026",
    "NewPassword@2026",
  );
  await assert.rejects(
    p.checkPassword("demo@acceptance.example", "Acceptance@2026"),
  );
  await p.checkPassword("demo@acceptance.example", "NewPassword@2026");
});

test("管理员新增、启停与重置密码联动登录且不泄露明文", async () => {
  const c = await p.createCustomer(
    " NEW@example.com ",
    "新客户",
    "InitialPassword@2026",
  );
  assert.equal(c.email, "new@example.com");
  assert.equal(c.mustChangePassword, true);
  assert.equal("password" in c, false);
  await p.checkPassword(c.email, "InitialPassword@2026");
  await assert.rejects(
    p.createCustomer("new@example.com", "", "AnotherPassword@2026"),
    /已存在/,
  );
  p.setCustomerEnabled(c.email, false);
  await assert.rejects(
    p.checkPassword(c.email, "InitialPassword@2026"),
    /停用/,
  );
  p.setCustomerEnabled(c.email, true);
  await p.resetCustomerPassword(c.email, "ResetPassword@2026");
  await assert.rejects(p.checkPassword(c.email, "InitialPassword@2026"));
  await p.checkPassword(c.email, "ResetPassword@2026");
  await p.changePassword(
    c.email,
    "ResetPassword@2026",
    "CustomerPassword@2026",
  );
  assert.equal(c.mustChangePassword, false);
});
