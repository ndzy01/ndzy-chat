// ========== 租户 ==========
function getTenantId() {
  var id = localStorage.getItem('ndzy_tenant_id');
  if (!id) {
    id = 'anon_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('ndzy_tenant_id', id);
  }
  return id;
}

function setTenantId(id) {
  localStorage.setItem('ndzy_tenant_id', id);
}

function authHeaders() {
  return { 'X-Tenant-Id': getTenantId(), 'Content-Type': 'application/json' };
}

// ========== 任务 CRUD ==========
async function getTasks(params) {
  var qs = '';
  if (params) {
    var parts = [];
    if (params.status) parts.push('status=' + encodeURIComponent(params.status));
    if (params.priority) parts.push('priority=' + encodeURIComponent(params.priority));
    if (params.targetDate) parts.push('targetDate=' + encodeURIComponent(params.targetDate));
    if (parts.length) qs = '?' + parts.join('&');
  }
  var resp = await fetch('/api/tasks' + qs, { headers: authHeaders() });
  if (!resp.ok) throw new Error('Failed to fetch tasks');
  return resp.json();
}

async function createTask(data) {
  var resp = await fetch('/api/tasks', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error('Failed to create task');
  return resp.json();
}

async function updateTask(id, data) {
  var resp = await fetch('/api/tasks/' + id, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error('Failed to update task');
  return resp.json();
}

async function deleteTask(id) {
  var resp = await fetch('/api/tasks/' + id, { method: 'DELETE', headers: authHeaders() });
  if (!resp.ok) throw new Error('Failed to delete task');
  return resp.json();
}

// ========== AI 1: 任务拆解 ==========
async function breakdownTask(id) {
  var resp = await fetch('/api/tasks/' + id + '/breakdown', { method: 'POST', headers: authHeaders() });
  if (!resp.ok) throw new Error('Failed to breakdown task');
  return resp.json();
}

// ========== AI 2: 工作总结 ==========
async function summarizeTasks(ids) {
  var resp = await fetch('/api/tasks/summarize', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ids: ids }),
  });
  if (!resp.ok) throw new Error('Failed to summarize');
  return resp.text();
}

// ========== AI 3: 自然语言解析 ==========
async function parseTask(text) {
  var resp = await fetch('/api/tasks/parse', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text: text }),
  });
  if (!resp.ok) throw new Error('Failed to parse');
  return resp.json();
}

// ========== AI 4: 每日焦点 ==========
async function getDailyBrief() {
  var resp = await fetch('/api/tasks/daily-brief', { headers: authHeaders() });
  if (!resp.ok) throw new Error('Failed to get brief');
  return resp.text();
}

// ========== AI 5: 智能搜索 ==========
async function searchTasks(query) {
  var resp = await fetch('/api/tasks/search?q=' + encodeURIComponent(query), { headers: authHeaders() });
  if (!resp.ok) throw new Error('Failed to search');
  return resp.text();
}

// ========== AI 6: 脑暴转任务 ==========
async function draftTasks(text, targetDate) {
  var resp = await fetch('/api/tasks/draft', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text: text, targetDate: targetDate }),
  });
  if (!resp.ok) throw new Error('Failed to draft');
  return resp.json();
}

// ========== AI 7: 拖延提醒 ==========
async function getNudge() {
  var resp = await fetch('/api/tasks/nudge', { headers: authHeaders() });
  if (!resp.ok) throw new Error('Failed to get nudge');
  return resp.text();
}

// ========== 子任务操作 ==========
async function toggleSubtask(id) {
  var resp = await fetch('/api/tasks/subtasks/' + id + '/toggle', { method: 'POST', headers: authHeaders() });
  if (!resp.ok) throw new Error('Failed to toggle subtask');
  return resp.json();
}

// ========== AI 8: 智能推荐 ==========
async function getRecommend() {
  var resp = await fetch('/api/tasks/recommend', { headers: authHeaders() });
  if (!resp.ok) throw new Error('Failed to get recommend');
  return resp.text();
}