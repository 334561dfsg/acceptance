<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import AppSelect from "../components/AppSelect.vue";
import OnboardingFields from "../components/OnboardingFields.vue";
import MaterialInput from "../components/MaterialInput.vue";
import { mvp, type BankAccount } from "../lib/mvp";
import { bankTemplate, submitAccount } from "../lib/banks";
import {
  onboarding,
  hkRegions,
  hkDistricts,
  type Entry,
  type LocalMaterial,
  fieldsIssue,
} from "../lib/onboarding";
import { requestMfa } from "../lib/mfa";
import { demo } from "../lib/store";
const route = useRoute(),
  router = useRouter();
let live = true;
onBeforeUnmount(() => {
  live = false;
});
const mode = ref(""),
  selected = ref<BankAccount>(),
  country = ref("HK"),
  routing = ref("SWIFT"),
  relationship = ref("SELF"),
  fields = ref<Record<string, string>>({}),
  material = ref<LocalMaterial>(),
  error = ref(""),
  busy = ref(false);
const template = computed(() =>
  bankTemplate(country.value, routing.value, relationship.value),
);
const bankOptions = [
  {
    value: "The Hongkong and Shanghai Banking Corporation Limited",
    label: "汇丰银行 HSBC",
    swift: "HSBCHKHHHKH",
  },
  {
    value: "Hang Seng Bank Limited",
    label: "恒生银行 Hang Seng",
    swift: "HASEHKHH",
  },
  {
    value: "Bank of China (Hong Kong) Limited",
    label: "中国银行（香港）",
    swift: "",
  },
];
const bankSelection = computed(() =>
  bankOptions.some((b) => b.value === fields.value["b.bank_name"])
    ? fields.value["b.bank_name"]!
    : fields.value["b.bank_name"]
      ? "OTHER"
      : "",
);
const customBank = ref(false);
const addressNotice = ref("");
function selectBank(value: string) {
  if (busy.value) return;
  customBank.value = value === "OTHER";
  const bank = bankOptions.find((b) => b.value === value);
  fields.value["b.bank_name"] = bank?.value || "";
  fields.value["b.swift_code"] = bank?.swift || "";
  fields.value["b.bank_code"] = "";
  fields.value["b.branch_code"] = "";
  fields.value["b.province"] = "";
  fields.value["b.city"] = "";
  fields.value["b.bank_address"] = "";
  addressNotice.value =
    "已切换银行，请核对 SWIFT / BIC，并重新填写适用的银行及分行代码。";
}
function hongKongField(f: Entry): Entry {
  if (f.key === "p.payee_country")
    return {
      ...f,
      readonly: true,
      options: [{ value: "HK", label: "中国香港" }],
    };
  const prefix = f.key.slice(0, 2);
  if (f.key.endsWith(".province"))
    return {
      ...f,
      label: prefix === "p." ? "收款企业区域" : "开户行区域",
      options: hkRegions,
    };
  if (f.key.endsWith(".city")) {
    const hasRegion = template.value.some(
      (item) => item.key === prefix + "province",
    );
    const region = fields.value[prefix + "province"];
    return {
      ...f,
      label: prefix === "p." ? "收款企业分区" : "开户行分区",
      options: hkDistricts
        .filter(([parent]) => !hasRegion || !region || parent === region)
        .map(([, value, label]) => ({ value, label })),
    };
  }
  return f;
}
const displayTemplate = computed(() => template.value.map(hongKongField));
// Synchronous local address dependency; optional/missing province permits all districts.
// Keep loaded legacy values visible as invalid until corrected; only user region changes reset city.
for (const prefix of ["p.", "b."]) {
  watch(
    () => fields.value[prefix + "province"],
    (region, previous) => {
      if (mode.value !== "form" || region === previous) return;
      const city = fields.value[prefix + "city"];
      if (
        region &&
        city &&
        !hkDistricts.some(
          ([parent, district]) => parent === region && district === city,
        )
      ) {
        fields.value[prefix + "city"] = "";
        addressNotice.value = "区域已变更，请重新选择对应分区。";
      }
    },
    { flush: "sync" },
  );
}
const allowed = computed(
  () =>
    mvp.merchant.channel === "AVAILABLE" &&
    (!route.params.id || selected.value?.status === "DECLINED"),
);
const relationshipDrafts = new Map<
  string,
  { fields: Record<string, string>; material?: LocalMaterial }
>();
function initialFields(value: string): Record<string, string> {
  const name = onboarding.company.company_name_en?.trim();
  if (value !== "SELF") return { "p.payee_country": "HK" };
  const company = onboarding.company;
  return {
    "b.account_name": name || "",
    "p.payee_country": "HK",
    "p.province":
      company.register_country === "HK" ? company.register_state || "" : "",
    "p.city":
      company.register_country === "HK" ? company.register_city || "" : "",
    "p.post_code":
      company.register_country === "HK" ? company.register_postcode || "" : "",
  };
}
watch(
  relationship,
  (value, previous) => {
    if (mode.value !== "form" || selected.value) return;
    relationshipDrafts.set(previous, {
      fields: { ...fields.value },
      material: material.value,
    });
    customBank.value = false;
    addressNotice.value = "";
    const draft = relationshipDrafts.get(value);
    fields.value = draft ? { ...draft.fields } : initialFields(value);
    material.value = draft?.material;
    error.value = "";
  },
  { flush: "sync" },
);
watch(routing, () => {
  error.value = "";
});
function open(b?: BankAccount) {
  mode.value = "";
  customBank.value = false;
  addressNotice.value = "";
  relationshipDrafts.clear();
  selected.value = b;
  country.value = b?.country || "HK";
  routing.value = b?.routing || "SWIFT";
  relationship.value = b?.relationship || "SELF";
  fields.value = b ? { ...b.fields } : initialFields(relationship.value);
  material.value = b?.material;
  error.value = "";
  mode.value = "form";
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

const initial = ref("");
const signature = () =>
  JSON.stringify([
    relationship.value,
    routing.value,
    fields.value,
    material.value,
  ]);
watch(
  () => route.params.id,
  (id) => {
    open(id ? mvp.banks.find((b) => b.no === id) : undefined);
    initial.value = signature();
  },
  { immediate: true },
);
onBeforeRouteLeave(() => {
  if (busy.value) return false;
  if (signature() !== initial.value)
    return window.confirm("尚有未提交的银行资料，确定离开并放弃修改吗？");
  return true;
});
async function submit() {
  if (!allowed.value) return;
  const issue = fieldsIssue(fields.value, displayTemplate.value);
  if (issue) {
    error.value = issue;
    return;
  }
  let submitted = false;
  await run(async () => {
    const snapshot = {
      country: country.value,
      routing: routing.value,
      relationship: relationship.value,
      fields: { ...fields.value },
      material: material.value,
    };
    const editing = selected.value;
    if (
      editing &&
      !(await requestMfa(demo.email, "验证身份后提交收款账户修改。"))
    )
      return;
    if (!live) return;
    submitAccount(
      snapshot.country,
      snapshot.routing,
      snapshot.relationship,
      snapshot.fields,
      snapshot.material,
      editing,
    );
    initial.value = signature();
    submitted = true;
  });
  if (live && submitted) await router.push("/client/accounts");
}
</script>
<template>
  <div class="mvp-page">
    <div class="page-heading">
      <div>
        <h1>{{ route.params.id ? "修改银行资料" : "添加银行账户" }}</h1>
        <p>填写企业银行资料，提交后可在收款账户列表查看审核状态。</p>
      </div>
      <button
        type="button"
        class="btn secondary"
        :disabled="busy"
        @click="router.push('/client/accounts')"
      >
        ← 返回收款账户
      </button>
    </div>
    <div v-if="!allowed" class="mvp-notice">
      当前账户状态不支持此操作，请返回收款账户列表查看。
    </div>
    <form class="panel bank-account-page" @submit.prevent="submit">
      <p v-if="error" class="mvp-error" role="alert">{{ error }}</p>
      <div v-if="allowed" class="bank-account-form">
        <p class="bank-form-intro">
          仅支持中国香港企业对公账户。请填写与银行账户证明一致的信息。
        </p>
        <section class="bank-form-section">
          <h3>账户类型</h3>
          <div class="onboard-fields bank-scenario-fields">
            <label
              >账户关系<AppSelect
                v-model="relationship"
                label="账户关系"
                :disabled="!!selected || busy"
                :options="[
                  { value: 'SELF', label: '本企业账户' },
                  { value: 'THIRD_PARTY', label: '第三方企业账户' },
                ]" /></label
            ><label
              >银行所在地区<input
                value="中国香港"
                readonly
                aria-label="银行所在地区" /></label
            ><label
              >结算通道<AppSelect
                v-model="routing"
                label="结算通道"
                :disabled="!!selected || busy"
                :options="[
                  { value: 'SWIFT', label: 'SWIFT（银行电汇）' },
                  ...(country === 'HK'
                    ? [{ value: 'RTGS', label: 'RTGS（实时全额结算）' }]
                    : []),
                ]"
            /></label>
          </div>
        </section>
        <section class="bank-form-section">
          <h3>收款企业信息</h3>
          <p v-if="relationship === 'SELF' && !selected" class="mvp-caption">
            已带入企业认证的注册地址信息，可按银行账户证明核对调整。
          </p>
          <p class="mvp-caption">
            区域与分区按香港地址选择；邮编请按银行要求填写。
          </p>
          <OnboardingFields
            :key="relationship + routing"
            v-model="fields"
            :fields="displayTemplate.filter((f) => f.key.startsWith('p.'))"
            :disabled="busy"
          />
        </section>
        <section class="bank-form-section">
          <h3>银行账户信息</h3>
          <label class="bank-picker"
            >收款银行 <span class="required">*</span>
            <AppSelect
              :model-value="customBank ? 'OTHER' : bankSelection"
              @update:model-value="selectBank"
              label="收款银行"
              searchable
              :disabled="busy"
              :options="[
                { value: '', label: '请选择银行' },
                ...bankOptions,
                { value: 'OTHER', label: '其他银行（手动填写）' },
              ]"
            />
          </label>
          <p class="mvp-caption">
            选择银行后带入名称及已核实的 SWIFT /
            BIC，请以银行账户证明为准。银行账号及分行代码需自行填写。
          </p>
          <p v-if="addressNotice" class="mvp-caption" role="status">
            {{ addressNotice }}
          </p>
          <p
            v-if="relationship === 'SELF' && onboarding.company.company_name_en"
            class="mvp-caption"
          >
            账户名称已按企业认证英文名称预填，请与银行账户证明核对。
          </p>
          <OnboardingFields
            :key="relationship + routing"
            v-model="fields"
            :fields="
              displayTemplate.filter(
                (f) =>
                  f.key.startsWith('b.') &&
                  (f.key !== 'b.bank_name' ||
                    customBank ||
                    bankSelection === 'OTHER'),
              )
            "
            :disabled="busy"
          />
        </section>
        <section class="bank-form-section">
          <h3>证明材料</h3>
          <MaterialInput
            v-model="material"
            kind="BANK"
            label="银行账户证明"
            :disabled="busy"
          />
        </section>
      </div>

      <div class="bank-page-actions">
        <button
          class="btn secondary"
          type="button"
          :disabled="busy"
          @click="router.push('/client/accounts')"
        >
          取消</button
        ><button
          v-if="allowed"
          class="btn primary"
          type="submit"
          :disabled="busy"
        >
          {{ busy ? "正在提交…" : "提交审核" }}
        </button>
      </div>
    </form>
  </div>
</template>
<style scoped>
.bank-picker {
  display: block;
  margin-bottom: 12px;
}
.bank-picker :deep(.app-select) {
  margin-top: 8px;
}
.bank-account-page {
  padding: 28px;
  width: 100%;
  max-width: none;
  min-width: 0;
}
.bank-page-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #e8edde;
  margin-top: 28px;
  padding-top: 20px;
}
@media (max-width: 640px) {
  .bank-picker {
    display: block;
    margin-bottom: 12px;
  }
  .bank-picker :deep(.app-select) {
    margin-top: 8px;
  }
  .bank-account-page {
    padding: 18px;
  }
}
</style>
