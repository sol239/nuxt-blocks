import type { IBlockSettings } from "./IBlockSettings";
import type { settingsClasses } from "./settings";

export type BlockType = keyof typeof settingsClasses;

export interface BlockJSON<TSettings extends IBlockSettings = IBlockSettings> {
  id: string;
  version: number;
  data: string | null;
  blockType: BlockType;
  blockSettings: TSettings;
}

export type BlockDeserializer = (json: BlockJSON<any>) => Block<any>;

const subclassRegistry = new Map<BlockType, new (...args: any[]) => Block<any>>();
let deserializer: BlockDeserializer | null = null;

export abstract class Block<TSettings extends IBlockSettings = IBlockSettings> {
  abstract readonly blockType: BlockType;
  abstract blockSettings: TSettings;

  constructor(
    public id: string,
    public version: number,
    public data: string | null,
  ) {}

  abstract toMarkdown(): string;
  abstract fromMarkdown(markdown: string): this;

  withData(data: string | null): this {
    const ctor = this.constructor as new (
      id: string,
      version: number,
      data: string | null,
      settings?: any,
    ) => this;
    return new ctor(this.id, this.version, data, this.blockSettings);
  }

  withSettings(settings: Partial<TSettings> | TSettings): this {
    const ctor = this.constructor as new (
      id: string,
      version: number,
      data: string | null,
      settings?: any,
    ) => this;
    const mergedSettings = Object.assign(
      Object.create(Object.getPrototypeOf(this.blockSettings)),
      this.blockSettings,
      settings,
    );
    return new ctor(this.id, this.version, this.data, mergedSettings);
  }

  toJSON(): BlockJSON<TSettings> {
    return {
      id: this.id,
      version: this.version,
      data: this.data,
      blockType: this.blockType,
      blockSettings: this.blockSettings,
    };
  }

  fromJSON(json: Partial<BlockJSON<TSettings>>): this {
    if (json.id !== undefined) this.id = json.id;
    if (json.version !== undefined) this.version = json.version;
    if (json.data !== undefined) this.data = json.data;
    if (json.blockSettings !== undefined) {
      Object.assign(this.blockSettings, json.blockSettings);
    }
    return this;
  }

  static registerSubclass(type: BlockType, ctor: new (...args: any[]) => Block<any>) {
    subclassRegistry.set(type, ctor);
  }

  static setDeserializer(fn: BlockDeserializer) {
    deserializer = fn;
  }

  static fromJSON(json: BlockJSON<any>): Block {
    if (deserializer) {
      return deserializer(json);
    }
    const Ctor = subclassRegistry.get(json.blockType);
    if (Ctor) {
      return new Ctor(json.id, json.version, json.data, json.blockSettings);
    }
    throw new Error(
      `Cannot deserialize block of type "${json?.blockType}". Make sure registry or subclass is registered.`,
    );
  }
}
