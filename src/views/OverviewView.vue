<script setup lang="ts">
import { openDeposit, openPayout } from "../lib/payment-actions";
import { computed, ref } from "vue";
import {
  IconArrowUpRight,
  IconDownload,
  IconBuildingBank,
} from "@tabler/icons-vue";
import { mvp, statusText } from "../lib/mvp";
import { deposits } from "../lib/deposit-mvp";
// Read-only, local panels: no requests, drafts or permission-specific tabs.
// Selection stays within this page; unmount restores the default recharge tab.
const tabs = [
  { id: "deposit", label: "充值" },
  { id: "payout", label: "付款" },
] as const;
type TransactionTab = (typeof tabs)[number]["id"];
const activeTab = ref<TransactionTab>("deposit");
function onTabKey(event: KeyboardEvent) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  activeTab.value =
    event.key === "Home"
      ? "deposit"
      : event.key === "End"
        ? "payout"
        : activeTab.value === "deposit"
          ? "payout"
          : "deposit";
  const group = (event.currentTarget as HTMLElement).parentElement;
  group
    ?.querySelector<HTMLButtonElement>(`#recent-tab-${activeTab.value}`)
    ?.focus();
}
const verified = computed(() =>
  ["AVAILABLE", "STABLE"].includes(mvp.merchant.channel),
);
const certification = computed(() =>
  !mvp.merchant.no
    ? "未开通"
    : {
        UNAVAILABLE: "待完成认证",
        UNDER_REVIEW: "认证审核中",
        AVAILABLE: "认证已通过",
        STABLE: "认证已通过",
      }[mvp.merchant.channel] || "通道暂不可用",
);
const incoming = computed(() => deposits.slice(0, 5));
const outgoing = computed(() =>
  [...mvp.orders].sort((a, b) => b.created - a.created).slice(0, 5),
);
const depositStatus = {
  PENDING: "等待收款",
  PARTIAL: "部分到账",
  COMPLETED: "已完成",
  TERMINATED: "已终止",
};
</script>
<template>
  <div class="overview-page">
    <div class="page-heading">
      <div>
        <h1>账户概览</h1>
        <p>查看账户资金、企业认证和最近的交易动态。</p>
      </div>
    </div>
    <div class="overview-summary">
      <section class="panel overview-balance">
        <div class="section-heading">
          <h2>USDT 余额</h2>
          <span class="overview-coin">₮</span>
        </div>
        <p class="muted">正常可用余额</p>
        <div class="overview-amount">
          {{ mvp.balances.USDT }} <span>USDT</span>
        </div>
        <p class="overview-frozen">
          冻结金额 <strong>{{ mvp.frozen.USDT }} USDT</strong>
        </p>
        <div class="overview-actions">
          <button class="btn primary" @click="openDeposit">
            <IconDownload :size="18" />USDT 充值</button
          ><button class="btn secondary" @click="openPayout">
            <IconArrowUpRight :size="18" />USD 付款
          </button>
        </div>
      </section>
      <section class="panel overview-company">
        <div class="section-heading">
          <h2>企业信息</h2>
          <IconBuildingBank :size="22" />
        </div>
        <h3>{{ mvp.merchant.name || "尚未开通企业账户" }}</h3>
        <dl>
          <div>
            <dt>账户编号</dt>
            <dd>{{ mvp.merchant.no || "—" }}</dd>
          </div>
          <div>
            <dt>认证状态</dt>
            <dd>
              <span :class="['status', verified ? 'success' : 'warning']">{{
                certification
              }}</span>
            </dd>
          </div>
        </dl>
        <RouterLink class="text-link" to="/client/onboarding"
          >{{
            verified
              ? "查看企业资料"
              : mvp.merchant.channel === "UNDER_REVIEW"
                ? "查看认证进度"
                : "完成认证"
          }}
          →</RouterLink
        >
      </section>
    </div>
    <section class="panel overview-orders">
      <div class="section-heading">
        <h2>最近交易</h2>
        <RouterLink
          class="text-link"
          :to="activeTab === 'deposit' ? '/client/payments' : '/client/orders'"
          >查看全部 →</RouterLink
        >
      </div>
      <div class="overview-tabs" role="tablist" aria-label="最近交易类型">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :id="`recent-tab-${tab.id}`"
          :aria-controls="`recent-panel-${tab.id}`"
          :aria-selected="activeTab === tab.id"
          :tabindex="activeTab === tab.id ? 0 : -1"
          @click="activeTab = tab.id"
          @keydown="onTabKey"
        >
          {{ tab.label }}
        </button>
      </div>
      <div
        v-show="activeTab === 'deposit'"
        id="recent-panel-deposit"
        role="tabpanel"
        aria-labelledby="recent-tab-deposit"
        tabindex="0"
      >
        <div class="overview-table">
          <table>
            <thead>
              <tr>
                <th>充值单号</th>
                <th>充值金额</th>
                <th>正常到账</th>
                <th>网络</th>
                <th>状态</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in incoming" :key="d.id">
                <td>{{ d.id }}</td>
                <td>{{ d.amount }} {{ d.coin }}</td>
                <td>{{ d.received }} {{ d.coin }}</td>
                <td>{{ d.network }}</td>
                <td>
                  <span
                    :class="[
                      'status',
                      d.status === 'COMPLETED' ? 'success' : 'warning',
                    ]"
                    >{{ depositStatus[d.status] }}</span
                  >
                </td>
                <td>
                  <RouterLink
                    class="text-link"
                    :to="{ path: '/client/payments', query: { order: d.id } }"
                    >详情</RouterLink
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!incoming.length" class="overview-empty">
          <strong>暂无充值记录</strong>
          <p>创建充值单后，可在这里查看最新进度。</p>
          <button class="text-link" @click="openDeposit">前往充值 →</button>
        </div>
      </div>
      <div
        v-show="activeTab === 'payout'"
        id="recent-panel-payout"
        role="tabpanel"
        aria-labelledby="recent-tab-payout"
        tabindex="0"
      >
        <div class="overview-table">
          <table>
            <thead>
              <tr>
                <th>付款单号</th>
                <th>支付金额</th>
                <th>预计到账</th>
                <th>创建时间</th>
                <th>状态</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in outgoing" :key="o.id">
                <td>{{ o.id }}</td>
                <td>{{ o.amount }} {{ o.coin }}</td>
                <td>{{ o.receive }} USD</td>
                <td>{{ new Date(o.created).toLocaleString("zh-CN") }}</td>
                <td>
                  <span
                    :class="[
                      'status',
                      o.status === 'COMPLETED' ? 'success' : 'warning',
                    ]"
                    >{{ statusText(o) }}</span
                  >
                </td>
                <td>
                  <RouterLink
                    class="text-link"
                    :to="{ path: '/client/orders', query: { order: o.id } }"
                    >详情</RouterLink
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!outgoing.length" class="overview-empty">
          <strong>暂无付款记录</strong>
          <p>提交付款申请后，可在这里跟踪处理结果。</p>
          <button class="text-link" @click="openPayout">创建付款 →</button>
        </div>
      </div>
    </section>
  </div>
</template>
<style scoped>
.overview-tabs {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid #e7ebdf;
  margin-bottom: 20px;
}
.overview-tabs button {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 12px 8px;
  min-width: 64px;
  font: inherit;
  font-size: 14px;
  color: #818a77;
  cursor: pointer;
}
.overview-tabs button[aria-selected="true"] {
  color: #334226;
  border-bottom-color: #536b3b;
  font-weight: 600;
}
.overview-tabs button:focus-visible,
[role="tabpanel"]:focus-visible {
  outline: 2px solid #718956;
  outline-offset: 3px;
}

.overview-page {
  display: grid;
  gap: 24px;
}
.overview-page .page-heading {
  margin-bottom: 0;
}
.overview-summary {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 24px;
}
.overview-balance,
.overview-company,
.overview-orders {
  padding: 26px;
}
.overview-balance {
  background: #f4f7ed;
}
.overview-coin {
  font-size: 25px;
  color: #667c45;
}
.overview-amount {
  font-size: clamp(26px, 3vw, 40px);
  overflow-wrap: anywhere;
  font-weight: 600;
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
  margin: 12px 0;
}
.overview-amount span {
  font-size: 16px;
  letter-spacing: 0;
}
.overview-frozen {
  color: #7b8472;
  font-size: 13px;
}
.overview-frozen strong {
  margin-left: 16px;
  font-weight: 500;
  color: #454e3d;
}
.overview-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}
.overview-company h3 {
  font-size: 20px;
  margin: 24px 0;
}
.overview-company dl {
  display: grid;
  gap: 18px;
  margin-bottom: 26px;
}
.overview-company dl div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.overview-company dt {
  color: #818a77;
  font-size: 13px;
}
.overview-company dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 13px;
}
.overview-table {
  overflow-x: auto;
}
.overview-table table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
  font-size: 13px;
}
.overview-table th {
  text-align: left;
  color: #818a77;
  font-weight: 500;
  background: #f8f9f5;
}
.overview-table td,
.overview-table th {
  padding: 16px;
  border-bottom: 1px solid #eef0e9;
}
.overview-empty {
  text-align: center;
  padding: 30px 16px;
}
.overview-empty p {
  color: #88917e;
  font-size: 13px;
}
.overview-empty strong {
  font-weight: 500;
}
.overview-orders .section-heading {
  gap: 16px;
}
.overview-orders .text-link {
  font-size: 13px;
}
@media (max-width: 800px) {
  .overview-summary {
    grid-template-columns: 1fr;
  }
  .overview-balance,
  .overview-company,
  .overview-orders {
    padding: 20px;
  }
  .overview-amount {
    font-size: 28px;
  }
  .overview-actions {
    flex-wrap: wrap;
  }
}
</style>
