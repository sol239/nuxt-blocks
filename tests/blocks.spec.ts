import { test, expect, type Page, type Locator } from '@playwright/test';
import { Block, type BlockType } from '../app/core/blocks/Block';
import { settingsClasses } from '../app/core/blocks/settings';
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
} from '../app/core/blocks/blockClasses';
import { CodeBlockSettings } from '../app/core/blocks/CodeBlockSettings';
import { ImageBlockSettings } from '../app/core/blocks/ImageBlockSettings';
import { VideoBlockSettings } from '../app/core/blocks/VideoBlockSettings';
import { normalizeMarkedText } from '../app/core/blocks/markedText';
import { mediaSource, safeUrl } from '../app/core/blocks/media';
import { AppConfiguration } from '../app/core/AppConfiguration';

test('settings survive edits and JSON restoration for every block type', () => {
  for (const type of Object.keys(settingsClasses) as BlockType[]) {
    const block = createBlock(type, 'stable-id', 7, 'content');
    block.blockSettings.alignment = 'right';
    const updated = block.withData('edited');
    const restored = Block.fromJSON(JSON.parse(JSON.stringify(updated)));
    expect(restored).toBeInstanceOf(blockClasses[type]);
    expect(restored.blockSettings).toBeInstanceOf(settingsClasses[type]);
    expect(restored.toJSON()).toEqual(updated.toJSON());
    expect(restored.blockSettings.alignment).toBe('right');
    expect(restored.id).toBe('stable-id');
    expect(restored.version).toBe(7);
    expect(block.data).toBe('content');
  }
  const settings = new CodeBlockSettings();
  settings.language = 'python';
  expect(
    new CodeBlock('code', 1, 'print(1)', settings).withData('print(2)')
      .blockSettings,
  ).toMatchObject({ language: 'python' });

  const imgSettings = new ImageBlockSettings();
  imgSettings.width = 400;
  imgSettings.height = 300;
  const restoredImg = Block.fromJSON(
    JSON.parse(
      JSON.stringify(
        new ImageBlock('img', 1, 'https://example.com/a.png', imgSettings),
      ),
    ),
  );
  expect(restoredImg.blockSettings).toMatchObject({ width: 400, height: 300 });

  const vidSettings = new VideoBlockSettings();
  vidSettings.width = 640;
  vidSettings.height = 360;
  const restoredVid = Block.fromJSON(
    JSON.parse(
      JSON.stringify(
        new VideoBlock('vid', 1, 'https://example.com/a.mp4', vidSettings),
      ),
    ),
  );
  expect(restoredVid.blockSettings).toMatchObject({ width: 640, height: 360 });
});

test('all 15 block subclasses implement toMarkdown and fromMarkdown correctly', () => {
  // 1. Paragraph
  const p = new ParagraphBlock('p1', 1, 'Hello world');
  expect(p.toMarkdown()).toBe('Hello world');
  const p2 = new ParagraphBlock().fromMarkdown('New text');
  expect(p2.data).toBe('New text');

  // 2. Heading1
  const h1 = new Heading1Block('h1', 1, 'Title');
  expect(h1.toMarkdown()).toBe('# Title');
  const h1Restored = new Heading1Block().fromMarkdown('# Deserialized Title');
  expect(h1Restored.data).toBe('Deserialized Title');

  // 3. Heading2
  const h2 = new Heading2Block('h2', 1, 'Section');
  expect(h2.toMarkdown()).toBe('## Section');
  const h2Restored = new Heading2Block().fromMarkdown(
    '## Deserialized Section',
  );
  expect(h2Restored.data).toBe('Deserialized Section');

  // 4. Heading3
  const h3 = new Heading3Block('h3', 1, 'Subsection');
  expect(h3.toMarkdown()).toBe('### Subsection');
  const h3Restored = new Heading3Block().fromMarkdown(
    '### Deserialized Subsection',
  );
  expect(h3Restored.data).toBe('Deserialized Subsection');

  // 5. Divider
  const div = new DividerBlock();
  expect(div.toMarkdown()).toBe('---');
  expect(new DividerBlock().fromMarkdown('anything').toMarkdown()).toBe('---');

  // 6. BulletedList
  const bl = new BulletedListBlock('bl', 1, '- First\n- Second');
  expect(bl.toMarkdown()).toBe('- First\n- Second');
  const blRestored = new BulletedListBlock().fromMarkdown('First\nSecond');
  expect(blRestored.toMarkdown()).toBe('- First\n- Second');

  // 7. NumberedList
  const nl = new NumberedListBlock('nl', 1, '1. First\n2. Second');
  expect(nl.toMarkdown()).toBe('1. First\n2. Second');
  const nlRestored = new NumberedListBlock().fromMarkdown('First\nSecond');
  expect(nlRestored.toMarkdown()).toBe('1. First\n2. Second');

  // 8. Quote
  const q = new QuoteBlock('q', 1, '> To be or not to be');
  expect(q.toMarkdown()).toBe('> To be or not to be');
  const qRestored = new QuoteBlock().fromMarkdown('Inspiration');
  expect(qRestored.toMarkdown()).toBe('> Inspiration');

  // 9. Link
  const link = new LinkBlock('l', 1, 'https://example.com');
  expect(link.toMarkdown()).toBe('[https://example.com](https://example.com)');
  const linkRestored = new LinkBlock().fromMarkdown(
    '[My Site](https://mysite.com)',
  );
  expect(linkRestored.data).toBe('https://mysite.com');

  // 10. Image (URL and fallback)
  const imgUrl = new ImageBlock('img1', 1, 'https://example.com/photo.jpg', {
    alt: 'Sample Photo',
    isUrl: true,
  });
  expect(imgUrl.toMarkdown()).toBe(
    '![Sample Photo](https://example.com/photo.jpg)',
  );
  const imgParsed = new ImageBlock().fromMarkdown(
    '![Alt Text](https://example.com/pic.png)',
  );
  expect(imgParsed.data).toBe('https://example.com/pic.png');
  expect(imgParsed.blockSettings.alt).toBe('Alt Text');
  expect(imgParsed.blockSettings.isUrl).toBe(true);

  const imgBase64 = new ImageBlock('img2', 1, 'raw_base64_data', {
    isUrl: false,
  });
  expect(imgBase64.toMarkdown()).toBe('#### [image] unsupported');

  // 11. Video (URL transformed to link and fallback)
  const vidUrl = new VideoBlock('vid1', 1, 'https://example.com/clip.mp4', {
    isUrl: true,
  });
  expect(vidUrl.toMarkdown()).toBe('[Video](https://example.com/clip.mp4)');
  const vidParsed = new VideoBlock().fromMarkdown(
    '[Video](https://example.com/movie.mp4)',
  );
  expect(vidParsed.data).toBe('https://example.com/movie.mp4');

  const vidBase64 = new VideoBlock('vid2', 1, 'raw_video_bytes', {
    isUrl: false,
  });
  expect(vidBase64.toMarkdown()).toBe('#### [video] unsupported');

  // 12. Audio (URL transformed to link and fallback)
  const audioUrl = new AudioBlock('aud1', 1, 'https://example.com/track.mp3', {
    isUrl: true,
  });
  expect(audioUrl.toMarkdown()).toBe('[Audio](https://example.com/track.mp3)');
  const audioParsed = new AudioBlock().fromMarkdown(
    '[Audio](https://example.com/song.mp3)',
  );
  expect(audioParsed.data).toBe('https://example.com/song.mp3');

  const audioBase64 = new AudioBlock('aud2', 1, 'raw_audio_bytes', {
    isUrl: false,
  });
  expect(audioBase64.toMarkdown()).toBe('#### [audio] unsupported');

  // 13. Code
  const code = new CodeBlock('code1', 1, "console.log('hi');", {
    language: 'javascript',
  });
  expect(code.toMarkdown()).toBe("```javascript\nconsole.log('hi');\n```");
  const codeParsed = new CodeBlock().fromMarkdown(
    "```python\nprint('hello')\n```",
  );
  expect(codeParsed.data).toBe("print('hello')");
  expect(codeParsed.blockSettings.language).toBe('python');

  // 14. Math
  const math = new MathBlock('m1', 1, 'E = mc^2');
  expect(math.toMarkdown()).toBe('$$\nE = mc^2\n$$');
  const mathParsed = new MathBlock().fromMarkdown('$$\na^2 + b^2 = c^2\n$$');
  expect(mathParsed.data).toBe('a^2 + b^2 = c^2');

  // 15. Drawing
  const drawingJson = JSON.stringify({
    strokes: [
      {
        tool: 'pen',
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
        width: 3,
        color: '#000000',
      },
    ],
  });
  const drawBlock = new DrawingBlock('d1', 1, drawingJson);
  expect(drawBlock.toMarkdown()).toBe(`\`\`\`drawing\n${drawingJson}\n\`\`\``);
  const drawRestored = new DrawingBlock().fromMarkdown(
    `\`\`\`drawing\n${drawingJson}\n\`\`\``,
  );
  expect(drawRestored.data).toBe(drawingJson);
});

test('marker formats and safe media sources', () => {
  expect(new AppConfiguration()).toMatchObject({
    codeBlocksAllowed: false,
    mathAllowed: false,
    drawingBlocksAllowed: false,
  });
  expect(normalizeMarkedText('One\n- Two', 'bulletedList')).toBe(
    '- One\n- Two',
  );
  expect(normalizeMarkedText('7. One\n99. Two\nThree', 'numberedList')).toBe(
    '1. One\n2. Two\n3. Three',
  );
  expect(normalizeMarkedText('One\n> Two', 'quote')).toBe('> One\n> Two');
  expect(safeUrl('javascript:alert(1)')).toBe('');
  expect(mediaSource('YWJj', false, 'image/png', 'image')).toBe(
    'data:image/png;base64,YWJj',
  );
  expect(mediaSource('YWJj', false, 'text/html', 'image')).toBe('');
});

test('two Backspaces delete supported empty text blocks', async ({ page }) => {
  await page.goto('/');
  const initialCount = await page.locator('[data-block-id]').count();

  for (const type of [
    'paragraph',
    'heading1',
    'heading2',
    'heading3',
    'bulletedList',
    'numberedList',
    'quote',
  ] as const) {
    const block = await add(page, type);
    const editor = block.locator('textarea');
    await editor.press('Backspace');
    await expect(block).toHaveCount(1);
    await editor.press('Backspace');
    await expect(block).toHaveCount(0);
    await expect(page.locator('[data-block-id]')).toHaveCount(initialCount);
  }

  const nonempty = await add(page, 'paragraph');
  const editor = nonempty.locator('textarea');
  await editor.fill('Keep');
  await editor.press('Backspace');
  await editor.press('Backspace');
  await expect(nonempty).toHaveCount(1);
});

const blockLabels: Record<BlockType, string> = {
  todo: 'To do',
  table: 'Table',
  codex: 'Codex',
  antigravity: 'Antigravity',
  ollama: 'Ollama',
  notebook: 'Notebook',
  web: 'Web',
  interactive: 'Interactive',
  markdown: 'Markdown',
  paragraph: 'Paragraph',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bulletedList: 'Bulleted list',
  numberedList: 'Numbered list',
  quote: 'Quote',
  divider: 'Divider',
  link: 'Link',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  code: 'Code',
  math: 'Math',
  drawing: 'Drawing',
};

async function add(page: Page, type: BlockType) {
  const target = page.locator('[data-block-id]').last();
  await target.hover();
  await target
    .getByRole('button', { name: 'Add block below', exact: true })
    .click();
  const newBlock = page.locator('[data-block-id]').last();
  if (type !== 'paragraph') {
    await newBlock.hover();
    await newBlock.locator('button[aria-label="Block actions"]').click();
    await newBlock.getByRole('menuitem', { name: 'Turn into' }).click();
    await newBlock
      .getByRole('menu', { name: 'Turn into options' })
      .getByRole('menuitem', { name: blockLabels[type] })
      .click();
  }
  const result = page.locator(
    `[data-block-id="${await newBlock.getAttribute('data-block-id')}"]`,
  );
  if (['bulletedList', 'numberedList', 'quote'].includes(type)) {
    await expect(result.locator('textarea')).toHaveAttribute(
      'aria-label',
      blockLabels[type],
    );
    await expect(async () => {
      await result.locator('p.cursor-text:visible, textarea:visible').click();
      await expect(result.locator('textarea')).toBeFocused({ timeout: 500 });
    }).toPass({ timeout: 5000 });
  }
  return result;
}

test('wrapper menu deletes the selected block and preserves editing after hydration', async ({
  page,
}) => {
  await page.goto('/');
  const block = page.locator('[data-block-id="origins-title"]');
  await expect(block).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(block).toHaveCSS('border-top-width', '0px');
  await expect(block.getByLabel('Heading 2 block type')).toHaveCSS(
    'opacity',
    '0',
  );
  await block.hover();
  await expect(block.getByLabel('Heading 2 block type')).toHaveCSS(
    'opacity',
    '1',
  );
  const trigger = block.getByRole('button', { name: 'Block actions' });
  await expect(trigger).toHaveCSS('opacity', '1');
  await trigger.click();
  await expect(
    block.getByRole('menuitem', { name: 'Delete block' }),
  ).toBeFocused();
  await block.getByRole('button', { name: 'Align center' }).click();
  await expect(
    block.getByRole('button', { name: 'Align center' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(block.locator('textarea')).toHaveCSS('text-align', 'center');
  await page.keyboard.press('Escape');
  await expect(block.getByRole('menu')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByLabel('Heading 1', { exact: true }).click();
  await expect(block.getByRole('menu')).toHaveCount(0);
  await block.hover();
  await trigger.click();
  await block.getByRole('menuitem', { name: 'Delete block' }).click();
  await expect(block).toHaveCount(0);
  await expect(page.locator('[data-block-id]')).toHaveCount(18);
  const remaining = page.locator('[data-block-id="origins"] textarea');
  await remaining.fill('Edited after deletion');
  await expect(remaining).toHaveValue('Edited after deletion');
  await add(page, 'paragraph');
  await expect(page.locator('[data-block-id]')).toHaveCount(19);
});

test('all block editors render inside wrappers and update interactively', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('[data-block-id]')).toHaveCount(19);

  const firstBlock = page.locator('[data-block-id]').first();
  await firstBlock.hover();
  await firstBlock.locator('button[aria-label="Block actions"]').click();
  await firstBlock.getByRole('menuitem', { name: 'Turn into' }).click();
  const turnIntoMenu = firstBlock.getByRole('menu', {
    name: 'Turn into options',
  });
  await expect(turnIntoMenu.getByRole('menuitem')).toHaveCount(20);
  await expect(
    turnIntoMenu.getByRole('menuitem', { name: 'Code' }),
  ).toHaveCount(1);
  await expect(
    turnIntoMenu.getByRole('menuitem', { name: 'Math' }),
  ).toHaveCount(1);
  await expect(
    turnIntoMenu.getByRole('menuitem', { name: 'Drawing' }),
  ).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  await expect(
    page.getByRole('toolbar', { name: 'Text formatting' }),
  ).toBeVisible();
  expect(
    await page.locator('main').evaluate((main) => {
      const editor = main.querySelector('[data-block-id]');
      const toolbar = main.querySelector('[role="toolbar"]');
      return Boolean(
        editor &&
        toolbar &&
        editor.compareDocumentPosition(toolbar) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);

  for (const type of [
    'paragraph',
    'heading1',
    'heading2',
    'heading3',
  ] as const) {
    const wrapper = await add(page, type);
    await wrapper.locator('textarea').fill(type + ' updated');
    await expect(wrapper.locator('textarea')).toHaveValue(type + ' updated');
  }
  await expect((await add(page, 'divider')).locator('hr')).toHaveCount(1);

  for (const [type, prefix, nextPrefix] of [
    ['bulletedList', '- ', '- '],
    ['numberedList', '1. ', '2. '],
    ['quote', '> ', '> '],
  ] as const) {
    await page.goto('/');
    const wrapper = page
      .getByLabel(blockLabels[type].replace('list', 'List') + ' block', {
        exact: true,
      })
      .first();
    await wrapper.locator('ul, ol, blockquote').click();
    const field = wrapper.locator('textarea');
    await field.fill(prefix + 'First');
    await field.press('End');
    await field.press('Alt+Enter');
    await field.pressSequentially('Second');
    await expect(field).toHaveValue(prefix + 'First\n' + nextPrefix + 'Second');
    const count = await page.locator('[data-block-id]').count();
    await field.press('Enter');
    await expect(page.locator('[data-block-id]')).toHaveCount(count + 1);
    await expect(
      page.getByLabel('Paragraph', { exact: true }).last(),
    ).toBeFocused();
    await expect(field).toHaveValue(prefix + 'First\n' + nextPrefix + 'Second');
  }

  const link = await add(page, 'link');
  await link.locator('input').fill('javascript:alert(1)');
  await expect(link.locator('a')).toHaveCount(0);
  await link.locator('input').fill('https://example.com');
  await expect(
    link.getByRole('link', { name: 'Open link in new tab', exact: true }),
  ).toHaveAttribute('href', 'https://example.com/');

  for (const type of ['image', 'video', 'audio'] as const) {
    const wrapper = await add(page, type);
    const mime = {
      image: 'image/png',
      video: 'video/mp4',
      audio: 'audio/mpeg',
    }[type];
    const content =
      type === 'image'
        ? Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6QAAAAABJRU5ErkJggg==',
            'base64',
          )
        : Buffer.from('sample media bytes');
    await wrapper
      .locator('input[type="file"]')
      .setInputFiles({ name: 'sample', mimeType: mime, buffer: content });
    await expect(
      wrapper.locator(type === 'image' ? 'img' : type),
    ).toHaveAttribute(
      'src',
      'data:' + mime + ';base64,' + content.toString('base64'),
    );
  }

  const code = await add(page, 'code');
  await code.getByRole('button', { name: 'Language', exact: true }).click();
  await code.getByRole('option', { name: 'python', exact: true }).click();
  await expect(code.getByText('Loading code editor…')).toHaveCount(0);
  await code.getByTestId('code-editor').click();
  await page.keyboard.type('print(1)');
  await expect(code.locator('.view-lines')).toContainText('print(1)');
  await page.keyboard.press('Control+]');
  await expect(code.getByLabel('Language', { exact: true })).toHaveText(
    'python',
  );

  const math = await add(page, 'math');
  const mathEditable = math.locator('[role="button"][aria-label*="math"]');
  if (await mathEditable.count()) {
    await mathEditable.click();
  }
  await math.getByLabel('LaTeX source').fill('x^2');
  await expect(math.locator('.katex')).toBeVisible();
  await math.getByLabel('LaTeX source').fill('{');
  await expect(math.locator('.katex-error')).toBeVisible();

  const drawing = await add(page, 'drawing');
  const canvasContainer = drawing.locator('.drawing-canvas-container');
  await expect(canvasContainer).toBeVisible();
  const canvas = canvasContainer.locator('canvas');
  await expect(canvas).toBeAttached();

  await canvasContainer.scrollIntoViewIfNeeded();
  const box = await canvasContainer.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.move(box.x + 150, box.y + 120);
    await page.mouse.up();
  }
  await expect(drawing.getByText('1 stroke')).toBeVisible();
  await drawing.hover();
  await drawing.getByRole('button', { name: /clear/i }).click();
  await expect(drawing.getByText('0 strokes')).toBeVisible();

  expect(errors).toEqual([]);
});

test('image and video resize handles and dimension settings', async ({
  page,
}) => {
  await page.goto('/');
  const imageBlock = page.locator('[data-block-id="example-image"]');
  await expect(imageBlock).toBeVisible();

  const resizeHandle = imageBlock.locator('[aria-label="Resize media"]');
  await expect(resizeHandle).toBeAttached();

  // Test keyboard resize on the handle
  await resizeHandle.focus();
  await page.keyboard.press('ArrowRight');

  // Verify dimensions applied to media container
  const mediaContainer = imageBlock.locator('.group\\/media');
  await expect(mediaContainer).toHaveAttribute('style', /width:\s*\d+px/);
  await expect(mediaContainer).toHaveAttribute('style', /height:\s*\d+px/);

  // Open edit mode and check dimension inputs
  await imageBlock.locator('[aria-label="Edit media"]').click();
  const widthInput = imageBlock.locator('input[placeholder="auto"]').first();
  await expect(widthInput).not.toHaveValue('');

  // Reset to auto
  await imageBlock.getByText('Reset to auto').click();
  await imageBlock.locator('[aria-label="Done editing"]').click();
  await expect(mediaContainer).not.toHaveAttribute('style', /width:/);
});

test('AppConfiguration defaults code, math, and drawing to false', () => {
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

test('dist exports public contracts and default module', async () => {
  const dist = await import('../dist/index.js');
  expect(dist.InteractiveBlock).toBeDefined();
  expect(dist.defaultInteractiveData).toBeDefined();
  expect(dist.Block).toBeDefined();
  expect(dist.ParagraphBlock).toBeDefined();
  expect(dist.Heading1Block).toBeDefined();
  expect(dist.AppConfiguration).toBeDefined();
  expect(dist.default).toBeDefined();
});

test('typing / in paragraph block opens turn into dropdown and handles selection and cancellation', async ({
  page,
}) => {
  await page.goto('/');
  const newPara = await add(page, 'paragraph');
  const textarea = newPara.locator('textarea');
  await textarea.click();

  // Type / to open turn into dropdown
  await page.keyboard.type('/');
  const dropdown = newPara.locator('[data-testid="turn-into-dropdown"]');
  await expect(dropdown).toBeVisible();

  // Type while dropdown is open: should filter options and NOT write into paragraph block
  await page.keyboard.type('head');
  await expect(textarea).toHaveValue('/');
  await expect(
    dropdown.locator('button[data-block-type="heading1"]'),
  ).toBeVisible();
  await expect(dropdown.locator('button[data-block-type="quote"]')).toHaveCount(
    0,
  );

  // Press Escape to close dropdown: block remains paragraph and keeps / (not 'head')
  await page.keyboard.press('Escape');
  await expect(dropdown).toHaveCount(0);
  await expect(textarea).toHaveValue('/');
  await expect(newPara.getByLabel('Paragraph block type')).toBeAttached();

  // Clear text
  await textarea.fill('');

  // Type / again to reopen dropdown
  await page.keyboard.type('/');
  await expect(dropdown).toBeVisible();

  // Type '1' to filter to Heading 1 without writing into the textarea
  await page.keyboard.type('1');
  await expect(textarea).toHaveValue('/');
  const h1Button = dropdown.locator('button[data-block-type="heading1"]');
  await expect(h1Button).toBeVisible();

  // Press Enter to turn into Heading 1
  await page.keyboard.press('Enter');

  // Verify converted to Heading 1 and / was stripped (not kept)
  await expect(dropdown).toHaveCount(0);
  const h1Block = page.locator('[data-block-id]').last();
  await expect(h1Block.getByLabel('Heading 1 block type')).toBeAttached();
  const h1Textarea = h1Block.locator('textarea');
  await expect(h1Textarea).toHaveValue('');
  await expect(h1Textarea).toBeFocused();
});

test('Markdown import creates ordered blocks and preserves unsupported structures', async () => {
  const { importMarkdown } = await import('../app/core/blocks/markdownImport');
  const blocks = importMarkdown(
    '# Title\n\nHello **world**.\n\n- First\n- Second\n\n1. One\n2. Two\n\n> Quote\n\n---\n\n```python\nprint(1)\n```\n',
  );
  expect(blocks.map((block) => block.blockType)).toEqual([
    'heading1',
    'paragraph',
    'bulletedList',
    'numberedList',
    'quote',
    'divider',
    'code',
  ]);
  expect(blocks[1]?.data).toBe('Hello world.');
  expect(blocks[1]?.blockSettings.styles).toContainEqual({
    start: 6,
    end: 11,
    style: 'bold',
  });
  expect(blocks[6]?.data).toBe('print(1)');
  expect(blocks[6]?.blockSettings).toMatchObject({ language: 'python' });
  expect(new Set(blocks.map((block) => block.id)).size).toBe(blocks.length);
  expect(
    importMarkdown('| A | B |\n|---|---|\n| X | Y |\n')[0]?.blockType,
  ).toBe('table');
  expect(importMarkdown('- Parent\n  - Child')[0]?.blockType).toBe('markdown');
  expect(importMarkdown('```js\nconst a = 1\n```', false)[0]?.blockType).toBe(
    'markdown',
  );
  expect(importMarkdown('\n  ')).toEqual([]);
});

test('clipboard exports preserve block order and separate Markdown from plain text', async () => {
  const { blocksToMarkdown, blocksToText } =
    await import('../app/core/blocks/blockClipboard');
  const blocks = [
    createBlock('heading1', 'copy-heading', 1, 'Title'),
    createBlock('paragraph', 'copy-body', 1, 'Hello world', {
      styles: [{ start: 6, end: 11, style: 'bold' }],
    }),
    createBlock('bulletedList', 'copy-list', 1, '- First\n- Second'),
    createBlock('quote', 'copy-quote', 1, '> Quote'),
  ];
  expect(blocksToMarkdown(blocks)).toBe(
    '# Title\n\nHello **world**\n\n- First\n- Second\n\n> Quote',
  );
  expect(blocksToText(blocks)).toBe(
    'Title\n\nHello world\n\nFirst\nSecond\n\nQuote',
  );
  expect(blocks[1]?.data).toBe('Hello world');
});

test('drag selection opens block actions and copied blocks paste with new IDs', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copiedBlocks: string }).copiedBlocks = text;
        },
      },
    }),
  );
  await page.goto('/');
  const wrappers = page.locator('[data-block-id]');
  await wrappers.first().waitFor();
  const before = await wrappers.count();
  const ids = await wrappers.evaluateAll((elements) =>
    elements
      .slice(0, 2)
      .map((element) => element.getAttribute('data-block-id')),
  );
  const first = (await wrappers.nth(0).boundingBox())!;
  const second = (await wrappers.nth(1).boundingBox())!;
  await page.mouse.move(first.x + 2, first.y + 2);
  await page.mouse.down();
  await page.mouse.move(
    second.x + second.width - 2,
    second.y + second.height - 2,
    { steps: 10 },
  );
  await page.mouse.up();
  const toolbar = page.getByRole('toolbar', { name: 'Selected block actions' });
  await expect(toolbar).toBeVisible();
  await expect(
    page.getByRole('toolbar', { name: 'Text formatting' }),
  ).toHaveCount(0);
  await toolbar
    .getByRole('button', { name: 'Copy blocks', exact: true })
    .click();
  const copied = JSON.parse(
    await page.evaluate(
      () => (window as unknown as { copiedBlocks: string }).copiedBlocks,
    ),
  );
  expect(copied.blocks.map((block: { id: string }) => block.id)).toEqual(ids);
  await page.keyboard.press('Control+v');
  await expect(wrappers).toHaveCount(before + 2);
  const pastedIds = await wrappers.evaluateAll((elements) =>
    elements
      .slice(2, 4)
      .map((element) => element.getAttribute('data-block-id')),
  );
  expect(pastedIds.every((id) => !ids.includes(id))).toBe(true);
  await page.keyboard.press('Delete');
  await expect(wrappers).toHaveCount(before);
  await expect(toolbar).toHaveCount(0);
});

test('interactive data validates, restores, and round-trips through Markdown', async () => {
  const { parseInteractiveData, interactiveTotal } =
    await import('../app/core/blocks/interactiveData');
  const { importMarkdown } = await import('../app/core/blocks/markdownImport');
  const block = createBlock('interactive', 'scenario', 4);
  expect(interactiveTotal(parseInteractiveData(block.data))).toBe(428);
  const next = parseInteractiveData(block.data);
  next.inputs[0]!.value = 5;
  const updated = block.withData(JSON.stringify(next));
  expect(interactiveTotal(parseInteractiveData(updated.data))).toBe(608);
  expect(interactiveTotal(parseInteractiveData(block.data))).toBe(428);
  const restored = Block.fromJSON(JSON.parse(JSON.stringify(updated)));
  expect(restored.blockType).toBe('interactive');
  expect(restored.id).toBe('scenario');
  expect(restored.version).toBe(4);
  expect(restored.blockSettings).toBeInstanceOf(settingsClasses.interactive);
  expect(importMarkdown(updated.toMarkdown(), false)[0]!.data).toBe(
    updated.data,
  );
  expect(block.fromMarkdown(updated.toMarkdown()).data).toBe(updated.data);
  expect(interactiveTotal(parseInteractiveData(block.data))).toBe(428);
  next.inputs[0]!.max = 0;
  expect(() => parseInteractiveData(JSON.stringify(next))).toThrow();
  expect(() => parseInteractiveData('{broken')).toThrow();
  expect(importMarkdown('```interactive\n{broken\n```')[0]!.blockType).toBe(
    'markdown',
  );
});

test('interactive sliders update results and configuration errors preserve the scenario', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const block = page.locator('[data-block-id="example-interactive"]');
  await expect(block.locator('output')).toHaveText('428 EUR');
  const slider = block.getByRole('slider', { name: 'Accommodation' });
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(block.locator('output')).toHaveText('518 EUR');
  await block.getByText('Configure block', { exact: true }).click();
  const source = block.getByRole('textbox', {
    name: 'Interactive configuration',
  });
  const valid = await source.inputValue();
  await source.fill('{broken');
  await block.getByRole('button', { name: 'Apply configuration' }).click();
  await expect(block.getByRole('alert')).toBeVisible();
  await expect(block.locator('output')).toHaveText('518 EUR');
  const custom = JSON.parse(valid);
  custom.title = 'Event budget';
  custom.inputs[0].rate = 100;
  await source.fill(JSON.stringify(custom));
  await block.getByRole('button', { name: 'Apply configuration' }).click();
  await expect(
    block.getByRole('heading', { name: 'Event budget' }),
  ).toBeVisible();
  await expect(block.locator('output')).toHaveText('558 EUR');
  await expect(block.getByRole('alert')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await block
      .locator('.interactive-block')
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('interactive block is available through both insertion menus', async ({
  page,
}) => {
  await page.goto('/');
  const converted = await add(page, 'interactive');
  await expect(converted.locator('output')).toHaveText('428 EUR');
  const paragraph = await add(page, 'paragraph');
  const id = await paragraph.getAttribute('data-block-id');
  await paragraph.locator('textarea').fill('/');
  await paragraph.locator('button[data-block-type="interactive"]').click();
  await expect(paragraph.locator('output')).toHaveText('428 EUR');
  await expect(paragraph).toHaveAttribute('data-block-id', id!);
});

test('interactive activities validate state, round-trip, and split money exactly', async () => {
  const {
    defaultInteractiveExperience,
    parseInteractiveExperience,
    splitBill,
  } = await import('../app/core/blocks/interactiveExperience');
  const { importMarkdown } = await import('../app/core/blocks/markdownImport');
  for (const kind of [
    'bill-splitter',
    'comparison',
    'checklist',
    'quiz',
  ] as const) {
    const data = defaultInteractiveExperience(kind);
    expect(parseInteractiveExperience(JSON.stringify(data))).toEqual(data);
    const block = createBlock(
      'interactive',
      'activity',
      3,
      JSON.stringify(data),
    );
    expect(importMarkdown(block.toMarkdown(), false)[0]!.data).toBe(block.data);
    expect(Block.fromJSON(JSON.parse(JSON.stringify(block))).data).toBe(
      block.data,
    );
  }
  const bill = {
    kind: 'bill-splitter' as const,
    title: '',
    description: '',
    amount: 10,
    people: 3,
    tip: 0,
    unit: 'EUR',
  };
  const result = splitBill(bill);
  expect(result.extra).toBe(1);
  expect(result.share).toBe(3.33);
  expect(result.largerShare).toBe(3.34);
  expect(
    Math.round(
      (result.extra * result.largerShare +
        (bill.people - result.extra) * result.share) *
        100,
    ),
  ).toBe(1000);
  expect(() =>
    parseInteractiveExperience(JSON.stringify({ ...bill, people: 0 })),
  ).toThrow();
  expect(() =>
    parseInteractiveExperience(JSON.stringify({ ...bill, people: 1.5 })),
  ).toThrow();
  expect(() =>
    parseInteractiveExperience(
      JSON.stringify({
        ...defaultInteractiveExperience('quiz'),
        questions: [],
      }),
    ),
  ).toThrow();
  expect(() =>
    parseInteractiveExperience(
      JSON.stringify({
        ...defaultInteractiveExperience('comparison'),
        selectedId: 'missing',
      }),
    ),
  ).toThrow();
  expect(() =>
    parseInteractiveExperience(
      JSON.stringify({
        ...defaultInteractiveExperience('checklist'),
        items: [{ id: 'x', label: 'x', detail: '', done: 'yes' }],
      }),
    ),
  ).toThrow();
});

test('interactive activities support forms, filtering, tasks, quiz feedback, and keyboard use', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const block = page.locator('[data-block-id="example-interactive"]');
  const kind = block.getByLabel('Interaction type');
  await kind.selectOption('bill-splitter');
  await expect(block.locator('output')).toHaveText('132.00 EUR');
  await block.getByLabel('People', { exact: true }).fill('3');
  await block.getByLabel('People', { exact: true }).press('Tab');
  await expect(block).toContainText('3 people pay 44.00 EUR each.');
  await block.getByRole('button', { name: '20% tip', exact: true }).click();
  await expect(block.locator('output')).toHaveText('144.00 EUR');
  await block.getByLabel('People', { exact: true }).fill('0');
  await block.getByLabel('People', { exact: true }).press('Tab');
  await expect(block.getByRole('alert')).toBeVisible();
  await expect(block.locator('output')).toHaveText('144.00 EUR');
  await kind.selectOption('comparison');
  await expect(block.getByRole('radio')).toHaveCount(3);
  await block.getByRole('radio', { name: /Old Town studio/ }).check();
  await expect(
    block.getByText('Your choice: Old Town studio', { exact: true }),
  ).toBeVisible();
  const budget = block.getByLabel(/Maximum price/);
  await budget.fill('70');
  await budget.press('Tab');
  await expect(block.getByRole('radio')).toHaveCount(1);
  await expect(block).toContainText('Select an option to record your choice.');
  await budget.fill('0');
  await budget.press('Tab');
  await expect(block.getByRole('status')).toContainText('No options fit');
  await kind.selectOption('checklist');
  await block.getByRole('checkbox', { name: /Test the prototype/ }).check();
  await expect(block.getByRole('progressbar')).toHaveAttribute('value', '2');
  await block.getByLabel('New task').fill('Publish demo');
  await block.getByLabel('New task').press('Enter');
  await expect(block.getByRole('checkbox')).toHaveCount(4);
  await block
    .getByRole('button', { name: 'Remove Publish demo', exact: true })
    .click();
  await expect(block.getByRole('checkbox')).toHaveCount(3);
  await kind.selectOption('quiz');
  await expect(
    block.getByRole('button', { name: 'Check answers' }),
  ).toBeDisabled();
  await block
    .getByRole('radio', { name: 'An immediate result', exact: true })
    .check();
  await block
    .getByRole('radio', { name: 'Cards with the same fields', exact: true })
    .check();
  await block.getByRole('button', { name: 'Check answers' }).click();
  await expect(block.locator('output')).toHaveText('2 / 2 correct');
  await expect(block).toContainText('Immediate feedback connects');
  await block.getByRole('button', { name: 'Try again' }).click();
  await expect(block.locator('output')).toHaveCount(0);
  await expect(block.getByRole('radio', { checked: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const value of ['bill-splitter', 'comparison', 'checklist', 'quiz']) {
    await kind.selectOption(value);
    expect(
      await block
        .locator('.interactive-block')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('web blocks preserve HTML, settings, and fences across restoration and Markdown', async () => {
  const { importMarkdown } = await import('../app/core/blocks/markdownImport');
  const { buildWebPreview } = await import('../app/core/blocks/webPreview');
  const html =
    '<style>body{color:red}</style><script>const code = "```";</script><h1>Demo</h1>';
  const block = createBlock('web', 'web-test', 7, html, {
    alignment: 'center',
    height: 600,
  });
  const restored = Block.fromJSON(JSON.parse(JSON.stringify(block)));
  expect(restored).toBeInstanceOf(blockClasses.web);
  expect(restored.blockSettings).toBeInstanceOf(settingsClasses.web);
  expect(restored.blockSettings.height).toBe(600);
  expect(restored.id).toBe('web-test');
  expect(restored.version).toBe(7);
  expect(importMarkdown(block.toMarkdown(), false)[0]!.data).toBe(html);
  expect(importMarkdown(block.toMarkdown(), false)[0]!.blockType).toBe('web');
  expect(createBlock('web').fromMarkdown(block.toMarkdown()).data).toBe(html);
  expect(block.withData('New HTML').blockSettings.height).toBe(600);
  expect(block.data).toBe(html);
  expect(buildWebPreview(html)).toContain(html);
});

async function webAction(block: Locator, name: string) {
  await block
    .getByRole('button', { name: 'Block actions', exact: true })
    .click();
  await block.getByRole('menuitem', { name, exact: true }).click();
}

test('web block runs HTML CSS and JavaScript in an isolated restartable preview', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const block = await add(page, 'web');
  const source = block.getByRole('textbox', {
    name: 'HTML source',
    exact: true,
  });
  await expect(source).toBeHidden();
  await expect(block.locator('.web-block header')).toHaveCount(0);
  await webAction(block, 'Edit HTML');
  const html = `<style>#counter { color: rgb(11, 22, 33); }</style>
<button id="counter">0</button><p id="isolation"></p>
<script>document.querySelector('#counter').onclick = event => event.target.textContent++;
try { parent.document.body.dataset.webEscaped = 'yes'; } catch { document.querySelector('#isolation').textContent = 'Host isolated'; }</script>`;
  await page.evaluate((value) => navigator.clipboard.writeText(value), html);
  await source.focus();
  await source.press('Control+a');
  await source.press('Control+v');
  await expect(source).toHaveValue(html);
  await webAction(block, 'Run HTML');
  const frame = block.frameLocator('iframe');
  await expect(frame.locator('#counter')).toHaveCSS('color', 'rgb(11, 22, 33)');
  await frame.getByRole('button', { name: '0', exact: true }).click();
  await expect(frame.locator('#counter')).toHaveText('1');
  await expect(frame.locator('#isolation')).toHaveText('Host isolated');
  expect(
    await page.locator('body').getAttribute('data-web-escaped'),
  ).toBeNull();
  await expect(block.locator('iframe')).toHaveAttribute(
    'sandbox',
    'allow-scripts',
  );
  await expect(source).toBeHidden();
  await webAction(block, 'Edit HTML');
  await source.fill('<h1>Updated</h1>');
  await expect(
    frame.getByRole('heading', { name: 'Updated', exact: true }),
  ).toBeVisible();
  await expect(source).toBeVisible();
  await block
    .getByRole('button', { name: 'Block actions', exact: true })
    .click();
  await block.getByLabel('Preview height', { exact: true }).fill('550');
  await block.getByLabel('Preview height', { exact: true }).press('Tab');
  await expect(block.locator('iframe')).toHaveCSS('height', '550px');
  await block
    .getByRole('button', { name: 'Block actions', exact: true })
    .click();
  await webAction(block, 'Stop');
  await expect(block.locator('iframe')).toHaveCount(0);
  await webAction(block, 'Run HTML');
  await expect(
    frame.getByRole('heading', { name: 'Updated', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await block
      .locator('.web-block')
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});

test('web block imports files, rejects invalid files, and is available in slash menu', async ({
  page,
}) => {
  await page.goto('/');
  const paragraph = await add(page, 'paragraph');
  await paragraph.locator('textarea').fill('/');
  await paragraph.locator('button[data-block-type="web"]').click();
  // Import runs the preview and hides the source editor; its value must persist.
  const source = paragraph.locator('textarea[aria-label="HTML source"]');
  const file = paragraph.getByLabel('Import HTML file', { exact: true });
  const html =
    '<h1>Imported file</h1><script>document.querySelector("h1").textContent += " runs"</script>';
  await paragraph
    .getByRole('button', { name: 'Block actions', exact: true })
    .click();
  await file.setInputFiles({
    name: 'demo.HTML',
    mimeType: 'text/html',
    buffer: Buffer.from(html),
  });
  await expect(source).toHaveValue(html);
  await expect(
    paragraph
      .frameLocator('iframe')
      .getByRole('heading', { name: 'Imported file runs', exact: true }),
  ).toBeVisible();
  await paragraph
    .getByRole('button', { name: 'Block actions', exact: true })
    .click();
  await file.setInputFiles({
    name: 'invalid.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('wrong type'),
  });
  await expect(paragraph.getByRole('alert')).toContainText('.html or .htm');
  await expect(source).toHaveValue(html);
  await paragraph
    .getByRole('button', { name: 'Block actions', exact: true })
    .click();
  await file.setInputFiles({
    name: 'large.html',
    mimeType: 'text/html',
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  });
  await expect(paragraph.getByRole('alert')).toContainText('2 MB');
  await expect(source).toHaveValue(html);
  await paragraph
    .getByRole('button', { name: 'Block actions', exact: true })
    .click();
  await file.setInputFiles({
    name: 'demo.HTML',
    mimeType: 'text/html',
    buffer: Buffer.from(html),
  });
  await expect(paragraph.getByRole('alert')).toHaveCount(0);
  await expect(
    paragraph
      .frameLocator('iframe')
      .getByRole('heading', { name: 'Imported file runs', exact: true }),
  ).toBeVisible();
});
