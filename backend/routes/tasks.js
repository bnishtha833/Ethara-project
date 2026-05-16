const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const TASK_SELECT = `
  SELECT t.*, 
    u1.name as assignee_name, u1.email as assignee_email,
    u2.name as creator_name,
    p.name as project_name, p.color as project_color
  FROM tasks t
  LEFT JOIN users u1 ON t.assignee_id = u1.id
  LEFT JOIN users u2 ON t.creator_id = u2.id
  LEFT JOIN projects p ON t.project_id = p.id
`;

// GET /api/tasks
router.get('/', authenticate, (req, res) => {
  const { project_id, status, assignee_id, priority } = req.query;
  const conds = []; const params = [];

  if (req.user.role !== 'admin') {
    conds.push('(t.assignee_id = ? OR t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?))');
    params.push(req.user.id, req.user.id);
  }
  if (project_id) { conds.push('t.project_id = ?'); params.push(project_id); }
  if (status)     { conds.push('t.status = ?');     params.push(status); }
  if (assignee_id){ conds.push('t.assignee_id = ?');params.push(assignee_id); }
  if (priority)   { conds.push('t.priority = ?');   params.push(priority); }

  const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';
  res.json(db.prepare(TASK_SELECT + where + ' ORDER BY t.created_at DESC').all(...params));
});

// POST /api/tasks
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, description, project_id, assignee_id, status, priority, due_date } = req.body;
  if (!title || !project_id) return res.status(400).json({ error: 'Title and project are required' });
  const r = db.prepare(
    'INSERT INTO tasks (title,description,project_id,assignee_id,creator_id,status,priority,due_date) VALUES (?,?,?,?,?,?,?,?)'
  ).run(title, description || '', project_id, assignee_id || null, req.user.id, status || 'todo', priority || 'medium', due_date || null);
  res.status(201).json(db.prepare(TASK_SELECT + ' WHERE t.id = ?').get(r.lastInsertRowid));
});

// GET /api/tasks/:id
router.get('/:id', authenticate, (req, res) => {
  const task = db.prepare(TASK_SELECT + ' WHERE t.id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.user.role !== 'admin') {
    const accessible = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
    if (!accessible) return res.status(403).json({ error: 'Access denied' });
  }
  res.json(task);
});

// PUT /api/tasks/:id
router.put('/:id', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.role === 'member') {
    if (task.assignee_id !== req.user.id)
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Members can only update task status' });
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, req.params.id);
  } else {
    const { title, description, project_id, assignee_id, status, priority, due_date } = req.body;
    db.prepare('UPDATE tasks SET title=?,description=?,project_id=?,assignee_id=?,status=?,priority=?,due_date=? WHERE id=?')
      .run(
        title !== undefined ? title : task.title,
        description !== undefined ? description : task.description,
        project_id || task.project_id,
        assignee_id !== undefined ? assignee_id : task.assignee_id,
        status || task.status,
        priority || task.priority,
        due_date !== undefined ? due_date : task.due_date,
        req.params.id
      );
  }
  res.json(db.prepare(TASK_SELECT + ' WHERE t.id = ?').get(req.params.id));
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  if (!db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
