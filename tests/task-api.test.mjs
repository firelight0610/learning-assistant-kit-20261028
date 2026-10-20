import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { NetlifyDB } from '@netlify/database-dev';
import { getDatabase } from '@netlify/database';
import { create_task_handler } from '../web/server/task-api.mjs';

let local_database;
let database;
let handle;
const migration_directory = resolve('netlify/database/migrations');
function request(path = '', method = 'GET', body, content_type = 'application/json') {
  return new Request(`http://localhost/api/tasks${path}`, { method, ...(body !== undefined ? { headers: { 'content-type': content_type }, body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
}
before(async () => {
  local_database = new NetlifyDB({ logger: () => {} });
  const connection_string = await local_database.start();
  await local_database.applyMigrations(migration_directory);
  database = getDatabase({ connectionString: connection_string });
  handle = create_task_handler(() => database);
});
after(async () => {
  if (database) await database.pool.end();
  if (local_database) await local_database.stop();
});

test('real SQL: list, create, mark, unmark, delete, and missing task', async () => {
  const list = await (await handle(request())).json();
  assert.equal(list.tasks.length, 8);
  assert.equal(list.tasks[0].due_date, '2026-10-20');
  const created = await handle(request('', 'POST', { title: '  中文任务 <script>  ', due_date: '2026-10-28' }));
  assert.equal(created.status, 201);
  const { task } = await created.json();
  assert.equal(task.title, '中文任务 <script>');
  assert.equal(task.completed, false);
  for (const completed of [true, false]) {
    const response = await handle(request(`/${task.id}`, 'PATCH', { completed }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).task.completed, completed);
  }
  assert.equal((await handle(request(`/${task.id}`, 'DELETE'))).status, 200);
  assert.equal((await handle(request(`/${task.id}`, 'DELETE'))).status, 404);
  assert.equal((await handle(request(`/${task.id}`, 'PATCH', { completed: true }))).status, 404);
});

test('SQL parameters preserve apostrophes and reject neither quotes nor Chinese', async () => {
  const title = "学习 SQL：'); DROP TABLE tasks; --";
  const result = await handle(request('', 'POST', { title }));
  assert.equal(result.status, 201);
  const { task } = await result.json();
  assert.equal(task.title, title);
  const tasks = (await (await handle(request())).json()).tasks;
  assert.ok(tasks.some((row) => row.id === task.id));
  await handle(request(`/${task.id}`, 'DELETE'));
});

test('invalid names, dates, IDs, JSON, oversized input and HTTP methods', async () => {
  for (const body of [{ title: '' }, { title: '   ' }, { title: 'a'.repeat(121) }, { title: 3 }, { title: 'test', due_date: '2026-02-30' }, { title: 'test', due_date: '2026-2-3' }, { title: 'test', due_date: 12 }, null, []]) {
    assert.equal((await handle(request('', 'POST', body))).status, 400);
  }
  assert.equal((await handle(request('', 'POST', '{invalid'))).status, 400);
  assert.equal((await handle(request('', 'POST', { title: 'test' }, 'text/plain'))).status, 415);
  assert.equal((await handle(request('', 'POST', { title: 'a'.repeat(5000) }))).status, 413);
  assert.equal((await handle(request('/1', 'PATCH', { completed: 'yes' }))).status, 400);
  assert.equal((await handle(request('/9999999999999999999', 'DELETE'))).status, 400);
  assert.equal((await handle(request('/abc', 'DELETE'))).status, 404);
  const unsupported = await handle(request('', 'PUT', {}));
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.get('allow'), 'GET, POST');
});

test('optional deadline remains null', async () => {
  const response = await handle(request('', 'POST', { title: '无截止日期' }));
  const { task } = await response.json();
  assert.equal(task.due_date, null);
  await handle(request(`/${task.id}`, 'DELETE'));
});

test('database failure is reported without exposing connection credentials', async () => {
  const broken = create_task_handler(() => { throw new Error('postgres://user:SECRET@private-host/db'); });
  const result = await broken(request());
  assert.equal(result.status, 503);
  assert.doesNotMatch(await result.text(), /SECRET|postgres:|private-host/);
});

test('data survives database restart and migration replay does not duplicate seeds', async () => {
  const local_root = resolve('.local');
  await mkdir(local_root, { recursive: true });
  const directory = await mkdtemp(resolve(local_root, 'persistence-test-'));
  let instance;
  let client;
  try {
    instance = new NetlifyDB({ directory, logger: () => {} });
    client = getDatabase({ connectionString: await instance.start() });
    await instance.applyMigrations(migration_directory);
    const handler = create_task_handler(() => client);
    await handler(request('', 'POST', { title: '重启后应该保留', due_date: '2026-10-28' }));
    await client.pool.end(); client = undefined;
    await instance.stop(); instance = undefined;
    instance = new NetlifyDB({ directory, logger: () => {} });
    client = getDatabase({ connectionString: await instance.start() });
    assert.deepEqual(await instance.applyMigrations(migration_directory), []);
    const payload = await (await create_task_handler(() => client)(request())).json();
    assert.equal(payload.tasks.length, 9);
    assert.ok(payload.tasks.some((task) => task.title === '重启后应该保留'));
  } finally {
    if (client) await client.pool.end();
    if (instance) await instance.stop();
    if (!resolve(directory).startsWith(`${local_root}${sep}persistence-test-`)) throw new Error('Unsafe test cleanup path');
    await rm(directory, { recursive: true, force: true });
  }
});
