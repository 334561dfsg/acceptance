<script setup lang="ts">
import ListPagination from "../components/ListPagination.vue";
import { requestMfa } from "../lib/mfa";
import { demo } from "../lib/store";
import { useRouter } from "vue-router";
const router = useRouter();
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { mvp, type BankAccount } from "../lib/mvp";
import { bankTemplate, removeAccount } from "../lib/banks";
import AppModal from "../components/AppModal.vue";
let live = true;
onBeforeUnmount(() => {
  live = false;
});
const mode = ref(""),
  selected = ref<BankAccount>(),
  error = ref(""),
  busy = ref(false),
  search = ref("");
const rows = computed(() =>
  mvp.banks.filter(
    (b) =>
      b.status !== "DELETED" &&
      (!search.value ||
        (b.accountName + b.bankName + b.accountNo)
          .toLowerCase()
          .includes(search.value.toLowerCase())),
  ),
);
const labels: Record<string, string> = {
  PENDING: "审核中",
  APPROVED: "已审核",
  DECLINED: "已驳回",
  DELETING: "删除中",
};
function open(b?: BankAccount) {
  void router.push(
    b
      ? `/client/accounts/${encodeURIComponent(b.no)}/edit`
      : "/client/accounts/new",
  );
}
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
const page = ref(1);
watch([search], () => (page.value = 1));
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
  <div class="mvp-page">
    <div class="page-heading">
      <div>
        <h1>收款账户</h1>
        <p>添加多个企业美元账户，付款时选择已审核账户。不支持个人银行卡。</p>
      </div>
      <button
        class="btn primary"
        :disabled="mvp.merchant.channel !== 'AVAILABLE'"
        @click="open()"
      >
        添加银行账户
      </button>
    </div>
    <div v-if="mvp.merchant.channel !== 'AVAILABLE'" class="mvp-notice">
      当前账户状态暂不支持新增收款账户。<RouterLink to="/client/onboarding"
        >查看企业账户</RouterLink
      >
    </div>
    <section class="panel mvp-records">
      <input
        v-model="search"
        placeholder="搜索账户名称、银行或账号"
        aria-label="搜索银行账户"
      />
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>企业账户名称</th>
              <th>银行 / 账号</th>
              <th>账户关系</th>
              <th>地区 / 通道</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in visibleRows" :key="b.no">
              <td>{{ b.accountName }}</td>
              <td>
                {{ b.bankName
                }}<small class="mvp-block"
                  >•••• {{ b.accountNo.slice(-4) }}</small
                >
              </td>
              <td>{{ b.relationship === "SELF" ? "本企业" : "第三方企业" }}</td>
              <td>
                {{ b.country === "HK" ? "中国香港" : b.country }} /
                {{ b.routing }}
              </td>
              <td>
                <span
                  :class="[
                    'status',
                    b.status === 'APPROVED' ? 'success' : 'warning',
                  ]"
                  >{{ labels[b.status] }}</span
                >
              </td>
              <td>
                <button
                  class="text-link"
                  @click="
                    selected = b;
                    mode = 'detail';
                    error = '';
                  "
                >
                  详情
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="6">
                <div class="mvp-empty">
                  <strong>{{
                    search ? "暂无匹配的收款账户" : "尚未添加收款账户"
                  }}</strong>
                  <p>
                    {{
                      search
                        ? "请调整搜索条件。"
                        : "添加企业美元银行账户，审核通过后即可用于付款。"
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
    <AppModal
      v-if="mode"
      :prevent-close="busy"
      :title="
        mode === 'form'
          ? selected
            ? '修改银行资料'
            : '添加银行账户'
          : mode === 'delete'
            ? '删除银行账户'
            : '银行账户详情'
      "
      @close="mode = ''"
    >
      <p v-if="error" class="mvp-error" role="alert">{{ error }}</p>
      <template v-if="selected"
        ><p v-if="mode === 'delete'">
          删除后不能再用于新的付款。提交后将进入删除处理中。
        </p>
        <dl class="mvp-details">
          <div>
            <dt>收款账户编号</dt>
            <dd>{{ selected.no }}</dd>
          </div>
          <div>
            <dt>申请编号</dt>
            <dd>{{ selected.sn }}</dd>
          </div>
          <div>
            <dt>账户名称</dt>
            <dd>{{ selected.accountName }}</dd>
          </div>
          <div>
            <dt>银行</dt>
            <dd>{{ selected.bankName }}</dd>
          </div>
          <div>
            <dt>账号</dt>
            <dd>{{ selected.accountNo }}</dd>
          </div>
          <div>
            <dt>地区 / 币种 / 通道</dt>
            <dd>
              {{ selected.country === "HK" ? "中国香港" : selected.country }} /
              USD / {{ selected.routing }}
            </dd>
          </div>
          <div>
            <dt>账户关系</dt>
            <dd>
              {{ selected.relationship === "SELF" ? "本企业" : "第三方企业" }} ·
              对公
            </dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>{{ labels[selected.status] || selected.status }}</dd>
          </div>
          <div
            v-for="f in bankTemplate(
              selected.country,
              selected.routing,
              selected.relationship,
            ).filter(
              (f) =>
                !['b.account_name', 'b.account_no', 'b.bank_name'].includes(
                  f.key,
                ),
            )"
            :key="f.key"
          >
            <dt>{{ f.label }}</dt>
            <dd>{{ selected.fields[f.key] || "—" }}</dd>
          </div>
          <div>
            <dt>证明材料</dt>
            <dd>{{ selected.material.name }}</dd>
          </div>
        </dl>
        <p v-if="selected.reason" class="mvp-error">{{ selected.reason }}</p>
      </template>
      <template #footer
        ><button class="btn secondary" :disabled="busy" @click="mode = ''">
          关闭</button
        ><template v-if="mode === 'detail' && selected"
          ><button
            v-if="selected.status === 'DECLINED'"
            class="btn primary"
            @click="open(selected)"
          >
            修改并重新提交</button
          ><button
            v-if="['APPROVED', 'DECLINED'].includes(selected.status)"
            class="btn secondary"
            @click="mode = 'delete'"
          >
            删除账户
          </button></template
        ><button
          v-if="mode === 'delete' && selected"
          class="btn primary"
          :disabled="busy"
          @click="
            run(async () => {
              if (!(await requestMfa(demo.email, '验证身份后删除收款账户。')))
                return;
              if (!live) return;
              removeAccount(selected!);
              mode = 'detail';
            })
          "
        >
          确认删除
        </button></template
      >
    </AppModal>
  </div>
</template>
