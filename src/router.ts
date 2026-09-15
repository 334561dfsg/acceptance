import { createRouter, createWebHistory } from "vue-router";
import { mfaInfo } from "./lib/mfa";
import { demo } from "./lib/store";
import PortalView from "./views/PortalView.vue";
import LoginView from "./views/LoginView.vue";
import ClientLayout from "./components/ClientLayout.vue";
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: PortalView },
    { path: "/login", component: LoginView },
    { path: "/admin", component: () => import("./views/AdminView.vue") },
    {
      path: "/client",
      component: ClientLayout,
      meta: { client: true },
      children: [
        {
          path: "security",
          component: () => import("./views/SecuritySetupView.vue"),
          meta: { title: "账户安全" },
        },
        {
          path: "overview",
          component: () => import("./views/OverviewView.vue"),
          meta: { title: "账户概览" },
        },
        {
          path: "onboarding",
          component: () => import("./views/OnboardingView.vue"),
          meta: { title: "账户信息" },
        },
        { path: "", redirect: "/client/overview" },
        {
          path: "exchange",
          redirect: { path: "/client/orders", query: { action: "payout" } },
        },
        {
          path: "orders",
          component: () => import("./views/ExchangeMvpView.vue"),
          meta: { title: "付款订单", page: "orders" },
        },
        {
          path: "accounts",
          component: () => import("./views/BankAccountsView.vue"),
          meta: { title: "收款账户" },
        },
        {
          path: "payments",
          component: () => import("./views/DepositMvpView.vue"),
          meta: { title: "充值订单" },
        },
        { path: ":pathMatch(.*)*", redirect: "/client/overview" },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
router.beforeEach((to) => {
  if (to.meta.client && !demo.email)
    return { path: "/login", query: { redirect: to.fullPath } };
  if (to.meta.client && !mfaInfo(demo.email) && to.path !== "/client/security")
    return "/client/security";
});
router.afterEach((to) => {
  document.title = `${to.meta.title || "企业支付工作台"} · Acceptance`;
});
export default router;
