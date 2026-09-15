/**
 * Telebot © 2025 slowlyh — plugin: saldo & limit user.
 */
import { Markup } from 'telegraf'
import config from '#config'
import { ensureUser, maxLimitFor, fmtMoney, progressBar } from '#lib/user'

export default {
  name: 'balance',
  description: 'Cek saldo, limit, dan isi ulang limit',
  command: ['balance', 'saldo', 'bal', 'limit', 'refill'],
  hidden: false,
  category: 'user',
  cooldown: 2,
  usage: '$prefix$command',

  handler: async ({ ctx, DB, command }) => {
    if (ctx.chat.type !== 'private') {
      const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=balance`
      return ctx.reply(`💰 Cek saldo di private chat: ${link}`)
    }

    const u = ensureUser(DB, ctx.from)
    if (!u.registered) {
      return ctx.reply('❌ Kamu belum terdaftar. Kirim /daftar dulu ya.')
    }

    const cur = config.economy.currency
    const maxLimit = u.maxLimit ?? maxLimitFor(u.level)
    const bar = progressBar(u.limit, maxLimit)

    if (command === 'refill') {
      if (u.limit >= maxLimit) {
        return ctx.reply(`✅ Limit kamu sudah penuh (<b>${u.limit}/${maxLimit}</b>).`, { parse_mode: 'HTML' })
      }
      const cost = (maxLimit - u.limit) * 100
      if (u.balance < cost) {
        return ctx.reply(
          `❌ Saldo tidak cukup.\nButuh ${cur} <b>${fmtMoney(cost)}</b>, saldo kamu ${cur} <b>${fmtMoney(u.balance)}</b>.`,
          { parse_mode: 'HTML' },
        )
      }
      DB.update('users', String(ctx.from.id), {
        balance: u.balance - cost,
        totalSpend: (u.totalSpend || 0) + cost,
        limit: maxLimit,
      })
      return ctx.reply(
        `✅ Limit diisi ulang ke <b>${maxLimit}</b>.\n${cur} Biaya: <b>${fmtMoney(cost)}</b>`,
        { parse_mode: 'HTML' },
      )
    }

    const text = [
      `💰 <b>SALDO & LIMIT</b>`,
      '',
      `${cur} Saldo : <b>${fmtMoney(u.balance)}</b>`,
      `🎫 Limit : <b>${u.limit}/${maxLimit}</b>`,
      `📊 ${bar}`,
      '',
      `<i>Limit dipakai untuk menjalankan perintah berbayar.</i>`,
      `<i>Isi ulang limit: /refill (100 per limit).</i>`,
    ].join('\n')

    const kb = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Isi Ulang Limit', 'u:refill')],
      [Markup.button.callback('🗓️ Daily', 'u:daily'), Markup.button.callback('🏠 Menu', 'm:home')],
    ])

    return ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb.reply_markup })
  },
}
