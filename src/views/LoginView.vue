<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { IconArrowRight, IconBuildingBank } from "@tabler/icons-vue";
import BrandLogo from "../components/BrandLogo.vue";
import { checkPassword } from "../lib/password";
import { mfaInfo, verifyMfa } from "../lib/mfa";
import { enterDemo } from "../lib/store";
const router = useRouter(),
  route = useRoute();
const mfaCode = ref("");
const email = ref("demo@acceptance.example"),
  password = ref("Acceptance@2026"),
  error = ref(""),
  busy = ref(false);
async function login() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  const account = email.value.trim().toLowerCase();
  try {
    await checkPassword(account, password.value);
    if (mfaInfo(account)) await verifyMfa(account, mfaCode.value.trim());
    enterDemo(account);
    password.value = "";
    mfaCode.value = "";
    const target = String(route.query.redirect || "");
    await router.push(
      target.startsWith("/client/") ? target : "/client/overview",
    );
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="login-page">
    <section class="login-story">
      <BrandLogo />
      <div class="login-illustration" aria-hidden="true">
        <svg
          viewBox="0 0 640 640"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="login-orbit"
              x1="100"
              y1="90"
              x2="520"
              y2="570"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#86a95e" />
              <stop offset="1" stop-color="#d9e7c6" />
            </linearGradient>
            <radialGradient id="login-glow">
              <stop stop-color="#e0efcc" />
              <stop offset="1" stop-color="#edf3e3" stop-opacity="0" />
            </radialGradient>
            <pattern
              id="login-grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="#9aaa88" opacity=".3" />
            </pattern>
          </defs>
          <rect width="640" height="640" fill="url(#login-grid)" />
          <circle cx="320" cy="320" r="290" fill="url(#login-glow)" />
          <g stroke="url(#login-orbit)">
            <circle cx="320" cy="320" r="232" stroke-dasharray="3 12" />
            <circle cx="320" cy="320" r="176" />
            <ellipse
              cx="320"
              cy="320"
              rx="265"
              ry="112"
              transform="rotate(-32 320 320)"
            />
            <ellipse
              cx="320"
              cy="320"
              rx="265"
              ry="112"
              transform="rotate(32 320 320)"
            />
          </g>
          <g stroke="#88a76a" stroke-width="1.5">
            <path
              d="M121 192h78l60 76M501 178h-61l-65 89M114 444h104l49-72M510 437h-83l-51-66"
            />
            <path d="M320 75v78m0 335v77" stroke-dasharray="4 8" />
          </g>
          <g fill="#f9fcf4" stroke="#b6cba0">
            <rect x="88" y="168" width="64" height="48" rx="12" />
            <rect x="473" y="154" width="56" height="48" rx="12" />
            <rect x="83" y="420" width="64" height="48" rx="12" />
            <rect x="480" y="412" width="62" height="48" rx="12" />
          </g>
          <g stroke="#668847" stroke-width="2" stroke-linecap="round">
            <path
              d="M107 185h24m-24 8h16M491 178h20m-7-7 7 7-7 7M100 437h25m-25 8h17M499 434l7 7 14-15"
            />
          </g>
          <rect
            x="234"
            y="234"
            width="172"
            height="172"
            rx="42"
            fill="#e0ebd1"
            fill-opacity=".6"
            transform="rotate(-10 320 320)"
          />
          <rect
            x="246"
            y="246"
            width="148"
            height="148"
            rx="34"
            fill="#fbfdf7"
            stroke="#bbcea7"
          />
          <g stroke="#557637" stroke-width="5" stroke-linejoin="round">
            <rect x="286" y="300" width="51" height="51" rx="8" />
            <rect x="303" y="283" width="51" height="51" rx="8" />
          </g>
          <g fill="#6d914e">
            <circle cx="320" cy="88" r="5" />
            <circle cx="497" cy="320" r="5" />
            <circle cx="207" cy="521" r="5" />
            <circle cx="147" cy="321" r="4" />
          </g>
        </svg>
      </div>
    </section>
    <section class="login-form-wrap">
      <form class="login-form" @submit.prevent="login">
        <div class="large-icon"><IconBuildingBank :size="28" /></div>
        <h2>欢迎回到客户系统</h2>
        <p class="muted">进入您的企业资金工作空间</p>
        <label
          >账号<input
            v-model="email"
            type="email"
            :disabled="busy"
            autocomplete="username"
            required
            placeholder="name@company.com"
        /></label>

        <label
          >密码<input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            :disabled="busy"
            maxlength="128"
            placeholder="请输入密码"
        /></label>
        <label
          >MFA 动态验证码<input
            v-model="mfaCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            :disabled="busy"
            placeholder="请输入 6 位动态验证码"
            aria-describedby="login-mfa-help"
        /></label>
        <div class="login-mfa-help">
          <p id="login-mfa-help">
            已绑定 MFA 请填写；未绑定可留空，登录后需完成绑定。
          </p>
        </div>
        <p v-if="route.query.changed" class="mvp-notice" role="status">
          密码已修改，请使用新密码重新登录。
        </p>
        <p v-if="error" class="mvp-error" role="alert">{{ error }}</p>
        <button class="btn primary full" type="submit" :disabled="busy">
          {{ busy ? "登录中…" : "登录" }} <IconArrowRight :size="18" />
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login-story {
  position: relative;
  overflow: hidden;
  padding: 48px 8%;
  justify-content: flex-start;
}
.login-illustration {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}
.login-illustration svg {
  width: 100%;
  max-width: 640px;
  height: auto;
}
.login-form-wrap {
  position: relative;
  justify-content: center;
  padding: 96px 10% 64px;
}

.login-form {
  max-width: 400px;
  margin: 24px auto;
}
.login-form label {
  display: block;
  margin-top: 24px;
}
.login-form input {
  display: block;
  width: 100%;
  margin-top: 9px;
  min-height: 46px;
}
.login-form > .btn {
  margin-top: 28px;
  min-height: 46px;
}
.login-mfa-help {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.login-mfa-help p {
  font-size: 12px;
  line-height: 1.65;
  color: #89917f;
  margin: 0;
}
.login-mfa-help button {
  font-size: 12px;
}
.login-form .large-icon {
  margin-bottom: 20px;
}
.login-form h2 {
  font-size: 25px;
}
.login-form > .mvp-error,
.login-form > .mvp-notice {
  margin-top: 18px;
}
@media (max-width: 760px) {
  .login-story {
    padding: 24px 7%;
    min-height: auto;
  }
  .login-illustration {
    display: none;
  }
  .login-form-wrap {
    padding: 70px 7% 32px;
    min-height: calc(100dvh - 80px);
  }

  .login-form {
    margin: 12px auto;
  }
}
</style>
