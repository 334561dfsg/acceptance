import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(fs.readFileSync('src/lib/password.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const p=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('password login rejects unknown accounts and wrong passwords; changes invalidate previous password',async()=>{
 await assert.rejects(p.checkPassword('other@example.com','Acceptance@2026'),/账号或密码/);
 await assert.rejects(p.checkPassword('demo@acceptance.example','wrong'),/账号或密码/);
 await p.checkPassword('DEMO@acceptance.example','Acceptance@2026');
 await assert.rejects(p.changePassword('demo@acceptance.example','Acceptance@2026','short'),/12/);
 await assert.rejects(p.changePassword('demo@acceptance.example','wrong','NewPassword@2026'),/账号或密码/);
 await assert.rejects(p.changePassword('demo@acceptance.example','Acceptance@2026','Acceptance@2026'),/相同/);
 await p.changePassword('demo@acceptance.example','Acceptance@2026','NewPassword@2026');
 await assert.rejects(p.checkPassword('demo@acceptance.example','Acceptance@2026'));
 await p.checkPassword('demo@acceptance.example','NewPassword@2026');
});
