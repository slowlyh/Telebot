/**
 * Telebot © 2025 slowlyh — bootstrap bot.
 * Dibawah supervisor main.js; plugin owner bisa kirim 'reset' via IPC untuk restart.
 */
import path from 'path'
import fs from 'fs'
import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import config from '#config'
import logger, { banner } from '#lib/logger'
import { initDB } from '#db'
import { Registry } from '#core/registry'
import { makeHandler } from '#core/handler'
import { showMenu, menuCallback, applyMenuPhoto, menuSettings } from '#core/menu'

const DB = await initDB()

// migrasi otomatis dari struktur lama (src/database/data/*.json) bila ada
try {
  const oldDir = path.join(process.cwd(), 'src', 'database', 'data')
  if (fs.existsSync(oldDir) && !DB.has('migrations', 'anichub')) {
    for (const f of fs.readdirSync(oldDir)) {
      if (!f.endsWith('.json')) continue
      const col = path.basename(f, '.json')
      if (DB.size(col) > 0) continue
      try {
        const obj = JSON.parse(fs.readFileSync(path.join(oldDir, f), 'utf-8'))
        for (const [k, v] of Object.entries(obj)) DB.set(col, k, v)
      } catch {}
    }
    DB.set('migrations', 'anichub', { at: Date.now() })
    logger.info('data lama dimigrasi ke ' + config.db.type)
  }
} catch (e) {
  logger.warn('migrasi data lama dilewati: ' + e.message)
}

const registry = new Registry(path.join(process.cwd(), 'src', 'plugins'))
await registry.loadAll()
registry.watch()

const bot = new Telegraf(config.token, { handlerTimeout: 180_000 })
bot.catch((err) => logger.error('telegram update error', err))

// /start → render menu (di private chat langsung; di grup diarahkan ke private)
const startOrMenu = (ctx) => {
  if (ctx.chat.type === 'private') return showMenu(ctx, DB, registry, 'home')
  const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=menu`
  return ctx.reply(`🤖 Buka menu di private chat: ${link}`)
}
bot.start(startOrMenu)

// foto → hanya relevan bila owner sedang menunggu "Atur Gambar"
bot.on(message('photo'), async (ctx) => {
  const pending = DB.get('pending', String(ctx.chat.id))
  if (pending?.type === 'menu_photo') return applyMenuPhoto(ctx, DB)
})

// callback menu / settings
bot.action(/^(m:|os:)/, async (ctx) => {
  try {
    await menuCallback(ctx, DB, registry, ctx.callbackQuery.data)
  } catch (e) {
    logger.error('menu callback error', e)
    await ctx.answerCbQuery('Terjadi kesalahan.', { show_alert: true }).catch(() => {})
  }
})

// semua pesan teks lain → dispatcher plugin
bot.on(message('text'), (ctx) => {
  // teks biasa membatalkan pending foto yang menggantung
  if (DB.get('pending', String(ctx.chat.id))?.type === 'menu_photo')
    DB.del('pending', String(ctx.chat.id))
  makeHandler(ctx, DB, registry)
})

bot
  .launch({ dropPendingUpdates: true })
  .then(() => {
    const s = menuSettings(DB)
    banner([
      ['bot', s.title],
      ['prefix', config.prefix],
      ['plugins', String(registry.stats().plugins)],
      ['db', config.db.type],
      ['node', process.version],
      ['owners', config.ownerIds.join(', ') || '-'],
    ])
    logger.info('bot aktif ✅')
  })
  .catch((e) => {
    logger.error('gagal launch', e)
    // token salah / tidak bisa getMe → fatal, jangan loop restart
    if (/Not Found|401|Unauthorized|getMe/i.test(String(e?.message || e))) {
      console.log('[fatal] BOT_TOKEN tidak valid — perbaiki .env lalu jalankan ulang.')
      process.exit(2)
    }
    process.exit(1)
  })

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
