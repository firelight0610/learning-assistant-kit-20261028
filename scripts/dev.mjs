import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { NetlifyDB } from '@netlify/database-dev';
import { getDatabase } from '@netlify/database';
import { create_task_handler } from '../web/server/task-api.mjs';

await mkdir('.local/database', { recursive: true });
const local_database = new NetlifyDB({ directory: resolve('.local/database') });
const connection_string = await local_database.start();
await local_database.applyMigrations(resolve('netlify/database/migrations'));
const database = getDatabase({ connectionString: connection_string });
const handle_tasks = create_task_handler(() => database);
const static_root = resolve('web/public');
const content_types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/api/')) {
      const chunks = [];
      let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > 4096) { outgoing.writeHead(413); outgoing.end('Request too large'); return; }
        chunks.push(chunk);
      }
      const method = incoming.method;
      const request = new Request(url, { method, headers: incoming.headers, ...(!['GET', 'HEAD'].includes(method) ? { body: Buffer.concat(chunks) } : {}) });
      const response = await handle_tasks(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const file_path = resolve(static_root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
    if (!file_path.startsWith(`${static_root}${sep}`)) { outgoing.writeHead(403); outgoing.end(); return; }
    const body = await readFile(file_path);
    outgoing.writeHead(200, { 'content-type': content_types[extname(file_path)] || 'application/octet-stream', 'cache-control': 'no-store' });
    outgoing.end(body);
  } catch {
    outgoing.writeHead(404); outgoing.end('Not found');
  }
});
server.listen(8888, '127.0.0.1', () => console.log('Study Kit ready: http://127.0.0.1:8888 (local Postgres-compatible database; data in .local/database)'));
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close();
  if (database.pool) await database.pool.end();
  await local_database.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
