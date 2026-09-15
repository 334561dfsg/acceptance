<script setup lang="ts">
import { computed, ref } from "vue";
import QRCode from "qrcode";
import { IconShieldLock } from "@tabler/icons-vue";
import ChangePassword from "./ChangePassword.vue";
import AppModal from "./AppModal.vue";
import { demo } from "../lib/store";
import { mfaInfo, createSecret, bindMfa, requestMfa } from "../lib/mfa";
defineProps<{ requiredSetup?: boolean }>();
const emit = defineEmits<{ complete: [] }>();
const info = computed(() => mfaInfo(demo.email));
const mode = ref(""),
  secret = ref(""),
  qr = ref(""),
  code = ref(""),
  error = ref(""),
  busy = ref(false);
async function setup() {
  if (
    info.value &&
    !(await requestMfa(demo.email, "更换身份验证器前，请验证当前身份。"))
  )
    return;
  secret.value = createSecret();
  code.value = "";
  error.value = "";
  mode.value = "bind";
  qr.value = "";
  try {
    qr.value = await QRCode.toDataURL(
      `otpauth://totp/${encodeURIComponent("Acceptance:" + demo.email)}?secret=${secret.value}&issuer=Acceptance&algorithm=SHA1&digits=6&period=30`,
      { width: 220, margin: 2 },
    );
  } catch {
    error.value = "二维码生成失败，请使用手动密钥。";
  }
}
async function bind() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await bindMfa(demo.email, secret.value, code.value);
    secret.value = "";
    qr.value = "";
    close();
    emit("complete");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
function close() {
  mode.value = "";
  secret.value = "";
  qr.value = "";
  code.value = "";
  error.value = "";
}
</script>
<template>
  <section class="panel security-settings">
    <div class="section-heading">
      <h2>安全设置</h2>
      <IconShieldLock :size="24" />
    </div>
    <div class="security-row">
      <div>
        <h3>
          身份验证器（MFA）
          <span :class="['status', info ? 'success' : 'warning']">{{
            info ? "已绑定" : "未绑定"
          }}</span>
        </h3>
        <p>使用动态验证码保护登录、付款和收款账户变更。</p>
        <p v-if="info" class="muted">
          绑定时间：{{ new Date(info.boundAt).toLocaleString("zh-CN") }}
        </p>
      </div>
      <div class="security-actions">
        <button class="btn primary" @click="setup">
          {{ info ? "更换验证器" : "绑定验证器" }}
        </button>
      </div>
    </div>
    <ChangePassword v-if="!requiredSetup && info" />
  </section>
  <AppModal
    v-if="mode"
    :prevent-close="busy"
    title="绑定身份验证器"
    @close="close"
    ><p>
      使用 Google Authenticator、Microsoft Authenticator
      等身份验证器扫描二维码，然后输入动态验证码。
    </p>
    <div class="mfa-setup">
      <img
        v-if="qr"
        :src="qr"
        width="220"
        height="220"
        alt="用于绑定身份验证器的二维码"
      />
      <div>
        <strong>无法扫码？手动输入密钥</strong
        ><code class="mfa-secret">{{ secret }}</code>
        <p class="muted">请勿将二维码或密钥分享给他人。</p>
      </div>
    </div>
    <form id="mfa-bind-form" @submit.prevent="bind">
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
    </form>
    <p v-if="error" class="mvp-error" role="alert">{{ error }}</p>
    <template #footer
      ><button class="btn secondary" :disabled="busy" @click="close">
        取消</button
      ><button
        class="btn primary"
        form="mfa-bind-form"
        :disabled="busy"
        type="submit"
      >
        {{ busy ? "验证中…" : "验证并绑定" }}
      </button></template
    ></AppModal
  >
</template>
<style>
.security-settings {
  padding: 26px;
  margin-top: 24px;
}
.security-row {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
}
.security-row h3 {
  font-size: 16px;
}
.security-row p {
  font-size: 13px;
  color: #64748b;
}
.security-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.mfa-setup {
  display: flex;
  align-items: center;
  gap: 24px;
  margin: 24px 0;
}
.mfa-secret {
  display: block;
  overflow-wrap: anywhere;
  padding: 14px;
  background: #f8fafc;
  margin-top: 12px;
  user-select: all;
}

@media (max-width: 640px) {
  .security-row,
  .mfa-setup {
    flex-direction: column;
    align-items: flex-start;
  }

  .mfa-setup img {
    align-self: center;
  }
}
</style>
