import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

console.log("Building nuxt-blocks...");

// 1. Compile TypeScript declarations and JavaScript outputs
execSync("npx tsc -p tsconfig.build.json", { stdio: "inherit" });

// 2. Generate root dist entry points for convenient resolution
const distDir = path.resolve("dist");

fs.writeFileSync(
  path.join(distDir, "index.js"),
  `export * from './src/index.js';\nexport { default } from './src/index.js';\n`,
  "utf-8"
);

fs.writeFileSync(
  path.join(distDir, "index.d.ts"),
  `export * from './src/index.js';\nexport { default } from './src/index.js';\n`,
  "utf-8"
);

fs.writeFileSync(
  path.join(distDir, "module.js"),
  `export * from './src/module.js';\nexport { default } from './src/module.js';\n`,
  "utf-8"
);

fs.writeFileSync(
  path.join(distDir, "module.d.ts"),
  `export * from './src/module.js';\nexport { default } from './src/module.js';\n`,
  "utf-8"
);

console.log("✅ nuxt-blocks build completed successfully.");

