const json_headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

function respond(data, status = 200, extra_headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...json_headers, ...extra_headers } });
}

function valid_date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function create_task_handler(get_database) {
  return async function handle_request(request) {
    const pathname = new URL(request.url).pathname.replace(/\/$/, '');
    const match = pathname.match(/^\/api\/tasks(?:\/([1-9]\d*))?$/);
    if (!match) return respond({ error: '没有找到这个接口。' }, 404);
    const task_id = match[1] ? Number(match[1]) : null;
    if (task_id !== null && (!Number.isSafeInteger(task_id) || task_id > 2147483647)) {
      return respond({ error: '任务编号无效。' }, 400);
    }
    const allowed = task_id === null ? ['GET', 'POST'] : ['PATCH', 'DELETE'];
    if (!allowed.includes(request.method)) return respond({ error: '不支持此操作。' }, 405, { allow: allowed.join(', ') });

    let body;
    if (['POST', 'PATCH'].includes(request.method)) {
      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
        return respond({ error: '请使用 JSON 格式提交。' }, 415);
      }
      const raw_body = await request.text();
      if (new TextEncoder().encode(raw_body).length > 4096) return respond({ error: '提交内容过长。' }, 413);
      try { body = JSON.parse(raw_body); } catch { return respond({ error: '提交内容不是有效的 JSON。' }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return respond({ error: '提交内容必须是对象。' }, 400);
      if (request.method === 'POST') {
        if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 120) {
          return respond({ error: '请填写 1～120 个字符的任务名称。' }, 400);
        }
        if (body.due_date != null && body.due_date !== '' && !valid_date(body.due_date)) {
          return respond({ error: '请选择有效的截止日期。' }, 400);
        }
      } else if (typeof body.completed !== 'boolean') {
        return respond({ error: '完成状态必须为 true 或 false。' }, 400);
      }
    }

    try {
      const db = get_database();
      if (request.method === 'GET') {
        // DATE is a calendar date. Return text to avoid the driver's local-time conversion.
        const rows = await db.sql`SELECT id, title, due_date::text AS due_date, completed, created_at FROM tasks ORDER BY completed ASC, tasks.due_date ASC NULLS LAST, id DESC`;
        return respond({ tasks: rows });
      }
      if (request.method === 'POST') {
        const title = body.title.trim();
        const due_date = body.due_date || null;
        const rows = await db.sql`INSERT INTO tasks (title, due_date) VALUES (${title}, ${due_date}) RETURNING id, title, due_date::text AS due_date, completed, created_at`;
        return respond({ task: rows[0] }, 201);
      }
      if (request.method === 'PATCH') {
        const rows = await db.sql`UPDATE tasks SET completed = ${body.completed} WHERE id = ${task_id} RETURNING id, title, due_date::text AS due_date, completed, created_at`;
        return rows.length ? respond({ task: rows[0] }) : respond({ error: '任务已不存在，请刷新列表。' }, 404);
      }
      const rows = await db.sql`DELETE FROM tasks WHERE id = ${task_id} RETURNING id`;
      return rows.length ? respond({ deleted_id: task_id }) : respond({ error: '任务已不存在，请刷新列表。' }, 404);
    } catch {
      // Never return database exceptions: they may contain connection credentials.
      return respond({ error: '暂时无法连接任务数据库，请稍后重试。' }, 503);
    }
  };
}
