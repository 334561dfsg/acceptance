import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const storage = new Map();
globalThis.sessionStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) };
let sequence = 0;
async function load(file, stubStore = false) {
 let source = fs.readFileSync(`src/lib/${file}.ts`, 'utf8').replace('import { reactive } from "vue";', 'const reactive = value => value;');
 if (stubStore) source = source.replace(/import .* from "\.\/(onboarding|mock-data|deposit-mvp)";/g, '') + '\nconst onboarding = {}; const resetOnboarding = () => {}; const seedMockData = () => {}; const deposits = [];';
 const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 return import('data:text/javascript;base64,' + Buffer.from(js + `\n// reload ${sequence++}`).toString('base64'));
}
test('会话刷新恢复，退出与过期后不恢复', async () => {
 storage.clear();
 const first = await load('store', true);
 first.enterDemo('demo@acceptance.example');
 const reloaded = await load('store', true);
 reloaded.restoreSession();
 assert.equal(reloaded.demo.email, 'demo@acceptance.example');
 reloaded.leaveDemo();
 const loggedOut = await load('store', true);
 loggedOut.restoreSession();
 assert.equal(loggedOut.demo.email, '');
 storage.set('acceptance.session.v1', JSON.stringify({email:'demo@acceptance.example',expires:1}));
 loggedOut.restoreSession();
 assert.equal(loggedOut.demo.email, '');
});
test('刷新保留修改后的密码、MFA绑定与验证码重放限制', async () => {
 storage.clear();
 const password = await load('password');
 await password.changePassword('demo@acceptance.example', 'Acceptance@2026', 'ChangedPassword@2026');
 const reloaded = await load('password');
 await reloaded.checkPassword('demo@acceptance.example', 'ChangedPassword@2026');
 await assert.rejects(reloaded.checkPassword('demo@acceptance.example', 'Acceptance@2026'));
 const mfa = await load('mfa');
 const secret = mfa.createSecret();
 const code = await mfa.totp(secret);
 await mfa.bindMfa('demo@acceptance.example', secret, code);
 const restored = await load('mfa');
 assert.ok(restored.mfaInfo('demo@acceptance.example'));
 await assert.rejects(restored.verifyMfa('demo@acceptance.example', code));
});
test('空白账户可登录并恢复会话，密码与完整数据账户隔离', async () => {
 storage.clear();
 const p = await load('password');
 await p.checkPassword('empty@acceptance.example', 'Acceptance@2026');
 await p.changePassword('empty@acceptance.example', 'Acceptance@2026', 'EmptyAccount@2026');
 const reloaded = await load('password');
 await reloaded.checkPassword('empty@acceptance.example', 'EmptyAccount@2026');
 await reloaded.checkPassword('demo@acceptance.example', 'Acceptance@2026');
 const session = await load('store', true);
 session.enterDemo('empty@acceptance.example');
 const restored = await load('store', true);
 restored.restoreSession();
 assert.equal(restored.demo.email, 'empty@acceptance.example');
});
