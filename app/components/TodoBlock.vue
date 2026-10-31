<template>
  <!-- TodoBlock: Editable checklist with inline Markdown previews for its title and steps. -->
  <section class="space-y-3" :style="{ textAlign: block.blockSettings.alignment }">
    <header class="flex items-center gap-3">
      <!-- Safe inline Markdown escapes HTML and restricts link protocols. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <h3 v-if="readOnly || inert || editing !== -1" class="todo-markdown min-w-0 text-xl font-semibold" :tabindex="readOnly || inert ? undefined : 0" @click="edit(-1, $event)" @keydown.enter.self.prevent="edit(-1, $event)" v-html="renderInlineMarkdown(todo.title)" />
      <textarea v-else :ref="resizeText" rows="1" class="todo-text min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-xl font-semibold outline-none" aria-label="Todo title" :value="todo.title" @blur="editing = null" @input="save({ ...todo, title: ($event.target as HTMLTextAreaElement).value })" />
      <span class="todo-progress shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" role="status">{{ completedCount }} / {{ todo.items.length }} completed</span>
    </header>
    <ul class="space-y-2">
      <li v-for="(item, index) in todo.items" :key="index" class="flex items-start gap-3">
        <input type="checkbox" class="todo-check mt-1 shrink-0" :checked="item.checked" :disabled="inert" :aria-label="`Complete ${item.text || 'item'}`" @change="updateItem(index, { checked: ($event.target as HTMLInputElement).checked })">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-if="readOnly || inert || editing !== index" class="todo-markdown min-w-0 flex-1" :class="{ 'line-through opacity-50': item.checked }" :tabindex="readOnly || inert ? undefined : 0" @click="edit(index, $event)" @keydown.enter.self.prevent="edit(index, $event)" v-html="renderInlineMarkdown(item.text) || 'Add a step…'" />
        <textarea v-else :ref="resizeText" rows="1" class="todo-text min-w-0 flex-1 resize-none overflow-hidden bg-transparent outline-none" :class="{ 'line-through opacity-50': item.checked }" :aria-label="`Todo item ${index + 1}`" :value="item.text" placeholder="Add a step…" @blur="editing = null" @input="updateItem(index, { text: ($event.target as HTMLTextAreaElement).value })" @keydown.enter.prevent="addItem" />
        <button v-if="!readOnly && !inert" type="button" :aria-label="`Remove item ${index + 1}`" class="px-1 opacity-50" @click="save({ ...todo, items: todo.items.filter((_, i) => i !== index) })">×</button>
      </li>
    </ul>
    <button v-if="!readOnly && !inert" type="button" class="text-sm opacity-60" @click="addItem">+ Add step</button>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onBeforeUnmount, type ComponentPublicInstance } from 'vue';
import { renderInlineMarkdown } from '../core/blocks/renderMarkdown';
import type { Block } from '../core/blocks/Block';
import { parseTodo, todoMarkdown, type TodoData, type TodoItem } from '../core/blocks/todoData';
const props = defineProps<{ block: Block; readOnly?: boolean; inert?: boolean }>();
const emit = defineEmits<{ 'update:block': [value: Block] }>();
const todo = computed(() => parseTodo(props.block.data));
const completedCount = computed(() => todo.value.items.filter(item => item.checked).length);
const editing = ref<number | null>(null);
async function edit(index: number, event: Event) {
  if (props.readOnly || props.inert || (event.target as HTMLElement).closest('a')) return;
  const section = (event.currentTarget as HTMLElement).closest('section');
  editing.value = index;
  await nextTick();
  const selector = index === -1 ? 'textarea[aria-label="Todo title"]' : `textarea[aria-label="Todo item ${index + 1}"]`;
  section?.querySelector<HTMLTextAreaElement>(selector)?.focus();
}
const textareas = new Set<HTMLTextAreaElement>();
function resizeText(element: Element | ComponentPublicInstance | null) {
  if (!(element instanceof HTMLTextAreaElement)) return;
  textareas.add(element);
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}
let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(() => {
    for (const element of textareas) {
      if (element.isConnected) resizeText(element);
      else textareas.delete(element);
    }
  });
  for (const element of textareas) observer.observe(element.parentElement!);
});
onBeforeUnmount(() => observer?.disconnect());
function save(value: TodoData) { emit('update:block', props.block.withData(todoMarkdown(value))); }
function updateItem(index: number, patch: Partial<TodoItem>) {
  save({ ...todo.value, items: todo.value.items.map((item, i) => i === index ? { ...item, ...patch } : item) });
}
async function addItem(event: Event) {
  const section = (event.target as HTMLElement).closest('section');
  editing.value = todo.value.items.length;
  save({ ...todo.value, items: [...todo.value.items, { text: '', checked: false }] });
  await nextTick();
  section?.querySelector<HTMLTextAreaElement>('li:last-child textarea')?.focus();
}
</script>
<style scoped>
/* ================= OVERRIDING DEFAULT ================= */
.todo-markdown { white-space: pre-wrap; overflow-wrap: anywhere; min-height: 1.5em; line-height: 1.5; }
.todo-markdown :deep(strong) { font-weight: 700; }
.todo-markdown :deep(em) { font-style: italic; }
.todo-markdown :deep(a) { color: var(--color-primary, #2563eb); text-decoration: underline; }
.todo-markdown :deep(code) { font-family: monospace; color: var(--inline-code-color, #e11d48); background: var(--inline-code-background, #f4f4f5); border-radius: .25rem; padding: 0 .15em; }
.todo-text { white-space: pre-wrap; overflow-wrap: anywhere; min-height: 1.5em; line-height: 1.5; }
.todo-check { appearance: none; width: 1.1rem; height: 1.1rem; border: 1.5px solid currentColor; border-radius: 50%; cursor: pointer; }
.todo-check:checked { background: var(--color-primary, #2563eb); border-color: var(--color-primary, #2563eb); }
.todo-check:checked::after { content: ''; display: block; width: .3rem; height: .55rem; margin: .1rem auto; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.todo-check:focus-visible { outline: 2px solid var(--color-primary, #2563eb); outline-offset: 3px; }
</style>
