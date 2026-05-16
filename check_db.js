const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'backend', 'taskmanager.db');

async function checkUsers() {
    const SQL = await initSqlJs();
    if (!fs.existsSync(DB_PATH)) {
        console.log('DB does not exist');
        return;
    }
    const db = new SQL.Database(fs.readFileSync(DB_PATH));
    const res = db.exec("SELECT id, name, email FROM users");
    if (res.length > 0) {
        console.log('Users found:');
        console.table(res[0].values.map(v => ({ id: v[0], name: v[1], email: v[2] })));
    } else {
        console.log('No users found.');
    }
}

checkUsers();
