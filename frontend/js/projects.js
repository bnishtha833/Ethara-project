if (!requireAuth()) throw new Error();
const user = getUser();
setActiveNav('projects');
renderSidebarUser();
if (user.role === 'admin') {
  document.getElementById('admin-nav').style.display = 'block';
  document.getElementById('new-project-btn').style.display = 'flex';
}

let allProjects = [], allUsers = [], editingProjectId = null, managingProjectId = null, selectedColor = '#6366f1';

async function loadProjects() {
  try {
    allProjects = await apiFetch('/projects');
    if (user.role === 'admin') allUsers = await apiFetch('/users');
    renderProjects(allProjects);
  } catch (e) { showToast(e.message, 'error'); }
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  if (!projects.length) {
    grid.innerHTML = '<div style="grid-column:1/-1" class="empty-state"><div class="empty-icon">📁</div><h3>No projects yet</h3><p>Create your first project to get started.</p></div>';
    return;
  }
  grid.innerHTML = projects.map(p => {
    const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
    return `
    <div class="project-card" style="--project-color:${p.color}">
      <div class="project-card-header">
        <div>
          <div class="project-name">${p.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">by ${p.owner_name}</div>
        </div>
        ${user.role === 'admin' ? `
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="event.stopPropagation();openMembersModal(${p.id})" title="Manage members">👥</button>
          <button class="btn btn-secondary btn-sm btn-icon" onclick="event.stopPropagation();openEditModal(${p.id})" title="Edit">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="event.stopPropagation();deleteProject(${p.id},'${p.name.replace(/'/g,"\\'")}')">🗑️</button>
        </div>` : ''}
      </div>
      <div class="project-desc">${p.description || 'No description provided.'}</div>
      <div class="project-progress">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${p.color}"></div></div>
        <div class="progress-text">${pct}% complete · ${p.done_count}/${p.task_count} tasks</div>
      </div>
      <div class="project-stats">
        <span class="project-stat">👥 ${p.member_count} member${p.member_count !== 1 ? 's' : ''}</span>
        <span class="project-stat">📋 ${p.task_count} task${p.task_count !== 1 ? 's' : ''}</span>
      </div>
      <div style="margin-top:14px">
        <a href="tasks.html?project=${p.id}" class="btn btn-secondary btn-sm" style="width:100%;justify-content:center">View Tasks →</a>
      </div>
    </div>`;
  }).join('');
}

function filterProjects() {
  const q = document.getElementById('search-projects').value.toLowerCase();
  renderProjects(allProjects.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)));
}

// Color picker
document.querySelectorAll('.color-swatch').forEach(s => {
  s.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('active'));
    s.classList.add('active');
    selectedColor = s.dataset.color;
  });
});
document.querySelector('[data-color="#6366f1"]')?.classList.add('active');

function openProjectModal() {
  editingProjectId = null; selectedColor = '#6366f1';
  document.getElementById('proj-modal-title').textContent = 'New Project';
  document.getElementById('proj-save-btn').textContent = 'Create Project';
  document.getElementById('proj-name').value = '';
  document.getElementById('proj-desc').value = '';
  document.querySelectorAll('.color-swatch').forEach(s => { s.classList.toggle('active', s.dataset.color === '#6366f1'); });
  document.getElementById('project-modal').classList.add('open');
}
function openEditModal(id) {
  const p = allProjects.find(x => x.id === id);
  if (!p) return;
  editingProjectId = id; selectedColor = p.color;
  document.getElementById('proj-modal-title').textContent = 'Edit Project';
  document.getElementById('proj-save-btn').textContent = 'Save Changes';
  document.getElementById('proj-name').value = p.name;
  document.getElementById('proj-desc').value = p.description || '';
  document.querySelectorAll('.color-swatch').forEach(s => { s.classList.toggle('active', s.dataset.color === p.color); });
  document.getElementById('project-modal').classList.add('open');
}
function closeProjectModal() { document.getElementById('project-modal').classList.remove('open'); }

async function saveProject() {
  const name = document.getElementById('proj-name').value.trim();
  if (!name) { showToast('Project name is required', 'error'); return; }
  const btn = document.getElementById('proj-save-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    const body = { name, description: document.getElementById('proj-desc').value, color: selectedColor };
    if (editingProjectId) await apiFetch('/projects/' + editingProjectId, { method: 'PUT', body });
    else await apiFetch('/projects', { method: 'POST', body });
    showToast(editingProjectId ? 'Project updated!' : 'Project created!', 'success');
    closeProjectModal(); loadProjects();
  } catch (e) { showToast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = editingProjectId ? 'Save Changes' : 'Create Project'; }
}

async function deleteProject(id, name) {
  if (!confirm(`Delete project "${name}" and all its tasks?`)) return;
  try {
    await apiFetch('/projects/' + id, { method: 'DELETE' });
    showToast('Project deleted', 'success'); loadProjects();
  } catch (e) { showToast(e.message, 'error'); }
}

async function openMembersModal(id) {
  managingProjectId = id;
  const project = await apiFetch('/projects/' + id);
  const members = project.members || [];
  const available = allUsers.filter(u => !members.find(m => m.id === u.id));

  document.getElementById('members-list').innerHTML = members.length
    ? members.map(m => `
        <div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--glass-border)">
          <div class="flex items-center gap-2">
            <div class="assignee-avatar">${initials(m.name)}</div>
            <div><div style="font-size:14px;font-weight:600">${m.name}</div><div style="font-size:12px;color:var(--text-muted)">${m.email}</div></div>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge badge-${m.role === 'admin' ? 'in_progress' : 'todo'}">${m.role}</span>
            <button class="btn btn-danger btn-sm btn-icon" onclick="removeMember(${m.id})">✕</button>
          </div>
        </div>`).join('')
    : '<p style="color:var(--text-muted);font-size:14px">No members yet.</p>';

  const sel = document.getElementById('add-member-select');
  sel.innerHTML = available.length
    ? available.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('')
    : '<option disabled>All users are members</option>';

  document.getElementById('members-modal').classList.add('open');
}
function closeMembersModal() { document.getElementById('members-modal').classList.remove('open'); }

async function addMember() {
  const uid = document.getElementById('add-member-select').value;
  if (!uid) return;
  try {
    await apiFetch(`/projects/${managingProjectId}/members`, { method: 'POST', body: { user_id: parseInt(uid) } });
    showToast('Member added!', 'success');
    openMembersModal(managingProjectId); loadProjects();
  } catch (e) { showToast(e.message, 'error'); }
}

async function removeMember(uid) {
  try {
    await apiFetch(`/projects/${managingProjectId}/members/${uid}`, { method: 'DELETE' });
    showToast('Member removed', 'success');
    openMembersModal(managingProjectId); loadProjects();
  } catch (e) { showToast(e.message, 'error'); }
}

// Close modals on overlay click
document.getElementById('project-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeProjectModal(); });
document.getElementById('members-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeMembersModal(); });

loadProjects();
