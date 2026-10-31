<template>
  <component
    :is="service.selectComponent"
    v-if="service?.selectComponent"
    :model-value="modelValue"
    :label="label"
    :options="options"
    :placeholder="placeholder"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <label v-else class="text-sm"
    >{{ label }}
    <select
      data-control-size="field"
      :value="modelValue"
      :aria-label="label"
      :disabled="disabled"
      class="mt-1 block w-full rounded-lg border border-zinc-200 bg-transparent p-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700"
      @change="change"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </label>
</template>
<script setup lang="ts">
import { useAiBlocks } from '../composables/useAiBlocks';
defineProps<{
  modelValue: string;
  label: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const service = useAiBlocks();
function change(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value);
}
</script>
