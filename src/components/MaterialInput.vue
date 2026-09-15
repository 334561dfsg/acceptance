<script setup lang="ts">
import { ref, useId } from "vue";
import { IconUpload, IconFileDescription } from "@tabler/icons-vue";
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
const picker = ref<HTMLInputElement>();
const model = defineModel<LocalMaterial | undefined>();
const error = ref(""),
  id = useId();
function select(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || props.disabled) return;
  error.value = materialIssue(file, props.kind);
  if (!error.value) model.value = localMaterial(file.name, file.size);
  input.value = "";
}
</script>
<template>
  <div class="onboard-material material-picker">
    <strong :id="id + '-label'">{{ label }}</strong>
    <div v-if="kind === 'BANK'" class="material-guidance">
      <p>建议提供银行对账单或银行出具的开户证明，最终以审核要求为准。</p>
      <p>
        材料应清晰显示企业账户名称、银行名称及银行账号，并与上方填写的信息一致。
      </p>
    </div>
    <p :id="id + '-help'" class="material-help">
      支持 {{ extensions(kind).join(" / ").toUpperCase() }} ·
      {{ kind === "BANK" ? "不超过" : "小于" }} 10 MB · 选择 1 个文件
    </p>
    <div class="material-upload-area" :class="{ 'has-file': !!model }">
      <component
        :is="model ? IconFileDescription : IconUpload"
        :size="30"
        stroke-width="1.5"
        class="material-upload-icon"
      />
      <div class="material-file-content" aria-live="polite">
        <strong>{{ model ? model.name : "选择证明文件" }}</strong>
        <span>{{
          model
            ? "文件已选择，可更换后再提交审核"
            : "支持 PDF 文档或清晰的图片文件"
        }}</span>
      </div>
      <div v-if="!disabled" class="material-file-actions">
        <button
          type="button"
          class="btn secondary"
          :aria-label="(model ? '更换' : '选择') + label"
          :aria-describedby="id + '-help' + (error ? ' ' + id + '-error' : '')"
          @click="picker?.click()"
        >
          <IconUpload :size="17" />{{ model ? "更换文件" : "选择文件" }}
        </button>
        <button
          v-if="model"
          type="button"
          class="text-link"
          :aria-label="'移除' + label"
          @click="
            model = undefined;
            error = '';
          "
        >
          移除
        </button>
      </div>
    </div>
    <input
      ref="picker"
      :id="id"
      class="material-hidden-input"
      type="file"
      :disabled="disabled"
      :accept="
        extensions(kind)
          .map((x) => '.' + x)
          .join(',')
      "
      :aria-labelledby="id + '-label'"
      @change="select"
      @cancel.stop
    />
    <p v-if="error" :id="id + '-error'" class="mvp-error" role="alert">
      {{ error }}
    </p>
  </div>
</template>
<style scoped>
.material-guidance {
  color: #475569;
  font-size: 13px;
  line-height: 1.8;
  margin: 10px 0;
}
.material-guidance p {
  margin: 4px 0;
}
.material-help {
  font-size: 12px;
  color: #64748b;
  margin: 10px 0 16px;
}
.material-upload-area {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
}
.material-upload-area.has-file {
  border-style: solid;
}
.material-upload-icon {
  color: #475569;
  flex-shrink: 0;
}
.material-file-content {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 6px;
}
.material-file-content strong {
  font-size: 13px;
  overflow-wrap: anywhere;
}
.material-file-content span {
  font-size: 12px;
  color: #64748b;
}
.material-file-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.material-picker .material-hidden-input {
  display: none;
}
@media (max-width: 640px) {
  .material-upload-area {
    flex-wrap: wrap;
    padding: 18px;
  }
  .material-file-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
