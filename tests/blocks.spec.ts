import { test, expect, type Page } from "@playwright/test";
import { Block, type BlockType } from "../app/core/blocks/Block";
import { settingsClasses } from "../app/core/blocks/settings";
import {
  blockClasses,
  createBlock,
  ParagraphBlock,
  Heading1Block,
  Heading2Block,
  Heading3Block,
  DividerBlock,
  BulletedListBlock,
  NumberedListBlock,
  QuoteBlock,
  LinkBlock,
  ImageBlock,
  VideoBlock,
  AudioBlock,
  CodeBlock,
  MathBlock,
  DrawingBlock,
} from "../app/core/blocks/blockClasses";
import { CodeBlockSettings } from "../app/core/blocks/CodeBlockSettings";
import { ImageBlockSettings } from "../app/core/blocks/ImageBlockSettings";
import { VideoBlockSettings } from "../app/core/blocks/VideoBlockSettings";
import { normalizeMarkedText } from "../app/core/blocks/markedText";
import { mediaSource, safeUrl } from "../app/core/blocks/media";
import { AppConfiguration } from "../app/core/AppConfiguration";

test("settings survive edits and JSON restoration for every block type", () => {
  for (const type of Object.keys(settingsClasses) as BlockType[]) {
    const block = createBlock(type, "stable-id", 7, "content");
    block.blockSettings.alignment = "right";
    const updated = block.withData("edited");
    const restored = Block.fromJSON(JSON.parse(JSON.stringify(updated)));
    expect(restored).toBeInstanceOf(blockClasses[type]);
    expect(restored.blockSettings).toBeInstanceOf(settingsClasses[type]);
    expect(restored.toJSON()).toEqual(updated.toJSON());
    expect(restored.blockSettings.alignment).toBe("right");
    expect(restored.id).toBe("stable-id");
    expect(restored.version).toBe(7);
    expect(block.data).toBe("content");
  }
  const settings = new CodeBlockSettings();
  settings.language = "python";
  expect(new CodeBlock("code", 1, "print(1)", settings).withData("print(2)").blockSettings)
    .toMatchObject({ language: "python" });

  const imgSettings = new ImageBlockSettings();
  imgSettings.width = 400;
  imgSettings.height = 300;
  const restoredImg = Block.fromJSON(
    JSON.parse(JSON.stringify(new ImageBlock("img", 1, "https://example.com/a.png", imgSettings))),
  );
  expect(restoredImg.blockSettings).toMatchObject({ width: 400, height: 300 });

  const vidSettings = new VideoBlockSettings();
  vidSettings.width = 640;
  vidSettings.height = 360;
  const restoredVid = Block.fromJSON(
    JSON.parse(JSON.stringify(new VideoBlock("vid", 1, "https://example.com/a.mp4", vidSettings))),
  );
  expect(restoredVid.blockSettings).toMatchObject({ width: 640, height: 360 });
});

test("all 15 block subclasses implement toMarkdown and fromMarkdown correctly", () => {
  // 1. Paragraph
  const p = new ParagraphBlock("p1", 1, "Hello world");
  expect(p.toMarkdown()).toBe("Hello world");
  const p2 = new ParagraphBlock().fromMarkdown("New text");
  expect(p2.data).toBe("New text");

  // 2. Heading1
  const h1 = new Heading1Block("h1", 1, "Title");
  expect(h1.toMarkdown()).toBe("# Title");
  const h1Restored = new Heading1Block().fromMarkdown("# Deserialized Title");
  expect(h1Restored.data).toBe("Deserialized Title");

  // 3. Heading2
  const h2 = new Heading2Block("h2", 1, "Section");
  expect(h2.toMarkdown()).toBe("## Section");
  const h2Restored = new Heading2Block().fromMarkdown("## Deserialized Section");
  expect(h2Restored.data).toBe("Deserialized Section");

  // 4. Heading3
  const h3 = new Heading3Block("h3", 1, "Subsection");
  expect(h3.toMarkdown()).toBe("### Subsection");
  const h3Restored = new Heading3Block().fromMarkdown("### Deserialized Subsection");
  expect(h3Restored.data).toBe("Deserialized Subsection");

  // 5. Divider
  const div = new DividerBlock();
  expect(div.toMarkdown()).toBe("---");
  expect(new DividerBlock().fromMarkdown("anything").toMarkdown()).toBe("---");

  // 6. BulletedList
  const bl = new BulletedListBlock("bl", 1, "- First\n- Second");
  expect(bl.toMarkdown()).toBe("- First\n- Second");
  const blRestored = new BulletedListBlock().fromMarkdown("First\nSecond");
  expect(blRestored.toMarkdown()).toBe("- First\n- Second");

  // 7. NumberedList
  const nl = new NumberedListBlock("nl", 1, "1. First\n2. Second");
  expect(nl.toMarkdown()).toBe("1. First\n2. Second");
  const nlRestored = new NumberedListBlock().fromMarkdown("First\nSecond");
  expect(nlRestored.toMarkdown()).toBe("1. First\n2. Second");

  // 8. Quote
  const q = new QuoteBlock("q", 1, "> To be or not to be");
  expect(q.toMarkdown()).toBe("> To be or not to be");
  const qRestored = new QuoteBlock().fromMarkdown("Inspiration");
  expect(qRestored.toMarkdown()).toBe("> Inspiration");

  // 9. Link
  const link = new LinkBlock("l", 1, "https://example.com");
  expect(link.toMarkdown()).toBe("[https://example.com](https://example.com)");
  const linkRestored = new LinkBlock().fromMarkdown("[My Site](https://mysite.com)");
  expect(linkRestored.data).toBe("https://mysite.com");

  // 10. Image (URL and fallback)
  const imgUrl = new ImageBlock("img1", 1, "https://example.com/photo.jpg", { alt: "Sample Photo", isUrl: true });
  expect(imgUrl.toMarkdown()).toBe("![Sample Photo](https://example.com/photo.jpg)");
  const imgParsed = new ImageBlock().fromMarkdown("![Alt Text](https://example.com/pic.png)");
  expect(imgParsed.data).toBe("https://example.com/pic.png");
  expect(imgParsed.blockSettings.alt).toBe("Alt Text");
  expect(imgParsed.blockSettings.isUrl).toBe(true);

  const imgBase64 = new ImageBlock("img2", 1, "raw_base64_data", { isUrl: false });
  expect(imgBase64.toMarkdown()).toBe("#### [image] unsupported");

  // 11. Video (URL transformed to link and fallback)
  const vidUrl = new VideoBlock("vid1", 1, "https://example.com/clip.mp4", { isUrl: true });
  expect(vidUrl.toMarkdown()).toBe("[Video](https://example.com/clip.mp4)");
  const vidParsed = new VideoBlock().fromMarkdown("[Video](https://example.com/movie.mp4)");
  expect(vidParsed.data).toBe("https://example.com/movie.mp4");

  const vidBase64 = new VideoBlock("vid2", 1, "raw_video_bytes", { isUrl: false });
  expect(vidBase64.toMarkdown()).toBe("#### [video] unsupported");

  // 12. Audio (URL transformed to link and fallback)
  const audioUrl = new AudioBlock("aud1", 1, "https://example.com/track.mp3", { isUrl: true });
  expect(audioUrl.toMarkdown()).toBe("[Audio](https://example.com/track.mp3)");
  const audioParsed = new AudioBlock().fromMarkdown("[Audio](https://example.com/song.mp3)");
  expect(audioParsed.data).toBe("https://example.com/song.mp3");

  const audioBase64 = new AudioBlock("aud2", 1, "raw_audio_bytes", { isUrl: false });
  expect(audioBase64.toMarkdown()).toBe("#### [audio] unsupported");

  // 13. Code
  const code = new CodeBlock("code1", 1, "console.log('hi');", { language: "javascript" });
  expect(code.toMarkdown()).toBe("```javascript\nconsole.log('hi');\n```");
  const codeParsed = new CodeBlock().fromMarkdown("```python\nprint('hello')\n```");
  expect(codeParsed.data).toBe("print('hello')");
  expect(codeParsed.blockSettings.language).toBe("python");

  // 14. Math
  const math = new MathBlock("m1", 1, "E = mc^2");
  expect(math.toMarkdown()).toBe("$$\nE = mc^2\n$$");
  const mathParsed = new MathBlock().fromMarkdown("$$\na^2 + b^2 = c^2\n$$");
  expect(mathParsed.data).toBe("a^2 + b^2 = c^2");

  // 15. Drawing
  const drawingJson = JSON.stringify({
    strokes: [{ tool: "pen", points: [{ x: 10, y: 10 }, { x: 20, y: 20 }], width: 3, color: "#000000" }],
  });
  const drawBlock = new DrawingBlock("d1", 1, drawingJson);
  expect(drawBlock.toMarkdown()).toBe(`\`\`\`drawing\n${drawingJson}\n\`\`\``);
  const drawRestored = new DrawingBlock().fromMarkdown(`\`\`\`drawing\n${drawingJson}\n\`\`\``);
  expect(drawRestored.data).toBe(drawingJson);
});

test("marker formats and safe media sources", () => {
  expect(new AppConfiguration()).toMatchObject({ codeBlocksAllowed: true, mathAllowed: true });
  expect(normalizeMarkedText("One\n- Two", "bulletedList")).toBe("- One\n- Two");
  expect(normalizeMarkedText("7. One\n99. Two\nThree", "numberedList")).toBe("1. One\n2. Two\n3. Three");
  expect(normalizeMarkedText("One\n> Two", "quote")).toBe("> One\n> Two");
  expect(safeUrl("javascript:alert(1)")).toBe("");
  expect(mediaSource("YWJj", false, "image/png", "image")).toBe("data:image/png;base64,YWJj");
  expect(mediaSource("YWJj", false, "text/html", "image")).toBe("");
});

test("two Backspaces delete supported empty text blocks", async ({ page }) => {
  await page.goto("/");
  const initialCount = await page.locator("[data-block-id]").count();

  for (const type of ["paragraph", "heading1", "heading2", "heading3", "bulletedList", "numberedList", "quote"] as const) {
    const block = await add(page, type);
    const editor = block.locator("textarea");
    await editor.press("Backspace");
    await expect(block).toHaveCount(1);
    await editor.press("Backspace");
    await expect(block).toHaveCount(0);
    await expect(page.locator("[data-block-id]")).toHaveCount(initialCount);
  }

  const nonempty = await add(page, "paragraph");
  const editor = nonempty.locator("textarea");
  await editor.fill("Keep");
  await editor.press("Backspace");
  await editor.press("Backspace");
  await expect(nonempty).toHaveCount(1);
});

const blockLabels: Record<BlockType, string> = {
  paragraph: "Paragraph",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  bulletedList: "Bulleted list",
  numberedList: "Numbered list",
  quote: "Quote",
  divider: "Divider",
  link: "Link",
  image: "Image",
  video: "Video",
  audio: "Audio",
  code: "Code",
  math: "Math",
  drawing: "Drawing",
};

async function add(page: Page, type: BlockType) {
  const target = page.locator("[data-block-id]").last();
  const input = target.locator("textarea, input").first();
  if (await input.count()) {
    await input.focus();
    await page.keyboard.press("Alt+Enter");
  }
  const newBlock = page.locator("[data-block-id]").last();
  if (type !== "paragraph") {
    await newBlock.hover();
    await newBlock.locator('button[aria-label="Block actions"]').click();
    await newBlock.getByRole("menuitem", { name: "Turn into" }).click();
    await newBlock.getByRole("menu", { name: "Turn into options" }).getByRole("menuitem", { name: blockLabels[type] }).click();
  }
  return newBlock;
}

test("wrapper menu deletes the selected block and preserves editing after hydration", async ({ page }) => {
  await page.goto("/");
  const block = page.locator('[data-block-id="origins-title"]');
  await expect(block).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(block).toHaveCSS("border-top-width", "0px");
  await expect(block.getByLabel("Heading 2 block type")).toHaveCSS("opacity", "0");
  await block.hover();
  await expect(block.getByLabel("Heading 2 block type")).toHaveCSS("opacity", "1");
  const trigger = block.getByRole("button", { name: "Block actions" });
  await expect(trigger).toHaveCSS("opacity", "1");
  await trigger.click();
  await expect(block.getByRole("menuitem", { name: "Delete block" })).toBeFocused();
  await block.getByRole("button", { name: "Align center" }).click();
  await expect(block.getByRole("button", { name: "Align center" })).toHaveAttribute("aria-pressed", "true");
  await expect(block.locator("textarea")).toHaveCSS("text-align", "center");
  await page.keyboard.press("Escape");
  await expect(block.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByLabel("Heading 1", { exact: true }).click();
  await expect(block.getByRole("menu")).toHaveCount(0);
  await block.hover();
  await trigger.click();
  await block.getByRole("menuitem", { name: "Delete block" }).click();
  await expect(block).toHaveCount(0);
  await expect(page.locator("[data-block-id]")).toHaveCount(17);
  const remaining = page.locator('[data-block-id="origins"] textarea');
  await remaining.fill("Edited after deletion");
  await expect(remaining).toHaveValue("Edited after deletion");
  await add(page, "paragraph");
  await expect(page.locator("[data-block-id]")).toHaveCount(18);
});

test("all block editors render inside wrappers and update interactively", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("[data-block-id]")).toHaveCount(18);
  
  const firstBlock = page.locator("[data-block-id]").first();
  await firstBlock.hover();
  await firstBlock.locator('button[aria-label="Block actions"]').click();
  await firstBlock.getByRole("menuitem", { name: "Turn into" }).click();
  const turnIntoMenu = firstBlock.getByRole("menu", { name: "Turn into options" });
  await expect(turnIntoMenu.getByRole("menuitem")).toHaveCount(15);
  await expect(turnIntoMenu.getByRole("menuitem", { name: "Code" })).toHaveCount(1);
  await expect(turnIntoMenu.getByRole("menuitem", { name: "Math" })).toHaveCount(1);
  await expect(turnIntoMenu.getByRole("menuitem", { name: "Drawing" })).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await expect(page.getByRole("toolbar", { name: "Text formatting" })).toBeVisible();
  expect(await page.locator("main").evaluate((main) => {
    const editor = main.querySelector('[class~="space-y-3"]');
    const toolbar = main.querySelector('[role="toolbar"]');
    return Boolean(editor && toolbar && (editor.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING));
  })).toBe(true);

  for (const type of ["paragraph", "heading1", "heading2", "heading3"] as const) {
    const wrapper = await add(page, type);
    await wrapper.locator("textarea").fill(type + " updated");
    await expect(wrapper.locator("textarea")).toHaveValue(type + " updated");
  }
  await expect((await add(page, "divider")).locator("hr")).toHaveCount(1);

  for (const [type, prefix, nextPrefix] of [
    ["bulletedList", "- ", "- "], ["numberedList", "1. ", "2. "], ["quote", "> ", "> "],
  ] as const) {
    const wrapper = await add(page, type);
    const field = wrapper.locator("textarea");
    await field.fill(prefix + "First");
    await field.press("End");
    await field.press("Enter");
    await field.pressSequentially("Second");
    await expect(field).toHaveValue(prefix + "First\n" + nextPrefix + "Second");
    const count = await page.locator("[data-block-id]").count();
    await field.press("Alt+Enter");
    await expect(page.locator("[data-block-id]")).toHaveCount(count + 1);
    await expect(page.getByLabel("Paragraph", { exact: true }).last()).toBeFocused();
    await expect(field).toHaveValue(prefix + "First\n" + nextPrefix + "Second");
  }

  const link = await add(page, "link");
  await link.locator("input").fill("javascript:alert(1)");
  await expect(link.locator("a")).toHaveCount(0);
  await link.locator("input").fill("https://example.com");
  await expect(link.locator("a")).toHaveAttribute("href", "https://example.com/");

  for (const type of ["image", "video", "audio"] as const) {
    const wrapper = await add(page, type);
    const mime = { image: "image/png", video: "video/mp4", audio: "audio/mpeg" }[type];
    const content = type === "image"
      ? Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6QAAAAABJRU5ErkJggg==", "base64")
      : Buffer.from("sample media bytes");
    await wrapper.locator('input[type="file"]').setInputFiles({ name: "sample", mimeType: mime, buffer: content });
    await expect(wrapper.locator(type === "image" ? "img" : type)).toHaveAttribute("src", "data:" + mime + ";base64," + content.toString("base64"));
  }

  const code = await add(page, "code");
  await code.getByLabel("Language", { exact: true }).selectOption("python");
  await expect(code.getByText("Loading code editor…")).toHaveCount(0);
  await code.getByTestId("code-editor").click();
  await page.keyboard.type("print(1)");
  await expect(code.locator(".view-lines")).toContainText("print(1)");
  await page.keyboard.press("Control+]");
  await expect(code.getByLabel("Language", { exact: true })).toHaveValue("python");

  const math = await add(page, "math");
  const mathEditable = math.locator('[role="button"][aria-label*="math"]');
  if (await mathEditable.count()) {
    await mathEditable.click();
  }
  await math.getByLabel("LaTeX source").fill("x^2");
  await expect(math.locator(".katex")).toBeVisible();
  await math.getByLabel("LaTeX source").fill("{");
  await expect(math.locator(".katex-error")).toBeVisible();

  const drawing = await add(page, "drawing");
  const canvasContainer = drawing.locator(".drawing-canvas-container");
  await expect(canvasContainer).toBeVisible();
  const canvas = canvasContainer.locator("canvas");
  await expect(canvas).toBeAttached();

  const box = await canvasContainer.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.move(box.x + 150, box.y + 120);
    await page.mouse.up();
  }
  await expect(drawing.getByText("1 stroke")).toBeVisible();
  await drawing.hover();
  await drawing.getByRole("button", { name: /clear/i }).click();
  await expect(drawing.getByText("0 strokes")).toBeVisible();

  expect(errors).toEqual([]);
});

test("image and video resize handles and dimension settings", async ({ page }) => {
  await page.goto("/");
  const imageBlock = page.locator('[data-block-id="example-image"]');
  await expect(imageBlock).toBeVisible();

  const resizeHandle = imageBlock.locator('[aria-label="Resize media"]');
  await expect(resizeHandle).toBeAttached();

  // Test keyboard resize on the handle
  await resizeHandle.focus();
  await page.keyboard.press("ArrowRight");

  // Verify dimensions applied to media container
  const mediaContainer = imageBlock.locator(".group\\/media");
  await expect(mediaContainer).toHaveAttribute("style", /width:\s*\d+px/);
  await expect(mediaContainer).toHaveAttribute("style", /height:\s*\d+px/);

  // Open edit mode and check dimension inputs
  await imageBlock.locator('[aria-label="Edit media"]').click();
  const widthInput = imageBlock.locator('input[placeholder="auto"]').first();
  await expect(widthInput).not.toHaveValue("");

  // Reset to auto
  await imageBlock.getByText("Reset to auto").click();
  await imageBlock.locator('[aria-label="Done editing"]').click();
  await expect(mediaContainer).not.toHaveAttribute("style", /width:/);
});

test("AppConfiguration defaults code, math, and drawing to false", () => {
  const config = new AppConfiguration();
  expect(config.codeBlocksAllowed).toBe(false);
  expect(config.mathAllowed).toBe(false);
  expect(config.drawingBlocksAllowed).toBe(false);

  const custom = new AppConfiguration({
    codeBlocksAllowed: true,
    mathAllowed: true,
    drawingBlocksAllowed: true,
  });
  expect(custom.codeBlocksAllowed).toBe(true);
  expect(custom.mathAllowed).toBe(true);
  expect(custom.drawingBlocksAllowed).toBe(true);
});

test("dist exports public contracts and default module", async () => {
  const dist = await import("../dist/index.js");
  expect(dist.Block).toBeDefined();
  expect(dist.ParagraphBlock).toBeDefined();
  expect(dist.Heading1Block).toBeDefined();
  expect(dist.AppConfiguration).toBeDefined();
  expect(dist.default).toBeDefined();
});
