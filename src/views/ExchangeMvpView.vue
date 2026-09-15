<script setup lang="ts">
import ListPagination from "../components/ListPagination.vue";
import { requestMfa } from "../lib/mfa";
import { demo } from "../lib/store";
import AppSelect from "../components/AppSelect.vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { IconArrowUpRight, IconInfoCircle, IconCheck } from "@tabler/icons-vue";
import AppModal from "../components/AppModal.vue";
import {
  mvp,
  estimate,
  makeQuote,
  confirmOrder,
  cancelOrder,
  statusText,
  type ExchangeOrder,
} from "../lib/mvp";
import { purposes, purposeLabels } from "../lib/payfi-rules";
let live = true;
onBeforeUnmount(() => {
  live = false;
});
const props = defineProps<{ actionOnly?: boolean }>();
const route = useRoute();
const router = useRouter();
const creating = ref(false);
const modal = ref<InstanceType<typeof AppModal>>();
import { paymentActions } from "../lib/payment-actions";
watch(
  () => paymentActions.payout,
  () => {
    if (props.actionOnly) openCreate();
  },
);
function openCreate() {
  if (creating.value || quote.value) return;
  error.value = "";
  creating.value = true;
}
function resetDialog() {
  creating.value = false;
  quote.value = undefined;
  error.value = "";
}
watch(
  () => route.path,
  () => {
    if (props.actionOnly) resetDialog();
  },
);
const amount = ref(""),
  purpose = ref(""),
  error = ref(""),
  notice = ref(""),
  busy = ref(false),
  search = ref(""),
  filter = ref(""),
  quote = ref<ExchangeOrder>(),
  clock = ref(Date.now());
watch(
  () => route.query.order,
  (id) => {
    if (props.actionOnly) return;
    const order = mvp.orders.find((o) => o.id === id);
    if (order) {
      quote.value = order;
      purpose.value = order.purpose;
    }
  },
  { immediate: true },
);
const bankId = ref("");
const approved = computed(() =>
  mvp.banks.filter((b) => b.status === "APPROVED"),
);
watch(
  approved,
  (rows) => {
    if (!rows.some((b) => b.no === bankId.value))
      bankId.value = rows[0]?.no || "";
  },
  { immediate: true },
);
const selectedBank = computed(() =>
  approved.value.find((b) => b.no === bankId.value),
);
const ready = computed(
  () =>
    mvp.merchant.status === "ACTIVE" &&
    ["AVAILABLE", "STABLE"].includes(mvp.merchant.channel) &&
    approved.value.length > 0,
);
const account = computed(() =>
  selectedBank.value
    ? `${selectedBank.value.accountName} · ${selectedBank.value.bankName} · ${selectedBank.value.accountNo} · USD / ${selectedBank.value.routing}`
    : "",
);
const preview = computed(() => estimate(amount.value, "SELL"));
const remaining = computed(() =>
  quote.value
    ? Math.min(
        300,
        Math.max(0, Math.ceil((quote.value.expires - clock.value) / 1000)),
      )
    : 0,
);
const records = computed(() =>
  mvp.orders.filter(
    (q) =>
      (!search.value ||
        q.id.includes(search.value) ||
        q.sn.includes(search.value)) &&
      (!filter.value || q.status === filter.value),
  ),
);
const date = (n: number | null) =>
  n ? new Date(n).toLocaleString("zh-CN", { hour12: false }) : "—";
const timer = setInterval(() => (clock.value = Date.now()), 1000);
onBeforeUnmount(() => clearInterval(timer));
async function run(fn: () => void | Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await fn();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
function getQuote() {
  run(() => {
    quote.value = makeQuote(
      "SELL",
      "USDT",
      amount.value,
      account.value,
      bankId.value,
    );
    purpose.value = "";
  });
}
function show(q: ExchangeOrder) {
  quote.value = q;
  purpose.value = q.purpose;
  error.value = "";
}
watch(
  () => route.query.action,
  (action) => {
    if (!props.actionOnly && action === "payout") {
      openCreate();
      const { action: _, ...query } = route.query;
      void router.replace({ path: route.path, query });
    }
  },
  { immediate: true },
);
const page = ref(1);
watch([search, filter], () => (page.value = 1));
watch(
  () => records.value.length,
  (total) =>
    (page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 20)))),
);
const visibleRows = computed(() =>
  records.value.slice((page.value - 1) * 20, page.value * 20),
);
</script>
<template>
  <div :class="actionOnly ? 'action-dialog-host' : 'mvp-page'">
    <template v-if="!actionOnly">
      <div class="page-heading">
        <div>
          <h1>付款订单</h1>
          <p>查看 USD 付款订单、USDT 支付金额和美元到账结果。</p>
        </div>
        <button class="btn primary" @click="openCreate">
          发起付款 <IconArrowUpRight :size="18" />
        </button>
      </div>
      <div v-if="notice" class="mvp-notice" role="status">
        {{ notice }}<button class="text-link" @click="notice = ''">收起</button>
      </div>
      <section class="panel mvp-records">
        <div class="mvp-filters">
          <input
            v-model="search"
            placeholder="搜索付款单号 / 申请编号"
            aria-label="搜索付款订单"
          /><AppSelect
            v-model="filter"
            label="订单状态"
            :options="[
              { value: '', label: '全部状态' },
              { value: 'PENDING', label: '待确认' },
              { value: 'PROCESSING', label: '处理中' },
              { value: 'COMPLETED', label: '已完成' },
              { value: 'CANCEL', label: '已取消' },
              { value: 'TERMINATED', label: '已终止' },
            ]"
          />
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>付款单号 / 申请编号</th>
                <th>支付金额</th>
                <th>预计到账</th>
                <th>实际到账</th>
                <th>状态</th>
                <th>创建时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in visibleRows" :key="q.id">
                <td>
                  <strong>{{ q.id }}</strong
                  ><small class="mvp-block">{{ q.sn }}</small>
                </td>
                <td>{{ q.amount }} USDT</td>
                <td>{{ q.receive }} USD</td>
                <td>{{ q.actualReceive ? `${q.actualReceive} USD` : "—" }}</td>
                <td>
                  <span
                    :class="[
                      'status',
                      q.status === 'COMPLETED' ? 'success' : 'warning',
                    ]"
                    >{{ statusText(q, clock) }}</span
                  >
                </td>
                <td>{{ date(q.created) }}</td>
                <td>
                  <button class="text-link" @click="show(q)">详情</button>
                </td>
              </tr>
              <tr v-if="!records.length">
                <td colspan="7">
                  <div class="mvp-empty">
                    <strong>{{
                      search || filter ? "暂无匹配的付款订单" : "暂无付款订单"
                    }}</strong>
                    <p>
                      {{
                        search || filter
                          ? "请调整搜索条件或状态筛选。"
                          : "发起 USD 付款后，可在这里跟踪申请状态。"
                      }}
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ListPagination v-model="page" :total="records.length" />
      </section>
    </template>
    <AppModal
      ref="modal"
      v-if="creating || quote"
      :prevent-close="busy"
      :title="
        !quote
          ? '发起 USD 付款'
          : quote.status === 'PENDING'
            ? '核对付款报价'
            : '付款订单详情'
      "
      @close="resetDialog"
    >
      <template v-if="!quote">
        <div v-if="!ready" class="panel onboard-gate">
          <IconInfoCircle :size="30" />
          <div>
            <h2>
              {{
                !mvp.merchant.no
                  ? "请先开通企业账户"
                  : "完成企业与银行审核后，即可申请兑换"
              }}
            </h2>
            <p>申请开户 → 提交 KYC → 通道开通 → 银行收款人审核。</p>
          </div>
          <RouterLink
            class="btn primary"
            :to="
              mvp.merchant.channel === 'AVAILABLE'
                ? '/client/accounts'
                : '/client/onboarding'
            "
            >{{
              !mvp.merchant.no ? "开通企业账户" : "完善收款账户"
            }}</RouterLink
          >
        </div>
        <div v-if="ready" class="payout-dialog-form">
          <form id="payout-form" @submit.prevent="getQuote">
            <div class="mvp-amount-box">
              <label for="sell-amount">卖出金额</label>
              <div>
                <input
                  id="sell-amount"
                  v-model="amount"
                  inputmode="decimal"
                  placeholder="0.00"
                /><strong>USDT</strong>
              </div>
              <small>可用 {{ mvp.balances.USDT }} USDT</small>
            </div>
            <div class="mvp-exchange-divider">
              参考汇率：1 USDT ≈ {{ preview.rate }} USD
            </div>
            <div class="mvp-amount-box receive">
              <label>预计到账金额</label>
              <div>
                <strong class="mvp-result">{{ preview.receive }}</strong
                ><strong>USD</strong>
              </div>
              <small>扣除手续费后参与兑换</small>
            </div>
            <label class="mvp-bank-label"
              >收款银行账户<AppSelect
                v-model="bankId"
                label="收款银行账户"
                searchable
                :options="[
                  { value: '', label: '请选择已审核账户' },
                  ...approved.map((b) => ({
                    value: b.no,
                    label:
                      b.accountName +
                      ' · ' +
                      b.bankName +
                      ' · ' +
                      b.accountNo.slice(-4) +
                      ' · ' +
                      (b.relationship === 'SELF' ? '本企业' : '第三方企业'),
                  })),
                ]"
            /></label>
            <p class="mvp-caption">
              {{
                selectedBank?.relationship === "SELF"
                  ? "本企业账户提现"
                  : "第三方企业付款"
              }}
              · 对方收到 USD，使用您的 USDT 余额支付。
            </p>
            <div class="mvp-fee">
              <span>参考手续费</span><strong>{{ preview.fee }} USDT</strong>
            </div>
            <p v-if="error && !quote" class="mvp-error" role="alert">
              {{ error }}
            </p>
            <p class="mvp-caption">报价保留 5 分钟，确认前不冻结余额。</p>
          </form>
        </div>
      </template>
      <template v-else>
        <div class="mvp-modal-top">
          <span
            :class="[
              'status',
              quote.status === 'COMPLETED' ? 'success' : 'warning',
            ]"
            >{{ statusText(quote, clock) }}</span
          ><strong v-if="quote.status === 'PENDING' && remaining">{{
            remaining
              ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} 后过期`
              : "报价已过期"
          }}</strong>
        </div>
        <div class="mvp-modal-amount">
          <span>{{ quote.actualReceive ? "实际到账" : "预计到账" }}</span
          ><strong
            >{{ quote.actualReceive || quote.receive }}
            <small>USD</small></strong
          >
        </div>
        <dl class="mvp-details">
          <div>
            <dt>付款订单号</dt>
            <dd>{{ quote.id }}</dd>
          </div>
          <div>
            <dt>申请编号</dt>
            <dd>{{ quote.sn }}</dd>
          </div>
          <div>
            <dt>卖出金额</dt>
            <dd>{{ quote.amount }} USDT</dd>
          </div>
          <div>
            <dt>手续费</dt>
            <dd>{{ quote.fee }} USDT</dd>
          </div>
          <div>
            <dt>参与兑换金额</dt>
            <dd>{{ quote.net }} USDT</dd>
          </div>
          <div>
            <dt>汇率</dt>
            <dd>{{ quote.rate }}</dd>
          </div>
          <div>
            <dt>收款银行账户</dt>
            <dd>{{ quote.account }}</dd>
          </div>
          <div>
            <dt>业务类型</dt>
            <dd>
              {{
                quote.orderType === "WITHDRAW"
                  ? "本企业账户提现"
                  : "第三方企业付款"
              }}
            </dd>
          </div>
          <div>
            <dt>用途</dt>
            <dd>
              {{ purposeLabels[purposes.indexOf(quote.purpose)] || "待填写" }}
            </dd>
          </div>
          <div>
            <dt>创建时间</dt>
            <dd>{{ date(quote.created) }}</dd>
          </div>
          <div>
            <dt>更新时间</dt>
            <dd>{{ date(quote.updated) }}</dd>
          </div>
          <div>
            <dt>完成时间</dt>
            <dd>{{ date(quote.completed) }}</dd>
          </div>
          <div>
            <dt>付款渠道</dt>
            <dd>
              {{
                quote.payoutChannel === "MANUAL"
                  ? "人工打款"
                  : quote.payoutChannel === "PAYMENT_CHANNEL"
                    ? "支付通道"
                    : "待分配"
              }}
            </dd>
          </div>
          <div v-if="quote.remark">
            <dt>备注</dt>
            <dd>{{ quote.remark }}</dd>
          </div>
        </dl>
        <p class="mvp-caption">
          报价费用不表示已经扣款，实际到账以订单结果为准。
        </p>
        <label v-if="quote.status === 'PENDING' && remaining"
          >结算用途<AppSelect
            v-model="purpose"
            label="结算用途"
            searchable
            :options="[
              { value: '', label: '请选择用途' },
              ...purposes.map((value, i) => ({
                value,
                label: purposeLabels[i]!,
              })),
            ]"
        /></label>
        <p v-if="error" class="mvp-error" role="alert">{{ error }}</p>

        <section v-if="quote.status === 'COMPLETED'" class="detail-section">
          <h3>打款凭据</h3>
          <p v-if="!quote.proofUrls.length" class="muted">暂无打款凭据</p>
          <a
            v-for="(url, index) in quote.proofUrls.filter((url) =>
              /^https:\/\//i.test(url),
            )"
            :key="url"
            class="text-link"
            :href="url"
            target="_blank"
            rel="noopener noreferrer"
            >查看凭据 {{ index + 1 }} ↗</a
          >
          <p v-if="quote.proofUrls.length" class="mvp-caption">
            凭据链接有效期为 7 天。
          </p>
        </section>
        <div v-if="quote.status === 'COMPLETED'" class="mvp-notice">
          <IconCheck :size="20" />付款已完成
        </div>
      </template>
      <template #footer
        ><button class="btn secondary" :disabled="busy" @click="modal?.close()">
          关闭</button
        ><button
          v-if="!quote && ready"
          type="submit"
          form="payout-form"
          class="btn primary"
          :disabled="busy"
        >
          获取付款报价</button
        ><template v-if="quote?.status === 'PENDING'"
          ><button
            class="btn secondary"
            :disabled="busy"
            @click="
              cancelOrder(quote);
              error = '';
            "
          >
            取消申请</button
          ><button
            class="btn primary"
            :disabled="!remaining || !purpose || busy"
            @click="
              run(async () => {
                const order = quote;
                const selectedPurpose = purpose;
                if (
                  order &&
                  (await requestMfa(
                    demo.email,
                    `确认支付 ${order.amount} USDT，预计到账 ${order.receive} USD。`,
                  )) &&
                  live
                ) {
                  confirmOrder(order, selectedPurpose);
                  amount = '';
                  notice = '付款申请已提交，可在付款订单中查看进度。';
                }
              })
            "
          >
            {{ busy ? "正在验证…" : "确认付款申请" }}
          </button></template
        ></template
      ></AppModal
    >
  </div>
</template>
