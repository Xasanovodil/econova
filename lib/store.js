const {DatabaseSync} = require('node:sqlite');
const {mkdirSync} = require('node:fs');
const {dirname} = require('node:path');
const {randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash} = require('node:crypto');

class GameError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}
const check = (ok, message, status) => { if (!ok) throw new GameError(message, status); };
const money = n => Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000_000;
const hashToken = token => createHash('sha256').update(token).digest('hex');

class Store {
  constructor(file) {
    if (file !== ':memory:') mkdirSync(dirname(file), {recursive: true});
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, alias TEXT NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS city(id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, balance INTEGER NOT NULL, overdraft INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS journal(id TEXT PRIMARY KEY, command_id TEXT NOT NULL, kind TEXT NOT NULL, memo TEXT NOT NULL, company_id TEXT, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS lines(entry_id TEXT NOT NULL REFERENCES journal(id), account TEXT NOT NULL REFERENCES accounts(id), amount INTEGER NOT NULL CHECK(amount != 0));
      CREATE TABLE IF NOT EXISTS commands(actor TEXT NOT NULL, id TEXT NOT NULL, fingerprint TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(actor,id));
      CREATE TABLE IF NOT EXISTS ticks(id TEXT PRIMARY KEY, created INTEGER NOT NULL);
      CREATE TRIGGER IF NOT EXISTS immutable_journal_update BEFORE UPDATE ON journal BEGIN SELECT RAISE(ABORT,'immutable journal'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_journal_delete BEFORE DELETE ON journal BEGIN SELECT RAISE(ABORT,'immutable journal'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_lines_update BEFORE UPDATE ON lines BEGIN SELECT RAISE(ABORT,'immutable journal'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_lines_delete BEFORE DELETE ON lines BEGIN SELECT RAISE(ABORT,'immutable journal'); END;
    `);
  }
  atomic(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  state() { return JSON.parse(this.db.prepare('SELECT value FROM city WHERE id=1').get().value); }
  write(state) { this.db.prepare('INSERT INTO city VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(JSON.stringify(state)); }
  account(id, overdraft = false) { this.db.prepare('INSERT OR IGNORE INTO accounts VALUES(?,0,?)').run(id, +overdraft); return id; }
  balance(id) { return this.db.prepare('SELECT balance FROM accounts WHERE id=?').get(id)?.balance || 0; }
  entry(commandId, kind, memo, companyId, lines) {
    check(lines.length >= 2 && lines.every(l => Number.isSafeInteger(l[1]) && l[1] !== 0), 'Hisob qatorlari noto‘g‘ri.');
    check(lines.reduce((s, l) => s + l[1], 0) === 0, 'Hisob muvozanatda emas.');
    const totals = new Map();
    for (const [account, amount] of lines) totals.set(account, (totals.get(account) || 0) + amount);
    for (const [account, change] of totals) {
      const row = this.db.prepare('SELECT * FROM accounts WHERE id=?').get(account);
      check(row && Number.isSafeInteger(row.balance + change), 'Hisob topilmadi.');
      check(row.overdraft || row.balance + change >= 0, 'Mablag‘ yoki zaxira yetarli emas.');
    }
    const id = randomUUID();
    this.db.prepare('INSERT INTO journal VALUES(?,?,?,?,?,?)').run(id, commandId, kind, memo, companyId, Date.now());
    for (const [account, amount] of lines) this.db.prepare('INSERT INTO lines VALUES(?,?,?)').run(id, account, amount);
    for (const [account, change] of totals) this.db.prepare('UPDATE accounts SET balance=balance+? WHERE id=?').run(change, account);
    return id;
  }
  transfer(commandId, kind, memo, companyId, from, to, amount) {
    check(money(amount) && amount > 0, 'Pul miqdori noto‘g‘ri.');
    return this.entry(commandId, kind, memo, companyId, [[from, -amount], [to, amount]]);
  }
  seed() {
    if (this.db.prepare('SELECT id FROM city').get()) return;
    this.atomic(() => {
      this.account('external:grant', true);
      for (const [id, alias] of [['aziza','Aziza'], ['bekzod','Bekzod'], ['camila','Camila']]) {
        const salt = randomBytes(16).toString('hex');
        this.db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(id, alias, salt, scryptSync('econova-demo', salt, 64).toString('hex'));
        this.account('wallet:' + id);
        this.transfer('seed', 'grant', 'Mashq uchun boshlang‘ich grant', null, 'external:grant', 'wallet:' + id, 15_000_000);
      }
      for (const id of ['supplier','landlord','equipment','depreciation','expense:parts','expense:wages','expense:rent','expense:temporary','expense:depreciation']) this.account(id);
      for (const id of ['manager','mechanic1','mechanic2']) this.account('household:' + id);
      this.write({version:1, cityId:'school-1', rulesVersion:1, name:'Navro‘z ko‘chasi', practice:true, proposal:null, company:null, tick:0, events:[], createdAt:Date.now()});
    });
  }
  login(userId, password) {
    const user = this.db.prepare('SELECT * FROM users WHERE id=?').get(userId);
    const derived = scryptSync(password, user?.salt || 'invalid', 64);
    check(user && timingSafeEqual(derived, Buffer.from(user.password, 'hex')), 'Ism yoki parol noto‘g‘ri.', 401);
    const token = randomBytes(32).toString('base64url');
    this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashToken(token), user.id, Date.now() + 7*86400000);
    return token;
  }
  authenticate(token) {
    const row = this.db.prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?').get(hashToken(token || ''), Date.now());
    check(row, 'Davom etish uchun hisobga kiring.', 401);
    return row.user_id;
  }
  logout(token) { this.db.prepare('DELETE FROM sessions WHERE token=?').run(hashToken(token || '')); }
  receipts(companyId) {
    return this.db.prepare('SELECT * FROM journal WHERE company_id=? ORDER BY rowid DESC LIMIT 60').all(companyId).map(e => ({...e, lines:this.db.prepare('SELECT account,amount FROM lines WHERE entry_id=?').all(e.id)}));
  }
  close() { this.db.close(); }
}
module.exports = {Store, GameError, check, money};
