import { execFileSync } from 'node:child_process';

const stagedFiles = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
  encoding: 'utf8',
}).split(/\r?\n/).filter(Boolean);

const forbidden = stagedFiles.filter((file) => {
  const name = file.split(/[\\/]/).pop();
  return name === '.env' || (name?.startsWith('.env.') && name !== '.env.example');
});

if (forbidden.length > 0) {
  console.error(`Refusing staged environment files: ${forbidden.join(', ')}`);
  process.exit(1);
}