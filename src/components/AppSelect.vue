<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from "vue";
import { IconCheck, IconChevronDown, IconSearch } from "@tabler/icons-vue";
defineOptions({ inheritAttrs: false });
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    options: readonly SelectOption[];
    disabled?: boolean;
    searchable?: boolean;
    placeholder?: string;
    id?: string;
    label?: string;
  }>(),
  { placeholder: "请选择" },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const uid = useId(),
  trigger = ref<HTMLButtonElement>(),
  popup = ref<HTMLElement>(),
  searchInput = ref<HTMLInputElement>();
const open = ref(false),
  query = ref(""),
  active = ref(-1),
  cachedLabel = ref("");
const options = computed(() =>
  props.options.filter((o) =>
    o.label.toLowerCase().includes(query.value.toLowerCase()),
  ),
);
const selected = computed(() =>
  props.options.find((o) => o.value === props.modelValue),
);
const invalid = computed(
  () => !!props.modelValue && (!selected.value || selected.value.disabled),
);
const display = computed(
  () => selected.value?.label || cachedLabel.value || props.placeholder,
);
const listId = `${uid}-list`,
  optionId = (value: string) => `${uid}-option-${encodeURIComponent(value)}`;
const activeId = computed(() =>
  open.value && options.value[active.value]
    ? optionId(options.value[active.value]!.value)
    : undefined,
);
watch(
  selected,
  (o) => {
    if (o) cachedLabel.value = o.label;
  },
  { immediate: true },
);
watch(
  () => props.modelValue,
  (v) => {
    if (!v && !selected.value) cachedLabel.value = "";
  },
);
function reconcile() {
  active.value = options.value.findIndex(
    (o) => o.value === props.modelValue && !o.disabled,
  );
  if (active.value < 0)
    active.value = options.value.findIndex((o) => !o.disabled);
}
watch([query, () => props.options], () => {
  reconcile();
  if (open.value) nextTick(position);
});
watch(
  () => props.disabled,
  (v) => {
    if (v) close();
  },
);
function position() {
  const anchor = trigger.value,
    panel = popup.value;
  if (!anchor || !panel || !open.value) return;
  const r = anchor.getBoundingClientRect();
  const footer = anchor
    .closest("dialog")
    ?.querySelector("footer")
    ?.getBoundingClientRect();
  const bottom = Math.min(window.innerHeight - 12, footer?.top ?? Infinity);
  const below = bottom - r.bottom - 6,
    above = r.top - 12;
  const upwards = below < 200 && above > below;
  const available = Math.min(320, upwards ? above - 6 : below);
  if (available < 90) {
    close();
    return;
  }
  const width = Math.min(Math.max(r.width, 180), window.innerWidth - 24);
  panel.style.width = `${width}px`;
  panel.style.maxHeight = `${available}px`;
  panel.style.left = `${Math.max(12, Math.min(r.left, window.innerWidth - width - 12))}px`;
  panel.style.top = `${upwards ? Math.max(12, r.top - 6 - Math.min(panel.scrollHeight, available)) : r.bottom + 6}px`;
}
async function show() {
  if (props.disabled) return;
  query.value = "";
  reconcile();
  open.value = true;
  await nextTick();
  if (!open.value || !popup.value) return;
  popup.value.showPopover();
  position();
  if (open.value && props.searchable) searchInput.value?.focus();
  scrollActive();
}
function close(focus = false) {
  open.value = false;
  popup.value?.hidePopover();
  query.value = "";
  if (focus) trigger.value?.focus();
}
function choose(value: string) {
  if (!props.options.some((o) => o.value === value && !o.disabled)) return;
  emit("update:modelValue", value);
  close(true);
}
function scrollActive() {
  nextTick(() => {
    if (activeId.value)
      document
        .getElementById(activeId.value)
        ?.scrollIntoView({ block: "nearest" });
  });
}
let typed = "",
  typedAt = 0;
function key(event: KeyboardEvent) {
  if (props.disabled || event.isComposing) return;
  if (event.key === "Escape" && open.value) {
    event.preventDefault();
    event.stopPropagation();
    close(true);
    return;
  }
  if (event.key === "Tab") {
    close(props.searchable && open.value);
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const editable = event.target === searchInput.value;
  if (event.key === "Enter" || (!editable && event.key === " ")) {
    event.preventDefault();
    event.stopPropagation();
    if (!open.value) void show();
    else if (options.value[active.value])
      choose(options.value[active.value]!.value);
  } else if (
    ["ArrowDown", "ArrowUp"].includes(event.key) ||
    (!editable && ["Home", "End"].includes(event.key))
  ) {
    event.preventDefault();
    if (!open.value) {
      void show();
      return;
    }
    const enabled = options.value
      .map((o, i) => (o.disabled ? -1 : i))
      .filter((i) => i >= 0);
    if (!enabled.length) return;
    const index = enabled.indexOf(active.value);
    active.value =
      event.key === "Home"
        ? enabled[0]!
        : event.key === "End"
          ? enabled[enabled.length - 1]!
          : enabled[
              (index + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) %
                enabled.length
            ]!;
    scrollActive();
  } else if (!editable && event.key.length === 1) {
    event.preventDefault();
    if (!open.value) void show();
    typed = Date.now() - typedAt > 700 ? event.key : typed + event.key;
    typedAt = Date.now();
    nextTick(() => {
      const index = options.value.findIndex(
        (o) =>
          !o.disabled && o.label.toLowerCase().startsWith(typed.toLowerCase()),
      );
      if (index >= 0) {
        active.value = index;
        scrollActive();
      }
    });
  }
}
function outside(e: Event) {
  const target = e.target as Node;
  if (
    open.value &&
    !popup.value?.contains(target) &&
    !trigger.value?.contains(target)
  )
    close();
}
function scroll(e: Event) {
  if (open.value && !popup.value?.contains(e.target as Node)) close();
}
onMounted(() => {
  document.addEventListener("pointerdown", outside, true);
  document.addEventListener("scroll", scroll, true);
  window.addEventListener("resize", position);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", outside, true);
  document.removeEventListener("scroll", scroll, true);
  window.removeEventListener("resize", position);
  popup.value?.hidePopover();
});
</script>
<template>
  <span class="app-select" :class="{ 'is-disabled': disabled }">
    <button
      ref="trigger"
      v-bind="$attrs"
      :id="id"
      class="app-select-trigger"
      type="button"
      :role="searchable ? 'button' : 'combobox'"
      :disabled="disabled"
      :aria-label="label || ($attrs['aria-label'] as string)"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="open ? listId : undefined"
      :aria-activedescendant="!searchable ? activeId : undefined"
      :aria-invalid="invalid || undefined"
      @click="open ? close() : show()"
      @keydown="key"
    >
      <span class="app-select-value"
        >{{ display }}{{ invalid ? "（已失效）" : "" }}</span
      ><IconChevronDown :size="16" :class="{ 'is-open': open }" />
    </button>
    <span
      ref="popup"
      popover="manual"
      class="app-select-popup"
      @keydown="key"
      @click.stop
    >
      <span v-if="searchable" class="app-select-search"
        ><IconSearch :size="16" /><input
          ref="searchInput"
          v-model="query"
          role="combobox"
          :aria-label="`搜索${label || '选项'}`"
          aria-autocomplete="list"
          aria-expanded="true"
          :aria-controls="listId"
          :aria-activedescendant="activeId"
          placeholder="搜索选项"
          autocomplete="off"
      /></span>
      <span
        :id="listId"
        class="app-select-options"
        role="listbox"
        :aria-label="label || '可选项'"
      >
        <span
          v-for="(option, index) in options"
          :id="optionId(option.value)"
          :key="option.value"
          class="app-select-option"
          :class="{ active: active === index, disabled: option.disabled }"
          role="option"
          :aria-selected="open && active === index"
          :aria-disabled="option.disabled || undefined"
          @pointerdown.prevent
          @click.prevent="choose(option.value)"
          @pointermove="!option.disabled && (active = index)"
          ><span>{{ option.label }}</span
          ><IconCheck v-if="option.value === modelValue" :size="16"
        /></span>
      </span>
      <span v-if="!options.length" class="app-select-empty" role="status"
        >没有匹配的选项</span
      >
    </span>
  </span>
</template>
<style>
.app-select {
  display: block;
  min-width: 0;
}
.app-select-trigger {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  color: #1e293b;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.app-select-trigger:focus-visible,
.app-select-trigger[aria-expanded="true"] {
  outline: 2px solid #64748b;
  outline-offset: 2px;
}
.app-select-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.app-select-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-select-trigger svg {
  flex-shrink: 0;
  transition: transform 0.15s;
}
.app-select-trigger svg.is-open {
  transform: rotate(180deg);
}
.app-select-popup {
  position: fixed;
  inset: auto;
  margin: 0;
  padding: 5px;
  background: white;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  box-shadow: 0 8px 28px #1e293b24;
  overflow: hidden;
  box-sizing: border-box;
}
.app-select-popup:popover-open {
  display: flex;
  flex-direction: column;
  animation: select-enter 0.15s ease-out;
}
.app-select-options {
  display: block;
  overflow: auto;
  overscroll-behavior: contain;
  min-height: 0;
}
.app-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  padding: 10px 12px;
  border-radius: 5px;
  font-size: 13px;
  line-height: 1.5;
  cursor: pointer;
  overflow-wrap: anywhere;
}
.app-select-option.active {
  background: #eaf1fc;
}
.app-select-option.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.app-select-option svg {
  flex-shrink: 0;
  color: #475569;
}
.app-select-empty {
  padding: 18px;
  text-align: center;
  font-size: 13px;
  color: #64748b;
}
.app-select-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 9px 9px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.app-select-search input {
  width: 100%;
  min-width: 0;
  border: 0 !important;
  box-shadow: none !important;
  outline: none !important;
  margin: 0 !important;
  padding: 7px 0 !important;
  background: white;
  font: inherit;
  font-size: 13px;
}
.mvp-filters > .app-select {
  min-width: 160px;
}
label > .app-select {
  margin-top: 8px;
}
.onboard-fields label + .app-select {
  margin-top: 8px;
}
@keyframes select-enter {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .app-select-popup:popover-open {
    animation: none;
  }
  .app-select-trigger svg {
    transition: none;
  }
}
</style>
