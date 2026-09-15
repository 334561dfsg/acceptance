<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { changePassword } from "../lib/password";
import { demo } from "../lib/store";
const router = useRouter(),
  current = ref(""),
  next = ref(""),
  confirm = ref(""),
  error = ref(""),
  busy = ref(false);
async function submit() {
  if (busy.value) return;
  error.value = "";
  if (next.value !== confirm.value) {
    error.value = "两次输入的密码不一致。";
    return;
  }
  busy.value = true;
  try {
    await changePassword(demo.email, current.value, next.value);
    await router.replace("/client/overview");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="mvp-page">
    <div class="page-heading">
      <div>
        <h1>设置登录密码</h1>
        <p>首次登录或密码重置后，请设置您自己的登录密码。</p>
      </div>
    </div>
    <form class="panel password-setup" @submit.prevent="submit">
      <p v-if="error" role="alert" class="mvp-error">{{ error }}</p>
      <label
        >初始 / 临时密码<input
          v-model="current"
          type="password"
          required
          autocomplete="current-password"
          :disabled="busy"
      /></label>
      <label
        >新密码<input
          v-model="next"
          type="password"
          required
          minlength="12"
          maxlength="128"
          autocomplete="new-password"
          :disabled="busy"
      /></label>
      <p class="muted">12–128 位，包含字母、数字和符号。</p>
      <label
        >确认新密码<input
          v-model="confirm"
          type="password"
          required
          autocomplete="new-password"
          :disabled="busy"
      /></label>
      <button class="btn primary" :disabled="busy">
        {{ busy ? "正在保存…" : "保存并继续" }}
      </button>
    </form>
  </div>
</template>
<style scoped>
.password-setup {
  max-width: 560px;
  padding: 28px;
  display: grid;
  gap: 20px;
}
.password-setup input {
  width: 100%;
}
</style>
