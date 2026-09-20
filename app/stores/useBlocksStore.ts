import { defineStore } from "pinia";
import { ref } from "vue";
import { Block } from "~/core/blocks/Block";

export const useBlocksStore = defineStore("blocks", () => {
  const blocks = ref<Block[]>([]);

  function addBlock(block: Block, index = blocks.value.length) {
    blocks.value.splice(index, 0, block);
  }

  function deleteBlock(id: string) {
    const index = blocks.value.findIndex((b) => b.id === id);
    if (index !== -1) blocks.value.splice(index, 1);
  }

  function setBlocks(newBlocks: Block[]) {
    blocks.value = newBlocks;
  }

  return { blocks, setBlocks, addBlock, deleteBlock };
});
