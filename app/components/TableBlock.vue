<template>
  <div ref="container" class="space-y-2" @keydown.stop @mousedown.stop>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    <template v-else-if="table">
      <div class="overflow-x-auto">
        <table
          class="native-table focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          :tabindex="editing ? undefined : 0"
          :title="editing ? undefined : 'Double-click to edit table'"
          @dblclick="editing = true"
          @keydown.enter.self.prevent="editing = true"
        >
          <thead>
            <tr>
              <th
                v-for="(cell, column) in table.header"
                :key="column"
                scope="col"
                :style="{ textAlign: table.align[column] || 'left' }"
              >
                <textarea
                  v-if="editing"
                  :aria-label="`Header ${column + 1}`"
                  :value="cell"
                  rows="1"
                  @input="
                    setCell(
                      -1,
                      column,
                      ($event.target as HTMLTextAreaElement).value,
                    )
                  "
                />
                <!-- renderMarkdown escapes HTML and restricts links to HTTP(S). -->
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div v-else v-html="renderMarkdown(cell)" />
                <button
                  v-if="editing"
                  type="button"
                  :disabled="table.header.length <= 1"
                  :aria-label="`Delete column ${column + 1}`"
                  class="table-action"
                  @click="removeColumn(column)"
                >
                  ×
                </button>
              </th>
              <th v-if="editing" scope="col">
                <span class="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in table.rows" :key="index">
              <td
                v-for="(cell, column) in row"
                :key="column"
                :style="{ textAlign: table.align[column] || 'left' }"
              >
                <textarea
                  v-if="editing"
                  :aria-label="`Row ${index + 1}, column ${column + 1}`"
                  :value="cell"
                  rows="1"
                  @input="
                    setCell(
                      index,
                      column,
                      ($event.target as HTMLTextAreaElement).value,
                    )
                  "
                />
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div v-else v-html="renderMarkdown(cell)" />
              </td>
              <td v-if="editing">
                <button
                  type="button"
                  :aria-label="`Delete row ${index + 1}`"
                  class="table-action"
                  @click="removeRow(index)"
                >
                  ×
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="editing" class="flex gap-2">
        <button
          type="button"
          data-control-size="field"
          class="table-action"
          @click="editing = false"
        >
          Done
        </button>
        <button
          type="button"
          data-control-size="field"
          class="table-action"
          @click="addRow"
        >
          Add row
        </button>
        <button
          type="button"
          data-control-size="field"
          class="table-action"
          @click="addColumn"
        >
          Add column
        </button>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import type { Block } from '../core/blocks/Block';
import { parseTable, type TableData } from '../core/blocks/tableData';
import { renderMarkdown } from '../core/blocks/renderMarkdown';
const props = defineProps<{ block: Block }>();
const emit = defineEmits<{ 'update:block': [block: Block] }>();
const editing = ref(false);
const container = ref<HTMLElement>();
function onOutsidePointerDown(event: PointerEvent) {
  if (editing.value && !event.composedPath().includes(container.value!))
    editing.value = false;
}
onMounted(() =>
  document.addEventListener('pointerdown', onOutsidePointerDown, true),
);
onBeforeUnmount(() =>
  document.removeEventListener('pointerdown', onOutsidePointerDown, true),
);
const parsed = computed(() => {
  try {
    return { table: parseTable(props.block.data), error: '' };
  } catch {
    return {
      table: null,
      error: 'Unable to read table. The original data is preserved.',
    };
  }
});
const table = computed(() => parsed.value.table);
const error = computed(() => parsed.value.error);
function change(update: (draft: TableData) => void) {
  const draft = parseTable(props.block.data);
  update(draft);
  emit('update:block', props.block.withData(JSON.stringify(draft)));
}
function setCell(row: number, column: number, text: string) {
  change((draft) => {
    (row < 0 ? draft.header : draft.rows[row]!)[column] = text;
  });
}
function addRow() {
  change((draft) => draft.rows.push(draft.header.map(() => '')));
}
function addColumn() {
  change((draft) => {
    draft.header.push('');
    draft.align.push(null);
    draft.rows.forEach((row) => row.push(''));
  });
}
function removeRow(index: number) {
  change((draft) => {
    draft.rows.splice(index, 1);
  });
}
function removeColumn(index: number) {
  if (!table.value || table.value.header.length <= 1) return;
  change((draft) => {
    draft.header.splice(index, 1);
    draft.align.splice(index, 1);
    draft.rows.forEach((row) => row.splice(index, 1));
  });
}
</script>
<style scoped>
.native-table {
  border-collapse: collapse;
  width: 100%;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}
.native-table th,
.native-table td {
  border: 1px solid var(--color-border, #a1a1aa);
  padding: 0.5rem 0.75rem;
  vertical-align: top;
}
.native-table th {
  font-weight: 600;
  background: color-mix(in srgb, currentColor 5%, transparent);
}
.native-table textarea {
  width: 100%;
  min-width: 8rem;
  resize: vertical;
  background: transparent;
  font: inherit;
  line-height: inherit;
}
.native-table :deep(p) {
  margin: 0;
}
.native-table :deep(code) {
  font-family: monospace;
  font-size: 1em;
  color: #e11d48;
  background-color: #fff1f2;
  padding: 0.1em 0.25em;
  border-radius: 0.2em;
}
:global(.dark) .native-table :deep(code) {
  color: #fda4af;
  background-color: rgb(136 19 55 / 0.25);
}
.native-table :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}
.table-action {
  border: 1px solid var(--color-border, #a1a1aa);
  border-radius: var(--app-radius, 0.3rem);
  padding: 0.2rem 0.5rem;
  font-size: 0.875rem;
}
.table-action:disabled {
  opacity: 0.4;
}
</style>
