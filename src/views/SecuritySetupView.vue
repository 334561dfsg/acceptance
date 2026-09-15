<script setup lang="ts">
import { useRouter } from "vue-router";
import SecuritySettings from "../components/SecuritySettings.vue";
const router = useRouter();
</script>
<template>
  <div class="mvp-page">
    <div class="page-heading">
      <div>
        <h1>设置账户安全</h1>
        <p>账号密码已验证。请绑定身份验证器，完成后即可使用账户功能。</p>
      </div>
    </div>
    <SecuritySettings
      required-setup
      @complete="router.replace('/client/overview')"
    />
  </div>
</template>
