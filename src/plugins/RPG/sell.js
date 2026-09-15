/**
 * Telebot © 2025 slowlyh — plugin: jual item RPG.
 */
import config from '#config'
import { ensureUser, addBalance, fmtMoney } from '#lib/user'
import { inventoryOf, removeItem, ITEMS } from '#lib/rpg'

export default {
  name: 'sell',
  description: 'Jual item dari inventori untuk mendapat gold',
  command: ['sell', 'jual'],
  hidden: false,
  category: 'rpg',
  cooldown: 2,
  usage: '$prefix$command <nama item> [jumlah]',

  handler: async ({ ctx, DB, args }) => {
    if (ctx.chat.type !== 'private') {
      const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=sell`
      return ctx.reply(`💱 Jual item di private chat: ${link}`)
    }

    const u = ensureUser(DB, ctx.from)
    if (!u.registered) return ctx.reply('❌ Daftar dulu: /daftar')

    const inv = inventoryOf(DB, ctx.from.id)
    const cur = config.economy.currency

    if (!args.length) {
      const entries = Object.entries(inv).filter(([, q]) => q > 0)
      if (!entries.length) return ctx.reply('🎒 Inventori kamu kosong.')
      const lines = entries.map(([id, qty]) => {
        const it = ITEMS[id]
        return it ? `${it.emoji} <b>${it.name}</b> ×${qty} → ${cur} ${fmtMoney(it.sell)}/pcs` : null
      })
      return ctx.reply(
        ['💱 <b>JUAL ITEM</b>', '', lines.filter(Boolean).join('\n'), '', '<i>Pakai: /sell &lt;id&gt; [jumlah]</i>'].join('\n'),
        { parse_mode: 'HTML' },
      )
    }

    const query = args[0].toLowerCase()
    const qty = Math.max(1, Number(args[1]) || 1)

    const it = ITEMS[query] || Object.values(ITEMS).find((x) => x.name.toLowerCase().includes(query)) || null
    if (!it) return ctx.reply('❌ Item tidak ditemukan di inventori kamu.')

    const have = inv[it.id] || 0
    if (have < qty) {
      return ctx.reply(`❌ Kamu hanya punya <b>${have}</b> × ${it.name}.`, { parse_mode: 'HTML' })
    }

    const total = it.sell * qty
    removeItem(DB, ctx.from.id, it.id, qty)
    addBalance(DB, ctx.from.id, total)

    return ctx.reply(
      [
        '💱 <b>PENJUALAN BERHASIL</b>',
        '',
        `${it.emoji} <b>${it.name}</b> ×${qty}`,
        `${cur} Dapat : <b>+${fmtMoney(total)}</b>`,
        `${cur} Saldo : <b>${fmtMoney(u.balance + total)}</b>`,
      ].join('\n'),
      { parse_mode: 'HTML' },
    )
  },
}
