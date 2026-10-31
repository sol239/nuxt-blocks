# Interactive answers with Blocks

A useful answer can become something you explore. A trip estimate can let you adjust the number of nights. A comparison can let you filter and choose a place to stay. A learning explanation can end with a quiz that checks your understanding.

The **Interactive** block supports five kinds of experience. Each combines content with controls that fit the task, and stores its state in the document.

| Type (`kind`)   | Controls                                   | Result                                 |
| --------------- | ------------------------------------------ | -------------------------------------- |
| `calculator`    | Sliders for quantities                     | Live total and proportional breakdown  |
| `bill-splitter` | Amount and people fields, tip presets      | Exact rounded shares, total, and tip   |
| `comparison`    | Budget filter and option selection         | Comparable cards and a recorded choice |
| `checklist`     | Checkboxes, add-step form, remove buttons  | Completion count and progress bar      |
| `quiz`          | Answer selection, check answers, try again | Score, corrections, and explanations   |

## Try it in a document

Add a block through `/interactive` or **Turn into → Interactive**. Use **Example type** to start a different experience. Switching types starts a fresh example; it replaces the current block's data. **Configure block** lets you supply your own content through the corresponding JSON schema.

The Demo Desk's **Intelligent UI Playground** includes all five kinds. Try splitting a dinner bill, comparing accommodation, completing a launch plan, answering a short quiz, and adjusting the original trip budget. Choices and progress save through the host's normal block update handler.

## Compose an interface from data

```ts
import { ref } from 'vue';
import {
  InteractiveBlock,
  defaultInteractiveExperience,
  parseInteractiveExperience,
} from 'nuxt-blocks';

const experience = defaultInteractiveExperience('checklist');
experience.title = 'Prepare our launch';
const block = ref(
  new InteractiveBlock('launch-plan', 1, JSON.stringify(experience)),
);

// Validate generated or user-supplied JSON before using it:
const checked = parseInteractiveExperience(block.value.data);
```

Render it in `BlockCanvas` or use the auto-registered component on its own:

```vue
<InteractiveBlock :block="block" @update:block="block = $event" />
```

Every change emits a new block instance, preserving its ID, version, and settings. Hosts persist these updates through their existing save path. JSON restoration and fenced `interactive` Markdown import preserve each experience's state. Configuration never executes HTML, JavaScript, or expressions.

## Configuration examples

All types include `kind`, `title`, and `description`. The exported `InteractiveExperience` TypeScript union describes the complete schema. Start with `defaultInteractiveExperience(kind)` to get a valid example.

A bill splitter uses:

```json
{
  "kind": "bill-splitter",
  "title": "Dinner with friends",
  "description": "Split the total equally, including the tip.",
  "amount": 120,
  "people": 4,
  "tip": 10,
  "unit": "EUR"
}
```

Amount and tip calculations use integer minor units. If equal shares cannot divide evenly into cents, the interface shows how many people pay each amount so the shares add up to the rounded total. This type assumes two decimal places in the chosen unit.

A checklist stores `items`, each with a unique nonempty `id`, a nonempty `label`, `detail`, and boolean `done`. It supports up to 100 items, including an empty plan. Adding and removing steps and toggling completion are persisted edits.

A comparison stores `unit`, `maxPrice`, `selectedId` (or `null`), and 1–12 `options`. Every option has a unique `id`, `name`, `price`, `description`, and `features` array. Changing the budget clears a selection that is no longer visible. If no option fits, the interface explains how to adjust the filter.

A quiz stores boolean `submitted` and 1–20 `questions`. Each question has a unique `id`, `prompt`, 2–8 `options`, a zero-based correct `answer`, a `selected` index (or `null`), and an `explanation`. Check answers becomes available after every question is answered. Changing an answer clears the previous feedback; Try again clears selections and score. This is a learning tool: answers are included in the document data.

The calculator retains the original schema: `resultLabel`, shared result `unit`, and 1–12 `inputs` with `label`, quantity `unit`, `min`, `max`, `step`, `value`, and `rate`. It computes `sum(value × rate)`. Legacy calculator JSON without `kind` continues to work. `parseInteractiveData` remains the calculator-specific helper; use `parseInteractiveExperience` for all types.

## Validation and access

Schemas validate finite numbers, bounds, types, IDs, and valid selections before accepting updates. Invalid configuration shows an error and preserves the current experience. Invalid stored data exposes a repair editor. Invalid interactive Markdown remains source Markdown instead of losing content.

Controls use native inputs, labels, radio groups, checkboxes, and keyboard navigation. Results and scores are announced through live regions. Text accompanies visual breakdowns, and layouts adapt to narrow screens. No optional rendering dependency is required.

These are reusable document interactions. The library does not generate arbitrary applications, call remote actions, or run model output as code.

## Inspiration

The [OpenAI Intelligent UI introduction](https://openai.com/index/gpt-6-for-everyone/) describes responses that combine explanations with interactive controls and visuals. Blocks applies this interaction pattern to documents: readers can change assumptions, make choices, track progress, and check their understanding directly in the content.

Additional references supplied for this feature: [OpenUI](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works) and [MindStudio](https://www.mindstudio.ai/blog/gpt-6-intelligent-ui-chatgpt).
