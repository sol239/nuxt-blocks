<template>
  <div class="rounded-xl border p-4" :class="sending ? 'border-dashed border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30' : 'space-y-3 border-zinc-200 dark:border-zinc-700'" @mousedown.stop @keydown.stop>
    <div v-if="sending" class="flex items-center gap-3" aria-busy="true">
      <svg class="size-5 shrink-0 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" opacity="0.2" /><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      <div class="min-w-0 flex-1"><p role="status" class="text-sm font-medium"><AppLoadingText text="Generating content…" /></p><p class="truncate text-xs text-zinc-500 dark:text-zinc-400">{{ provider === 'antigravity' ? 'Antigravity' : provider === 'codex' ? 'Codex' : 'Ollama' }} · {{ selected?.label }}</p></div>
      <button data-control-size="field" type="button" class="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-zinc-700 dark:hover:bg-zinc-800" @click="stop">Stop</button>
    </div>
    <template v-else>
    <h3 class="font-semibold">{{ provider === 'antigravity' ? 'Antigravity' : provider === 'codex' ? 'Codex' : 'Ollama' }}</h3>
    <label class="block text-sm">Prompt
      <textarea data-control-size="area" :value="block.data || ''" aria-label="Prompt" rows="3" class="mt-1 w-full rounded-lg border border-zinc-200 bg-transparent p-2 transition-colors outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:focus:border-blue-500 dark:focus:ring-blue-950" :disabled="sending" placeholder="What would you like to create?" @input="updatePrompt" @keydown="onPromptKeydown" />
    </label>
    <div class="flex flex-wrap items-end gap-3">
      <AiBlockSelect :model-value="settings.model" label="Model" placeholder="Select a model" :options="models" :disabled="sending || loading" class="w-full min-w-0 sm:w-64" @update:model-value="selectModel" />
      <AiBlockSelect :model-value="settings.effort" label="Thinking" :options="efforts.length ? efforts : [{ value: '', label: 'Model default' }]" :disabled="sending || !efforts.length" class="w-full min-w-0 sm:w-44" @update:model-value="selectEffort" />
      <button data-control-size="field" type="button" class="rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50" :disabled="sending || loading || !selected || !block.data?.trim() || !service" @click="send">Send</button>
      <button data-control-size="field" type="button" class="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800" :disabled="loading" @click="loadModels">Refresh models</button>
    </div>
    <p v-if="loading" role="status" class="text-sm"><AppLoadingText text="Loading models…" /></p>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    </template>
  </div>
</template>
<script setup lang="ts">
import AppLoadingText from '../../../../components/AppComponents/AppLoadingText.vue';
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import type { CodexBlockSettings } from '../core/blocks/CodexBlockSettings';
import type { Block } from '../core/blocks/Block';
import { useAiBlocks, type AiModel } from '../composables/useAiBlocks';
import AiBlockSelect from './AiBlockSelect.vue';
import { rememberAiSelection, recalledAiSelection } from '../core/blocks/aiBlockPreferences';
import { generatedBlocks } from '../core/blocks/generatedBlocks';
const props = defineProps<{ block: Block }>();
const emit = defineEmits<{ 'update:block': [block: Block]; 'generated-blocks': [blocks: Block[]]; 'generation-complete': [] }>();
const service = useAiBlocks();
const provider = computed(() => props.block.blockType === 'antigravity' ? 'antigravity' : props.block.blockType === 'codex' ? 'codex' : 'ollama');
const settings = computed(() => props.block.blockSettings as typeof props.block.blockSettings & { model: string; effort: string });
const models = ref<AiModel[]>([]);
const selected = computed(() => models.value.find(model => model.value === settings.value.model));
const efforts = computed(() => selected.value?.efforts ?? []);
const sending = ref(false), loading = ref(false), error = ref('');
let controller: AbortController | null = null;
function stop() { controller?.abort(); }
function updatePrompt(event: Event) { emit('update:block', props.block.withData((event.target as HTMLTextAreaElement).value)); }
function onPromptKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  if (!event.repeat) void send();
}
function selectModel(model: string) {
  const selection = { model, effort: models.value.find(item => item.value === model)?.efforts[0]?.value || '' };
  rememberAiSelection(provider.value, selection);
  emit('update:block', (props.block as Block<CodexBlockSettings>).withSettings(selection));
}
function selectEffort(effort: string) {
  rememberAiSelection(provider.value, { model: settings.value.model, effort });
  emit('update:block', (props.block as Block<CodexBlockSettings>).withSettings({ effort })); }
async function loadModels() {
  if (!service || loading.value) return;
  loading.value = true; error.value = '';
  try {
    models.value = await service.models(provider.value);
    if (!settings.value.model) {
      const selection = recalledAiSelection(provider.value, models.value);
      if (selection) emit('update:block', (props.block as Block<CodexBlockSettings>).withSettings(selection));
    }
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Cannot load models.'; }
  finally { loading.value = false; }
}
async function send() {
  if (!service || sending.value || loading.value || !selected.value || !props.block.data?.trim()) return;
  sending.value = true; error.value = ''; controller = new AbortController();
  const runId = crypto.randomUUID();
  let content = '', lastUpdate = 0;
  const flush = (complete = false) => { if (content.trim()) emit('generated-blocks', generatedBlocks(content, runId, { complete, onError: message => { error.value = message; } })); };
  try {
    const final = await service.generate(provider.value, settings.value.model, settings.value.effort, props.block.data, controller.signal, delta => {
      content += delta;
      if (Date.now() - lastUpdate > 200) { flush(); lastUpdate = Date.now(); }
    });
    content = final; flush(true);
    if (!content.trim()) error.value = 'No content was generated. Try again.';
    if (!error.value && !controller.signal.aborted) emit('generation-complete');
  } catch (cause) {
    flush(true);
    error.value = controller.signal.aborted ? 'Generation stopped. Content already created is kept.' : cause instanceof Error ? cause.message : 'Generation failed.';
  } finally { sending.value = false; controller = null; }
}
onMounted(loadModels);
onBeforeUnmount(() => controller?.abort());
</script>
