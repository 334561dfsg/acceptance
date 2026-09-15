<script setup lang="ts">
import BrandLogo from "../components/BrandLogo.vue";
import { IconShieldLock, IconArrowLeft } from "@tabler/icons-vue";
</script>
<template>
  <div class="portal">
    <header class="portal-header">
      <BrandLogo /><RouterLink to="/" class="back-link"
        ><IconArrowLeft :size="18" /> 返回首页</RouterLink
      >
    </header>
    <main class="admin-placeholder">
      <div class="large-icon"><IconShieldLock :size="32" /></div>
      <span class="eyebrow">管理后台</span>
      <h1>运营空间，准备就绪。</h1>
      <p>管理后台入口已建立，客户管理、交易审核与权限配置将在后续接入。</p>
      <span class="status neutral">尚未开放</span
      ><RouterLink to="/login" class="btn primary">预览客户系统</RouterLink>
    </main>
  </div>
</template>
