<template>
  <div v-if="data.kind === 'bill-splitter'" class="activity">
    <form class="fields" @submit.prevent>
      <label>Bill amount ({{ data.unit }})<input type="number" :value="data.amount" min="0" max="1000000000" step="0.01" @change="updateBill('amount', $event)"></label>
      <label>People<input type="number" :value="data.people" min="1" max="1000" step="1" @change="updateBill('people', $event)"></label>
      <label>Tip (%)<input type="number" :value="data.tip" min="0" max="100" step="1" @change="updateBill('tip', $event)"></label>
    </form>
    <div class="chips" role="group" aria-label="Tip presets">
      <button v-for="tip in [0, 5, 10, 15, 20]" :key="tip" type="button" :aria-pressed="data.tip === tip" @click="save({ ...data, tip })">{{ tip }}% tip</button>
    </div>
    <div v-if="bill" class="result" aria-live="polite">
      <span>Total with tip</span><output class="big">{{ money(bill.total) }} {{ data.unit }}</output>
      <p v-if="!bill.extra">{{ data.people }} people pay {{ money(bill.share) }} {{ data.unit }} each.</p>
      <p v-else>{{ bill.extra }} people pay {{ money(bill.largerShare) }} {{ data.unit }}; {{ data.people - bill.extra }} pay {{ money(bill.share) }} {{ data.unit }}.</p>
      <small>Tip: {{ money(bill.tip) }} {{ data.unit }}. Shares include rounding to two decimal places.</small>
    </div>
  </div>
  <div v-else-if="data.kind === 'comparison'" class="activity">
    <label class="budget">Maximum price ({{ data.unit }})<input type="number" :value="data.maxPrice" min="0" max="1000000000" @change="updateBudget"></label>
    <fieldset class="options">
      <legend>Choose an option · {{ visibleOptions.length }} available</legend>
      <label v-for="option in visibleOptions" :key="option.id" class="option" :class="{ chosen: data.selectedId === option.id }">
        <span class="option-top"><input type="radio" :name="`${block.id}-option`" :checked="data.selectedId === option.id" @change="save({ ...data, selectedId: option.id })">{{ option.name }}</span>
        <strong>{{ money(option.price) }} {{ data.unit }}</strong>
        <p>{{ option.description }}</p><ul><li v-for="feature in option.features" :key="feature">{{ feature }}</li></ul>
      </label>
    </fieldset>
    <p v-if="!visibleOptions.length" role="status">No options fit this budget. Increase the maximum to see more.</p>
    <p class="selection" aria-live="polite">{{ selectedOption ? `Your choice: ${selectedOption.name}` : 'Select an option to record your choice.' }}</p>
  </div>
  <div v-else-if="data.kind === 'checklist'" class="activity">
    <div class="progress-heading"><strong>{{ completed }} / {{ data.items.length }} complete</strong><span>{{ progress }}%</span></div>
    <progress aria-label="Plan completion" :value="completed" :max="data.items.length || 1" />
    <ul class="tasks">
      <li v-for="item in data.items" :key="item.id">
        <label><input type="checkbox" :checked="item.done" @change="toggleTask(item.id)"><span :class="{ done: item.done }"><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span></label>
        <button type="button" class="remove" :aria-label="`Remove ${item.label}`" @click="removeTask(item.id)">×</button>
      </li>
    </ul>
    <p v-if="!data.items.length">Your plan is empty. Add the first step below.</p>
    <form class="add-task" @submit.prevent="addTask">
      <input v-model="newTask" aria-label="New task" placeholder="Add the next step…" maxlength="1000">
      <button type="submit" :disabled="!newTask.trim() || data.items.length >= 100">Add step</button>
    </form>
    <p v-if="data.items.length && completed === data.items.length" role="status" class="success">All steps complete. Ready for the next milestone!</p>
  </div>
  <div v-else-if="data.kind === 'quiz'" class="activity">
    <fieldset v-for="(question, index) in data.questions" :key="question.id" class="question">
      <legend>{{ index + 1 }}. {{ question.prompt }}</legend>
      <label v-for="(option, optionIndex) in question.options" :key="optionIndex" class="answer" :class="{ chosen: question.selected === optionIndex }">
        <input type="radio" :name="`${block.id}-${question.id}`" :checked="question.selected === optionIndex" @change="selectAnswer(question.id, optionIndex)">{{ option }}
      </label>
      <p v-if="data.submitted" class="feedback" :class="question.selected === question.answer ? 'success' : 'incorrect'">
        <strong>{{ question.selected === question.answer ? 'Correct.' : `Correct answer: ${question.options[question.answer]}.` }}</strong> {{ question.explanation }}
      </p>
    </fieldset>
    <div class="quiz-actions"><button type="button" :disabled="data.questions.some(question => question.selected === null)" @click="save({ ...data, submitted: true })">Check answers</button><button type="button" class="secondary" @click="save({ ...data, submitted: false, questions: data.questions.map(question => ({ ...question, selected: null })) })">Try again</button></div>
    <output v-if="data.submitted" class="score" aria-live="polite">{{ data.questions.filter(question => question.selected === question.answer).length }} / {{ data.questions.length }} correct</output>
  </div>
  <p v-if="error" role="alert" class="incorrect">{{ error }}</p>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Block } from '~/core/blocks/Block';
import { parseInteractiveExperience, splitBill, type InteractiveExperience } from '~/core/blocks/interactiveExperience';
const props = defineProps<{ block: Block }>();
const emit = defineEmits<{ 'update:block': [block: Block] }>();
const data = computed(() => parseInteractiveExperience(props.block.data));
const error = ref('');
const newTask = ref('');
const money = (value: number) => new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const bill = computed(() => data.value.kind === 'bill-splitter' ? splitBill(data.value) : null);
const visibleOptions = computed(() => { const current = data.value; return current.kind === 'comparison' ? current.options.filter(option => option.price <= current.maxPrice) : []; });
const selectedOption = computed(() => { const current = data.value; return current.kind === 'comparison' ? current.options.find(option => option.id === current.selectedId) : null; });
const completed = computed(() => data.value.kind === 'checklist' ? data.value.items.filter(item => item.done).length : 0);
const progress = computed(() => data.value.kind === 'checklist' && data.value.items.length ? Math.round(completed.value / data.value.items.length * 100) : 0);
function save(next: InteractiveExperience) {
  try { const valid = parseInteractiveExperience(JSON.stringify(next)); emit('update:block', props.block.withData(JSON.stringify(valid))); error.value = ''; }
  catch { error.value = 'Enter a valid value within the allowed range.'; }
}
function updateBill(key: 'amount' | 'people' | 'tip', event: Event) {
  if (data.value.kind !== 'bill-splitter') return;
  const input = event.target as HTMLInputElement;
  if (!input.validity.valid || !input.value) { error.value = 'Enter a valid value within the allowed range.'; return; }
  save({ ...data.value, [key]: input.valueAsNumber });
}
function updateBudget(event: Event) {
  const current = data.value;
  const input = event.target as HTMLInputElement;
  if (current.kind !== 'comparison') return;
  if (!input.validity.valid || !input.value) { error.value = 'Enter a valid budget.'; return; }
  const maxPrice = input.valueAsNumber;
  const selectedId = current.options.some(option => option.id === current.selectedId && option.price <= maxPrice) ? current.selectedId : null;
  save({ ...current, maxPrice, selectedId });
}
function toggleTask(id: string) {
  if (data.value.kind === 'checklist') save({ ...data.value, items: data.value.items.map(item => item.id === id ? { ...item, done: !item.done } : item) });
}
function removeTask(id: string) {
  if (data.value.kind === 'checklist') save({ ...data.value, items: data.value.items.filter(item => item.id !== id) });
}
function addTask() {
  if (data.value.kind !== 'checklist' || !newTask.value.trim() || data.value.items.length >= 100) return;
  save({ ...data.value, items: [...data.value.items, { id: crypto.randomUUID(), label: newTask.value.trim(), detail: '', done: false }] });
  newTask.value = '';
}
function selectAnswer(id: string, selected: number) {
  if (data.value.kind === 'quiz') save({ ...data.value, submitted: false, questions: data.value.questions.map(question => question.id === id ? { ...question, selected } : question) });
}
</script>

<style scoped>
.activity { margin-top: 24px; font-size: 14px; }
.fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
label { cursor: pointer; }
.fields label, .budget { display: grid; gap: 8px; font-size: 12px; color: #475569; }
input:not([type=checkbox], [type=radio]) { width: 100%; min-width: 0; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: white; color: #0f172a; }
input[type=checkbox], input[type=radio] { accent-color: #4f46e5; flex-shrink: 0; width: 17px; height: 17px; }
button { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; cursor: pointer; font-size: 12px; }
button:disabled { opacity: .45; cursor: default; }
button[aria-pressed=true], .add-task button, .quiz-actions button:first-child { background: #4f46e5; color: white; border-color: #4f46e5; }
.chips, .quiz-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.result { margin-top: 20px; border-radius: 14px; padding: 22px; background: #f8fafc; }
.big { display: block; margin: 6px 0 14px; font-size: 32px; font-weight: 650; }
small { color: #64748b; font-size: 12px; }
.budget { max-width: 300px; margin-bottom: 20px; }
.options { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px; }
legend { font-weight: 600; margin-bottom: 12px; }
.option { display: flex; flex-direction: column; gap: 12px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; }
.option-top { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.option p, .option li { color: #64748b; font-size: 12px; }
.option ul { padding-left: 18px; list-style: disc; display: grid; gap: 5px; }
.chosen { border-color: #4f46e5 !important; background: #eef2ff; }
.selection { margin-top: 18px; color: #4f46e5; }
.progress-heading { display: flex; justify-content: space-between; }
progress { width: 100%; height: 12px; accent-color: #4f46e5; margin: 10px 0 20px; }
.tasks { display: grid; gap: 8px; padding: 0; list-style: none; }
.tasks li { display: flex; align-items: center; gap: 10px; padding: 12px; background: #f8fafc; border-radius: 10px; }
.tasks label { display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0; }
.tasks strong, .tasks small { display: block; overflow-wrap: anywhere; }
.tasks small { margin-top: 4px; }
.done strong { text-decoration: line-through; color: #64748b; }
.remove { border: 0; color: #64748b; font-size: 20px; }
.add-task { display: flex; gap: 10px; margin-top: 16px; }
.add-task button { flex-shrink: 0; }
.question { margin-bottom: 24px; }
.answer { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin: 8px 0; }
.feedback { font-size: 13px; line-height: 1.6; margin-top: 12px; }
.success { color: #047857; }
.incorrect { color: #b91c1c; margin-top: 10px; }
.score { display: block; margin-top: 20px; font-size: 22px; font-weight: 650; }
:where(input, button):focus-visible { outline: 2px solid #4f46e5; outline-offset: 3px; }
@media (max-width: 480px) { .fields { grid-template-columns: minmax(0, 1fr); } }
</style>
