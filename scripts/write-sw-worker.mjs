import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

mkdirSync(dist, { recursive: true });

const worker = `/* react-offline-first — minimal Background Sync handler (extend in your app) */
self.addEventListener('sync', function (event) {
  if (event.tag === 'offline-first-sync') {
    event.waitUntil(Promise.resolve());
  }
});
`;

writeFileSync(join(dist, 'offline-first-sync-worker.js'), worker, 'utf8');
