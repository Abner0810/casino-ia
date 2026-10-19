import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const staged = process.argv.includes('--staged');
const args = staged
  ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
  : ['ls-files', '-z', '--cached', '--others', '--exclude-standard'];
const files = [...new Set(execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\0'))]
  .filter((file) => file.startsWith('backend/') && /\.(?:js|mjs)$/.test(file) && (staged || existsSync(path.join(root, file))));
for (const file of files) {
  // For commits inspect the staged content, including partial staging.
  const result = staged
    ? spawnSync(process.execPath, ['--input-type=module', '--check'], {
      input: execFileSync('git', ['show', `:${file}`], { cwd: root }), stdio: ['pipe', 'inherit', 'inherit'],
    })
    : spawnSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax checked: ${files.length} backend files${staged ? ' (staged)' : ''}.`);
