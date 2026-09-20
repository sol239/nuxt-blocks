#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import * as p from "@clack/prompts";

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
Usage: npx nuxt-blocks [init] [options]

Commands:
  init          Interactively configure nuxt-blocks and install optional dependencies

Options:
  --help, -h    Show help information
  --version, -v Show package version
`);
    process.exit(0);
  }

  if (process.argv.includes("--version") || process.argv.includes("-v")) {
    const pkg = JSON.parse(
      fs.readFileSync(
        path.join(path.dirname(new URL(import.meta.url).pathname), "../package.json"),
        "utf-8"
      )
    );
    console.log(`nuxt-blocks v${pkg.version}`);
    process.exit(0);
  }

  p.intro("🚀 nuxt-blocks initialization");

  const cwd = process.cwd();

  const selectedFeatures = await p.multiselect({
    message: "Select optional block capabilities to enable:",
    options: [
      {
        value: "code",
        label: "Monaco Code Editor",
        hint: "installs monaco-editor, @monaco-editor/loader",
      },
      {
        value: "math",
        label: "LaTeX Math Rendering",
        hint: "installs katex",
      },
      {
        value: "drawing",
        label: "Drawing Canvas",
        hint: "installs pixi.js",
      },
    ],
    required: false,
    initialValues: [],
  });

  if (p.isCancel(selectedFeatures)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const codeEnabled = selectedFeatures.includes("code");
  const mathEnabled = selectedFeatures.includes("math");
  const drawingEnabled = selectedFeatures.includes("drawing");

  // Determine package manager
  let pm = "npm";
  let installCmd = "install";
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) {
    pm = "pnpm";
    installCmd = "add";
  } else if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
    pm = "yarn";
    installCmd = "add";
  } else if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) {
    pm = "bun";
    installCmd = "add";
  }

  const packagesToInstall = [];
  if (codeEnabled) {
    packagesToInstall.push("monaco-editor", "@monaco-editor/loader");
  }
  if (mathEnabled) {
    packagesToInstall.push("katex");
  }
  if (drawingEnabled) {
    packagesToInstall.push("pixi.js");
  }

  if (packagesToInstall.length > 0) {
    const s = p.spinner();
    s.start(`Installing dependencies with ${pm}: ${packagesToInstall.join(", ")}`);
    try {
      execSync(`${pm} ${installCmd} ${packagesToInstall.join(" ")}`, {
        cwd,
        stdio: "ignore",
      });
      s.stop(`Installed ${packagesToInstall.join(", ")}`);
    } catch (err) {
      s.stop("Failed to install dependencies automatically.", 1);
      p.log.warn(`Please install manually: ${pm} ${installCmd} ${packagesToInstall.join(" ")}`);
    }
  }

  // Update nuxt.config.ts if present
  const nuxtConfigPaths = ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"];
  let configPath = null;
  for (const file of nuxtConfigPaths) {
    const fullPath = path.join(cwd, file);
    if (fs.existsSync(fullPath)) {
      configPath = fullPath;
      break;
    }
  }

  if (configPath) {
    let content = fs.readFileSync(configPath, "utf-8");
    const moduleConfigStr = `['nuxt-blocks', { code: ${codeEnabled}, math: ${mathEnabled}, drawing: ${drawingEnabled} }]`;

    if (content.includes("nuxt-blocks")) {
      p.log.info("nuxt.config already references nuxt-blocks. Please ensure your module options match:");
      p.log.message(moduleConfigStr);
    } else if (content.includes("modules:")) {
      content = content.replace(/modules:\s*\[/, `modules: [\n    ${moduleConfigStr},`);
      fs.writeFileSync(configPath, content, "utf-8");
      p.log.success(`Added nuxt-blocks with configuration to ${path.basename(configPath)}`);
    } else {
      p.note(
        `Add nuxt-blocks to your ${path.basename(configPath)}:\n\nexport default defineNuxtConfig({\n  modules: [\n    ${moduleConfigStr}\n  ]\n})`,
        "Configuration Instructions",
      );
    }
  }

  p.outro("nuxt-blocks setup complete! 🎉");
}

main().catch((err) => {
  console.error("Error during setup:", err);
  process.exit(1);
});
