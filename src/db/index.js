/**
 * Telebot © 2025 slowlyh — store abstrak: JSON (default) atau SQLite.
 * Dipilih lewat env DB_TYPE. Semua modul memanggil lewat API yang sama:
 *
 *   const db = await getDB()
 *   db.set('users', id, { name })   db.get('users', id)   db.has(...)
 *   db.del('users', id)             db.all('users')       db.keys('users')
 *   db.get('settings', 'menu')      db.update('settings', 'menu', patch)
 *
 * 'collection' = satu tabel (sqlite) / satu file (json).
 */
import fs from 'fs'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import config from '#config'
import logger from '#lib/logger'

const NAME_RE = /^[A-Za-z0-9_-]+$/
const safe = (name) => {
  const n = String(name)
  if (!NAME_RE.test(n)) throw new Error('invalid collection name: ' + n)
  return n
}

class JSONStore {
  constructor(dir) {
    this.dir = dir
    fs.mkdirSync(dir, { recursive: true })
  }
  file(name) {
    return path.join(this.dir, safe(name) + '.json')
  }
  read(name) {
    try {
      return JSON.parse(fs.readFileSync(this.file(name), 'utf-8'))
    } catch {
      return {}
    }
  }
  write(name, obj) {
    const tmp = this.file(name) + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2))
    fs.renameSync(tmp, this.file(name))
  }
  get(col, key) {
    return this.read(col)[String(key)] ?? null
  }
  set(col, key, value) {
    const o = this.read(col)
    o[String(key)] = value
    this.write(col, o)
    return value
  }
  update(col, key, patch) {
    const cur = this.get(col, key)
    const next =
      cur && typeof cur === 'object' && !Array.isArray(cur)
        ? { ...cur, ...patch }
        : patch
    return this.set(col, key, next)
  }
  del(col, key) {
    const o = this.read(col)
    const had = o[String(key)] !== undefined
    delete o[String(key)]
    this.write(col, o)
    return had
  }
  has(col, key) {
    return this.get(col, key) !== null
  }
  all(col) {
    return this.read(col)
  }
  keys(col) {
    return Object.keys(this.read(col))
  }
  size(col) {
    return Object.keys(this.read(col)).length
  }
  close() {}
}

class SQLiteStore {
  constructor(dir) {
    fs.mkdirSync(dir, { recursive: true })
    this.db = new DatabaseSync(path.join(dir, 'telebot.db'))
    this.db.exec('PRAGMA journal_mode = WAL;')
  }
  ensure(col) {
    const n = safe(col)
    this.db.exec(`CREATE TABLE IF NOT EXISTS "${n}" (k TEXT PRIMARY KEY, v TEXT NOT NULL)`)
    return n
  }
  get(col, key) {
    const row = this.db
      .prepare(`SELECT v FROM "${this.ensure(col)}" WHERE k = ?`)
      .get(String(key))
    return row ? JSON.parse(row.v) : null
  }
  set(col, key, value) {
    this.db
      .prepare(
        `INSERT INTO "${this.ensure(col)}" (k, v) VALUES (?, ?)
         ON CONFLICT(k) DO UPDATE SET v = excluded.v`,
      )
      .run(String(key), JSON.stringify(value))
    return value
  }
  update(col, key, patch) {
    const cur = this.get(col, key)
    const next =
      cur && typeof cur === 'object' && !Array.isArray(cur)
        ? { ...cur, ...patch }
        : patch
    return this.set(col, key, next)
  }
  del(col, key) {
    const r = this.db
      .prepare(`DELETE FROM "${this.ensure(col)}" WHERE k = ?`)
      .run(String(key))
    return r.changes > 0
  }
  has(col, key) {
    return this.get(col, key) !== null
  }
  all(col) {
    const out = {}
    for (const row of this.db.prepare(`SELECT k, v FROM "${this.ensure(col)}"`).all())
      out[row.k] = JSON.parse(row.v)
    return out
  }
  keys(col) {
    return this.db.prepare(`SELECT k FROM "${this.ensure(col)}"`).all().map((r) => r.k)
  }
  size(col) {
    return this.db.prepare(`SELECT COUNT(*) AS c FROM "${this.ensure(col)}"`).get().c
  }
  close() {
    try {
      this.db.close()
    } catch {}
  }
}

let store = null

export async function initDB() {
  if (store) return store
  const dir = path.resolve(config.db.dir)
  if (config.db.type === 'sqlite') {
    store = new SQLiteStore(dir)
    logger.info(`db: sqlite (${path.join(dir, 'telebot.db')})`)
  } else {
    store = new JSONStore(dir)
    logger.info('db: json (' + dir + ')')
  }
  return store
}

export const getDB = () => store || initDB()

export default { initDB, getDB }
