if (!requireAuth()) throw new Error();
const user = getUser();
setActiveNav('tasks');
renderSidebarUser();
if (user.role === 'admin') {
  document.getElementById('admin-nav').style.display = 'block';
  document.getElementById('new-task-btn').style.display = 'flex';
  document.getElementById('filter-assignee').style.display = 'block';
}

let allTasks = [], allProjects = [], allUsers = [], editingTaskId = null;

// Pre-filter from URL param
const urlParams = new URLSearchParams(location.search);
const preProject = urlParams.get('project');
if (preProject) document.getElementById('filter-project').dataset.preload = preProject;

async function loadData() {
  try {
    [allProjects, allUsers] = await Promise.all([
      apiFetch('/projects'),
      user.role === 'admin' ? apiFetch('/users') : Promise.resolve([])
    ]);
    // Populate filter dropdowns
    const projFilter = document.getElementById('filter-project');
    allProjects.forEach(p => {
      projFilter.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name}</option>`);
    });
    if (preProject) projFilter.value = preProject;

    if (user.role === 'admin') {
      const assigneeFilter = document.getElementById('filter-assignee');
      allUsers.forEach(u => {
        assigneeFilter.insertAdjacentHTML('beforeend', `<option value="${u.id}">${u.name}</option>`);
      });
    }
    await loadTasks();
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadTasks() {
  const qs = new URLSearchParams();
  const proj = document.getElementById('filter-project').value;
  const pri = document.getElementById('filter-priority').value;
  const asgn = document.getElementById('filter-assignee').value;
  if (proj) qs.set('project_id', proj);
  if (pri) qs.set('priority', pri);
  if (asgn) qs.set('assignee_id', asgn);
  allTasks = await apiFetch('/tasks' + (qs.toString() ? '?' + qs : ''));
  filterAndRender();
}

function filterAndRender() {
  const q = document.getElementById('search-tasks').value.toLowerCase();
  const filtered = allTasks.filter(t =>
    t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
  );
  renderKanban(filtered);
}

function renderKanban(tasks) {
  const cols = { todo: [], in_progress: [], done: [] };
  tasks.forEach(t => { if (cols[t.status]) cols[t.status].push(t); });
  ['todo', 'in_progress', 'done'].forEach(status => {
    document.getElementById(`count-${status}`).textContent = cols[status].length;
    const col = document.getElementById(`col-${status}`);
    col.innerHTML = cols[status].length
      ? cols[status].map(t => renderTaskCard(t)).join('')
      : `<div style="text-align:center;padding:32px 16px;color:var(--text-dim);font-size:13px">No tasks</div>`;
  });
}

function renderTaskCard(t) {
  const overdue = isOverdue(t.due_date, t.status);
  return `
  <div class="task-card" onclick="openDetailModal(${t.id})">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
      <div class="task-card-title">${t.title}</div>
      <span class="badge badge-${t.priority}" style="flex-shrink:0;margin-left:8px">${t.priority}</span>
    </div>
    ${t.description ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.4">${t.description.slice(0,80)}${t.description.length > 80 ? '...' : ''}</div>` : ''}
    <div class="task-card-meta">
      <span class="task-card-project" style="border-left:2px solid ${t.project_color || '#6366f1'}">&nbsp;${t.project_name || '?'}</span>
    </div>
    <div class="task-card-footer">
      <span class="assignee-chip">
        ${t.assignee_name
          ? `<span class="assignee-avatar">${initials(t.assignee_name)}</span>${t.assignee_name}`
          : `<span style="color:var(--text-dim)">Unassigned</span>`}
      </span>
      <span class="due-date ${overdue ? 'overdue' : ''}">${overdue ? '⚠️ ' : ''}${fmtDate(t.due_date)}</span>
    </div>
  </div>`;
}

// Task detail modal
function openDetailModal(id) {
  const t = allTasks.find(x => x.id === id);
  if (!t) return;
  const overdue = isOverdue(t.due_date, t.status);
  document.getElementById('detail-title').textContent = t.title;
  document.getElementById('detail-body').innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      <span class="badge badge-${t.status}">${statusLabel(t.status)}</span>
      <span class="badge badge-${t.priority}">${priorityLabel(t.priority)}</span>
      ${overdue ? '<span class="badge badge-overdue">⚠️ Overdue</span>' : ''}
    </div>
    ${t.description ? `<p style="font-size:14px;color:var(--text-muted);margin-bottom:16px;line-height:1.6">${t.description}</p>` : ''}
    <div style="display:grid;gap:12px">
      <div class="flex items-center gap-2"><span style="font-size:13px;color:var(--text-dim);width:100px">Project</span><span style="font-size:14px">${t.project_name || '—'}</span></div>
      <div class="flex items-center gap-2"><span style="font-size:13px;color:var(--text-dim);width:100px">Assignee</span><span style="font-size:14px">${t.assignee_name || 'Unassigned'}</span></div>
      <div class="flex items-center gap-2"><span style="font-size:13px;color:var(--text-dim);width:100px">Created by</span><span style="font-size:14px">${t.creator_name || '—'}</span></div>
      <div class="flex items-center gap-2"><span style="font-size:13px;color:var(--text-dim);width:100px">Due Date</span><span class="${overdue ? 'due-date overdue' : ''}" style="font-size:14px">${fmtDate(t.due_date)}</span></div>
    </div>
    ${user.role === 'member' && t.assignee_id === user.id ? `
    <hr class="divider"/>
    <div class="form-group"><label class="form-label">Update Status</label>
    <select id="quick-status" class="form-control">
      <option value="todo" ${t.status==='todo'?'selected':''}>To Do</option>
      <option value="in_progress" ${t.status==='in_progress'?'selected':''}>In Progress</option>
      <option value="done" ${t.status==='done'?'selected':''}>Done</option>
    </select></div>` : ''}
  `;

  const actions = document.getElementById('detail-actions');
  actions.innerHTML = '';
  if (user.role === 'admin') {
    actions.innerHTML = `
      <button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id})">Delete</button>
      <button class="btn btn-secondary btn-sm" onclick="closeDetailModal()">Close</button>
      <button class="btn btn-primary btn-sm" onclick="openEditTask(${t.id})">Edit Task</button>`;
  } else if (t.assignee_id === user.id) {
    actions.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="closeDetailModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="quickUpdateStatus(${t.id})">Save Status</button>`;
  } else {
    actions.innerHTML = `<button class="btn btn-secondary btn-sm" onclick="closeDetailModal()">Close</button>`;
  }
  document.getElementById('detail-modal').classList.add('open');
}
function closeDetailModal() { document.getElementById('detail-modal').classList.remove('open'); }

async function quickUpdateStatus(id) {
  const status = document.getElementById('quick-status').value;
  try {
    await apiFetch('/tasks/' + id, { method: 'PUT', body: { status } });
    showToast('Status updated!', 'success');
    closeDetailModal(); loadTasks();
  } catch (e) { showToast(e.message, 'error'); }
}

// Task Create/Edit modal
function openTaskModal() {
  editingTaskId = null;
  document.getElementById('task-modal-title').textContent = 'New Task';
  document.getElementById('task-save-btn').textContent = 'Create Task';
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-due').value = '';
  document.getElementById('task-status').value = 'todo';
  document.getElementById('task-priority').value = 'medium';
  populateTaskSelects();
  document.getElementById('task-modal').classList.add('open');
}

function openEditTask(id) {
  closeDetailModal();
  const t = allTasks.find(x => x.id === id);
  if (!t) return;
  editingTaskId = id;
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('task-save-btn').textContent = 'Save Changes';
  document.getElementById('task-title').value = t.title;
  document.getElementById('task-desc').value = t.description || '';
  document.getElementById('task-due').value = t.due_date || '';
  document.getElementById('task-status').value = t.status;
  document.getElementById('task-priority').value = t.priority;
  populateTaskSelects(t.project_id, t.assignee_id);
  document.getElementById('task-modal').classList.add('open');
}

function populateTaskSelects(projId, assigneeId) {
  const pSel = document.getElementById('task-project');
  pSel.innerHTML = allProjects.map(p => `<option value="${p.id}" ${p.id == projId ? 'selected' : ''}>${p.name}</option>`).join('');

  const aSel = document.getElementById('task-assignee');
  aSel.innerHTML = '<option value="">Unassigned</option>' +
    allUsers.map(u => `<option value="${u.id}" ${u.id == assigneeId ? 'selected' : ''}>${u.name} (${u.role})</option>`).join('');
}

function closeTaskModal() { document.getElementById('task-modal').classList.remove('open'); }

async function saveTask() {
  const title = document.getElementById('task-title').value.trim();
  const project_id = document.getElementById('task-project').value;
  if (!title) { showToast('Title is required', 'error'); return; }
  if (!project_id) { showToast('Please select a project', 'error'); return; }
  const btn = document.getElementById('task-save-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    const body = {
      title,
      description: document.getElementById('task-desc').value,
      project_id: parseInt(project_id),
      assignee_id: document.getElementById('task-assignee').value ? parseInt(document.getElementById('task-assignee').value) : null,
      status: document.getElementById('task-status').value,
      priority: document.getElementById('task-priority').value,
      due_date: document.getElementById('task-due').value || null
    };
    if (editingTaskId) await apiFetch('/tasks/' + editingTaskId, { method: 'PUT', body });
    else await apiFetch('/tasks', { method: 'POST', body });
    showToast(editingTaskId ? 'Task updated!' : 'Task created!', 'success');
    closeTaskModal(); loadTasks();
  } catch (e) { showToast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = editingTaskId ? 'Save Changes' : 'Create Task'; }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await apiFetch('/tasks/' + id, { method: 'DELETE' });
    showToast('Task deleted', 'success');
    closeDetailModal(); loadTasks();
  } catch (e) { showToast(e.message, 'error'); }
}

function filterAndRender() {
  const q = document.getElementById('search-tasks').value.toLowerCase();
  renderKanban(allTasks.filter(t => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)));
}

// Overlay close
document.getElementById('task-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeTaskModal(); });
document.getElementById('detail-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeDetailModal(); });

// Filter change
document.getElementById('filter-project').addEventListener('change', loadTasks);
document.getElementById('filter-priority').addEventListener('change', loadTasks);
document.getElementById('filter-assignee').addEventListener('change', loadTasks);

loadData();
