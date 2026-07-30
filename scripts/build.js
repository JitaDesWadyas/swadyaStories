import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const copyTargets = ['index.html', 'output.html', 'src'];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const target of copyTargets) {
  const source = path.join(root, target);
  const destination = path.join(dist, target);
  fs.cpSync(source, destination, { recursive: true });
}

console.log('Build completata in dist/');
console.log('Avvia con: npm run preview');
