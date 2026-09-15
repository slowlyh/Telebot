/**
 * Telebot © 2025 slowlyh — plugin: inventori RPG.
 */
import { Markup } from 'telegraf'
import { ensureUser } from '#lib/user'
import { inventoryOf, ITEMS, statsOf } from '#lib/rpg'

export default {
  name: 'inventori',
  description: 'Lihat isi tas & item yang dipakai',
  command: ['inventori', 'inventory', 'inv', 'tas', 'bag'],
  hidden: false,
  category: 'rpg',
  cooldown: 2,
  usage: '$prefix$command',

  handler: async ({ ctx, DB }) => {
    if (ctx.chat.type !== 'private') {
      const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=inventori`
      return ctx.reply(`🎒 Inventori di private chat: ${link}`)
    }

    const u = ensureUser(DB, ctx.from)
    if (!u.registered) return ctx.reply('❌ Daftar dulu: /daftar')

    const inv = inventoryOf(DB, ctx.from.id)
    const entries = Object.entries(inv).filter(([, q]) => q > 0)

    if (!entries.length) {
      return ctx.reply(
        '🎒 <b>INVENTORI KOSONG</b>\n\nCari item dengan /adventure atau beli di /shop.',
        { parse_mode: 'HTML' },
      )
    }

    const equip = u.equip || {}
    const lines = entries.map(([id, qty]) => {
      const it = ITEMS[id]
      if (!it) return `• ${id} ×${qty}`
      const worn = Object.values(equip).includes(id) ? ' <i>(dipakai)</i>' : ''
      return `${it.emoji} <b>${it.name}</b> ×${qty}${worn}\n   <i>${it.desc}</i>`
    })

    const s = statsOf(DB, ctx.from.id)
    const hpMax = 100 + (u.level - 1) * 20

    const text = [
      '🎒 <b>INVENTORI</b>',
      '',
      lines.join('\n'),
      '',
      '📊 <b>Stat Saat Ini</b>',
      `❤️ HP   : <b>${u.hp ?? hpMax}/${hpMax}</b>`,
      `⚔️ ATK  : <b>${s.atk}</b>`,
      `🛡️ DEF  : <b>${s.def}</b>`,
      `🍀 LUCK : <b>${s.luck}%</b>`,
      '',
      `<i>Pakai item: /equip &lt;nama item&gt;</i>`,
    ].join('\n')

    const kb = Markup.inlineKeyboard([
      [Markup.button.callback('🛒 Shop', 'u:shop'), Markup.button.callback('⚔️ Adventure', 'u:adv')],
      [Markup.button.callback('🏠 Menu', 'm:home')],
    ])

    return ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb.reply_markup })
  },
}
