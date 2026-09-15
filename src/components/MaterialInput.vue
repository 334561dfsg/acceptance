<script setup lang="ts">
import { ref, useId } from "vue";
import {
  extensions,
  materialIssue,
  localMaterial,
  type LocalMaterial,
} from "../lib/onboarding";
const props = defineProps<{
  kind: string;
  label: string;
  disabled?: boolean;
}>();
const model = defineModel<LocalMaterial | undefined>();
const error = ref(""),
  id = useId();
function select(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  error.value = materialIssue(file, props.kind);
  if (!error.value) model.value = localMaterial(file.name, file.size);
  input.value = "";
}
</script>
<template>
  <div class="onboard-material">
    <label :for="id"
      ><strong>{{ label }}</strong
      ><small
        >{{ kind === "BANK" ? "不超过" : "小于" }} 10 MB ·
        {{ extensions(kind).join(" / ") }}</small
      ></label
    >
    <div v-if="model" class="onboard-file">
      <span>{{ model.name }}<small>文件已选择</small></span
      ><button
        v-if="!disabled"
        type="button"
        class="text-link"
        :aria-label="'移除' + label"
        @click="model = undefined"
      >
        移除
      </button>
    </div>
    <input
      v-if="!disabled"
      :id="id"
      type="file"
      :accept="
        extensions(kind)
          .map((x) => '.' + x)
          .join(',')
      "
      :aria-describedby="id + '-error'"
      @change="select"
    />
    <p :id="id + '-error'" class="mvp-error" v-if="error" role="alert">
      {{ error }}
    </p>
  </div>
</template>
