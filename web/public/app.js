const $ = (selector) => document.querySelector(selector);
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const deadline = '2026-10-28';
let tasks = [];
let current_filter = 'all';
let loaded = false;
let refreshing = false;
let delete_id = null;
let toast_timeout;

$('#today-label').textContent = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()) + ' · 今天，也向前一步';
const days_left = Math.ceil((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
$('#days-left').textContent = Math.abs(days_left);
if (days_left < 0) {
  $('#days-unit').textContent = '天前';
  $('#deadline-title').textContent = '交付日已过，继续记录新的进步。';
} else if (days_left === 0) {
  $('#days-unit').textContent = '天 · 今天交付';
  $('#deadline-title').textContent = '检查网址和材料，准备提交。';
}

async function api(path = '', method = 'GET', data) {
  const response = await fetch(`/api/tasks${path}`, { method, headers: data ? { 'content-type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
  let payload;
  try { payload = await response.json(); } catch { throw new Error('服务暂时不可用，请稍后刷新重试。'); }
  if (!response.ok) throw new Error(payload.error || '操作失败，请稍后重试。');
  return payload;
}

function show_error(message) {
  $('#api-error').textContent = message;
  $('#api-error').hidden = false;
  $('#sync-state').textContent = '同步失败';
  $('#sync-state').className = 'sync-state failed';
}

function synced() {
  $('#api-error').hidden = true;
  $('#sync-state').textContent = '已同步';
  $('#sync-state').className = 'sync-state synced';
}

function notify(message) {
  clearTimeout(toast_timeout);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toast_timeout = setTimeout(() => { $('#toast').hidden = true; }, 2800);
}

function render() {
  const completed = tasks.filter((task) => task.completed).length;
  const percentage = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  $('#total-count').textContent = tasks.length;
  $('#pending-count').textContent = tasks.length - completed;
  $('#done-count').textContent = completed;
  $('#filter-total').textContent = tasks.length;
  $('#progress-label').textContent = `${percentage}%`;
  $('#task-progress').value = percentage;
  $('#progress-hint').textContent = completed ? `已经完成 ${completed} 项，继续保持。` : '从完成第一个任务开始';
  const visible = tasks.filter((task) => current_filter === 'all' || (current_filter === 'done' ? task.completed : !task.completed));
  $('#task-list').replaceChildren();
  for (const task of visible) {
    const row = $('#task-template').content.firstElementChild.cloneNode(true);
    row.dataset.id = task.id;
    row.classList.toggle('completed', task.completed);
    row.querySelector('.task-title').textContent = task.title;
    const checkbox = row.querySelector('input');
    checkbox.checked = task.completed;
    row.querySelector('.sr-only').textContent = `将“${task.title}”标记为${task.completed ? '未完成' : '已完成'}`;
    checkbox.addEventListener('change', async () => {
      checkbox.disabled = true;
      try {
        const result = await api(`/${task.id}`, 'PATCH', { completed: checkbox.checked });
        tasks = tasks.map((entry) => entry.id === task.id ? result.task : entry);
        synced(); render();
        $(`.task-row[data-id="${task.id}"] input`)?.focus();
        notify(result.task.completed ? '又完成了一步，做得好。' : '任务已恢复为待完成');
      } catch (error) { checkbox.checked = task.completed; checkbox.disabled = false; show_error(error.message); }
    });
    const date = row.querySelector('.task-date');
    date.textContent = task.due_date ? `${task.due_date.replaceAll('-', '.')} 截止` : '未设截止日期';
    const state = row.querySelector('.task-state');
    if (task.completed) state.textContent = '已完成';
    else if (task.due_date && task.due_date < today) { state.textContent = '已逾期'; state.classList.add('overdue'); }
    else if (task.due_date === today) { state.textContent = '今天截止'; state.classList.add('today'); }
    else state.textContent = '待完成';
    const delete_button = row.querySelector('.delete-task');
    delete_button.setAttribute('aria-label', `删除任务：${task.title}`);
    delete_button.addEventListener('click', () => {
      delete_id = task.id;
      $('#delete-task-name').textContent = task.title;
      $('#delete-dialog').showModal();
      $('#cancel-delete').focus();
    });
    $('#task-list').append(row);
  }
  $('#list-message').hidden = visible.length > 0;
  $('#list-message').textContent = tasks.length === 0 ? '还没有任务。写下你准备完成的第一件事吧。' : current_filter === 'done' ? '还没有已完成任务，先从一个小目标开始。' : '当前没有待完成任务，给自己一点掌声。';
  $('#visible-count').textContent = `显示 ${visible.length} 项`;
}

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  $('#refresh-tasks').disabled = true;
  $('#sync-state').textContent = '正在同步…';
  try {
    const result = await api();
    tasks = result.tasks;
    loaded = true;
    synced(); render();
  } catch (error) {
    show_error(loaded ? `${error.message} 当前显示上次加载的内容。` : error.message);
    if (!loaded) $('#list-message').textContent = '任务暂未加载成功，请点击右上角刷新按钮重试。';
  } finally { refreshing = false; $('#refresh-tasks').disabled = false; }
}

for (const button of document.querySelectorAll('[data-filter]')) {
  button.addEventListener('click', () => {
    current_filter = button.dataset.filter;
    for (const filter of document.querySelectorAll('[data-filter]')) {
      filter.classList.toggle('active', filter === button);
      filter.setAttribute('aria-pressed', String(filter === button));
    }
    if (loaded) render();
  });
}
$('#add-task').addEventListener('click', () => {
  $('#task-form').reset(); $('#form-error').hidden = true;
  $('#task-dialog').showModal(); $('#task-title').focus();
});
$('#close-dialog').addEventListener('click', () => $('#task-dialog').close());
$('#cancel-dialog').addEventListener('click', () => $('#task-dialog').close());
$('#refresh-tasks').addEventListener('click', refresh);
$('#task-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#save-task').disabled = true;
  $('#save-task').textContent = '正在保存…';
  $('#form-error').hidden = true;
  try {
    await api('', 'POST', { title: $('#task-title').value, due_date: $('#task-date').value || null });
    $('#task-dialog').close();
    await refresh(); notify('任务已保存');
  } catch (error) { $('#form-error').textContent = error.message; $('#form-error').hidden = false; }
  finally { $('#save-task').disabled = false; $('#save-task').textContent = '保存任务'; }
});
$('#cancel-delete').addEventListener('click', () => $('#delete-dialog').close());
$('#confirm-delete').addEventListener('click', async () => {
  $('#confirm-delete').disabled = true;
  try {
    await api(`/${delete_id}`, 'DELETE');
    tasks = tasks.filter((task) => task.id !== delete_id);
    $('#delete-dialog').close(); synced(); render(); notify('任务已删除');
  } catch (error) { $('#delete-dialog').close(); show_error(error.message); }
  finally { $('#confirm-delete').disabled = false; }
});
for (const link of document.querySelectorAll('.nav-link')) {
  link.addEventListener('click', () => {
    for (const entry of document.querySelectorAll('.nav-link')) entry.classList.toggle('active', entry === link);
  });
}
await refresh();
