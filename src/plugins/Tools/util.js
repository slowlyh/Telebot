/**
 * Telebot © 2025 slowlyh — plugin: utilitas lokal tanpa API eksternal.
 */
import os from 'os'

const bytes = (n) => `${(n / 1048576).toFixed(1)} MB`

export default {
  name: 'tools',
  description: 'Utility offline: hapus, halo, listuser, cek',
  command: ['hapus', 'halo', 'listuser', 'cek'],
  hidden: false,
  category: 'tools',
  cooldown: 2,
  usage: '$prefix$command',

  handler: async ({ ctx, command, DB }) => {
    if (command === 'hapus') {
      const msg = ctx.message.reply_to_message
      if (!msg) return ctx.reply('↩️ Reply pesan yang mau dihapus.')
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id)
      } catch {
        return ctx.reply('⛔ Bot tidak punya hak hapus (perlu admin).')
      }
      const sent = await ctx.reply('🗑️ Dihapus.')
      setTimeout(() => {
        ctx.telegram.deleteMessage(ctx.chat.id, sent.message_id).catch(() => {})
      }, 3000)
      return
    }

    if (command === 'halo') {
      const name = ctx.from.first_name
      return ctx.reply(`👋 Hai ${name}! Bot online — kirim /menu untuk lihat fitur.`)
    }

    if (command === 'listuser') {
      const users = DB.all('users')
      const ids = Object.keys(users)
      if (!ids.length) return ctx.reply('Belum ada user tercatat.')
      const registered = ids.filter((id) => users[id].registered)
      const lines = ids
        .slice(0, 40)
        .map((id) => {
          const u = users[id]
          const tag = u.registered ? '✅' : '⬜'
          const bal = (u.balance || 0).toLocaleString('id-ID')
          return `${tag} ${u.regName || u.name}${u.username ? ' (@' + u.username + ')' : ''} — Lv${u.level || 1} · 💰${bal} · 🎫${u.limit ?? 0} — <code>${id}</code>`
        })
      return ctx.reply(
        `👥 <b>${ids.length}</b> user (${registered.length} terdaftar)\n\n${lines.join('\n')}`,
        { parse_mode: 'HTML' },
      )
    }

    if (command === 'cek') {
      const c = ctx.chat
      return ctx.reply(
        [
          `🧾 <b>Info chat ini</b>`,
          `Type : <code>${c.type}</code>`,
          `ID   : <code>${c.id}</code>`,
          c.username ? `UN   : <code>@${c.username}</code>` : null,
          `Host : ${os.hostname()} · ${os.platform()} ${os.arch()}`,
          `RAM  : ${bytes(os.totalmem() - os.freemem())} / ${bytes(os.totalmem())}`,
        ]
          .filter(Boolean)
          .join('\n'),
        { parse_mode: 'HTML' },
      )
    }
  },
}
