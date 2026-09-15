/**
 * Telebot © 2025 slowlyh — plugin: pakai/pasang item RPG.
 */
import { ensureUser } from '#lib/user'
import { inventoryOf, equipmentOf, ITEMS, statsOf, consumeItem } from '#lib/rpg'

export default {
  name: 'equip',
  description: 'Pakai item: consumable (potion) atau pasang senjata/armor',
  command: ['equip', 'pakai', 'use'],
  hidden: false,
  category: 'rpg',
  cooldown: 2,
  usage: '$prefix$command <nama item>',

  handler: async ({ ctx, DB, args }) => {
    if (ctx.chat.type !== 'private') {
      const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=equip`
      return ctx.reply(`⚔️ Pakai item di private chat: ${link}`)
    }

    const u = ensureUser(DB, ctx.from)
    if (!u.registered) return ctx.reply('❌ Daftar dulu: /daftar')

    const inv = inventoryOf(DB, ctx.from.id)
    const entries = Object.entries(inv).filter(([, q]) => q > 0)

    if (!args.length) {
      if (!entries.length) return ctx.reply('🎒 Inventori kamu kosong.')
      const lines = entries.map(([id, qty]) => {
        const it = ITEMS[id]
        return it ? `${it.emoji} <b>${it.name}</b> ×${qty} — <code>${it.id}</code>\n   <i>${it.desc}</i>` : null
      })
      return ctx.reply(
        ['⚔️ <b>PAKAI ITEM</b>', '', lines.filter(Boolean).join('\n'), '', '<i>Pakai: /equip &lt;id&gt;</i>'].join('\n'),
        { parse_mode: 'HTML' },
      )
    }

    const query = args[0].toLowerCase()
    const it = ITEMS[query] || Object.values(ITEMS).find((x) => x.name.toLowerCase().includes(query)) || null
    if (!it) return ctx.reply('❌ Item tidak ditemukan.')
    if ((inv[it.id] || 0) <= 0) return ctx.reply(`❌ Kamu tidak punya <b>${it.name}</b>.`, { parse_mode: 'HTML' })

    // consumable → pakai langsung
    if (it.type === 'consumable') {
      const hpMax = 100 + (u.level - 1) * 20
      const hp = u.hp ?? hpMax
      if (hp >= hpMax) return ctx.reply(`✅ HP kamu sudah penuh (<b>${hp}/${hpMax}</b>).`, { parse_mode: 'HTML' })
      const res = consumeItem(DB, ctx.from.id, it.id, hp, hpMax)
      if (!res) return ctx.reply('❌ Gagal memakai item.')
      DB.update('users', String(ctx.from.id), { hp: res.hp })
      return ctx.reply(
        [
          `${it.emoji} <b>${it.name}</b> dipakai!`,
          `❤️ HP : <b>${res.hp}/${hpMax}</b> <i>(+${res.healed})</i>`,
        ].join('\n'),
        { parse_mode: 'HTML' },
      )
    }

    // weapon / armor / accessory → pasang
    const slot = it.type
    const equip = equipmentOf(DB, ctx.from.id)
    equip[slot] = it.id
    DB.update('users', String(ctx.from.id), { equip })

    const s = statsOf(DB, ctx.from.id)
    return ctx.reply(
      [
        `✅ <b>${it.name}</b> terpasang di slot <b>${slot}</b>.`,
        '',
        '📊 <b>Stat Sekarang</b>',
        `⚔️ ATK  : <b>${s.atk}</b>`,
        `🛡️ DEF  : <b>${s.def}</b>`,
        `🍀 LUCK : <b>${s.luck}%</b>`,
      ].join('\n'),
      { parse_mode: 'HTML' },
    )
  },
}
