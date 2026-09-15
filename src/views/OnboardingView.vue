<script setup lang="ts">
import {
  accountStage,
  channelLabels,
  merchantLabels,
} from "../lib/payfi-rules";
import SecuritySettings from "../components/SecuritySettings.vue";
import AppSelect from "../components/AppSelect.vue";
import { computed, ref, nextTick, watch } from "vue";
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
import HongKongAddressFields from "../components/HongKongAddressFields.vue";
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
const kycHeading = ref<HTMLElement>();
const kycSteps = [
  { key: "company", title: "企业信息", description: "基本资料与经营地址" },
  { key: "people", title: "法人及受益人", description: "身份信息与持有人资料" },
  { key: "materials", title: "证明材料", description: "上传文件并提交审核" },
];
function copyRegisteredAddress() {
  for (const field of addressFields("register_")) {
    o.company[field.key.replace("register_", "operation_")] =
      o.company[field.key] || "";
  }
}
const errorElement = ref<HTMLElement>();
const name = ref(""),
  error = ref(""),
  tab = ref("company");
watch(tab, async () => {
  error.value = "";
  await nextTick();
  kycHeading.value?.focus({ preventScroll: true });
  kycHeading.value?.scrollIntoView({ block: "start", behavior: "auto" });
});
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
        <p>管理企业认证资料与账户安全设置。</p>
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
            <div class="kyc-form-heading" ref="kycHeading" tabindex="-1">
              <div>
                <h2>企业认证</h2>
                <p>
                  请按企业注册文件填写，带
                  <span class="required">*</span> 的项目为必填。
                </p>
              </div>
              <span class="kyc-step-count"
                >{{ kycSteps.findIndex((step) => step.key === tab) + 1 }} /
                3</span
              >
            </div>
            <nav class="kyc-step-nav" aria-label="认证资料步骤">
              <button
                v-for="(step, i) in kycSteps"
                :key="step.key"
                type="button"
                :class="{ active: tab === step.key }"
                :aria-current="tab === step.key ? 'step' : undefined"
                @click="tab = step.key"
              >
                <span class="kyc-step-number">{{ i + 1 }}</span
                ><span
                  ><strong>{{ step.title }}</strong
                  ><small>{{ step.description }}</small></span
                >
              </button>
            </nav>
            <div v-show="tab === 'company'">
              <section class="kyc-section">
                <div class="kyc-section-heading">
                  <h3>企业基本信息</h3>
                  <p>企业名称、注册信息应与注册文件一致。</p>
                </div>
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
                <fieldset class="company-attributes" :disabled="!kycEditable">
                  <legend>企业属性 <span>请勾选符合的情况</span></legend>
                  <div class="company-attribute-options">
                    <label
                      ><input v-model="o.isListed" type="checkbox" /><span
                        >上市公司</span
                      ></label
                    >
                    <label
                      ><input v-model="o.isStateOwned" type="checkbox" /><span
                        >国有企业</span
                      ></label
                    >
                    <label
                      ><input
                        v-model="o.isForeignOwned"
                        type="checkbox"
                        aria-describedby="foreign-owned-help"
                      /><span>有外资或境外企业股东</span></label
                    >
                  </div>
                  <p id="foreign-owned-help">
                    有外资或境外企业股东的企业，需上传股权结构图。
                  </p>
                </fieldset>
              </section>
              <section class="kyc-section">
                <div class="kyc-section-heading">
                  <h3>企业注册地址</h3>
                  <p>填写企业注册文件上登记的完整地址。</p>
                </div>
                <HongKongAddressFields v-model="o.company" prefix="register_" />
              </section>
              <section class="kyc-section">
                <div class="kyc-section-heading kyc-address-heading">
                  <div>
                    <h3>企业运营地址</h3>
                    <p>填写企业实际开展业务的地址。</p>
                  </div>
                  <button
                    type="button"
                    class="btn secondary"
                    @click="copyRegisteredAddress"
                  >
                    复制注册地址
                  </button>
                </div>
                <HongKongAddressFields
                  v-model="o.company"
                  prefix="operation_"
                />
              </section>
            </div>
            <div v-show="tab === 'people'">
              <section class="kyc-section">
                <div class="kyc-section-heading">
                  <h3>法人 / 董事长</h3>
                  <p>请填写与护照一致的姓名和身份资料。</p>
                </div>
                <OnboardingFields v-model="o.legal" :fields="personFields" />
              </section>
              <section
                v-for="(u, i) in o.ubos"
                :key="i"
                class="onboard-person kyc-section"
              >
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
            <div v-show="tab === 'materials'" class="kyc-material-step">
              <div class="kyc-section-heading">
                <h3>上传认证文件</h3>
                <p>
                  按以下项目准备清晰、完整的文件。具体格式和大小要求见各上传区域。
                </p>
              </div>
              <div class="onboard-materials">
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
            </div>
            <div class="onboard-actions">
              <p>切换步骤会保留本次填写内容。</p>
              <button
                v-if="tab !== 'company'"
                type="button"
                class="btn secondary"
                @click="tab = tab === 'materials' ? 'people' : 'company'"
              >
                上一步
              </button>
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
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 24px;
}
.account-tabs button {
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  padding: 14px 0;
  color: #64748b;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.account-tabs button[aria-selected="true"] {
  color: #1e293b;
  border-bottom-color: #1e293b;
  font-weight: 600;
}
.account-tabs button:focus-visible {
  outline: 2px solid #64748b;
  outline-offset: 3px;
}
.account-enterprise {
  padding: 28px 32px;
}
.account-enterprise .onboard-progress {
  padding-bottom: 26px;
  margin-bottom: 28px;
  border-bottom: 1px solid #e2e8f0;
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
  border-bottom: 1px solid #e2e8f0;
}
.account-enterprise .enterprise-account-info + .enterprise-account-info {
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid #e2e8f0;
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

<style scoped>
.kyc-form-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin: 28px 0 24px;
  scroll-margin-top: 24px;
}
.kyc-form-heading h2 {
  font-size: 21px;
  margin: 0 0 6px;
  color: #1e293b;
}
.kyc-form-heading p,
.kyc-section-heading p {
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
  margin: 6px 0 0;
}
.kyc-step-count {
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
}
.kyc-step-nav {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}
.kyc-step-nav button {
  display: flex;
  gap: 12px;
  align-items: center;
  text-align: left;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
}
.kyc-step-nav button.active {
  background: #eaf1fc;
  border-color: #64748b;
  color: #1e293b;
}
.kyc-step-number {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #e2e8f0;
  flex-shrink: 0;
}
.active .kyc-step-number {
  background: #1e293b;
  color: white;
}
.kyc-step-nav strong,
.kyc-step-nav small {
  display: block;
}
.kyc-step-nav strong {
  font-size: 14px;
}
.kyc-step-nav small {
  margin-top: 5px;
  font-size: 12px;
  font-weight: normal;
}
.kyc-section {
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin: 0 0 20px;
  background: #fff;
}
.kyc-section-heading {
  margin-bottom: 22px;
}
.kyc-section-heading h3 {
  margin: 0;
  font-size: 15px;
  color: #1e293b;
}
.kyc-address-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}
.kyc-section :deep(.onboard-fields) {
  gap: 20px 28px;
}
.kyc-section :deep(label) {
  line-height: 1.7;
}
.company-attributes {
  min-width: 0;
  border: 0;
  padding: 0;
  margin: 24px 0 0;
}
.company-attributes legend {
  padding: 0;
  font-size: 13px;
  color: #1e293b;
}
.company-attributes legend span {
  margin-left: 12px;
  font-size: 12px;
  color: #64748b;
}
.company-attribute-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 32px;
  margin-top: 8px;
}
.company-attribute-options label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  margin: 0;
  cursor: pointer;
  font-size: 13px;
}
.company-attribute-options input[type="checkbox"] {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  min-width: 18px;
  min-height: 18px;
  padding: 0;
  margin: 0;
  accent-color: #1e293b;
  cursor: pointer;
}
.company-attribute-options label span {
  white-space: nowrap;
}
.company-attributes p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
}
.company-attributes:disabled label,
.company-attributes:disabled input {
  cursor: default;
}
.kyc-material-step .onboard-materials {
  grid-template-columns: minmax(0, 1fr);
}
.onboard-form .onboard-actions {
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
  gap: 12px;
}
.onboard-actions p {
  margin-right: auto;
}
@media (max-width: 760px) {
  .kyc-step-nav {
    gap: 6px;
  }
  .kyc-step-nav button {
    padding: 12px 6px;
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  .kyc-step-nav small {
    display: none;
  }
  .kyc-step-nav strong {
    font-size: 12px;
  }
  .kyc-section {
    padding: 18px 14px;
  }
  .kyc-address-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .onboard-form .onboard-actions {
    flex-wrap: wrap;
  }
  .onboard-actions p {
    width: 100%;
  }
}
</style>
