const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'taskmanager.db');
let _db = null;

function save() {
  if (!_db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
}

function rowsFrom(stmt) {
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// API-compatible wrapper so all routes work unchanged
const db = {
  prepare(sql) {
    return {
      run(...args) {
        const params = args.flat();
        _db.run(sql, params);
        save();
        try {
          const r = _db.exec('SELECT last_insert_rowid() as id');
          return { lastInsertRowid: r[0].values[0][0] };
        } catch (e) {
          console.error('Error getting lastInsertRowid:', e);
          return { lastInsertRowid: null };
        }
      },
      get(...args) {
        const params = args.flat();
        const stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        const rows = rowsFrom(stmt);
        return rows[0];
      },
      all(...args) {
        const params = args.flat();
        const stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        return rowsFrom(stmt);
      }
    };
  },

  async init() {
    const SQL = await initSqlJs();
    _db = fs.existsSync(DB_PATH)
      ? new SQL.Database(fs.readFileSync(DB_PATH))
      : new SQL.Database();

    // Schema — run each statement separately
    const schema = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, description TEXT DEFAULT '',
        owner_id INTEGER NOT NULL, color TEXT DEFAULT '#6366f1',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS project_members (
        project_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
        PRIMARY KEY (project_id, user_id))`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL, description TEXT DEFAULT '',
        project_id INTEGER NOT NULL, assignee_id INTEGER,
        creator_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium', due_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`
    ];
    schema.forEach(s => _db.run(s));
    save();

    // Seed demo data if not already present
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@demo.com');
    if (!existing) {
      const ins = (sql, p) => { _db.run(sql, p); const r = _db.exec('SELECT last_insert_rowid()'); return r[0].values[0][0]; };

      const adminId = ins('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
        ['Admin Demo','admin@demo.com', bcrypt.hashSync('demo123',10),'admin']);
      const mem1Id = ins('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
        ['Alice Johnson','alice@demo.com', bcrypt.hashSync('demo123',10),'member']);
      const mem2Id = ins('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
        ['Bob Smith','member@demo.com', bcrypt.hashSync('demo123',10),'member']);

      const p1 = ins('INSERT INTO projects (name,description,owner_id,color) VALUES (?,?,?,?)',
        ['Website Redesign','Complete overhaul of the company website',adminId,'#6366f1']);
      const p2 = ins('INSERT INTO projects (name,description,owner_id,color) VALUES (?,?,?,?)',
        ['Mobile App v2','New features for the mobile application',adminId,'#f472b6']);
      const p3 = ins('INSERT INTO projects (name,description,owner_id,color) VALUES (?,?,?,?)',
        ['API Integration','Third-party API integrations',adminId,'#34d399']);

      [[p1,adminId],[p2,adminId],[p3,adminId],[p1,mem1Id],[p2,mem1Id],[p2,mem2Id],[p3,mem2Id]]
        .forEach(([pid,uid]) => _db.run('INSERT OR IGNORE INTO project_members (project_id,user_id) VALUES (?,?)',[pid,uid]));

      const d = n => { const x = new Date(); x.setDate(x.getDate()+n); return x.toISOString().split('T')[0]; };
      [
        ['Design new homepage','Mockups for new homepage',p1,mem1Id,adminId,'in_progress','high',d(2)],
        ['Update navigation menu','Redesign nav for mobile',p1,mem1Id,adminId,'todo','medium',d(7)],
        ['Fix mobile responsiveness','Fix layout bugs',p1,adminId,adminId,'done','high',d(-1)],
        ['Implement dark mode','Add dark mode toggle',p2,mem1Id,adminId,'todo','low',d(10)],
        ['Push notifications','Configure push service',p2,mem2Id,adminId,'in_progress','high',d(-2)],
        ['User onboarding flow','Design onboarding screens',p2,mem1Id,adminId,'todo','medium',d(3)],
        ['OAuth integration','Add Google/GitHub OAuth',p3,adminId,adminId,'done','high',d(-3)],
        ['Payment gateway','Integrate Stripe payment',p3,mem2Id,adminId,'todo','high',d(-1)],
        ['Email service setup','Configure SendGrid emails',p3,adminId,adminId,'in_progress','medium',d(5)],
      ].forEach(t => _db.run(
        'INSERT INTO tasks (title,description,project_id,assignee_id,creator_id,status,priority,due_date) VALUES (?,?,?,?,?,?,?,?)', t
      ));

      save();
      console.log('✅ Demo seeded | admin@demo.com / alice@demo.com / member@demo.com — password: demo123');
    }
    console.log('📦 Database ready');
  }
};

module.exports = db;
