/**
 * Telebot © 2025 slowlyh — plugin: adventure RPG.
 */
import config from '#config'
import { ensureUser, useLimit, addExp, addBalance, fmtMoney } from '#lib/user'
import { adventureRound, addItem, ITEMS } from '#lib/rpg'

export default {
  name: 'adventure',
  description: 'Bertualang mencari loot, gold, dan EXP (butuh limit)',
  command: ['adventure', 'adv', 'petualangan', 'hunt'],
  hidden: false,
  category: 'rpg',
  cooldown: 4,
  usage: '$prefix$command',

  handler: async ({ ctx, DB }) => {
    if (ctx.chat.type !== 'private') {
      const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=adventure`
      return ctx.reply(`⚔️ Adventure di private chat: ${link}`)
    }

    const u = ensureUser(DB, ctx.from)
    if (!u.registered) return ctx.reply('❌ Daftar dulu: /daftar')
    if (!u.rpg) return ctx.reply('❌ Kamu belum join RPG. Kirim /joinrpg dulu.')

    const cost = config.rpg.adventureCost
    if (!useLimit(DB, ctx.from.id, cost)) {
      return ctx.reply(`🎫 Limit habis! Adventure butuh <b>${cost}</b> limit.\nIsi ulang: /refill`, {
        parse_mode: 'HTML',
      })
    }

    const hpMax = 100 + (u.level - 1) * 20

    // regenerasi HP berbasis waktu (5 HP / 3 menit) agar user tidak buntu permanen
    const elapsedMin = Math.floor((Date.now() - (u.lastAdventure || 0)) / 180000)
    let curHp = u.hp ?? hpMax
    if (elapsedMin > 0 && curHp < hpMax) {
      curHp = Math.min(hpMax, curHp + elapsedMin * 5)
      DB.update('users', String(ctx.from.id), { hp: curHp })
    }

    if (curHp <= 0) {
      return ctx.reply(
        `💀 HP kamu habis! HP pulih otomatis 5 per 3 menit (sekarang <b>${curHp}/${hpMax}</b>).\nAtau pakai potion: /equip potion`,
        { parse_mode: 'HTML' },
      )
    }

    const r = adventureRound(DB, ctx.from.id, { ...u, hp: curHp })
    const cur = config.economy.currency

    // terapkan hasil
    const patch = { hp: r.win ? Math.min(r.hpMax, r.playerHp) : 0, lastAdventure: Date.now() }
    DB.update('users', String(ctx.from.id), patch)

    addBalance(DB, ctx.from.id, r.rewards.gold)
    const lvl = addExp(DB, ctx.from.id, r.rewards.exp)

    const lootLines = []
    for (const loot of r.rewards.items) {
      addItem(DB, ctx.from.id, loot.id, loot.qty)
      const it = ITEMS[loot.id]
      lootLines.push(`${it.emoji} ${it.name} ×${loot.qty}`)
    }

    const lines = [
      `${r.zone.emoji} <b>${r.zone.name.toUpperCase()}</b>`,
      '',
      r.log.slice(-4).join('\n'),
      '',
      r.win ? '🏆 <b>KEMENANGAN!</b>' : '💀 <b>KAMU KALAH…</b>',
      '',
      `⚔️ Lawan : ${r.enemy}`,
      `🔄 Ronde : <b>${r.rounds}</b>`,
      `❤️ HP    : <b>${r.win ? r.playerHp : 0}/${r.hpMax}</b>`,
      '',
      '🎁 <b>Hadiah</b>',
      `✨ EXP   : <b>+${r.rewards.exp}</b>`,
      `${cur} Gold  : <b>+${fmtMoney(r.rewards.gold)}</b>`,
      lootLines.length ? `🎒 Loot  : ${lootLines.join(', ')}` : '🎒 Loot  : —',
    ]

    if (lvl.leveled > 0) {
      lines.push('', `🎉 <b>NAIK LEVEL ${lvl.level}!</b> Batas limit naik ke <b>${lvl.maxLimit}</b>.`)
    }
    if (!r.win) {
      lines.push('', '<i>HP habis — pakai /equip potion untuk memulihkan diri.</i>')
    }

    return ctx.reply(lines.join('\n'), { parse_mode: 'HTML' })
  },
}
