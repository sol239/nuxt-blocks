/** A declarative calculator: each contribution is value × rate; no executable code. */
export interface InteractiveInput {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  rate: number;
}
export interface InteractiveData {
  title: string;
  description: string;
  resultLabel: string;
  unit: string;
  inputs: InteractiveInput[];
}
export function defaultInteractiveData(): InteractiveData {
  return {
    title: "Plan a Czech getaway",
    description: "Move the sliders to explore your trip budget. Each change updates the estimate below.",
    resultLabel: "Estimated trip cost", unit: "EUR",
    inputs: [
      { label: "Accommodation", unit: "nights", min: 0, max: 14, step: 1, value: 3, rate: 90 },
      { label: "Meals", unit: "meals", min: 0, max: 42, step: 1, value: 6, rate: 18 },
      { label: "Transport", unit: "journeys", min: 0, max: 10, step: 1, value: 2, rate: 25 },
    ],
  };
}
export function parseInteractiveData(source: string | null): InteractiveData {
  if (!source?.trim()) return defaultInteractiveData();
  const data = JSON.parse(source);
  const isText = (value: unknown) => typeof value === "string" && value.length <= 1000;
  if (!data || ![data.title, data.description, data.resultLabel, data.unit].every(isText)
    || !Array.isArray(data.inputs) || data.inputs.length < 1 || data.inputs.length > 12) {
    throw new Error("Provide title, description, resultLabel, unit, and 1–12 inputs.");
  }
  for (const input of data.inputs) {
    if (!input || !isText(input.label) || !isText(input.unit)
      || ![input.min, input.max, input.step, input.value, input.rate].every((n) => typeof n === "number" && Number.isFinite(n))
      || input.min < 0 || input.max <= input.min || input.max > 1e9
      || input.step <= 0 || input.step > input.max - input.min || input.rate < 0 || input.rate > 1e9
      || input.value < input.min || input.value > input.max) {
      throw new Error("Each input needs a label, unit, finite nonnegative bounds and rate, a positive step, and a value within its bounds.");
    }
  }
  // Keep only the documented schema in emitted updates.
  return { title: data.title, description: data.description, resultLabel: data.resultLabel, unit: data.unit,
    inputs: data.inputs.map((input: InteractiveInput) => ({ label: input.label, unit: input.unit,
      min: input.min, max: input.max, step: input.step, value: input.value, rate: input.rate })) };
}
export function interactiveTotal(data: InteractiveData): number {
  return data.inputs.reduce((total, input) => total + input.value * input.rate, 0);
}
