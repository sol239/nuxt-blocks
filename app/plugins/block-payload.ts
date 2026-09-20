import { Block } from "~/core/blocks/Block";
import "~/core/blocks/registry";

// Preserve class methods when Pinia state crosses the server/client boundary.
export default definePayloadPlugin(() => {
  definePayloadReducer("Block", value => value instanceof Block && {
    ...value.toJSON(),
    blockSettings: { ...value.blockSettings },
  });
  definePayloadReviver("Block", value =>
    Block.fromJSON(value as ReturnType<Block["toJSON"]>),
  );
});
