/**
 * Telebot © 2025 slowlyh — plugin: hadiah harian (daily).
 */
import config from '#config'
import { ensureUser, addBalance, addExp, refillLimit, fmtMoney, expNeeded } from '#lib/user'

const humanize = (ms) => {
  const s = Math.ceil(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h ? `${h}j` : null, m ? `${m}m` : null, `${sec}d`].filter(Boolean).join(' ')
}

export default {
  name: 'daily',
  description: 'Klaim hadiah harian: saldo, EXP, dan isi ulang limit',
  command: ['daily', 'harian', 'claim'],
  hidden: false,
  category: 'user',
  cooldown: 3,
  usage: '$prefix$command',

  handler: async ({ ctx, DB }) => {
    if (ctx.chat.type !== 'private') {
      const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=daily`
      return ctx.reply(`🗓️ Klaim hadiah harian di private chat: ${link}`)
    }

    const u = ensureUser(DB, ctx.from)
    if (!u.registered) {
      return ctx.reply('❌ Kamu belum terdaftar. Kirim /daftar dulu ya.')
    }

    const now = Date.now()
    const cd = config.economy.dailyCooldownMs
    const elapsed = now - (u.lastDaily || 0)

    if (elapsed < cd) {
      return ctx.reply(`⏳ Hadiah harian belum siap. Coba lagi dalam <b>${humanize(cd - elapsed)}</b>.`, {
        parse_mode: 'HTML',
      })
    }

    // bonus naik seiring level
    const bonus = config.economy.dailyBonus + (u.level - 1) * 250
    const expGain = 50 + (u.level - 1) * 10
    const cur = config.economy.currency

    addBalance(DB, ctx.from.id, bonus)
    const lvl = addExp(DB, ctx.from.id, expGain)
    const limitNow = refillLimit(DB, ctx.from.id)

    const lines = [
      '🗓️ <b>HADIAH HARIAN</b>',
      '',
      `${cur} Saldo : <b>+${fmtMoney(bonus)}</b>`,
      `✨ EXP   : <b>+${expGain}</b>`,
      `🎫 Limit : diisi ulang → <b>${limitNow}</b>`,
      '',
      `🏅 Level : <b>${lvl.level}</b> (${lvl.exp}/${expNeeded(lvl.level)} EXP)`,
    ]

    if (lvl.leveled > 0) {
      lines.push('', `🎉 <b>NAIK LEVEL!</b> Kamu sekarang level <b>${lvl.level}</b>.`, `🎫 Batas limit baru: <b>${lvl.maxLimit}</b>`)
    }

    DB.update('users', String(ctx.from.id), { lastDaily: now })

    return ctx.reply(lines.join('\n'), { parse_mode: 'HTML' })
  },
}
