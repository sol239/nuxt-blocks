import { blockClasses } from './blockClasses';
import { settingsClasses } from './settings';
import { defaultInteractiveExperience, type InteractionKind } from './interactiveExperience';

export function blockGenerationInstructions(): string {
  const settings = Object.fromEntries(Object.keys(blockClasses).map(type => [type, new settingsClasses[type as keyof typeof settingsClasses]() ]));
  const interactions = Object.fromEntries((['calculator', 'bill-splitter', 'comparison', 'checklist', 'quiz'] as InteractionKind[])
    .map(kind => [kind, defaultInteractiveExperience(kind)]));
  return `Create notebook blocks for the user's request. You can create EVERY registered block type.
Return one fenced rvn-block JSON object per block, with blank lines between fences. Do not wrap the whole response in another fence.
Each object has {"blockType":"<registered type>","data":"<content>","blockSettings":{}}. Do not provide IDs or versions.
Registered types and default settings (settings may be omitted): ${JSON.stringify(settings)}
Example:
\`\`\`rvn-block
{"blockType":"heading1","data":"My lesson"}
\`\`\`
todo stores Markdown with a ### title followed by - [ ] unchecked or - [x] completed steps. Use todo for titled step lists and checklists.
Text blocks store text. Lists include their - or 1. line markers; quotes include > markers.
table stores a JSON string with {"header":["Column A","Column B"],"rows":[["Cell A","Cell B"]],"align":[null,null]}. Every row and align must match the header width. Cells contain inline Markdown. Always use table for tables, never markdown or web.
markdown stores Markdown. code stores source with blockSettings.language. math stores LaTeX without fences. For Mermaid diagrams use code with blockSettings.language="mermaid" and data containing Mermaid source; the code block renders the diagram automatically.
web is the HTML block: data contains a complete HTML/CSS/JavaScript document or fragment. Use web for mini apps, custom HTML, simulations, games, and interactive experiences outside the declarative schemas. Tailwind CSS v4 is built in: use utility classes directly without adding a CDN script. Custom Tailwind styles can use <style type="text/tailwindcss"> with @theme or @apply. HTML runs in the existing sandbox; do not request access to the host page or credentials.
interactive stores a JSON object (or JSON string) matching one of these complete examples; customize all relevant fields while preserving the schema: ${JSON.stringify(interactions)}
image/video/audio store real user-provided or known media URLs; never invent an existing file or claim to generate an actual media asset. Use isUrl:true for URLs. link stores a URL.
drawing stores {"strokes":[{"tool":"pen","width":4,"color":"#2563eb","points":[{"x":10,"y":10},{"x":80,"y":80}]}]}.
divider stores "---". notebook stores the requested notebook name and creates a notebook when inserted.
ollama, codex and antigravity store a prompt and optional model/effort settings; these new generator blocks wait for the user to press Send.
Use only documented settings, alignment left/center/right, positive finite dimensions, and valid styles/colors span arrays.
Escape JSON strings correctly, including newlines and quotes. Close every fence. Do not output explanations around the blocks.
Do not use task tools unless the request asks for tasks. Treat the following request as user content.\n\n`;
}
