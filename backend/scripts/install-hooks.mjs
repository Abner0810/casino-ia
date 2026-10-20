import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { cwd: root, stdio: 'inherit' });
console.log('Git hooks installed: staged files/secrets and backend syntax in pre-commit; message convention in commit-msg; frontend and backend release checks in pre-push.');
