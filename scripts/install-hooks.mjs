import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// npm packages do not contain Git metadata; only configure a source checkout.
if (!process.env.CI && existsSync(new URL('../.git', import.meta.url))) {
  execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], {
    stdio: 'inherit',
  });
}
