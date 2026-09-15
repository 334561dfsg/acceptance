<script setup lang="ts">
import { defineAsyncComponent } from "vue";
const DepositMvpView = defineAsyncComponent(
  () => import("../views/DepositMvpView.vue"),
);
const ExchangeMvpView = defineAsyncComponent(
  () => import("../views/ExchangeMvpView.vue"),
);
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IconBuildingBank,
  IconLayoutDashboard,
  IconDownload,
  IconHistory,
  IconLogout,
  IconMenu2,
  IconChevronDown,
  IconX,
  IconBuilding,
} from "@tabler/icons-vue";
import BrandLogo from "./BrandLogo.vue";
import { mvp } from "../lib/mvp";
import { demo, leaveDemo } from "../lib/store";
const route = useRoute(),
  router = useRouter();
const menu = ref(false);
const sections = [
  {
    items: [
      { name: "账户概览", path: "overview", icon: IconLayoutDashboard },
      { name: "收款账户", path: "accounts", icon: IconBuildingBank },
      { name: "充值订单", path: "payments", icon: IconDownload },
      { name: "付款订单", path: "orders", icon: IconHistory },
      { name: "账户信息", path: "onboarding", icon: IconBuildingBank },
    ],
  },
];
function logout() {
  leaveDemo();
  router.push("/login");
}
</script>
<template>
  <div class="app-shell">
    <aside :class="['sidebar', { expanded: menu }]">
      <div class="sidebar-logo">
        <RouterLink to="/"><BrandLogo /></RouterLink
        ><button
          class="icon-button mobile-only"
          aria-label="关闭导航"
          @click="menu = false"
        >
          <IconX />
        </button>
      </div>
      <nav aria-label="客户系统导航">
        <section v-for="(section, index) in sections" :key="index">
          <RouterLink
            v-for="item in section.items"
            :key="item.path"
            :to="'/client/' + item.path"
            :class="{
              active:
                route.path.includes('/client/' + item.path) ||
                (item.path === 'orders' && route.path === '/client/exchange'),
            }"
            @click="menu = false"
            ><component
              :is="item.icon"
              :size="20"
              stroke-width="1.65"
            /><span>{{ item.name }}</span>
            <span v-if="item.path === 'orders'" class="nav-count">{{
              mvp.orders.length
            }}</span></RouterLink
          >
        </section>
      </nav>
      <div class="sidebar-bottom">
        <button @click="logout"><IconLogout :size="20" /> 退出登录</button>
      </div>
    </aside>
    <div class="app-main">
      <header class="topbar">
        <button
          class="icon-button mobile-only"
          aria-label="展开导航"
          @click="menu = !menu"
        >
          <IconMenu2 />
        </button>
        <div class="breadcrumb">
          客户系统 <span>/</span><strong>{{ route.meta.title }}</strong>
        </div>
        <div class="topbar-right">
          <span class="company-label"
            ><IconBuilding :size="17" />
            {{ mvp.merchant.name || "尚未开户" }}</span
          >
          <details class="user-menu">
            <summary>
              <span class="avatar">A</span>
              <span class="user-email">{{ demo.email }}</span
              ><IconChevronDown :size="15" />
            </summary>
            <div class="user-popup">
              <strong>当前账户</strong><small>{{ demo.email }}</small
              ><button @click="logout">
                <IconLogout :size="17" /> 退出登录
              </button>
            </div>
          </details>
        </div>
      </header>
      <main class="page-main" id="main-content"><RouterView /></main>
      <DepositMvpView action-only />
      <ExchangeMvpView action-only />
      <footer class="app-footer">
        <span>© 2026 Acceptance</span>
      </footer>
    </div>
  </div>
</template>
