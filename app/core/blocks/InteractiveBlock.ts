import { Block } from "./Block";
import { InteractiveBlockSettings } from "./InteractiveBlockSettings";
import { defaultInteractiveData } from "./interactiveData";

export class InteractiveBlock extends Block<InteractiveBlockSettings> {
  readonly blockType = "interactive" as const;
  blockSettings: InteractiveBlockSettings;

  constructor(id: string = crypto.randomUUID(), version = 1, data: string | null = null,
    settings?: Partial<InteractiveBlockSettings> | null) {
    super(id, version, data ?? JSON.stringify(defaultInteractiveData()));
    this.blockSettings = Object.assign(new InteractiveBlockSettings(), settings ?? {});
  }

  toMarkdown(): string {
    // Choose a fence longer than any run in the payload.
    const runs = this.data?.match(/`+/g) ?? [];
    const fence = "`".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
    return `${fence}interactive\n${this.data ?? ""}\n${fence}`;
  }

  fromMarkdown(markdown: string): this {
    const match = markdown.match(/^(`{3,})interactive\r?\n([\s\S]*?)\r?\n\1$/);
    return this.withData(match ? match[2]! : markdown);
  }
}
Block.registerSubclass("interactive", InteractiveBlock);
