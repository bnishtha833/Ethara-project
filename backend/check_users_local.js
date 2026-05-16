const db = require('./db');

async function check() {
    await db.init();
    const users = db.prepare("SELECT id, name, email FROM users").all();
    console.log('Users in DB:');
    console.table(users);
}

check();
