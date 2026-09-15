/**
 * Telebot © 2025 slowlyh — plugin: join RPG.
 */
import config from '#config'
import { ensureUser, fmtMoney, addBalance } from '#lib/user'
import { statsOf } from '#lib/rpg'

export default {
  name: 'joinrpg',
  description: 'Gabung ke mode RPG (wajib daftar akun dulu)',
  command: ['joinrpg', 'rpgjoin', 'mulai'],
  hidden: false,
  category: 'rpg',
  cooldown: 3,
  usage: '$prefix$command',

  handler: async ({ ctx, DB }) => {
    if (ctx.chat.type !== 'private') {
      const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=joinrpg`
      return ctx.reply(`⚔️ Join RPG di private chat: ${link}`)
    }

    const u = ensureUser(DB, ctx.from)
    if (!u.registered) {
      return ctx.reply('❌ Kamu harus <b>daftar</b> dulu sebelum join RPG.\nKirim /daftar untuk mendaftar.', {
        parse_mode: 'HTML',
      })
    }
    if (u.rpg) {
      const s = statsOf(DB, ctx.from.id)
      return ctx.reply(
        `✅ Kamu sudah tergabung di RPG.\n\n⚔️ ATK <b>${s.atk}</b> · 🛡️ DEF <b>${s.def}</b> · 🍀 LUCK <b>${s.luck}</b>%\n\nMulai petualangan: /adventure`,
        { parse_mode: 'HTML' },
      )
    }

    const cost = config.rpg.joinCost
    const cur = config.economy.currency
    if (u.balance < cost) {
      return ctx.reply(
        `❌ Butuh ${cur} <b>${fmtMoney(cost)}</b> untuk join RPG.\nSaldo kamu: ${cur} <b>${fmtMoney(u.balance)}</b>`,
        { parse_mode: 'HTML' },
      )
    }

    addBalance(DB, ctx.from.id, -cost)
    DB.update('users', String(ctx.from.id), { rpg: true, hp: 100, equip: {} })

    const s = statsOf(DB, ctx.from.id)
    return ctx.reply(
      [
        '⚔️ <b>SELAMAT BERGABUNG DI RPG!</b>',
        '',
        `💸 Biaya join : ${cur} <b>${fmtMoney(cost)}</b>`,
        '',
        '📊 <b>Stat Awal</b>',
        `⚔️ ATK  : <b>${s.atk}</b>`,
        `🛡️ DEF  : <b>${s.def}</b>`,
        `🍀 LUCK : <b>${s.luck}%</b>`,
        `❤️ HP   : <b>100/100</b>`,
        '',
        '🎮 Perintah tersedia:',
        '• /adventure — bertualang & cari loot',
        '• /inventori — lihat tas kamu',
        '• /shop — beli item',
        '• /sell — jual item',
        '• /equip — pakai item',
      ].join('\n'),
      { parse_mode: 'HTML' },
    )
  },
}
