<template>
  <section class="interactive-block" aria-label="Interactive experience">
    <template v-if="parsed.data">
      <header>
        <span class="eyebrow">{{ interactionLabels[parsed.data.kind] }}</span>
        <h3>{{ parsed.data.title }}</h3>
        <p>{{ parsed.data.description }}</p>
      </header>
      <div v-if="calculator" class="explorer-layout">
        <div class="controls">
          <label
            v-for="(input, index) in calculator.inputs"
            :key="index"
            class="input-row"
          >
            <span class="input-heading"
              ><span>{{ input.label }}</span
              ><span>{{ format(input.value) }} {{ input.unit }}</span></span
            >
            <input
              type="range"
              :aria-label="input.label"
              :min="input.min"
              :max="input.max"
              :step="input.step"
              :value="input.value"
              @input="updateValue(index, $event)"
            />
            <span class="range-caption"
              ><span
                >{{ format(input.min) }}–{{ format(input.max) }}
                {{ input.unit }}</span
              ><span
                >{{ format(input.rate) }} {{ calculator.unit }} / unit</span
              ></span
            >
          </label>
        </div>
        <div class="result">
          <span>{{ calculator.resultLabel }}</span>
          <output aria-live="polite" aria-atomic="true" class="total"
            >{{ format(total) }} <small>{{ calculator.unit }}</small></output
          >
          <div class="breakdown-bar" aria-hidden="true">
            <span
              v-for="(input, index) in calculator.inputs"
              :key="index"
              :style="{
                width: `${total ? ((input.value * input.rate) / total) * 100 : 0}%`,
                backgroundColor: color(index),
              }"
            />
          </div>
          <ul aria-label="Result breakdown">
            <li v-for="(input, index) in calculator.inputs" :key="index">
              <span
                ><i :style="{ backgroundColor: color(index) }" />{{
                  input.label
                }}</span
              ><strong
                >{{ format(input.value * input.rate) }}
                {{ calculator.unit }}</strong
              >
            </li>
          </ul>
          <p class="formula">Total = sum of each quantity × its rate</p>
        </div>
      </div>
      <InteractiveActivities
        v-else
        :key="parsed.data.kind"
        :block="block"
        @update:block="emit('update:block', $event)"
      />
    </template>
    <p v-else role="alert" class="error">
      {{ parsed.error }} Open configuration to repair the data.
    </p>
    <label class="type-picker"
      >Example type
      <select
        :value="parsed.data?.kind ?? 'calculator'"
        aria-label="Interaction type"
        @change="changeType"
      >
        <option
          v-for="(label, kind) in interactionLabels"
          :key="kind"
          :value="kind"
        >
          {{ label }}
        </option>
      </select>
      <small>Choosing a different type starts a fresh example.</small>
    </label>
    <details class="configuration">
      <summary @click="prepareConfiguration">Configure block</summary>
      <p>
        Edit the content and controls for this interaction. Applying
        configuration saves it with this block.
      </p>
      <textarea
        v-model="draft"
        aria-label="Interactive configuration"
        spellcheck="false"
      />
      <button type="button" @click="applyConfiguration">
        Apply configuration
      </button>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Block } from '~/core/blocks/Block';
import { interactiveTotal } from '~/core/blocks/interactiveData';
import {
  parseInteractiveExperience,
  defaultInteractiveExperience,
  interactionLabels,
  type InteractionKind,
} from '~/core/blocks/interactiveExperience';
import InteractiveActivities from './InteractiveActivities.vue';

const props = defineProps<{ block: Block }>();
const emit = defineEmits<{ 'update:block': [block: Block] }>();
const draft = ref('');
const error = ref('');
const parsed = computed(() => {
  try {
    return { data: parseInteractiveExperience(props.block.data), error: '' };
  } catch (cause) {
    return {
      data: null,
      error: cause instanceof Error ? cause.message : 'Invalid configuration.',
    };
  }
});
const calculator = computed(() =>
  parsed.value.data?.kind === 'calculator' ? parsed.value.data : null,
);
const total = computed(() =>
  calculator.value ? interactiveTotal(calculator.value) : 0,
);
function changeType(event: Event) {
  const kind = (event.target as HTMLSelectElement).value as InteractionKind;
  if (kind === parsed.value.data?.kind) return;
  const example = defaultInteractiveExperience(kind);
  emit('update:block', props.block.withData(JSON.stringify(example)));
  draft.value = JSON.stringify(example, null, 2);
  error.value = '';
}
const format = (value: number) =>
  new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value);
const color = (index: number) =>
  ['#4f46e5', '#0d9488', '#f59e0b', '#db2777'][index % 4];
function updateValue(index: number, event: Event) {
  const data = calculator.value;
  if (!data) return;
  const value = (event.target as HTMLInputElement).valueAsNumber;
  const inputs = data.inputs.map((input, i) =>
    i === index ? { ...input, value } : input,
  );
  emit(
    'update:block',
    props.block.withData(JSON.stringify({ ...data, inputs })),
  );
}
function prepareConfiguration(event: Event) {
  if ((event.currentTarget as HTMLElement).parentElement?.hasAttribute('open'))
    return;
  draft.value = parsed.value.data
    ? JSON.stringify(parsed.value.data, null, 2)
    : (props.block.data ?? '');
  error.value = '';
}
function applyConfiguration() {
  try {
    const data = parseInteractiveExperience(draft.value);
    emit('update:block', props.block.withData(JSON.stringify(data)));
    error.value = '';
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : 'Invalid configuration.';
  }
}
</script>

<style scoped>
.interactive-block {
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: clamp(16px, 4vw, 28px);
  background: #fff;
  color: #0f172a;
  text-align: left;
}
.eyebrow {
  text-transform: uppercase;
  color: #4f46e5;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
}
h3 {
  font-size: 24px;
  font-weight: 650;
  margin: 6px 0;
  line-height: 1.25;
}
header p,
.configuration p {
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}
.explorer-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 28px;
  margin-top: 26px;
}
.controls {
  display: grid;
  gap: 22px;
  align-content: center;
}
.input-row {
  display: grid;
  gap: 10px;
}
.input-heading,
.range-caption,
li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.input-heading {
  font-size: 13px;
  font-weight: 600;
}
.input-heading > span:last-child {
  color: #4f46e5;
}
input[type='range'] {
  width: 100%;
  accent-color: #4f46e5;
  cursor: pointer;
}
.range-caption {
  color: #64748b;
  font-size: 10px;
}
.result {
  background: #f8fafc;
  border-radius: 14px;
  padding: 22px;
  font-size: 12px;
  color: #64748b;
}
.total {
  display: block;
  font-size: 38px;
  font-weight: 650;
  letter-spacing: -0.04em;
  color: #0f172a;
  margin-top: 4px;
  overflow-wrap: anywhere;
}
.total small {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  color: #64748b;
}
.breakdown-bar {
  display: flex;
  height: 10px;
  border-radius: 10px;
  overflow: hidden;
  margin: 20px 0;
  background: #e2e8f0;
}
.breakdown-bar span {
  transition: width 150ms ease;
}
ul {
  display: grid;
  gap: 10px;
  list-style: none;
  padding: 0;
}
li span {
  display: flex;
  align-items: center;
  gap: 7px;
}
i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
strong {
  color: #334155;
  font-weight: 500;
  white-space: nowrap;
}
.formula {
  margin-top: 18px;
  font-size: 10px;
}
.type-picker {
  display: grid;
  gap: 8px;
  margin-top: 24px;
  font-size: 12px;
  color: #64748b;
}
.type-picker select {
  width: 100%;
  max-width: 280px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px;
  background: white;
  color: #0f172a;
}
.configuration {
  margin-top: 22px;
  border-top: 1px solid #e2e8f0;
  padding-top: 14px;
  font-size: 12px;
  color: #64748b;
}
summary {
  cursor: pointer;
  width: fit-content;
}
.configuration p {
  margin: 10px 0;
}
textarea {
  width: 100%;
  min-height: 240px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
  color: #0f172a;
  resize: vertical;
}
button {
  padding: 8px 14px;
  border-radius: 8px;
  background: #4f46e5;
  color: white;
  margin-top: 8px;
  cursor: pointer;
}
.error {
  color: #b91c1c !important;
  font-size: 13px;
}
:where(input, textarea, button, summary):focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 4px;
}
@media (max-width: 560px) {
  .explorer-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .breakdown-bar span {
    transition: none;
  }
}
</style>
