/**
 * Telebot © 2025 slowlyh — plugin: profil user.
 */
import { Markup } from 'telegraf'
import config from '#config'
import {
  getUser,
  ensureUser,
  expNeeded,
  maxLimitFor,
  fmtMoney,
  progressBar,
} from '#lib/user'

const fmtDate = (ms) =>
  ms ? new Date(ms).toLocaleString('id-ID', { timeZone: config.tz, hour12: false }) : '-'

export default {
  name: 'profile',
  description: 'Lihat profil, saldo, limit, level, dan EXP kamu',
  command: ['profile', 'profil', 'me', 'akun'],
  hidden: false,
  category: 'user',
  cooldown: 2,
  usage: '$prefix$command',

  handler: async ({ ctx, DB }) => {
    if (ctx.chat.type !== 'private') {
      const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=profile`
      return ctx.reply(`👤 Profil tersedia di private chat: ${link}`)
    }

    const target = ctx.message.reply_to_message?.from || ctx.from
    const u = target.id === ctx.from.id ? ensureUser(DB, ctx.from) : getUser(DB, target.id)

    if (!u) {
      return ctx.reply('❌ User belum terdaftar. Kirim /daftar dulu.')
    }
    if (!u.registered) {
      return ctx.reply('❌ Akun belum terdaftar. Kirim /daftar untuk mendaftar.')
    }

    const need = expNeeded(u.level)
    const maxLimit = u.maxLimit ?? maxLimitFor(u.level)
    const bar = progressBar(u.exp, need)
    const cur = config.economy.currency

    const text = [
      `👤 <b>PROFIL ${(u.regName || u.name || 'User').toUpperCase()}</b>`,
      '',
      `🆔 ID       : <code>${u.id || target.id}</code>`,
      u.username ? `🔗 Username : @${u.username}` : null,
      `🎂 Umur     : <b>${u.age ?? '-'}</b>`,
      `🏅 Level    : <b>${u.level}</b> ${u.premium ? '⭐' : ''}`,
      `✨ EXP      : <b>${u.exp}/${need}</b>`,
      `📊 Progres  : ${bar}`,
      '',
      `${cur} Saldo    : <b>${fmtMoney(u.balance)}</b>`,
      `🎫 Limit    : <b>${u.limit}/${maxLimit}</b>`,
      `⚔️ RPG      : <b>${u.rpg ? 'Aktif' : 'Belum join'}</b>`,
      '',
      `📈 Total earn  : ${cur} ${fmtMoney(u.totalEarn)}`,
      `📉 Total spend : ${cur} ${fmtMoney(u.totalSpend)}`,
      `📅 Terdaftar   : ${fmtDate(u.createdAt)}`,
      `🕐 Terakhir    : ${fmtDate(u.lastSeen)}`,
    ]
      .filter(Boolean)
      .join('\n')

    const kb = Markup.inlineKeyboard([
      [
        Markup.button.callback('💰 Balance', 'u:balance'),
        Markup.button.callback('🎫 Limit', 'u:limit'),
      ],
      [
        Markup.button.callback('⚔️ RPG', 'u:rpg'),
        Markup.button.callback('🎒 Inventori', 'u:inv'),
      ],
      [Markup.button.callback('🏠 Menu', 'm:home')],
    ])

    return ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb.reply_markup })
  },
}
