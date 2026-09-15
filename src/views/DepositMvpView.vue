<script setup lang="ts">
import QRCode from "qrcode";
import ListPagination from "../components/ListPagination.vue";
import AppSelect from "../components/AppSelect.vue";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  IconPlus,
  IconCopy,
  IconQrcode,
  IconShieldCheck,
} from "@tabler/icons-vue";
import AppModal from "../components/AppModal.vue";
import {
  deposits,
  createDeposit,
  closeDeposit,
  type Deposit,
} from "../lib/deposit-mvp";
import { mvp } from "../lib/mvp";
import type { Coin } from "../lib/payfi-rules";
const props = defineProps<{ actionOnly?: boolean }>();
const modal = ref<InstanceType<typeof AppModal>>();
import { paymentActions } from "../lib/payment-actions";
function openCreate() {
  if (mode.value) return;
  error.value = "";
  mode.value = "create";
}
watch(
  () => paymentActions.deposit,
  () => {
    if (props.actionOnly) openCreate();
  },
);
const coin = ref<Coin>("USDT"),
  network = ref("TRON"),
  amount = ref(""),
  mode = ref(""),
  selected = ref<Deposit>(),
  error = ref("");
watch(coin, (c) => {
  if (c === "USDC") network.value = "ETHEREUM";
});
const route = useRoute();
watch(
  () => route.path,
  () => {
    if (props.actionOnly) mode.value = "";
  },
);
watch(
  () => route.query.order,
  (id) => {
    if (props.actionOnly) return;
    const order = deposits.find((d) => d.id === id);
    if (order) {
      selected.value = order;
      mode.value = "detail";
    }
  },
  { immediate: true },
);
const search = ref(""),
  filter = ref("");
const rows = computed(() =>
  deposits.filter(
    (d) =>
      (!search.value ||
        d.id.includes(search.value.trim()) ||
        d.sn.includes(search.value.trim())) &&
      (!filter.value || d.status === filter.value),
  ),
);
const date = (n: number | null) =>
  n ? new Date(n).toLocaleString("zh-CN", { hour12: false }) : "—";
const labels = {
  PENDING: "等待收款",
  PARTIAL: "部分到账",
  COMPLETED: "已完成",
  TERMINATED: "已终止",
};
const flowLabels: Record<string, string> = {
  RECEIVED: "正常到账",
  RETURNED: "已自动退回",
  REFUNDABLE: "可退款",
  REFUNDING: "退款中",
  REFUND_SUCCEED: "退款成功",
};
// Display-only fixtures are deliberately invalid chain addresses; never put them in API order data.
const displayAddress = computed(() => {
  if (!selected.value) return "";
  return (
    selected.value.address ||
    (selected.value.network === "TRON"
      ? "T_DEMO_TRC20_USDT_DO_NOT_TRANSFER"
      : "0x_DEMO_ERC20_USDT_DO_NOT_TRANSFER")
  );
});
const addressQr = ref("");
const copied = ref(false);
watch(
  displayAddress,
  async (address, _, onCleanup) => {
    let active = true;
    onCleanup(() => {
      active = false;
    });
    addressQr.value = "";
    copied.value = false;
    if (address) {
      try {
        const data = await QRCode.toDataURL(address, { width: 180, margin: 2 });
        if (active) addressQr.value = data;
      } catch {
        /* The text address remains usable if QR rendering fails. */
      }
    }
  },
  { immediate: true },
);
async function copyAddress() {
  try {
    if (displayAddress.value) {
      await navigator.clipboard.writeText(displayAddress.value);
      copied.value = true;
    }
  } catch {
    error.value = "复制失败，请手动复制充值地址。";
  }
}
function create() {
  try {
    selected.value = createDeposit(amount.value, coin.value, network.value);
    amount.value = "";
    mode.value = "address";
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
const page = ref(1);
watch([search, filter], () => (page.value = 1));
watch(
  () => rows.value.length,
  (total) =>
    (page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 20)))),
);
const visibleRows = computed(() =>
  rows.value.slice((page.value - 1) * 20, page.value * 20),
);
</script>
<template>
  <div :class="actionOnly ? 'action-dialog-host' : 'mvp-page'">
    <template v-if="!actionOnly">
      <div class="page-heading">
        <div>
          <h1>充值订单</h1>
          <p>管理 USDT 充值订单，查看正常到账、异常到账和处理进度。</p>
        </div>
        <button
          class="btn primary"
          :disabled="mvp.merchant.status !== 'ACTIVE'"
          @click="openCreate"
        >
          <IconPlus :size="18" />发起充值
        </button>
      </div>
      <div v-if="mvp.merchant.status !== 'ACTIVE'" class="mvp-notice">
        {{
          mvp.merchant.no
            ? "当前企业账户不可充值，请查看账户状态。"
            : "请先创建企业账户，再发起 USDT 充值。"
        }}
        <RouterLink to="/client/onboarding">查看账户信息 →</RouterLink>
      </div>
      <section class="panel mvp-records">
        <div class="mvp-filters">
          <input
            v-model="search"
            aria-label="搜索充值订单"
            placeholder="搜索充值单号 / 商户订单号"
          /><AppSelect
            v-model="filter"
            label="充值订单状态"
            :options="[
              { value: '', label: '全部状态' },
              ...Object.entries(labels).map(([value, label]) => ({
                value,
                label,
              })),
            ]"
          />
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>充值单号 / 商户订单号</th>
                <th>充值金额</th>
                <th>商户应收</th>
                <th>正常到账 / 异常到账</th>
                <th>网络</th>
                <th>状态</th>
                <th>创建时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in visibleRows" :key="d.id">
                <td>
                  <strong>{{ d.id }}</strong
                  ><small class="mvp-block">{{ d.sn }}</small>
                </td>
                <td>{{ d.amount }} {{ d.coin }}</td>
                <td>{{ d.net }} {{ d.coin }}</td>
                <td>
                  {{ d.received }} {{ d.coin
                  }}<small class="mvp-block"
                    >异常：{{ d.trouble }} {{ d.coin }}</small
                  >
                </td>
                <td>{{ d.network }}</td>
                <td>
                  <span
                    :class="[
                      'status',
                      d.status === 'COMPLETED' ? 'success' : 'warning',
                    ]"
                    >{{ labels[d.status] }}</span
                  >
                </td>
                <td>{{ date(d.created) }}</td>
                <td>
                  <button
                    class="text-link"
                    @click="
                      selected = d;
                      mode = 'detail';
                    "
                  >
                    详情
                  </button>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="8">
                  <div class="mvp-empty">
                    <strong>{{
                      search || filter ? "暂无匹配的充值订单" : "暂无充值订单"
                    }}</strong>
                    <p>
                      {{
                        search || filter
                          ? "请调整搜索条件或状态筛选。"
                          : "发起 USDT 充值后，可在这里查看进度。"
                      }}
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ListPagination v-model="page" :total="rows.length" />
      </section>
    </template>
    <AppModal
      ref="modal"
      v-if="mode"
      :title="
        mode === 'create'
          ? 'USDT 充值'
          : mode === 'address'
            ? 'USDT 收款地址'
            : mode === 'close'
              ? '终止充值单'
              : '充值单详情'
      "
      @close="mode = ''"
    >
      <div v-if="error" class="mvp-error" role="alert">{{ error }}</div>
      <div v-if="mode === 'create'" class="mvp-deposit-form">
        <div class="deposit-intro">
          <span class="deposit-token">₮</span>
          <div>
            <strong>充值 USDT</strong>
            <p>设置充值金额与网络，创建本次收款订单。</p>
          </div>
        </div>
        <label
          >网络<AppSelect
            v-model="network"
            label="网络"
            :options="[
              { value: 'TRON', label: 'TRON（TRC20）' },
              { value: 'ETHEREUM', label: 'Ethereum（ERC20）' },
            ]" /></label
        ><label
          >充值金额（USDT）<input
            v-model="amount"
            inputmode="decimal"
            placeholder="0.00"
        /></label>
        <p class="mvp-caption">
          创建后显示本次订单的收款地址。金额须大于 0，最多两位小数。
        </p>
      </div>
      <template v-else-if="selected && ['address', 'detail'].includes(mode)">
        <section class="deposit-receive">
          <div class="deposit-network">
            <span>收款币种与网络</span
            ><strong
              >{{ selected.coin }} ·
              {{ selected.network === "TRON" ? "TRC20" : "ERC20" }}</strong
            >
          </div>
          <div class="deposit-address-layout">
            <div class="deposit-qr">
              <img
                v-if="addressQr"
                :src="addressQr"
                alt="充值地址二维码"
                width="180"
                height="180"
              />
              <template v-else
                ><IconQrcode :size="64" stroke-width="1" /><span>{{
                  displayAddress ? "二维码暂不可用" : "地址未就绪"
                }}</span></template
              >
            </div>
            <div class="deposit-address-content">
              <label>本次充值收款地址</label>
              <div class="deposit-address-box">
                <code v-if="displayAddress">{{ displayAddress }}</code>
                <span v-else>尚未取得收款地址，暂不可转账</span>
                <button
                  v-if="displayAddress"
                  class="icon-button"
                  :aria-label="copied ? '已复制地址' : '复制收款地址'"
                  @click="copyAddress"
                >
                  <IconCopy :size="20" />
                </button>
              </div>
              <p v-if="copied" class="mvp-caption" role="status">
                收款地址已复制
              </p>
              <div class="deposit-network-note">
                <IconShieldCheck :size="22" />
                <div>
                  <strong>收款币种与网络</strong>
                  <p>
                    {{
                      selected.network === "TRON"
                        ? "TRON（TRC20）"
                        : "Ethereum（ERC20）"
                    }}
                    网络的 {{ selected.coin }}。
                  </p>
                  <p v-if="selected.address">
                    此地址用于本次充值订单，订单完成或终止后请勿继续转入。
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="deposit-summary">
            <div>
              <span>本次充值金额</span
              ><strong>{{ selected.amount }} {{ selected.coin }}</strong>
            </div>
            <div>
              <span>手续费</span
              ><strong>{{ selected.fee }} {{ selected.coin }}</strong>
            </div>
            <div>
              <span>商户应收</span
              ><strong>{{ selected.net }} {{ selected.coin }}</strong>
            </div>
          </div>
          <p class="mvp-caption">
            正常到账达到本次充值金额后，订单完成。异常到账不计入正常可用余额。
          </p>
        </section>
        <template v-if="mode === 'detail'">
          <span
            :class="[
              'status',
              selected.status === 'COMPLETED' ? 'success' : 'warning',
            ]"
            >{{ labels[selected.status] }}</span
          >
          <dl class="mvp-details">
            <div>
              <dt>订单号</dt>
              <dd>{{ selected.id }}</dd>
            </div>
            <div>
              <dt>商户订单号</dt>
              <dd>{{ selected.sn }}</dd>
            </div>
            <div>
              <dt>实际正常到账</dt>
              <dd>{{ selected.received }} {{ selected.coin }}</dd>
            </div>
            <div>
              <dt>异常到账</dt>
              <dd>{{ selected.trouble }} {{ selected.coin }}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{{ date(selected.created) }}</dd>
            </div>
            <div>
              <dt>收款网络</dt>
              <dd>{{ selected.network }}</dd>
            </div>
            <div>
              <dt>完成 / 关闭时间</dt>
              <dd>
                {{
                  selected.completed
                    ? new Date(selected.completed).toLocaleString("zh-CN")
                    : "—"
                }}
              </dd>
            </div>
          </dl>
          <section class="detail-section">
            <p class="mvp-caption">
              商户应收是创建订单时确定的金额，不代表链上实收；异常到账不计入正常可用余额。
            </p>
          </section>
          <section
            v-for="group in [
              { title: '到账流水', rows: selected.flows },
              { title: '异常退款流水', rows: selected.refundableFlows },
            ]"
            :key="group.title"
            class="detail-section"
          >
            <h3>{{ group.title }}</h3>
            <p v-if="!group.rows.length" class="muted">暂无{{ group.title }}</p>
            <dl v-for="flow in group.rows" :key="flow.id" class="mvp-details">
              <div>
                <dt>流水编号</dt>
                <dd>{{ flow.id }}</dd>
              </div>
              <div>
                <dt>到账数量</dt>
                <dd>{{ flow.amount }} {{ selected.coin }}</dd>
              </div>
              <div>
                <dt>处理结果</dt>
                <dd>
                  {{
                    flowLabels[flow.status || flow.refundStatus || ""] ||
                    "待确认"
                  }}
                </dd>
              </div>
              <div>
                <dt>来源地址</dt>
                <dd>{{ flow.fromAddress }}</dd>
              </div>
              <div>
                <dt>交易哈希</dt>
                <dd>{{ flow.txHash }}</dd>
              </div>
              <div>
                <dt>风险等级</dt>
                <dd>{{ flow.riskLevel || "未提供" }}</dd>
              </div>
              <div>
                <dt>创建时间</dt>
                <dd>{{ date(flow.created) }}</dd>
              </div>
            </dl>
          </section>

          <RouterLink
            v-if="selected.status === 'COMPLETED'"
            class="btn primary"
            to="/client/exchange"
            @click="mode = ''"
            >使用余额支付 USD</RouterLink
          ></template
        ></template
      >
      <p v-else-if="mode === 'close'">
        终止后无法继续正常收款。后续到账应归入异常资金，不可直接结算。
      </p>
      <template #footer
        ><button class="btn secondary" @click="modal?.close()">关闭</button
        ><button v-if="mode === 'create'" class="btn primary" @click="create">
          获取收款地址</button
        ><button
          v-if="mode === 'address'"
          class="btn secondary"
          @click="mode = 'detail'"
        >
          查看订单详情</button
        ><button
          v-if="
            mode === 'detail' &&
            selected &&
            ['PENDING', 'PARTIAL'].includes(selected.status)
          "
          class="btn secondary"
          @click="mode = 'close'"
        >
          终止订单</button
        ><button
          v-if="mode === 'close' && selected"
          class="btn primary"
          @click="
            closeDeposit(selected);
            mode = 'detail';
          "
        >
          确认终止
        </button></template
      ></AppModal
    >
  </div>
</template>

<style scoped>
.deposit-intro {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}
.deposit-token {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #eaf1fc;
  color: #2563eb;
  font-size: 26px;
}
.deposit-intro p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}
.deposit-network {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
  font-size: 13px;
  color: #64748b;
}
.deposit-network strong {
  padding: 8px 12px;
  background: #1e293b;
  color: white;
  border-radius: 6px;
}
.deposit-address-layout {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.deposit-qr {
  width: 180px;
  min-height: 180px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
  background: #f8fafc;
  overflow: hidden;
  font-size: 12px;
}
.deposit-address-content {
  min-width: 0;
}
.deposit-address-content label {
  font-size: 13px;
  color: #64748b;
}
.deposit-address-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  background: #f8fafc;
  border-radius: 8px;
  margin: 10px 0 16px;
  min-height: 68px;
}
.deposit-address-box code {
  overflow-wrap: anywhere;
  min-width: 0;
  font-size: 13px;
  line-height: 1.7;
}
.deposit-address-box > span {
  font-size: 13px;
  line-height: 1.7;
  color: #64748b;
}
.deposit-address-box button {
  flex-shrink: 0;
  margin-left: auto;
}
.deposit-network-note {
  display: flex;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  font-size: 12px;
  line-height: 1.7;
}
.deposit-network-note > svg {
  flex-shrink: 0;
  color: #2563eb;
}
.deposit-network-note p {
  color: #64748b;
  margin: 8px 0 0;
}
.deposit-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 24px;
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
}
.deposit-summary span {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}
.deposit-summary strong {
  font-size: 13px;
  overflow-wrap: anywhere;
}
@media (max-width: 600px) {
  .deposit-address-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
  .deposit-qr {
    justify-self: center;
  }
  .deposit-summary {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .deposit-summary > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .deposit-summary span {
    margin: 0;
  }
}
</style>
