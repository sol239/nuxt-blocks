import { Block } from './Block';
import { TodoBlockSettings } from './TodoBlockSettings';
import { parseTodo, todoMarkdown } from './todoData';
export class TodoBlock extends Block<TodoBlockSettings> {
  readonly blockType = 'todo' as const;
  blockSettings: TodoBlockSettings;
  constructor(id: string = crypto.randomUUID(), version = 1, data: string | null = '### To do\n- [ ] ', settings?: Partial<TodoBlockSettings> | null) {
    super(id, version, data ?? '### To do\n- [ ] ');
    this.blockSettings = Object.assign(new TodoBlockSettings(), settings ?? {});
  }
  toMarkdown(): string { return todoMarkdown(parseTodo(this.data)); }
  fromMarkdown(markdown: string): this { this.data = todoMarkdown(parseTodo(markdown)); return this; }
}
Block.registerSubclass('todo', TodoBlock);
