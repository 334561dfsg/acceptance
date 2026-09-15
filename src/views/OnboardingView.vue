<script setup lang="ts">
import {
  accountStage,
  channelLabels,
  merchantLabels,
} from "../lib/payfi-rules";
import SecuritySettings from "../components/SecuritySettings.vue";
import AppSelect from "../components/AppSelect.vue";
import { computed, ref, nextTick } from "vue";
import { IconCheck, IconClock, IconArrowRight } from "@tabler/icons-vue";
import industries from "../lib/industries.json";
import { mvp } from "../lib/mvp";
import { demo } from "../lib/store";
import {
  onboarding as o,
  companyFields,
  addressFields,
  personFields,
  materialKeys,
  materialNames,
  createMerchant,
  submitKyc,
  fieldsIssue,
} from "../lib/onboarding";
import OnboardingFields from "../components/OnboardingFields.vue";
import MaterialInput from "../components/MaterialInput.vue";
const accountTab = ref("company");
const accountTabs = [
  { key: "company", label: "企业资料" },
  { key: "security", label: "安全设置" },
];
function switchTab(event: KeyboardEvent, index: number) {
  const key = event.key;
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
  event.preventDefault();
  const next =
    key === "Home"
      ? 0
      : key === "End"
        ? 1
        : (index + (key === "ArrowRight" ? 1 : -1) + 2) % 2;
  accountTab.value = accountTabs[next]!.key;
  (event.currentTarget as HTMLElement).parentElement
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    [next]?.focus();
}
const errorElement = ref<HTMLElement>();
const name = ref(""),
  error = ref(""),
  tab = ref("company");
const stage = computed(() =>
  accountStage(mvp.merchant.no, mvp.merchant.channel),
);
const titles = [
  "开通企业账户",
  "提交企业认证",
  "等待通道审核",
  "绑定收款银行",
  "开始兑换美元",
];
const kycEditable = computed(() => mvp.merchant.channel === "UNAVAILABLE");
function action(fn: () => void) {
  error.value = "";
  try {
    fn();
  } catch (e) {
    error.value = (e as Error).message;
    nextTick(() => {
      errorElement.value?.focus();
      errorElement.value?.scrollIntoView({ block: "center" });
    });
  }
}
function addUbo() {
  if (o.ubos.length < 10) o.ubos.push({});
}
function removeUbo(i: number) {
  o.ubos.splice(i, 1);
  for (const key of Object.keys(o.materials))
    if (key.startsWith("UBO_")) {
      const index = Number(key.split("_")[1]);
      if (index === i) delete o.materials[key];
      else if (index > i) {
        o.materials[`UBO_${index - 1}_PP`] = o.materials[key]!;
        delete o.materials[key];
      }
    }
}
function nextKycStep() {
  action(() => {
    if (tab.value === "company") {
      const issue = fieldsIssue(o.company, [
        ...companyFields,
        ...addressFields("register_"),
        ...addressFields("operation_"),
      ]);
      if (issue) throw new Error(issue);
      tab.value = "people";
    } else {
      const issue = fieldsIssue(o.legal, personFields);
      if (issue) throw new Error("法人：" + issue);
      for (let i = 0; i < o.ubos.length; i++) {
        const issue = fieldsIssue(o.ubos[i]!, personFields);
        if (issue) throw new Error(`受益人 ${i + 1}：${issue}`);
      }
      tab.value = "materials";
    }
  });
}
</script>
<template>
  <div class="mvp-page onboard-page">
    <div class="page-heading">
      <div>
        <h1>账户信息</h1>
      </div>
    </div>
    <div class="account-tabs" role="tablist" aria-label="账户设置">
      <button
        v-for="(item, index) in accountTabs"
        :id="`account-tab-${item.key}`"
        :key="item.key"
        role="tab"
        type="button"
        :aria-selected="accountTab === item.key"
        :aria-controls="`account-panel-${item.key}`"
        :tabindex="accountTab === item.key ? 0 : -1"
        @click="accountTab = item.key"
        @keydown="switchTab($event, index)"
      >
        {{ item.label }}
      </button>
    </div>
    <div
      v-show="accountTab === 'company'"
      id="account-panel-company"
      role="tabpanel"
      aria-labelledby="account-tab-company"
      class="panel account-enterprise"
    >
      <ol v-if="stage >= 0 && stage !== 4" class="onboard-progress">
        <li
          v-for="(t, i) in titles.slice(0, 3)"
          :key="t"
          :class="{ current: i === stage, complete: i < stage }"
        >
          <b
            ><IconCheck v-if="i < stage" :size="16" /><template v-else>{{
              i + 1
            }}</template></b
          >
          <span>{{ t }}</span>
        </li>
      </ol>
      <div
        v-if="error"
        ref="errorElement"
        tabindex="-1"
        class="mvp-error"
        role="alert"
      >
        {{ error }}
      </div>
      <section v-if="stage === 0" class="panel onboard-start">
        <h2>填写企业资料</h2>
        <p>请输入与企业注册文件一致的名称。</p>
        <dl class="mvp-details account-context">
          <div>
            <dt>当前账户</dt>
            <dd>{{ demo.email }}</dd>
          </div>
          <div>
            <dt>支持范围</dt>
            <dd>香港企业认证 · 企业对公收款账户</dd>
          </div>
        </dl>
        <form @submit.prevent="action(() => createMerchant(name, demo.email))">
          <label
            >企业名称<input
              v-model="name"
              placeholder="请输入企业官方名称"
              maxlength="256"
              required /></label
          ><button class="btn primary" type="submit">
            下一步，填写认证资料 <IconArrowRight :size="18" />
          </button>
        </form>
        <p class="mvp-caption">企业认证通过后，可添加收款账户。</p>
      </section>
      <template v-else
        ><section class="panel onboard-summary">
          <div>
            <strong>{{ mvp.merchant.name }}</strong>
            <p>{{ o.owner }} · {{ mvp.merchant.no }}</p>
          </div>
          <span :class="['status', stage === 4 ? 'success' : 'warning']">{{
            channelLabels[mvp.merchant.channel] || "状态待确认"
          }}</span>
        </section>
        <template v-if="stage === 1"
          ><div v-if="o.kycReason" class="mvp-error">{{ o.kycReason }}</div>
          <section class="panel onboard-form">
            <div class="section-heading">
              <h2>企业认证资料</h2>
            </div>
            <p class="mvp-caption">支持香港企业，法人及受益人使用护照材料。</p>
            <div class="mvp-tabs" role="group" aria-label="认证资料步骤">
              <button
                v-for="(v, k) in {
                  company: '企业信息',
                  people: '法人及受益人',
                  materials: '证明材料',
                }"
                :key="k"
                :class="{ selected: tab === k }"
                :aria-pressed="tab === k"
                @click="tab = k"
              >
                {{ v }}
              </button>
            </div>
            <div v-show="tab === 'company'">
              <OnboardingFields
                v-model="o.company"
                :fields="companyFields"
                :disabled="!kycEditable"
              /><label class="onboard-industry"
                >所属行业<AppSelect
                  v-model="o.industry"
                  label="所属行业"
                  searchable
                  :disabled="!kycEditable"
                  :options="industries"
              /></label>
              <div class="onboard-checks">
                <label
                  ><input v-model="o.isListed" type="checkbox" />上市公司</label
                ><label
                  ><input
                    v-model="o.isStateOwned"
                    type="checkbox"
                  />国有企业</label
                ><label
                  ><input
                    v-model="o.isForeignOwned"
                    type="checkbox"
                  />存在外资或境外企业股东（须补充股权结构图）</label
                >
              </div>
              <h3>企业注册地址</h3>
              <OnboardingFields
                v-model="o.company"
                :fields="addressFields('register_')"
              />
              <h3>企业运营地址</h3>
              <OnboardingFields
                v-model="o.company"
                :fields="addressFields('operation_')"
              />
            </div>
            <div v-show="tab === 'people'">
              <h3>法人 / 董事长 · 护照认证</h3>
              <OnboardingFields v-model="o.legal" :fields="personFields" />
              <section v-for="(u, i) in o.ubos" :key="i" class="onboard-person">
                <div class="section-heading">
                  <h3>最终受益人 {{ i + 1 }} · 护照认证</h3>
                  <button
                    v-if="o.ubos.length > 1"
                    class="text-link"
                    @click="removeUbo(i)"
                  >
                    移除此受益人
                  </button>
                </div>
                <OnboardingFields
                  :model-value="u"
                  @update:model-value="o.ubos[i] = $event"
                  :fields="personFields"
                />
              </section>
              <button
                class="btn secondary"
                :disabled="o.ubos.length >= 10"
                @click="addUbo"
              >
                添加受益人（{{ o.ubos.length }}/10）
              </button>
            </div>
            <div v-show="tab === 'materials'" class="onboard-materials">
              <MaterialInput
                v-for="k in materialKeys()"
                :key="k"
                v-model="o.materials[k]"
                :kind="k"
                :label="
                  materialNames[k] ||
                  `受益人 ${Number(k.split('_')[1]) + 1} 护照`
                "
              /><MaterialInput
                v-if="o.kycReason"
                v-model="o.materials.EXTRA"
                kind="EXTRA"
                label="补充材料（选填）"
              />
            </div>
            <div class="onboard-actions">
              <p>带 * 的字段及必需证明材料需完整填写。切换步骤保留本次草稿。</p>
              <button
                v-if="tab !== 'materials'"
                class="btn primary"
                @click="nextKycStep"
              >
                下一步</button
              ><button v-else class="btn primary" @click="action(submitKyc)">
                提交认证审核
              </button>
            </div>
          </section></template
        >
        <section v-if="stage === 2" class="panel onboard-wait">
          <IconClock :size="38" />
          <h2>企业认证审核中</h2>
          <p>
            资料已提交，审核期间不可重复提交或修改。通道开通后可添加收款银行账户。
          </p>
        </section>
        <section v-if="stage === -1" class="onboard-wait">
          <h2>{{ channelLabels[mvp.merchant.channel] || "账户状态待确认" }}</h2>
          <p>当前无法提交认证或发起付款，请联系账户管理员核实。</p>
        </section>
        <template v-if="stage === 4">
          <section class="panel onboard-ready enterprise-account-info">
            <div class="section-heading">
              <h2>企业资料</h2>
              <span class="status success">认证已通过</span>
            </div>
            <dl class="mvp-details">
              <div>
                <dt>企业名称</dt>
                <dd>{{ o.company.company_name || mvp.merchant.name }}</dd>
              </div>
              <div>
                <dt>英文名称</dt>
                <dd>{{ o.company.company_name_en }}</dd>
              </div>
              <div>
                <dt>企业账户编号</dt>
                <dd>{{ mvp.merchant.no }}</dd>
              </div>
              <div>
                <dt>关联账户</dt>
                <dd>{{ o.owner }}</dd>
              </div>
              <div>
                <dt>企业注册号</dt>
                <dd>{{ o.company.company_registration_no }}</dd>
              </div>
              <div>
                <dt>注册地区</dt>
                <dd>中国香港</dd>
              </div>
              <div>
                <dt>注册日期</dt>
                <dd>{{ o.company.company_registration_date }}</dd>
              </div>
              <div>
                <dt>所属行业</dt>
                <dd>
                  {{
                    industries.find((item) => item.value === o.industry)
                      ?.label || o.industry
                  }}
                </dd>
              </div>
              <div>
                <dt>注册地址</dt>
                <dd>
                  {{
                    [
                      o.company.register_state,
                      o.company.register_city,
                      o.company.register_line1,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  }}
                </dd>
              </div>
              <div>
                <dt>企业官网</dt>
                <dd>{{ o.company.business_site_url || "未填写" }}</dd>
              </div>
              <div>
                <dt>企业账户状态</dt>
                <dd>
                  {{ merchantLabels[mvp.merchant.status] || "状态待确认" }}
                </dd>
              </div>
              <div>
                <dt>支付通道状态</dt>
                <dd>
                  {{ channelLabels[mvp.merchant.channel] || "状态待确认" }}
                </dd>
              </div>
            </dl>
          </section>
          <section class="panel onboard-ready enterprise-account-info">
            <h2>收款银行账户</h2>
            <p>企业认证已完成，可添加多个本企业或第三方企业对公账户。</p>
            <div class="onboard-ready-actions">
              <RouterLink class="btn primary" to="/client/accounts"
                >管理收款银行账户</RouterLink
              ><RouterLink class="btn secondary" to="/client/payments"
                >USDT 充值</RouterLink
              >
            </div>
          </section>
        </template>
      </template>
    </div>
    <div
      v-show="accountTab === 'security'"
      id="account-panel-security"
      role="tabpanel"
      aria-labelledby="account-tab-security"
    >
      <SecuritySettings />
    </div>
  </div>
</template>

<style scoped>
.onboard-page .page-heading {
  margin-bottom: 20px;
}
.account-tabs {
  display: flex;
  gap: 28px;
  border-bottom: 1px solid #dfe5da;
  margin-bottom: 24px;
}
.account-tabs button {
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  padding: 14px 0;
  color: #78836f;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.account-tabs button[aria-selected="true"] {
  color: #283d22;
  border-bottom-color: #435f34;
  font-weight: 600;
}
.account-tabs button:focus-visible {
  outline: 2px solid #7ba756;
  outline-offset: 3px;
}
.account-enterprise {
  padding: 28px 32px;
}
.account-enterprise .onboard-progress {
  padding-bottom: 26px;
  margin-bottom: 28px;
  border-bottom: 1px solid #e9ece5;
}
.account-enterprise .onboard-progress li {
  flex: 0 1 280px;
}
.account-enterprise .panel {
  border: 0;
  box-shadow: none;
  border-radius: 0;
  padding: 0;
  max-width: none;
}
.account-enterprise .onboard-start form {
  max-width: 640px;
  margin-top: 28px;
}
.account-context {
  display: flex;
  flex-wrap: wrap;
  gap: 24px 64px;
  margin-top: 24px;
}
.account-context > div {
  display: block;
  border: 0;
  padding: 0;
}
.account-context dd {
  margin: 8px 0 0;
  text-align: left;
  overflow-wrap: anywhere;
}
.account-enterprise .onboard-start .mvp-caption {
  margin-top: 14px;
}
.account-enterprise .onboard-summary {
  padding-bottom: 24px;
  border-bottom: 1px solid #e9ece5;
}
.account-enterprise .enterprise-account-info + .enterprise-account-info {
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid #e9ece5;
}
#account-panel-security :deep(.security-settings) {
  margin-top: 0;
}
@media (max-width: 760px) {
  .account-enterprise {
    padding: 22px 18px;
  }
  .account-context {
    flex-direction: column;
    gap: 18px;
  }
  .account-enterprise .onboard-progress {
    padding-bottom: 20px;
    margin-bottom: 22px;
  }
}
</style>
