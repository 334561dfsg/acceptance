<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  IconUsers,
  IconHistory,
  IconPlus,
  IconArrowLeft,
  IconShieldLock,
} from "@tabler/icons-vue";
import BrandLogo from "../components/BrandLogo.vue";
import AppSelect from "../components/AppSelect.vue";
import AppModal from "../components/AppModal.vue";
import {
  customerAccounts,
  createCustomer,
  setCustomerEnabled,
  resetCustomerPassword,
  type CustomerAccount,
} from "../lib/password";
import { mfaInfo, removeMfa } from "../lib/mfa";
import { demo, leaveDemo } from "../lib/store";
import { adminState, recordAdminAction, customerSnapshot } from "../lib/admin";
import { channelLabels } from "../lib/payfi-rules";
const route = useRoute();
const search = ref(""),
  filter = ref("all"),
  page = ref(1),
  section = ref("company"),
  receipt = ref("");
const modal = ref(""),
  target = ref<CustomerAccount>(),
  busy = ref(false),
  error = ref("");
const email = ref(""),
  contact = ref(""),
  password = ref(""),
  confirmPassword = ref(""),
  reason = ref("");
const dialog = ref<InstanceType<typeof AppModal>>();
const record = ref<[string, string][]>([]);
// Local console surfaces: list/detail/activity. Mutations require a target confirmation;
// credentials are never put in activity records. Payment and KYC statuses are read-only.
const consoleSurface = computed(() =>
  route.path.endsWith("/activity")
    ? "audit-log"
    : route.params.id
      ? "record-detail"
      : "record-list",
);
const customers = computed(() => {
  void adminState.revision;
  return [...customerAccounts];
});
const selected = computed(() =>
  customers.value.find((c) => c.id === route.params.id),
);
const snapshot = computed(() =>
  selected.value ? customerSnapshot(selected.value.email) : undefined,
);
const events = computed(() =>
  adminState.events.filter(
    (e) =>
      !search.value ||
      `${e.email} ${e.action} ${e.note}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
const rows = computed(() =>
  customers.value.filter((c) => {
    const term = search.value.trim().toLowerCase();
    const company = customerSnapshot(c.email).mvp.merchant.name;
    return (
      (!term ||
        `${c.email} ${c.contact} ${c.id} ${company}`
          .toLowerCase()
          .includes(term)) &&
      (filter.value === "all" || c.enabled === (filter.value === "active"))
    );
  }),
);
const total = computed(() =>
  consoleSurface.value === "audit-log"
    ? events.value.length
    : rows.value.length,
);
const pages = computed(() => Math.max(1, Math.ceil(total.value / 10)));
const visibleRows = computed(() =>
  rows.value.slice((page.value - 1) * 10, page.value * 10),
);
const visibleEvents = computed(() =>
  events.value.slice((page.value - 1) * 10, page.value * 10),
);
watch([search, filter], () => (page.value = 1));
watch(pages, (value) => (page.value = Math.min(page.value, value)));
watch(
  () => route.fullPath,
  () => {
    section.value = "company";
    search.value = "";
    filter.value = "all";
    page.value = 1;
  },
);
const date = (value?: number) =>
  value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "—";
const companyName = (c: CustomerAccount) =>
  customerSnapshot(c.email).mvp.merchant.name || "尚未创建企业";
const channel = (c: CustomerAccount) => {
  const m = customerSnapshot(c.email).mvp.merchant;
  return m.no ? channelLabels[m.channel] || m.channel : "尚未开户";
};
const statusLabels: Record<string, string> = {
  APPROVED: "已审核",
  PENDING: "待处理",
  DECLINED: "已驳回",
  COMPLETED: "已完成",
  PARTIAL: "部分到账",
  PROCESSING: "处理中",
  CANCEL: "已取消",
  TERMINATED: "已终止",
  DELETING: "删除中",
  DELETED: "已删除",
};
const label = (value: string) => statusLabels[value] || value;
const tabs = [
  { key: "company", label: "企业资料" },
  { key: "banks", label: "收款账户" },
  { key: "deposits", label: "充值订单" },
  { key: "payments", label: "付款订单" },
  { key: "activity", label: "操作记录" },
];
const detailPage = ref(1);
watch([section, () => route.params.id], () => (detailPage.value = 1));
const detailTotal = computed(() =>
  section.value === "banks"
    ? snapshot.value?.mvp.banks.length || 0
    : section.value === "deposits"
      ? snapshot.value?.deposits.length || 0
      : section.value === "payments"
        ? snapshot.value?.mvp.orders.length || 0
        : detailEvents.value.length,
);
const detailPages = computed(() =>
  Math.max(1, Math.ceil(detailTotal.value / 10)),
);
const detailEvents = computed(() =>
  adminState.events.filter((e) => e.email === selected.value?.email),
);
const modalTitle = computed(
  () =>
    ({
      create: "新增客户",
      disable: "停用客户账号",
      enable: "启用客户账号",
      password: "重置登录密码",
      mfa: "重置身份验证器",
      record: "记录详情",
    })[modal.value] || "",
);
function open(action: string, c?: CustomerAccount) {
  target.value = c;
  modal.value = action;
  error.value = "";
  email.value = "";
  contact.value = "";
  password.value = "";
  confirmPassword.value = "";
  reason.value = "";
}
function showRecord(values: [string, string][]) {
  record.value = values;
  open("record");
}
function closed() {
  modal.value = "";
  password.value = "";
  confirmPassword.value = "";
  error.value = "";
}
async function submit() {
  if (busy.value) return;
  error.value = "";
  if (
    ["create", "password"].includes(modal.value) &&
    password.value !== confirmPassword.value
  ) {
    error.value = "两次输入的密码不一致。";
    return;
  }
  if (modal.value !== "create" && !reason.value.trim()) {
    error.value = "请填写操作原因。";
    return;
  }
  busy.value = true;
  try {
    const c = target.value;
    if (modal.value === "create") {
      const added = await createCustomer(
        email.value,
        contact.value,
        password.value,
      );
      recordAdminAction(
        added.email,
        "新增客户",
        "创建登录账号，首次登录须修改密码并绑定 MFA。",
      );
      receipt.value = `客户 ${added.email} 已创建，请通过安全渠道提供初始密码。`;
    } else if (c) {
      const action = modal.value;
      if (action === "password")
        await resetCustomerPassword(c.email, password.value);
      else if (action === "mfa") removeMfa(c.email);
      else setCustomerEnabled(c.email, action === "enable");
      if (demo.email === c.email && action !== "enable") leaveDemo();
      const title = modalTitle.value;
      recordAdminAction(c.email, title, reason.value.trim());
      receipt.value = `${c.email}：${title}成功。`;
    }
    password.value = "";
    confirmPassword.value = "";
    busy.value = false;
    dialog.value?.close();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <BrandLogo /><span class="admin-label">管理后台</span>
      <nav aria-label="管理台导航">
        <RouterLink
          to="/admin/customers"
          :class="{ active: consoleSurface !== 'audit-log' }"
          ><IconUsers :size="19" />客户账户</RouterLink
        >
        <RouterLink
          to="/admin/activity"
          :class="{ active: consoleSurface === 'audit-log' }"
          ><IconHistory :size="19" />操作记录</RouterLink
        >
      </nav>
      <RouterLink to="/" class="admin-home"
        ><IconArrowLeft :size="17" />返回系统入口</RouterLink
      >
    </aside>
    <div class="admin-workspace">
      <header class="admin-topbar">
        <span
          >管理后台
          <span class="muted">
            /
            {{
              consoleSurface === "audit-log"
                ? "操作记录"
                : selected
                  ? "客户详情"
                  : "客户账户"
            }}</span
          ></span
        ><span><IconShieldLock :size="17" /> 系统管理员</span>
      </header>
      <main>
        <p v-if="receipt" class="admin-receipt" role="status">
          {{ receipt
          }}<button type="button" aria-label="关闭提示" @click="receipt = ''">
            ×
          </button>
        </p>
        <template v-if="consoleSurface === 'record-list'">
          <div class="page-heading">
            <div>
              <h1>客户账户</h1>
              <p>管理客户登录权限与账户安全，查看企业及资金业务信息。</p>
            </div>
            <button class="btn primary" @click="open('create')">
              <IconPlus :size="17" />新增客户
            </button>
          </div>
          <div class="admin-stats">
            <div>
              <span>客户总数</span><strong>{{ customers.length }}</strong>
            </div>
            <div>
              <span>正常账号</span
              ><strong>{{ customers.filter((c) => c.enabled).length }}</strong>
            </div>
            <div>
              <span>已停用</span
              ><strong>{{ customers.filter((c) => !c.enabled).length }}</strong>
            </div>
          </div>
          <section class="panel admin-panel">
            <div class="admin-filters">
              <label
                ><span class="sr-only">搜索客户</span
                ><input
                  v-model="search"
                  placeholder="搜索账号、企业名称或客户编号" /></label
              ><AppSelect
                v-model="filter"
                label="账号状态"
                :options="[
                  { value: 'all', label: '全部账号状态' },
                  { value: 'active', label: '正常' },
                  { value: 'disabled', label: '已停用' },
                ]"
              />
            </div>
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>客户账号</th>
                    <th>企业名称</th>
                    <th>账号状态</th>
                    <th>企业支付通道</th>
                    <th>MFA</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in visibleRows" :key="c.id">
                    <td>
                      <RouterLink
                        :to="'/admin/customers/' + c.id"
                        class="admin-link"
                        >{{ c.email }}</RouterLink
                      ><small>{{ c.id }}</small>
                    </td>
                    <td>{{ companyName(c) }}</td>
                    <td>
                      <span
                        :class="['status', c.enabled ? 'success' : 'neutral']"
                        >{{ c.enabled ? "正常" : "已停用" }}</span
                      >
                    </td>
                    <td>{{ channel(c) }}</td>
                    <td>{{ mfaInfo(c.email) ? "已绑定" : "未绑定" }}</td>
                    <td>{{ date(c.created) }}</td>
                    <td>
                      <RouterLink
                        :to="'/admin/customers/' + c.id"
                        class="admin-link"
                        >查看详情</RouterLink
                      >
                    </td>
                  </tr>
                  <tr v-if="!visibleRows.length">
                    <td colspan="7" class="admin-empty">
                      没有符合条件的客户，请调整搜索条件。
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
        <template v-else-if="consoleSurface === 'audit-log'">
          <div class="page-heading">
            <div>
              <h1>操作记录</h1>
              <p>查看客户账号维护操作及操作原因。</p>
            </div>
          </div>
          <section class="panel admin-panel">
            <div class="admin-filters">
              <label
                ><span class="sr-only">搜索操作记录</span
                ><input v-model="search" placeholder="搜索客户账号、操作或原因"
              /></label>
            </div>
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>管理员</th>
                    <th>客户账号</th>
                    <th>操作</th>
                    <th>原因 / 说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="e in visibleEvents" :key="e.id">
                    <td>{{ date(e.at) }}</td>
                    <td>{{ e.actor }}</td>
                    <td>{{ e.email }}</td>
                    <td>{{ e.action }}</td>
                    <td>{{ e.note }}</td>
                  </tr>
                  <tr v-if="!visibleEvents.length">
                    <td colspan="5" class="admin-empty">
                      暂无操作记录，账号维护操作后会在这里留存。
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
        <template v-else-if="selected && snapshot">
          <div class="page-heading">
            <div>
              <h1>客户详情</h1>
              <p>{{ selected.email }} · {{ selected.id }}</p>
            </div>
            <RouterLink to="/admin/customers" class="btn secondary"
              >← 返回客户列表</RouterLink
            >
          </div>
          <section class="panel admin-panel">
            <div class="admin-detail-head">
              <div>
                <h2>{{ companyName(selected) }}</h2>
                <p class="muted">
                  {{ selected.contact || "未填写联系人" }} · 创建于
                  {{ date(selected.created) }}
                </p>
              </div>
              <span
                :class="['status', selected.enabled ? 'success' : 'neutral']"
                >{{ selected.enabled ? "账号正常" : "账号已停用" }}</span
              >
            </div>
            <dl class="admin-facts">
              <div>
                <dt>企业支付通道</dt>
                <dd>{{ channel(selected) }}</dd>
              </div>
              <div>
                <dt>身份验证器</dt>
                <dd>{{ mfaInfo(selected.email) ? "已绑定" : "未绑定" }}</dd>
              </div>
              <div>
                <dt>登录密码</dt>
                <dd>
                  {{
                    selected.mustChangePassword ? "待客户设置新密码" : "已设置"
                  }}
                </dd>
              </div>
              <div>
                <dt>USDT 可用余额</dt>
                <dd>{{ snapshot.mvp.balances.USDT }} USDT</dd>
              </div>
            </dl>
            <div class="admin-actions">
              <button
                class="btn secondary"
                @click="open(selected.enabled ? 'disable' : 'enable', selected)"
              >
                {{ selected.enabled ? "停用账号" : "启用账号" }}</button
              ><button
                class="btn secondary"
                @click="open('password', selected)"
              >
                重置密码</button
              ><button
                class="btn secondary"
                :disabled="!mfaInfo(selected.email)"
                @click="open('mfa', selected)"
              >
                重置 MFA
              </button>
            </div>
          </section>
          <nav class="admin-tabs" aria-label="客户信息分类">
            <button
              v-for="t in tabs"
              :key="t.key"
              :aria-pressed="section === t.key"
              :class="{ active: section === t.key }"
              @click="section = t.key"
            >
              {{ t.label }}
            </button>
          </nav>
          <section class="panel admin-panel">
            <template v-if="section === 'company'"
              ><h2>企业资料</h2>
              <dl v-if="snapshot.mvp.merchant.no" class="admin-facts">
                <div>
                  <dt>企业名称</dt>
                  <dd>{{ snapshot.onboarding.company.company_name }}</dd>
                </div>
                <div>
                  <dt>企业英文名称</dt>
                  <dd>
                    {{ snapshot.onboarding.company.company_name_en || "—" }}
                  </dd>
                </div>
                <div>
                  <dt>商户编号</dt>
                  <dd>{{ snapshot.mvp.merchant.no }}</dd>
                </div>
                <div>
                  <dt>企业注册号</dt>
                  <dd>
                    {{
                      snapshot.onboarding.company.company_registration_no || "—"
                    }}
                  </dd>
                </div>
                <div>
                  <dt>注册日期</dt>
                  <dd>
                    {{
                      snapshot.onboarding.company.company_registration_date ||
                      "—"
                    }}
                  </dd>
                </div>
                <div>
                  <dt>注册地址</dt>
                  <dd>
                    {{
                      [
                        snapshot.onboarding.company.register_country,
                        snapshot.onboarding.company.register_state,
                        snapshot.onboarding.company.register_city,
                        snapshot.onboarding.company.register_line1,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    }}
                  </dd>
                </div>
              </dl>
              <p v-else class="admin-empty">客户尚未创建企业或提交认证资料。</p>
              <p class="muted">
                企业认证及支付通道状态以支付服务方返回结果为准。
              </p></template
            >
            <div v-else-if="section === 'banks'" class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>账户名称</th>
                    <th>银行</th>
                    <th>账号</th>
                    <th>通道</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="b in snapshot.mvp.banks.slice(
                      (detailPage - 1) * 10,
                      detailPage * 10,
                    )"
                    :key="b.no"
                  >
                    <td>{{ b.accountName }}</td>
                    <td>{{ b.bankName }}</td>
                    <td>尾号 {{ b.accountNo.slice(-4) }}</td>
                    <td>{{ b.routing }}</td>
                    <td>{{ label(b.status) }}</td>
                    <td>
                      <button
                        class="admin-link"
                        @click="
                          showRecord([
                            ['账户编号', b.no],
                            ['企业名称', b.accountName],
                            ['银行名称', b.bankName],
                            ['银行账号', b.accountNo],
                            ['SWIFT / BIC', b.fields['b.swift_code'] || '—'],
                            ['结算通道', b.routing],
                            ['状态', label(b.status)],
                            ['审核说明', b.reason || '—'],
                          ])
                        "
                      >
                        详情
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!snapshot.mvp.banks.length">
                    <td colspan="6" class="admin-empty">暂无收款账户</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else-if="section === 'deposits'" class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>充值单号</th>
                    <th>金额</th>
                    <th>网络</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="d in snapshot.deposits.slice(
                      (detailPage - 1) * 10,
                      detailPage * 10,
                    )"
                    :key="d.id"
                  >
                    <td>{{ d.id }}</td>
                    <td>{{ d.amount }} USDT</td>
                    <td>{{ d.network }}</td>
                    <td>{{ label(d.status) }}</td>
                    <td>{{ date(d.created) }}</td>
                    <td>
                      <button
                        class="admin-link"
                        @click="
                          showRecord([
                            ['充值单号', d.id],
                            ['充值金额', d.amount + ' USDT'],
                            ['手续费', d.fee + ' USDT'],
                            ['商户应收', d.net + ' USDT'],
                            ['网络', d.network],
                            ['状态', label(d.status)],
                            ['创建时间', date(d.created)],
                          ])
                        "
                      >
                        详情
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!snapshot.deposits.length">
                    <td colspan="6" class="admin-empty">暂无充值订单</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else-if="section === 'payments'" class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>付款单号</th>
                    <th>支付金额</th>
                    <th>预计收款</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="o in snapshot.mvp.orders.slice(
                      (detailPage - 1) * 10,
                      detailPage * 10,
                    )"
                    :key="o.id"
                  >
                    <td>{{ o.id }}</td>
                    <td>{{ o.amount }} USDT</td>
                    <td>{{ o.receive }} USD</td>
                    <td>{{ label(o.status) }}</td>
                    <td>{{ date(o.created) }}</td>
                    <td>
                      <button
                        class="admin-link"
                        @click="
                          showRecord([
                            ['付款单号', o.id],
                            ['收款账户', o.account],
                            ['支付金额', o.amount + ' USDT'],
                            ['手续费', o.fee + ' USDT'],
                            ['预计收款', o.receive + ' USD'],
                            [
                              '实际收款',
                              o.actualReceive ? o.actualReceive + ' USD' : '—',
                            ],
                            ['状态', label(o.status)],
                            ['备注', o.remark || '—'],
                          ])
                        "
                      >
                        详情
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!snapshot.mvp.orders.length">
                    <td colspan="6" class="admin-empty">暂无付款订单</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>操作</th>
                    <th>管理员</th>
                    <th>原因 / 说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="e in detailEvents.slice(
                      (detailPage - 1) * 10,
                      detailPage * 10,
                    )"
                    :key="e.id"
                  >
                    <td>{{ date(e.at) }}</td>
                    <td>{{ e.action }}</td>
                    <td>{{ e.actor }}</td>
                    <td>{{ e.note }}</td>
                  </tr>
                  <tr v-if="!detailEvents.length">
                    <td colspan="4" class="admin-empty">该客户暂无操作记录</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <div v-if="section !== 'company'" class="admin-pagination">
            <span>共 {{ detailTotal }} 条</span
            ><button
              class="btn secondary"
              :disabled="detailPage <= 1"
              @click="detailPage--"
            >
              上一页</button
            ><span>{{ detailPage }} / {{ detailPages }}</span
            ><button
              class="btn secondary"
              :disabled="detailPage >= detailPages"
              @click="detailPage++"
            >
              下一页
            </button>
          </div>
        </template>
        <section v-else class="panel admin-panel">
          <h1>客户不存在</h1>
          <p>该客户记录不可用。</p>
          <RouterLink to="/admin/customers" class="btn secondary"
            >返回客户列表</RouterLink
          >
        </section>
        <div v-if="consoleSurface !== 'record-detail'" class="admin-pagination">
          <span>共 {{ total }} 条</span
          ><button class="btn secondary" :disabled="page <= 1" @click="page--">
            上一页</button
          ><span>{{ page }} / {{ pages }}</span
          ><button
            class="btn secondary"
            :disabled="page >= pages"
            @click="page++"
          >
            下一页
          </button>
        </div>
      </main>
    </div>
    <AppModal
      v-if="modal"
      ref="dialog"
      :title="modalTitle"
      :prevent-close="busy"
      @close="closed"
    >
      <dl v-if="modal === 'record'" class="mvp-details">
        <div v-for="[name, value] in record" :key="name">
          <dt>{{ name }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>
      <form
        v-else
        id="admin-operation"
        class="admin-operation"
        @submit.prevent="submit"
      >
        <p v-if="target" class="admin-target">{{ target.email }}</p>
        <p v-if="error" class="mvp-error" role="alert">{{ error }}</p>
        <template v-if="modal === 'create'"
          ><label
            >登录邮箱 <span class="required">*</span
            ><input
              v-model="email"
              type="email"
              required
              maxlength="128"
              :disabled="busy"
              autocomplete="off" /></label
          ><label
            >联系人<input v-model="contact" maxlength="64" :disabled="busy"
          /></label>
          <p class="muted">
            新客户首次登录需修改初始密码并绑定身份验证器。
          </p></template
        >
        <p v-if="modal === 'disable'" class="mvp-notice">
          停用后客户将无法登录，当前本地登录会话将退出。企业资料和订单会保留。
        </p>
        <p v-if="modal === 'enable'" class="mvp-notice">
          启用后客户可使用已有密码登录，企业支付通道状态不受影响。
        </p>
        <p v-if="modal === 'mfa'" class="mvp-notice">
          重置后原验证器将失效，客户需重新登录并绑定 MFA。请先核实客户身份。
        </p>
        <template v-if="modal === 'create' || modal === 'password'"
          ><p v-if="modal === 'password'" class="mvp-notice">
            原密码将失效，客户需使用临时密码登录并设置新密码。请先核实客户身份。
          </p>
          <label
            >{{ modal === "create" ? "初始密码" : "临时密码" }}
            <span class="required">*</span
            ><input
              v-model="password"
              type="password"
              required
              minlength="12"
              maxlength="128"
              autocomplete="new-password"
              :disabled="busy"
          /></label>
          <p class="muted">
            12–128 位，包含字母、数字和符号。请通过安全渠道告知客户。
          </p>
          <label
            >确认密码 <span class="required">*</span
            ><input
              v-model="confirmPassword"
              type="password"
              required
              maxlength="128"
              autocomplete="new-password"
              :disabled="busy" /></label
        ></template>
        <label v-if="modal !== 'create'"
          >操作原因 <span class="required">*</span
          ><textarea
            v-model="reason"
            required
            maxlength="300"
            rows="3"
            :disabled="busy"
            placeholder="填写客户申请或身份核实情况"
          />
        </label>
      </form>
      <template #footer
        ><button
          class="btn secondary"
          :disabled="busy"
          @click="dialog?.close()"
        >
          {{ modal === "record" ? "关闭" : "取消" }}</button
        ><button
          v-if="modal !== 'record'"
          type="submit"
          form="admin-operation"
          class="btn primary"
          :disabled="busy"
        >
          {{ busy ? "正在处理…" : "确认" + (modal === "create" ? "创建" : "") }}
        </button></template
      >
    </AppModal>
  </div>
</template>
<style scoped>
.admin-shell {
  min-height: 100dvh;
  background: #f5f7fb;
  color: #1e293b;
}
.admin-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 226px;
  background: white;
  border-right: 1px solid #e2e8f0;
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
}
.admin-label {
  font-size: 11px;
  color: #64748b;
  margin: 8px 0 35px 30px;
  letter-spacing: 2px;
}
.admin-sidebar nav {
  display: grid;
  gap: 8px;
}
.admin-sidebar nav a,
.admin-home {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border-radius: 8px;
  color: #64748b;
}
.admin-sidebar nav a.active {
  color: #1d4ed8;
  background: #eaf1fc;
}
.admin-home {
  margin-top: auto;
  font-size: 12px;
}
.admin-workspace {
  margin-left: 226px;
}
.admin-topbar {
  height: 76px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}
.admin-topbar > span:last-child {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #64748b;
}
.admin-workspace main {
  padding: 32px;
  max-width: 1800px;
  margin: auto;
}
.admin-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}
.admin-stats > div {
  padding: 20px 24px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
}
.admin-stats span {
  color: #64748b;
  font-size: 12px;
}
.admin-stats strong {
  display: block;
  font-size: 28px;
  margin-top: 10px;
}
.admin-panel {
  padding: 24px;
  margin-bottom: 24px;
}
.admin-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.admin-filters > label {
  flex: 1;
  margin: 0;
}
.admin-filters input {
  width: 100%;
}
.admin-filters > :last-child:not(label) {
  width: 180px;
}
.admin-table-wrap {
  overflow: auto;
}
.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 12px;
}
.admin-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}
.admin-table th,
.admin-table td {
  padding: 16px 14px;
  border-bottom: 1px solid #edf1f5;
}
.admin-table td {
  line-height: 1.7;
  max-width: 360px;
  overflow-wrap: anywhere;
}
.admin-table small {
  display: block;
  color: #94a3b8;
  margin-top: 3px;
}
.admin-link {
  color: #1d4ed8;
  white-space: nowrap;
}
.admin-link:hover {
  text-decoration: underline;
}
.admin-table .admin-empty,
.admin-empty {
  text-align: center;
  padding: 52px 20px;
  color: #64748b;
}
.admin-pagination {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  align-items: center;
  color: #64748b;
  font-size: 12px;
}
.admin-detail-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}
.admin-detail-head h2 {
  margin-bottom: 8px;
}
.admin-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin: 24px 0;
}
.admin-facts dt {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}
.admin-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.admin-actions {
  display: flex;
  gap: 12px;
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
  flex-wrap: wrap;
}
.admin-tabs {
  display: flex;
  gap: 24px;
  overflow: auto;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 20px;
}
.admin-tabs button {
  padding: 14px 0;
  white-space: nowrap;
  color: #64748b;
  border-bottom: 2px solid transparent;
}
.admin-tabs button.active {
  color: #1d4ed8;
  border-color: #1d4ed8;
}
.admin-operation {
  display: grid;
  gap: 16px;
}
.admin-operation label {
  margin: 0;
}
.admin-operation input,
.admin-operation textarea {
  width: 100%;
}
.admin-operation p {
  margin: 0;
}
.admin-target {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  overflow-wrap: anywhere;
}
.admin-receipt {
  display: flex;
  justify-content: space-between;
  background: #edf7f0;
  border: 1px solid #cde9d4;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  color: #28613b;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
@media (max-width: 900px) {
  .admin-sidebar {
    position: static;
    width: auto;
    padding: 18px;
  }
  .admin-sidebar .brand {
    font-size: 20px;
  }
  .admin-label {
    display: none;
  }
  .admin-sidebar nav {
    display: flex;
    margin-top: 16px;
  }
  .admin-home {
    position: absolute;
    top: 18px;
    right: 12px;
    padding: 8px;
  }
  .admin-workspace {
    margin: 0;
  }
  .admin-topbar {
    height: 56px;
    padding: 0 20px;
  }
  .admin-workspace main {
    padding: 20px;
  }
  .admin-stats {
    gap: 10px;
  }
  .admin-stats > div {
    padding: 16px;
  }
  .admin-panel {
    padding: 16px;
  }
  .admin-facts {
    grid-template-columns: 1fr;
  }
  .admin-filters {
    flex-wrap: wrap;
  }
  .admin-filters label {
    flex-basis: 100%;
  }
  .admin-table {
    min-width: 720px;
  }
}
</style>
