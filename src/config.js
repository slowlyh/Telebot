/**
 * Telebot © 2025 slowlyh — konfigurasi terpusat.
 * Nilai bisa di-set lewat .env / environment variable.
 */
import 'dotenv/config'

const env = (key, fallback) => {
  const v = process.env[key]
  return v === undefined || v === '' ? fallback : v
}

export const config = {
  token: env('BOT_TOKEN', ''),
  prefix: env('BOT_PREFIX', '/'),
  ownerIds: env('OWNER_IDS', '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number),
  tz: env('TZ', 'Asia/Jakarta'),

  // Database: 'json' (default) atau 'sqlite' — user bisa ganti di .env (DB_TYPE).
  db: {
    type: env('DB_TYPE', 'json').toLowerCase() === 'sqlite' ? 'sqlite' : 'json',
    dir: env('DB_DIR', 'data'),
  },

  // Tampilan menu — semua bisa diubah owner via menu settings (/menu → ⚙️).
  menu: {
    photo: env('MENU_PHOTO', 'https://img1.pixhost.to/images/9569/653523193_image.jpg'),
    title: env('MENU_TITLE', 'Telebot'),
    subtitle: env('MENU_SUBTITLE', 'Modular Telegram bot — Telegraf'),
    footer: env('MENU_FOOTER', '© 2025 slowlyh — hyuu.tech'),
    repoUrl: env('MENU_REPO_URL', 'https://github.com/slowlyh/Telebot'),
    siteUrl: env('MENU_SITE_URL', 'https://hyuu.tech'),
    // style: 'photo' = gambar + tombol kategori | 'text' = tanpa gambar
    style: env('MENU_STYLE', 'photo'),
  },

  // Ekonomi & RPG dasar — bisa diubah owner via /seteco.
  economy: {
    registerBonus: Number(env('ECO_REGISTER_BONUS', '5000')),
    registerLimit: Number(env('ECO_REGISTER_LIMIT', '25')),
    dailyBonus: Number(env('ECO_DAILY_BONUS', '1500')),
    dailyCooldownMs: Number(env('ECO_DAILY_COOLDOWN_MS', String(20 * 60 * 60 * 1000))),
    captchaTtlMs: Number(env('ECO_CAPTCHA_TTL_MS', '300000')),
    captchaLength: Number(env('ECO_CAPTCHA_LENGTH', '5')),
    currency: env('ECO_CURRENCY', '💰'),
  },

  // RPG dasar — dipakai plugin rpg.
  rpg: {
    minLevel: Number(env('RPG_MIN_LEVEL', '1')),
    joinCost: Number(env('RPG_JOIN_COST', '500')),
    adventureCost: Number(env('RPG_ADVENTURE_COST', '1')),
    adventureExp: Number(env('RPG_ADVENTURE_EXP', '25')),
  },
}

export const isOwner = (id) => config.ownerIds.includes(Number(id))

export default config
