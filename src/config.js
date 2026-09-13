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
}

export const isOwner = (id) => config.ownerIds.includes(Number(id))

export default config
