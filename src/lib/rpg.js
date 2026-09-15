/**
 * Telebot © 2025 slowlyh — data & logika RPG dasar.
 * Item, shop, inventory, dan simulasi adventure.
 */
import crypto from 'node:crypto'

export const ITEMS = {
  potion: { id: 'potion', name: 'Potion Kecil', emoji: '🧪', price: 300, sell: 150, desc: 'Memulihkan 30 HP saat adventure.', heal: 30, type: 'consumable' },
  elixir: { id: 'elixir', name: 'Elixir Besar', emoji: '🍶', price: 1200, sell: 600, desc: 'Memulihkan 100 HP saat adventure.', heal: 100, type: 'consumable' },
  sword: { id: 'sword', name: 'Pedang Baja', emoji: '⚔️', price: 2500, sell: 1200, desc: '+8 ATK permanen.', atk: 8, type: 'weapon' },
  axe: { id: 'axe', name: 'Kapak Perang', emoji: '🪓', price: 5000, sell: 2500, desc: '+18 ATK permanen.', atk: 18, type: 'weapon' },
  armor: { id: 'armor', name: 'Armor Kulit', emoji: '🥋', price: 2000, sell: 1000, desc: '+10 DEF permanen.', def: 10, type: 'armor' },
  shield: { id: 'shield', name: 'Perisai Besi', emoji: '🛡️', price: 4500, sell: 2200, desc: '+22 DEF permanen.', def: 22, type: 'armor' },
  ring: { id: 'ring', name: 'Cincin Keberuntungan', emoji: '💍', price: 8000, sell: 4000, desc: '+15% peluang loot langka.', luck: 15, type: 'accessory' },
  fish: { id: 'fish', name: 'Ikan Segar', emoji: '🐟', price: 120, sell: 60, desc: 'Bahan hasil adventure.', type: 'material' },
  gem: { id: 'gem', name: 'Permata', emoji: '💎', price: 0, sell: 900, desc: 'Loot langka, bisa dijual mahal.', type: 'material' },
  wood: { id: 'wood', name: 'Kayu', emoji: '🪵', price: 60, sell: 30, desc: 'Bahan hasil adventure.', type: 'material' },
}

export const SHOP_ORDER = ['potion', 'elixir', 'armor', 'sword', 'shield', 'axe', 'ring', 'wood', 'fish']

export const ZONES = [
  { id: 'hutan', name: 'Hutan Pinus', emoji: '🌲', minLevel: 1, exp: 20, gold: [40, 120], hp: [10, 30], loot: ['wood', 'fish'], rare: 'gem' },
  { id: 'gua', name: 'Gua Gelap', emoji: '🕳️', minLevel: 2, exp: 40, gold: [90, 240], hp: [20, 45], loot: ['fish', 'wood'], rare: 'gem' },
  { id: 'gunung', name: 'Gunung Berapi', emoji: '🌋', minLevel: 4, exp: 75, gold: [180, 420], hp: [35, 70], loot: ['gem', 'wood'], rare: 'ring' },
  { id: 'reruntuhan', name: 'Reruntuhan Kuno', emoji: '🏛️', minLevel: 6, exp: 120, gold: [300, 700], hp: [55, 100], loot: ['gem', 'fish'], rare: 'gem' },
]

const pick = (arr) => arr[crypto.randomInt(arr.length)]
const between = ([a, b]) => a + crypto.randomInt(b - a + 1)

export function getItem(id) {
  return ITEMS[id] || null
}

export function shopList() {
  return SHOP_ORDER.map((id) => ITEMS[id]).filter(Boolean)
}

export function inventoryOf(DB, userId) {
  return DB.get('inventory', String(userId)) || {}
}

export function addItem(DB, userId, itemId, qty = 1) {
  if (!ITEMS[itemId]) return null
  const inv = inventoryOf(DB, userId)
  inv[itemId] = (inv[itemId] || 0) + qty
  DB.set('inventory', String(userId), inv)
  return inv[itemId]
}

export function removeItem(DB, userId, itemId, qty = 1) {
  const inv = inventoryOf(DB, userId)
  if (!inv[itemId] || inv[itemId] < qty) return false
  inv[itemId] -= qty
  if (inv[itemId] <= 0) delete inv[itemId]
  DB.set('inventory', String(userId), inv)
  return true
}

export function equipmentOf(DB, userId) {
  const u = DB.get('users', String(userId)) || {}
  return u.equip || {}
}

/** total bonus stat dari equipment */
export function statsOf(DB, userId) {
  const equip = equipmentOf(DB, userId)
  let atk = 10
  let def = 5
  let luck = 0
  for (const itemId of Object.values(equip)) {
    const it = ITEMS[itemId]
    if (!it) continue
    atk += it.atk || 0
    def += it.def || 0
    luck += it.luck || 0
  }
  return { atk, def, luck }
}

/** pakai item consumable → return hasil */
export function consumeItem(DB, userId, itemId, hp, maxHp) {
  const it = ITEMS[itemId]
  if (!it || it.type !== 'consumable') return null
  if (!removeItem(DB, userId, itemId, 1)) return null
  const healed = Math.min(it.heal, maxHp - hp)
  return { healed, hp: hp + healed, name: it.name }
}

/** satu ronde adventure: mengembalikan narasi + hadiah */
export function adventureRound(DB, userId, user) {
  const stats = statsOf(DB, userId)
  const available = ZONES.filter((z) => (user.level || 1) >= z.minLevel)
  const zone = pick(available.length ? available : [ZONES[0]])

  const hpMax = 100 + (user.level - 1) * 20
  const curHp = user.hp ?? hpMax

  const enemy = pick([
    '🐗 Babi Hutan Liar',
    '🐺 Serigala Abu',
    '🦂 Kalajengking Raksasa',
    '👹 Goblin Perampok',
    '🕷️ Laba-laba Raksasa',
    '🐻 Beruang Cokelat',
    '🧟 Zombie Lapuk',
  ])

  const enemyAtk = 12 + zone.minLevel * 6 + crypto.randomInt(12)
  const enemyHp = 40 + zone.minLevel * 20 + crypto.randomInt(30)

  let playerHp = curHp
  let foeHp = enemyHp
  let rounds = 0
  const log = []

  while (playerHp > 0 && foeHp > 0 && rounds < 12) {
    rounds++
    const dmg = Math.max(1, stats.atk + crypto.randomInt(8) - crypto.randomInt(4))
    foeHp -= dmg
    log.push(`⚔️ Kamu menyerang ${enemy} — <b>${dmg}</b> dmg`)
    if (foeHp <= 0) break
    const inc = Math.max(1, enemyAtk - stats.def + crypto.randomInt(6))
    playerHp -= inc
    log.push(`💥 ${enemy} membalas — <b>${inc}</b> dmg`)
  }

  const win = foeHp <= 0 && playerHp > 0
  const rewards = { exp: 0, gold: 0, items: [] }

  if (win) {
    rewards.exp = zone.exp + crypto.randomInt(zone.exp)
    rewards.gold = between(zone.gold)
    const lootId = pick(zone.loot)
    rewards.items.push({ id: lootId, qty: 1 })
    const luckRoll = crypto.randomInt(100)
    if (luckRoll < 12 + stats.luck) {
      rewards.items.push({ id: zone.rare, qty: 1 })
    }
  } else {
    rewards.exp = Math.floor(zone.exp * 0.25)
    rewards.gold = Math.floor(between(zone.gold) * 0.2)
  }

  return {
    zone,
    enemy,
    win,
    rounds,
    log,
    playerHp: Math.max(0, playerHp),
    hpMax,
    rewards,
    stats,
  }
}

export default {
  ITEMS,
  SHOP_ORDER,
  ZONES,
  getItem,
  shopList,
  inventoryOf,
  addItem,
  removeItem,
  equipmentOf,
  statsOf,
  consumeItem,
  adventureRound,
}
