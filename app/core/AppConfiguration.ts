export class AppConfiguration {
    mathAllowed: boolean = false;
    codeBlocksAllowed: boolean = false;
    drawingBlocksAllowed: boolean = false;
    codeSuggestionsEnabled: boolean = false;

    constructor(init?: Partial<AppConfiguration>) {
        if (init) {
            Object.assign(this, init);
        }
    }
}

