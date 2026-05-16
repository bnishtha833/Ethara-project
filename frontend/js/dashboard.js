if (!requireAuth()) throw new Error('Not authed');
const user = getUser();

// Setup
setActiveNav('dashboard');
renderSidebarUser();
if (user.role === 'admin') {
  document.getElementById('admin-nav').style.display = 'block';
  document.getElementById('stat-users-card').style.display = 'block';
}

// Welcome message
const hr = new Date().getHours();
const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
document.getElementById('welcome-msg').textContent = `${greet}, ${user.name.split(' ')[0]}! 👋`;

async function loadDashboard() {
  try {
    const d = await apiFetch('/dashboard/stats');
    const { stats, projectStats, recentTasks, userCount, projectCount } = d;

    document.getElementById('stat-total').textContent = stats.total || 0;
    document.getElementById('stat-done').textContent = stats.completed || 0;
    document.getElementById('stat-inprogress').textContent = stats.in_progress || 0;
    document.getElementById('stat-overdue').textContent = stats.overdue || 0;
    document.getElementById('stat-projects').textContent = projectCount || 0;
    if (user.role === 'admin') document.getElementById('stat-users').textContent = userCount || 0;

    renderRecentTasks(recentTasks);
    renderProjectProgress(projectStats);
  } catch (e) {
    showToast('Failed to load dashboard: ' + e.message, 'error');
  }
}

function renderRecentTasks(tasks) {
  const el = document.getElementById('recent-tasks');
  if (!tasks || tasks.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h3>No tasks yet</h3><p>Create your first task to get started.</p></div>';
    return;
  }
  el.innerHTML = `
    <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Task</th><th>Project</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due Date</th>
      </tr></thead>
      <tbody>
        ${tasks.map(t => `
          <tr>
            <td><span style="font-weight:600">${t.title}</span></td>
            <td><span class="color-dot" style="background:${t.project_color};display:inline-block;margin-right:6px"></span>${t.project_name || '—'}</td>
            <td>${t.assignee_name ? `<span class="assignee-chip"><span class="assignee-avatar">${initials(t.assignee_name)}</span>${t.assignee_name}</span>` : '<span style="color:var(--text-dim)">Unassigned</span>'}</td>
            <td><span class="badge badge-${t.priority}">${priorityLabel(t.priority)}</span></td>
            <td><span class="badge badge-${t.status}">${statusLabel(t.status)}</span></td>
            <td class="${isOverdue(t.due_date, t.status) ? 'due-date overdue' : 'due-date'}">${fmtDate(t.due_date)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    </div>`;
}

function renderProjectProgress(projects) {
  const el = document.getElementById('project-progress');
  if (!projects || projects.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📁</div><h3>No projects</h3></div>';
    return;
  }
  el.innerHTML = projects.map(p => {
    const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
    return `
      <div style="margin-bottom:20px">
        <div class="flex items-center justify-between mb-4" style="margin-bottom:8px">
          <div class="flex items-center gap-2">
            <span class="color-dot" style="background:${p.color}"></span>
            <span style="font-weight:600;font-size:14px">${p.name}</span>
          </div>
          <span style="font-size:13px;color:var(--text-muted)">${p.done || 0}/${p.total || 0} tasks</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%;background:${p.color}"></div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${pct}% complete</div>
      </div>`;
  }).join('');
}

loadDashboard();
