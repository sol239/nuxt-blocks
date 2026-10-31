<template>
  <section class="web-block" aria-label="Web block">
    <div v-show="showSource" :id="sourceId" class="source">
      <label :for="`${sourceId}-editor`">HTML source</label>
      <textarea
        :id="`${sourceId}-editor`"
        data-control-size="area"
        :value="block.data ?? ''"
        aria-label="HTML source"
        placeholder="Paste HTML with <style> and <script> tags here…"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        @input="editSource"
      />
      <p>
        Paste a full HTML document or a fragment, including CSS in &lt;style&gt;
        and JavaScript in &lt;script&gt;. The preview updates automatically
        after edits. Tailwind CSS classes work automatically; no CDN script is
        needed.
      </p>
    </div>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <div v-if="importing || !running || dirty" class="preview-heading">
      <span role="status"
        ><AppLoadingText
          :text="
            importing
              ? 'Reading HTML file…'
              : !running
                ? 'Preview stopped'
                : dirty
                  ? 'Updating preview…'
                  : 'Preview'
          "
      /></span>
    </div>
    <iframe
      v-if="mounted && running"
      :key="runId"
      title="Web preview"
      sandbox="allow-scripts"
      referrerpolicy="no-referrer"
      :srcdoc="preview"
      :style="{ height: `${height}px` }"
    />
    <div v-else class="stopped">
      <AppLoadingText
        :text="
          mounted
            ? 'Choose Run HTML in block actions to start the preview.'
            : 'Preparing preview…'
        "
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import AppLoadingText from '../../../../components/AppComponents/AppLoadingText.vue';
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from 'vue';
import {
  WEB_BLOCK_CONTROLS,
  type WebBlockControls,
} from '../composables/useWebBlockControls';
import type { Block } from '~/core/blocks/Block';
import tailwindRuntime from '@tailwindcss/browser?raw';
import { buildWebPreview, MAX_WEB_FILE_BYTES } from '~/core/blocks/webPreview';

const props = defineProps<{ block: Block }>();
const emit = defineEmits<{ 'update:block': [block: Block] }>();
const sourceId = useId();
const mounted = ref(false);
const showSource = ref(false);
const error = ref('');
const importing = ref(false);
const running = ref(true);
const runId = ref(0);
const lastRunSource = ref(props.block.data ?? '');
const preview = ref(buildWebPreview(lastRunSource.value, tailwindRuntime));
const dirty = computed(() => lastRunSource.value !== (props.block.data ?? ''));
const height = computed(() => {
  const value = props.block.blockSettings.height;
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1600, Math.max(160, value))
    : 420;
});
let fileRevision = 0;
let previewTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => props.block.data,
  (source) => {
    clearTimeout(previewTimer);
    if ((source ?? '') === lastRunSource.value) return;
    previewTimer = setTimeout(() => run(source ?? '', false), 350);
  },
);
function stop() {
  clearTimeout(previewTimer);
  running.value = false;
}
const wrapperControls = inject(WEB_BLOCK_CONTROLS, null);
const controls: WebBlockControls = {
  get showSource() {
    return showSource.value;
  },
  get running() {
    return running.value;
  },
  get height() {
    return height.value;
  },
  sourceId,
  toggleSource() {
    showSource.value = !showSource.value;
  },
  importFile,
  resize,
  run() {
    run(props.block.data ?? '');
  },
  stop,
};
onMounted(() => {
  mounted.value = true;
  if (wrapperControls) wrapperControls.value = controls;
});
onBeforeUnmount(() => {
  fileRevision++;
  clearTimeout(previewTimer);
  if (wrapperControls?.value === controls) wrapperControls.value = null;
});
function run(source: string, hideSource = true) {
  clearTimeout(previewTimer);
  lastRunSource.value = source;
  preview.value = buildWebPreview(source, tailwindRuntime);
  runId.value++;
  running.value = true;
  if (hideSource) showSource.value = false;
}
function editSource(event: Event) {
  fileRevision++;
  importing.value = false;
  error.value = '';
  emit(
    'update:block',
    props.block.withData((event.target as HTMLTextAreaElement).value),
  );
}
function resize(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.value || !input.validity.valid) {
    input.value = String(height.value);
    return;
  }
  emit(
    'update:block',
    props.block.withSettings({ height: input.valueAsNumber }),
  );
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const revision = ++fileRevision;
  error.value = '';
  importing.value = false;
  if (!/\.html?$/i.test(file.name)) {
    error.value = 'Choose an .html or .htm file.';
    return;
  }
  if (file.size > MAX_WEB_FILE_BYTES) {
    error.value = 'Choose an HTML file smaller than 2 MB.';
    return;
  }
  importing.value = true;
  try {
    const source = await file.text();
    if (revision !== fileRevision) return;
    emit('update:block', props.block.withData(source));
    run(source);
  } catch {
    if (revision === fileRevision)
      error.value = 'Unable to read this file. Try importing it again.';
  } finally {
    if (revision === fileRevision) importing.value = false;
  }
}
</script>

<style scoped>
.web-block {
  width: 100%;
  text-align: left;
}
.preview-heading {
  padding: 8px 0;
}
.source {
  padding: 12px 0;
}
.source label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}
textarea {
  display: block;
  width: 100%;
  min-height: 240px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 12px;
  background: #0f172a;
  color: #e2e8f0;
  font: 12px/1.6 monospace;
  tab-size: 2;
}
.source p,
.preview-heading,
.stopped {
  color: #64748b;
  font-size: 12px;
}
.source p {
  margin-top: 8px;
}
iframe {
  display: block;
  width: 100%;
  border: 0;
  background: white;
}
.stopped {
  padding: 32px 16px;
  text-align: center;
}
.error {
  color: #b91c1c;
  font-size: 13px;
  padding: 12px 16px;
}
:where(input, textarea):focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
}
</style>
