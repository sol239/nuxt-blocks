import { defaultInteractiveData, parseInteractiveData, type InteractiveData } from './interactiveData';

export type InteractionKind = 'calculator' | 'bill-splitter' | 'comparison' | 'checklist' | 'quiz';
interface ExperienceBase { title: string; description: string }
export interface CalculatorExperience extends InteractiveData { kind: 'calculator' }
export interface BillExperience extends ExperienceBase {
  kind: 'bill-splitter'; amount: number; people: number; tip: number; unit: string;
}
export interface ComparisonExperience extends ExperienceBase {
  kind: 'comparison'; unit: string; maxPrice: number; selectedId: string | null;
  options: { id: string; name: string; price: number; description: string; features: string[] }[];
}
export interface ChecklistExperience extends ExperienceBase {
  kind: 'checklist'; items: { id: string; label: string; detail: string; done: boolean }[];
}
export interface QuizExperience extends ExperienceBase {
  kind: 'quiz'; submitted: boolean;
  questions: { id: string; prompt: string; options: string[]; answer: number; selected: number | null; explanation: string }[];
}
export type InteractiveExperience = CalculatorExperience | BillExperience | ComparisonExperience | ChecklistExperience | QuizExperience;
export const interactionLabels: Record<InteractionKind, string> = {
  calculator: 'Scenario calculator', 'bill-splitter': 'Bill splitter', comparison: 'Compare options', checklist: 'Action plan', quiz: 'Learning quiz',
};
export function defaultInteractiveExperience(kind: InteractionKind): InteractiveExperience {
  switch (kind) {
    case 'calculator': return { kind, ...defaultInteractiveData() };
    case 'bill-splitter': return { kind, title: 'Split dinner with friends', description: 'Enter the bill, choose a tip, and split the total equally.', amount: 120, people: 4, tip: 10, unit: 'EUR' };
    case 'comparison': return { kind, title: 'Choose a place to stay', description: 'Filter by your nightly budget, compare the details, and select your preferred option.', unit: 'EUR / night', maxPrice: 200, selectedId: null, options: [
      { id: 'old-town', name: 'Old Town studio', price: 90, description: 'A central base for exploring on foot.', features: ['Kitchenette', 'Walkable location', 'Self check-in'] },
      { id: 'riverside', name: 'Riverside hotel', price: 140, description: 'Extra comfort and a quieter evening by the river.', features: ['Breakfast included', 'River view', '24-hour reception'] },
      { id: 'garden', name: 'Garden guesthouse', price: 65, description: 'A relaxed option with a short tram ride to the centre.', features: ['Private garden', 'Free parking', 'Near a tram stop'] },
    ] };
    case 'checklist': return { kind, title: 'Prepare your launch', description: 'Track your next steps, add tasks, and see how far you have come.', items: [
      { id: 'scope', label: 'Define the scope', detail: 'Describe the audience, problem, and success criteria.', done: true },
      { id: 'prototype', label: 'Test the prototype', detail: 'Ask two teammates to complete the main workflow.', done: false },
      { id: 'release', label: 'Prepare release notes', detail: 'Explain what changed and how to get started.', done: false },
    ] };
    case 'quiz': return { kind, title: 'Test your UI intuition', description: 'Choose an answer for each question, then check your understanding.', submitted: false, questions: [
      { id: 'feedback', prompt: 'What helps a user understand the effect of changing an input?', options: ['An immediate result', 'A longer instruction page', 'A hidden status message'], answer: 0, selected: null, explanation: 'Immediate feedback connects the action to its result.' },
      { id: 'comparison', prompt: 'Which interface helps compare three accommodation options?', options: ['An unstructured paragraph', 'Cards with the same fields', 'A slider without labels'], answer: 1, selected: null, explanation: 'Consistent fields make differences easier to scan and compare.' },
    ] };
  }
}

function text(value: unknown): value is string { return typeof value === 'string' && value.length <= 1000; }
function number(value: unknown, min: number, max: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
function list(value: unknown, min: number, max: number): value is unknown[] { return Array.isArray(value) && value.length >= min && value.length <= max; }
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function uniqueIds(items: { id: string }[]) { return items.every(item => item.id.trim()) && new Set(items.map(item => item.id)).size === items.length; }
function invalid(): never { throw new Error('Invalid interaction configuration. Check the fields, bounds, item IDs, and selected answers.'); }

/** Read legacy calculators and declarative activities. No expressions or scripts are executed. */
export function parseInteractiveExperience(source: string | null): InteractiveExperience {
  const value: unknown = source?.trim() ? JSON.parse(source) : defaultInteractiveData();
  if (!object(value)) return invalid();
  if (value.kind === undefined || value.kind === 'calculator') return { kind: 'calculator', ...parseInteractiveData(JSON.stringify(value)) };
  if (!text(value.title) || !text(value.description)) return invalid();
  const base = { title: value.title, description: value.description };
  switch (value.kind) {
    case 'bill-splitter':
      if (!number(value.amount, 0, 1e9) || !number(value.people, 1, 1000) || !Number.isInteger(value.people) || !number(value.tip, 0, 100) || !text(value.unit)) return invalid();
      return { ...base, kind: 'bill-splitter', amount: value.amount, people: value.people, tip: value.tip, unit: value.unit };
    case 'comparison': {
      if (!text(value.unit) || !number(value.maxPrice, 0, 1e9) || !list(value.options, 1, 12)) return invalid();
      const options = value.options.map(item => {
        if (!object(item) || !text(item.id) || !text(item.name) || !text(item.description) || !number(item.price, 0, 1e9) || !list(item.features, 0, 12) || !item.features.every(text)) return invalid();
        return { id: item.id, name: item.name, description: item.description, price: item.price, features: item.features };
      });
      if (!uniqueIds(options) || (value.selectedId !== null && !options.some(item => item.id === value.selectedId))) return invalid();
      return { ...base, kind: 'comparison', unit: value.unit, maxPrice: value.maxPrice, selectedId: value.selectedId as string | null, options };
    }
    case 'checklist': {
      if (!list(value.items, 0, 100)) return invalid();
      const items = value.items.map(item => {
        if (!object(item) || !text(item.id) || !text(item.label) || !item.label.trim() || !text(item.detail) || typeof item.done !== 'boolean') return invalid();
        return { id: item.id, label: item.label, detail: item.detail, done: item.done };
      });
      if (!uniqueIds(items)) return invalid();
      return { ...base, kind: 'checklist', items };
    }
    case 'quiz': {
      if (typeof value.submitted !== 'boolean' || !list(value.questions, 1, 20)) return invalid();
      const questions = value.questions.map(item => {
        if (!object(item) || !text(item.id) || !text(item.prompt) || !text(item.explanation) || !list(item.options, 2, 8) || !item.options.every(text)
          || !number(item.answer, 0, item.options.length - 1) || !Number.isInteger(item.answer)
          || (item.selected !== null && (!number(item.selected, 0, item.options.length - 1) || !Number.isInteger(item.selected)))) return invalid();
        return { id: item.id, prompt: item.prompt, explanation: item.explanation, options: item.options, answer: item.answer, selected: item.selected as number | null };
      });
      if (!uniqueIds(questions) || (value.submitted && questions.some(item => item.selected === null))) return invalid();
      return { ...base, kind: 'quiz', submitted: value.submitted, questions };
    }
    default: return invalid();
  }
}

/** Split in minor units so every person's share adds up to the exact rounded total. */
export function splitBill(data: BillExperience) {
  const subtotal = Math.round(data.amount * 100);
  const tip = Math.round(subtotal * data.tip / 100);
  const total = subtotal + tip;
  const share = Math.floor(total / data.people);
  const extra = total % data.people;
  return { total: total / 100, tip: tip / 100, share: share / 100, extra, largerShare: (share + 1) / 100 };
}
