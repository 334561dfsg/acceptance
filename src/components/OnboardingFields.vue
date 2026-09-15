<script setup lang="ts">
import AppSelect from "./AppSelect.vue";
import { useId, reactive } from "vue";
import { fieldsIssue, type Entry } from "../lib/onboarding";
const model = defineModel<Record<string, string>>({ required: true });
defineProps<{ fields: Entry[]; disabled?: boolean }>();
const id = useId();
const touched = reactive<Record<string, boolean>>({});
const fieldError = (f: Entry) =>
  touched[f.key] ? fieldsIssue(model.value, [f]) : "";
</script>
<template>
  <div class="onboard-fields">
    <div
      v-for="f in fields"
      :key="f.key"
      :class="{
        'field-wide':
          /line1|street_address|bank_address|business_site_url/.test(f.key),
      }"
      :data-field="f.key"
    >
      <label :for="id + f.key"
        >{{ f.label }}<span v-if="!f.optional" class="required"> *</span></label
      ><input
        v-if="f.readonly"
        :id="id + f.key"
        readonly
        :value="
          f.options?.find((option) => option.value === model[f.key])?.label ||
          model[f.key]
        "
      />
      <AppSelect
        v-else-if="f.options"
        :id="id + f.key"
        v-model="model[f.key]"
        :disabled="disabled"
        :searchable="f.options.length > 10"
        :aria-invalid="!!fieldError(f)"
        :aria-describedby="fieldError(f) ? id + f.key + '-error' : undefined"
        @update:model-value="touched[f.key] = true"
        :label="f.label"
        :aria-required="!f.optional"
        :options="[{ value: '', label: '请选择' }, ...(f.options || [])]"
      /><input
        v-else
        :id="id + f.key"
        v-model="model[f.key]"
        :type="f.type || 'text'"
        :maxlength="f.max"
        :aria-required="!f.optional"
        :disabled="disabled"
        :aria-invalid="!!fieldError(f)"
        :aria-describedby="fieldError(f) ? id + f.key + '-error' : undefined"
        @blur="touched[f.key] = true"
        :autocomplete="f.type === 'date' ? 'off' : undefined"
      />
      <p v-if="f.help" class="field-help">{{ f.help }}</p>
      <p v-if="fieldError(f)" :id="id + f.key + '-error'" class="field-error">
        {{ fieldError(f) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.field-help {
  margin: 8px 0 0;
  color: var(--muted, #64748b);
  font-size: 12px;
  line-height: 1.6;
}
input[readonly] {
  background: #f8fafc;
}
</style>
