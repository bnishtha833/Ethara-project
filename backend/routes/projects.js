const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const PROJECT_SELECT = `
  SELECT p.*, u.name as owner_name,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
  FROM projects p LEFT JOIN users u ON p.owner_id = u.id
`;

// GET /api/projects
router.get('/', authenticate, (req, res) => {
  const rows = req.user.role === 'admin'
    ? db.prepare(PROJECT_SELECT + ' ORDER BY p.created_at DESC').all()
    : db.prepare(PROJECT_SELECT + ' WHERE p.id IN (SELECT project_id FROM project_members WHERE user_id = ?) ORDER BY p.created_at DESC').all(req.user.id);
  res.json(rows);
});

// POST /api/projects
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });
  const r = db.prepare('INSERT INTO projects (name, description, owner_id, color) VALUES (?, ?, ?, ?)').run(name, description || '', req.user.id, color || '#6366f1');
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)').run(r.lastInsertRowid, req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM projects WHERE id = ?').get(r.lastInsertRowid));
});

// GET /api/projects/:id
router.get('/:id', authenticate, (req, res) => {
  const project = db.prepare(PROJECT_SELECT + ' WHERE p.id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (req.user.role !== 'admin') {
    if (!db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.id, req.user.id))
      return res.status(403).json({ error: 'Access denied' });
  }
  const members = db.prepare('SELECT u.id, u.name, u.email, u.role FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = ?').all(req.params.id);
  res.json({ ...project, members });
});

// PUT /api/projects/:id
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const { name, description, color } = req.body;
  db.prepare('UPDATE projects SET name=?, description=?, color=? WHERE id=?').run(name || p.name, description !== undefined ? description : p.description, color || p.color, req.params.id);
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  if (!db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Project not found' });
  db.prepare('DELETE FROM project_members WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tasks WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:id/members
router.post('/:id/members', authenticate, requireAdmin, (req, res) => {
  const { user_id } = req.body;
  if (!db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Project not found' });
  if (!db.prepare('SELECT id FROM users WHERE id = ?').get(user_id))
    return res.status(404).json({ error: 'User not found' });
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)').run(req.params.id, user_id);
  res.json({ message: 'Member added' });
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', authenticate, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;
