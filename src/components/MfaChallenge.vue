<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppModal from "./AppModal.vue";
import { challenge, finishChallenge, verifyMfa } from "../lib/mfa";
const code = ref(""),
  error = ref(""),
  busy = ref(false);
watch(
  () => challenge.open,
  () => {
    code.value = "";
    error.value = "";
  },
);
const route = useRoute();
watch(
  () => route.fullPath,
  () => finishChallenge(false),
);
async function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  const email = challenge.email;
  try {
    await verifyMfa(email, code.value);
    if (challenge.open && challenge.email === email) finishChallenge(true);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <AppModal
    v-if="challenge.open"
    :prevent-close="busy"
    title="安全验证"
    @close="finishChallenge(false)"
    ><p>{{ challenge.title }}</p>
    <p class="muted">输入身份验证器当前显示的 6 位动态验证码。</p>
    <form id="mfa-challenge-form" @submit.prevent="submit">
      <label
        >动态验证码<input
          v-model="code"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          placeholder="6 位验证码"
          required
          :disabled="busy"
      /></label>
      <p v-if="error" class="mvp-error" role="alert">{{ error }}</p>
    </form>
    <template #footer
      ><button
        class="btn secondary"
        :disabled="busy"
        @click="finishChallenge(false)"
      >
        取消</button
      ><button
        class="btn primary"
        form="mfa-challenge-form"
        :disabled="busy"
        type="submit"
      >
        {{ busy ? "验证中…" : "验证并继续" }}
      </button></template
    ></AppModal
  >
</template>
