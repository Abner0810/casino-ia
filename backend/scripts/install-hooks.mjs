import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { cwd: root, stdio: 'inherit' });
console.log('Git hooks installed: backend syntax before commit; syntax and unit tests before push.');
