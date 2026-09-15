<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, useId, watch, nextTick } from "vue";
import { acquireModalScroll } from "../lib/modal-scroll";
import { IconX } from "@tabler/icons-vue";
const props = defineProps<{ title: string; preventClose?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const titleId = useId();
const dialog = ref<HTMLDialogElement>();
const closing = ref(false);
let timer: ReturnType<typeof setTimeout>;
let trigger: HTMLElement | null = null;
let releaseScroll: (() => void) | undefined;
function trapFocus(event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  const elements = [
    ...(dialog.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
    ) || []),
  ].filter((el) => el.getClientRects().length);
  const first = elements[0],
    last = elements[elements.length - 1];
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  if (
    event.shiftKey &&
    (document.activeElement === first ||
      !elements.includes(document.activeElement as HTMLElement))
  ) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
function close() {
  if (closing.value || props.preventClose) return;
  closing.value = true;
  timer = setTimeout(
    () => {
      dialog.value?.close();
      emit("close");
      requestAnimationFrame(() => trigger?.isConnected && trigger.focus());
    },
    matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150,
  );
}
watch(
  () => props.title,
  async () => {
    await nextTick();
    const body = dialog.value?.querySelector<HTMLElement>(".modal-body");
    if (body) body.scrollTop = 0;
    dialog.value?.querySelector<HTMLElement>("h2")?.focus();
  },
);
defineExpose({ close });
onMounted(() => {
  trigger = document.activeElement as HTMLElement;
  releaseScroll = acquireModalScroll();
  dialog.value?.showModal();
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  releaseScroll?.();
});
</script>
<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      :class="['modal', { closing }]"
      :aria-labelledby="titleId"
      @cancel.prevent="close"
      @keydown="trapFocus"
    >
      <header>
        <h2 :id="titleId" tabindex="-1" autofocus>{{ title }}</h2>
        <button
          v-if="!preventClose"
          class="icon-button"
          aria-label="关闭"
          @click="close"
        >
          <IconX :size="20" />
        </button>
      </header>
      <div class="modal-body"><slot /></div>
      <footer>
        <slot name="footer"
          ><button class="btn primary" @click="close">关闭</button></slot
        >
      </footer>
    </dialog></Teleport
  >
</template>
