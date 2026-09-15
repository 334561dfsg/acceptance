<script setup lang="ts">
import { computed, ref, watch } from "vue";
import OnboardingFields from "./OnboardingFields.vue";
import { addressFields, hkDistricts } from "../lib/onboarding";
const model = defineModel<Record<string, string>>({ required: true });
const props = defineProps<{ prefix: "register_" | "operation_" }>();
const notice = ref("");
// Local synchronous candidates: retain valid values; clear an incompatible district
// on an explicit region change, announce the reset and require a new selection.
const fieldDependencyState = computed(() => ({
  dependencyOwnerId: props.prefix,
  upstreamSnapshot: model.value[props.prefix + "state"],
  downstreamPolicy: "clear-incompatible-district-with-announcement",
  submitSnapshotPolicy: "require-HK-region-and-matching-district",
}));
if (!model.value[props.prefix + "country"])
  model.value[props.prefix + "country"] = "HK";
watch(
  () => fieldDependencyState.value.upstreamSnapshot,
  (region) => {
    const cityKey = props.prefix + "city";
    if (
      model.value[cityKey] &&
      !hkDistricts.some(
        ([parent, district]) =>
          parent === region && district === model.value[cityKey],
      )
    ) {
      model.value[cityKey] = "";
      notice.value = "区域已变更，请重新选择分区。";
    }
  },
  { flush: "sync" },
);
watch(
  () => model.value[props.prefix + "city"],
  (city) => {
    if (city) notice.value = "";
  },
);
</script>
<template>
  <OnboardingFields
    v-model="model"
    :fields="addressFields(prefix, model[prefix + 'state'] || '')"
  />
  <p class="address-notice" role="status">
    {{ notice || "先选择区域，再选择对应分区。" }}
  </p>
</template>
<style scoped>
.address-notice {
  margin: 12px 0 0;
  font-size: 12px;
  color: #737e69;
}
</style>
