/**
 * Telebot © 2025 slowlyh — plugin: shop RPG.
 */
import { Markup } from 'telegraf'
import config from '#config'
import { ensureUser, addBalance, fmtMoney } from '#lib/user'
import { shopList, addItem, ITEMS } from '#lib/rpg'

export default {
  name: 'shop',
  description: 'Toko item RPG — beli senjata, armor, potion',
  command: ['shop', 'toko', 'beli', 'buy'],
  hidden: false,
  category: 'rpg',
  cooldown: 2,
  usage: '$prefix$command [nama item] [jumlah]',

  handler: async ({ ctx, DB, args }) => {
    if (ctx.chat.type !== 'private') {
      const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=shop`
      return ctx.reply(`🛒 Toko di private chat: ${link}`)
    }

    const u = ensureUser(DB, ctx.from)
    if (!u.registered) return ctx.reply('❌ Daftar dulu: /daftar')

    const cur = config.economy.currency
    const items = shopList()

    if (args.length) {
      const query = args[0].toLowerCase()
      const qty = Math.max(1, Math.min(99, Number(args[1]) || 1))
      const it =
        ITEMS[query] ||
        items.find((x) => x.name.toLowerCase().includes(query)) ||
        null

      if (!it || it.price <= 0) {
        return ctx.reply('❌ Item tidak ditemukan. Lihat daftar: /shop')
      }

      const total = it.price * qty
      if (u.balance < total) {
        return ctx.reply(
          `❌ Saldo tidak cukup.\nButuh ${cur} <b>${fmtMoney(total)}</b>, saldo kamu ${cur} <b>${fmtMoney(u.balance)}</b>.`,
          { parse_mode: 'HTML' },
        )
      }

      addBalance(DB, ctx.from.id, -total)
      addItem(DB, ctx.from.id, it.id, qty)

      return ctx.reply(
        [
          '✅ <b>PEMBELIAN BERHASIL</b>',
          '',
          `${it.emoji} <b>${it.name}</b> ×${qty}`,
          `${cur} Total : <b>${fmtMoney(total)}</b>`,
          `${cur} Sisa  : <b>${fmtMoney(u.balance - total)}</b>`,
          '',
          '<i>Pakai: /equip ' + it.id + '</i>',
        ].join('\n'),
        { parse_mode: 'HTML' },
      )
    }

    const lines = items.map((it) => {
      const price = it.price > 0 ? `${cur} ${fmtMoney(it.price)}` : '—'
      return `${it.emoji} <b>${it.name}</b> — ${price}\n   <code>${it.id}</code> · <i>${it.desc}</i>`
    })

    const text = [
      '🛒 <b>TOKO RPG</b>',
      '',
      `${cur} Saldo kamu: <b>${fmtMoney(u.balance)}</b>`,
      '',
      lines.join('\n'),
      '',
      '<i>Beli: /shop &lt;id&gt; [jumlah]</i>',
    ].join('\n')

    const rows = []
    const buyable = items.filter((it) => it.price > 0)
    for (let i = 0; i < buyable.length; i += 2) {
      rows.push(
        buyable
          .slice(i, i + 2)
          .map((it) => Markup.button.callback(`${it.emoji} ${it.name}`, `u:buy:${it.id}`)),
      )
    }
    rows.push([Markup.button.callback('🎒 Inventori', 'u:inv'), Markup.button.callback('🏠 Menu', 'm:home')])

    return ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(rows).reply_markup,
    })
  },
}
