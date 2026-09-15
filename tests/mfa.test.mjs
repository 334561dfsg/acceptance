import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const source = fs
  .readFileSync("src/lib/mfa.ts", "utf8")
  .replace(
    'from "vue"',
    `from "${pathToFileURL(require.resolve("vue")).href}"`,
  );
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const m = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
test("TOTP matches standard SHA1 test vector (six digit truncation)", async () => {
  assert.equal(
    await m.totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59000),
    "287082",
  );
});
test("binding validates code; secrets are absent from public status; only dynamic codes authorize", async () => {
  const secret = m.createSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  await assert.rejects(m.bindMfa("test@example.com", secret, "bad"));
  assert.equal(m.mfaInfo("test@example.com"), undefined);
  const code = await m.totp(secret);
  assert.equal(await m.bindMfa("test@example.com", secret, code), undefined);
  assert.deepEqual(Object.keys(m.mfaInfo("test@example.com")), ["boundAt"]);
  await assert.rejects(m.verifyMfa("test@example.com", code));
  await assert.rejects(m.verifyMfa("other@example.com", code));
  await assert.rejects(m.verifyMfa("test@example.com", "ABCD-EFGH-IJKL-MNOP"));
  m.removeMfa("test@example.com");
  assert.equal(m.mfaInfo("test@example.com"), undefined);
});
test("cancelled challenge never authorizes and repeated failures throttle", async () => {
  const secret = m.createSecret();
  await m.bindMfa("challenge@example.com", secret, await m.totp(secret));
  const pending = m.requestMfa("challenge@example.com", "Test");
  assert.equal(m.challenge.open, true);
  m.finishChallenge(false);
  assert.equal(await pending, false);
  for (let i = 0; i < 5; i++)
    await assert.rejects(m.verifyMfa("challenge@example.com", "bad"));
  await assert.rejects(m.verifyMfa("challenge@example.com", "bad"), /一分钟/);
  m.removeMfa("challenge@example.com");
});
