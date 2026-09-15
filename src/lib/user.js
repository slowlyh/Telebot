/**
 * Telebot © 2025 slowlyh — inti data user: profil, limit, exp/level, balance.
 * Semua angka user lewat sini agar konsisten di seluruh plugin.
 */
import config from '#config'

export const COL = 'users'

export const DEFAULT_USER = {
  registered: false,
  regName: null,
  age: null,
  limit: 25,
  maxLimit: 25,
  exp: 0,
  level: 1,
  balance: 0,
  totalEarn: 0,
  totalSpend: 0,
  rpg: false,
  hp: 100,
  equip: {},
  warn: 0,
  premium: false,
  createdAt: null,
  lastDaily: 0,
  lastLimit: 0,
  lastAdventure: 0,
}

export const maxLimitFor = (level) => 25 + (level - 1) * 5

/** exp yang dibutuhkan untuk naik dari `level` ke `level + 1` */
export const expNeeded = (level) => Math.floor(100 * Math.pow(level, 1.35))

export function getUser(DB, id) {
  const raw = DB.get(COL, String(id))
  if (!raw) return null
  return { ...DEFAULT_USER, ...raw }
}

export function ensureUser(DB, from) {
  const id = String(from.id)
  const existing = DB.get(COL, id)
  const base = {
    name: from.first_name || existing?.name || 'User',
    username: from.username || null,
    lastSeen: Date.now(),
  }
  if (!existing) {
    const fresh = { ...DEFAULT_USER, id, ...base, createdAt: Date.now() }
    DB.set(COL, id, fresh)
    return fresh
  }
  return DB.update(COL, id, base)
}

export function isRegistered(DB, id) {
  return Boolean(DB.get(COL, String(id))?.registered)
}

/** tambah exp; otomatis naik level & menambah batas limit. return info level-up */
export function addExp(DB, id, amount) {
  const u = getUser(DB, id)
  if (!u) return null
  let { exp, level } = u
  exp += Math.max(0, Math.floor(amount))
  let leveled = 0
  while (exp >= expNeeded(level)) {
    exp -= expNeeded(level)
    level += 1
    leveled += 1
  }
  const maxLimit = maxLimitFor(level)
  DB.update(COL, String(id), { exp, level, maxLimit })
  return { level, exp, leveled, maxLimit }
}

export function addBalance(DB, id, amount) {
  const u = getUser(DB, id)
  if (!u) return null
  const balance = Math.max(0, u.balance + Math.floor(amount))
  const patch = { balance }
  if (amount > 0) patch.totalEarn = (u.totalEarn || 0) + Math.floor(amount)
  if (amount < 0) patch.totalSpend = (u.totalSpend || 0) + Math.abs(Math.floor(amount))
  DB.update(COL, String(id), patch)
  return balance
}

export function addLimit(DB, id, amount) {
  const u = getUser(DB, id)
  if (!u) return null
  const maxLimit = u.maxLimit ?? maxLimitFor(u.level)
  const limit = Math.min(maxLimit, Math.max(0, (u.limit || 0) + Math.floor(amount)))
  DB.update(COL, String(id), { limit })
  return limit
}

/** pakai 1 limit; return false bila limit habis */
export function useLimit(DB, id, cost = 1) {
  const u = getUser(DB, id)
  if (!u) return false
  if ((u.limit || 0) < cost) return false
  DB.update(COL, String(id), { limit: u.limit - cost })
  return true
}

export function refillLimit(DB, id) {
  const u = getUser(DB, id)
  if (!u) return 0
  const maxLimit = u.maxLimit ?? maxLimitFor(u.level)
  DB.update(COL, String(id), { limit: maxLimit, lastLimit: Date.now() })
  return maxLimit
}

export const fmtMoney = (n) => Number(n || 0).toLocaleString('id-ID')

export const dailyBonus = () => config.economy.dailyBonus
export const registerBonus = () => config.economy.registerBonus
export const registerLimit = () => config.economy.registerLimit

export function progressBar(cur, max, size = 10) {
  const ratio = max <= 0 ? 0 : Math.min(1, cur / max)
  const filled = Math.round(ratio * size)
  return '▰'.repeat(filled) + '▱'.repeat(size - filled)
}

export default {
  COL,
  DEFAULT_USER,
  maxLimitFor,
  expNeeded,
  getUser,
  ensureUser,
  isRegistered,
  addExp,
  addBalance,
  addLimit,
  useLimit,
  refillLimit,
  fmtMoney,
  dailyBonus,
  registerBonus,
  registerLimit,
  progressBar,
}
