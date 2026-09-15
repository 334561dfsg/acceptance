<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import AppModal from "./AppModal.vue";
import { demo, leaveDemo } from "../lib/store";
import { checkPassword, changePassword, passwordIssue } from "../lib/password";
import { mfaInfo, requestMfa } from "../lib/mfa";
const router = useRouter(),
  open = ref(false),
  current = ref(""),
  next = ref(""),
  confirm = ref(""),
  error = ref(""),
  busy = ref(false);
function close() {
  if (busy.value) return;
  open.value = false;
  current.value = "";
  next.value = "";
  confirm.value = "";
  error.value = "";
}
async function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  const account = demo.email;
  try {
    if (!mfaInfo(account)) throw new Error("请先绑定身份验证器。");
    const issue = passwordIssue(next.value);
    if (issue) throw new Error(issue);
    if (next.value !== confirm.value)
      throw new Error("两次输入的新密码不一致。");
    if (current.value === next.value)
      throw new Error("新密码不能与当前密码相同。");
    await checkPassword(account, current.value);
    if (
      !(await requestMfa(
        account,
        "验证身份后修改密码，修改成功后需要重新登录。",
      ))
    )
      return;
    if (demo.email !== account) return;
    await changePassword(account, current.value, next.value);
    leaveDemo();
    await router.replace({ path: "/login", query: { changed: "1" } });
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="security-row password-row">
    <div>
      <h3>登录密码</h3>
      <p>使用当前密码与动态验证码修改登录密码。</p>
    </div>
    <button class="btn secondary" @click="open = true">修改密码</button>
  </div>
  <AppModal v-if="open" title="修改密码" :prevent-close="busy" @close="close"
    ><form
      id="change-password-form"
      class="password-fields"
      @submit.prevent="submit"
    >
      <label
        >当前密码<input
          v-model="current"
          type="password"
          autocomplete="current-password"
          required
          :disabled="busy"
          maxlength="128" /></label
      ><label
        >新密码<input
          v-model="next"
          type="password"
          autocomplete="new-password"
          required
          :disabled="busy"
          maxlength="128"
          aria-describedby="password-rule"
      /></label>
      <p id="password-rule" class="muted">12–128位，包含字母、数字和符号。</p>
      <label
        >确认新密码<input
          v-model="confirm"
          type="password"
          autocomplete="new-password"
          required
          :disabled="busy"
          maxlength="128"
      /></label>
      <p v-if="error" class="mvp-error" role="alert">{{ error }}</p>
    </form>
    <template #footer
      ><button class="btn secondary" :disabled="busy" @click="close">
        取消</button
      ><button
        class="btn primary"
        type="submit"
        form="change-password-form"
        :disabled="busy"
      >
        {{ busy ? "验证中…" : "验证并修改" }}
      </button></template
    ></AppModal
  >
</template>
<style>
.password-row {
  border-top: 1px solid #e4e9dd;
  padding-top: 22px;
  margin-top: 24px;
}
.password-fields {
  display: grid;
  gap: 18px;
}
.password-fields p {
  margin: 0;
  font-size: 13px;
}
</style>
