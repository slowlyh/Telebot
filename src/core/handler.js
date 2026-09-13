/**
 * Telebot © 2025 slowlyh — dispatcher perintah plugin.
 * Menangani: parsing, prefix, cooldown, batasan grup/owner, statistik, error.
 */
import config, { isOwner } from '#config'
import logger from '#lib/logger'

const cooldowns = new Map() // `${name}:${chatId}` -> expiry

const onCooldown = (key, sec) => {
  const now = Date.now()
  const until = cooldowns.get(key) || 0
  if (until > now) return Math.ceil((until - now) / 1000)
  cooldowns.set(key, now + sec * 1000)
  return 0
}

export function makeHandler(ctx, DB, registry) {
  const msg = ctx.message
  const chatId = msg.chat.id
  const text = (msg.text || '').trim()

  // jalur callback / inline sudah diurus sebelum sampai sini
  if (!text.startsWith(config.prefix)) return

  const body = text.slice(config.prefix.length).trim()
  if (!body) return
  const [cmd, ...args] = body.split(/\s+/)
  const meta = registry.resolve(cmd.toLowerCase())
  if (!meta) return

  // simpan / update info user & grup
  if (ctx.from) {
    DB.update('users', String(ctx.from.id), {
      name: ctx.from.first_name,
      username: ctx.from.username || null,
      lastSeen: Date.now(),
    })
  }
  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    DB.update('groups', String(chatId), { title: msg.chat.title, at: Date.now() })
  }

  if (meta.owner && !isOwner(ctx.from?.id)) {
    return ctx.reply('⛔ Perintah ini khusus owner.')
  }
  if (meta.group && !['group', 'supergroup'].includes(msg.chat.type)) {
    return ctx.reply('ℹ️ Hanya bisa dipakai di grup.')
  }
  if (meta.cooldown) {
    const wait = onCooldown(`${meta.name}:${chatId}`, meta.cooldown)
    if (wait) return ctx.reply(`⏳ Tunggu ${wait}s sebelum pakai /${cmd} lagi.`)
  }

  const usage = (meta.usage || '$prefix$command').replace(/\$prefix/g, config.prefix)
  if (!args.length && usage.includes('<')) {
    return ctx.reply(`📖 ${usage.replace('$command', cmd)}`)
  }

  DB.update('stats', 'plugins', { [meta.name]: (DB.get('stats', 'plugins')?.[meta.name] || 0) + 1 })

  Promise.resolve(
    meta.handler({
      ctx,
      args,
      command: cmd.toLowerCase(),
      DB,
      registry,
      config,
      isOwner: isOwner(ctx.from?.id),
      logger,
    }),
  ).catch((err) => {
    logger.error(`plugin ${meta.name} error`, err)
    const fail = (meta.failed || 'Gagal: %error').replace('%command', cmd).slice(0, 100)
    ctx.reply(`❌ ${fail}\n<code>${(err?.message || String(err)).slice(0, 500)}</code>`, {
      parse_mode: 'HTML',
    })
  })
}
