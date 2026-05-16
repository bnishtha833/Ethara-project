const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const isAdmin = req.user.role === 'admin';
  const uid = req.user.id;

  try {
    let stats;
    if (isAdmin) {
      stats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status='todo' THEN 1 ELSE 0 END) as todo,
          SUM(CASE WHEN due_date < ? AND status != 'done' THEN 1 ELSE 0 END) as overdue
        FROM tasks
      `).get(today);
    } else {
      stats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status='todo' THEN 1 ELSE 0 END) as todo,
          SUM(CASE WHEN due_date < ? AND status != 'done' THEN 1 ELSE 0 END) as overdue
        FROM tasks
        WHERE (assignee_id = ? OR project_id IN (SELECT project_id FROM project_members WHERE user_id = ?))
      `).get(today, uid, uid);
    }

    const projectStats = isAdmin
      ? db.prepare(`
          SELECT p.id, p.name, p.color,
            COUNT(t.id) as total,
            SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) as done
          FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
          GROUP BY p.id ORDER BY total DESC LIMIT 6`).all()
      : db.prepare(`
          SELECT p.id, p.name, p.color,
            COUNT(t.id) as total,
            SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) as done
          FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
          WHERE p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
          GROUP BY p.id ORDER BY total DESC LIMIT 6`).all(uid);

    const recentTasks = isAdmin
      ? db.prepare(`
          SELECT t.id, t.title, t.status, t.priority, t.due_date,
            p.name as project_name, p.color as project_color, u.name as assignee_name
          FROM tasks t
          LEFT JOIN projects p ON t.project_id = p.id
          LEFT JOIN users u ON t.assignee_id = u.id
          ORDER BY t.created_at DESC LIMIT 8`).all()
      : db.prepare(`
          SELECT t.id, t.title, t.status, t.priority, t.due_date,
            p.name as project_name, p.color as project_color, u.name as assignee_name
          FROM tasks t
          LEFT JOIN projects p ON t.project_id = p.id
          LEFT JOIN users u ON t.assignee_id = u.id
          WHERE (t.assignee_id = ? OR t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?))
          ORDER BY t.created_at DESC LIMIT 8`).all(uid, uid);

    const userCount = isAdmin ? db.prepare('SELECT COUNT(*) as count FROM users').get().count : null;
    const projectCount = isAdmin
      ? db.prepare('SELECT COUNT(*) as count FROM projects').get().count
      : db.prepare('SELECT COUNT(*) as count FROM project_members WHERE user_id = ?').get(uid).count;

    res.json({ stats, projectStats, recentTasks, userCount, projectCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Dashboard query failed' });
  }
});

module.exports = router;
