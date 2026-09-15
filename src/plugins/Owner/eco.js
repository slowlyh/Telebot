/**
 * Telebot © 2025 slowlyh — plugin owner: kelola ekonomi & user.
 */
import config from '#config'
import { getUser, addBalance, addLimit, refillLimit, fmtMoney } from '#lib/user'

const ECO_KEYS = {
  registerBonus: 'bonus daftar',
  registerLimit: 'limit daftar',
  dailyBonus: 'bonus daily',
  dailyCooldownMs: 'cooldown daily (ms)',
  captchaLength: 'panjang captcha',
  captchaTtlMs: 'masa berlaku captcha (ms)',
  joinCost: 'biaya join RPG',
  adventureCost: 'biaya adventure (limit)',
  adventureExp: 'exp adventure',
}

export default {
  name: 'owner-eco',
  description: 'Kelola ekonomi & user: seteco, addsaldo, addlimit, resetlimit, userinfo',
  command: ['seteco', 'addsaldo', 'addlimit', 'resetlimit', 'userinfo'],
  hidden: false,
  category: 'owner',
  cooldown: 2,
  usage: '$prefix$command <args>',
  owner: true,

  handler: async ({ ctx, command, args, DB }) => {
    // /seteco [key] [value]
    if (command === 'seteco') {
      if (!args.length) {
        const lines = Object.entries(ECO_KEYS).map(([k, label]) => {
          const val = k in config.economy ? config.economy[k] : config.rpg[k]
          return `• <code>${k}</code> — ${label}: <b>${val}</b>`
        })
        return ctx.reply(
          ['⚙️ <b>PENGATURAN EKONOMI</b>', '', lines.join('\n'), '', '<i>Ubah: /seteco &lt;key&gt; &lt;nilai&gt;</i>', '<i>Catatan: perubahan bersifat sementara (runtime), set permanen via .env</i>'].join('\n'),
          { parse_mode: 'HTML' },
        )
      }
      const key = args[0]
      if (!ECO_KEYS[key]) return ctx.reply('❌ Key tidak dikenal. Kirim /seteco untuk daftar.')
      const val = Number(args[1])
      if (!Number.isFinite(val)) return ctx.reply('❌ Nilai harus angka.')
      const target = key in config.economy ? config.economy : config.rpg
      target[key] = val
      return ctx.reply(`✅ <code>${key}</code> → <b>${val}</b>`, { parse_mode: 'HTML' })
    }

    // target user: reply, argumen @username, atau ID
    const targetId = await resolveTarget(ctx, args, DB)
    if (!targetId) return ctx.reply('📖 Reply user, atau sertakan ID: /' + command + ' <id> [jumlah]')

    const u = getUser(DB, targetId)
    if (!u) return ctx.reply('❌ User tidak ditemukan di database.')

    if (command === 'userinfo') {
      return ctx.reply(
        [
          `👤 <b>INFO USER</b>`,
          `Nama   : <b>${u.regName || u.name}</b>`,
          `ID     : <code>${targetId}</code>`,
          `Daftar : <b>${u.registered ? 'Ya' : 'Tidak'}</b>`,
          `Level  : <b>${u.level}</b> · EXP <b>${u.exp}</b>`,
          `Saldo  : ${config.economy.currency} <b>${fmtMoney(u.balance)}</b>`,
          `Limit  : <b>${u.limit}/${u.maxLimit}</b>`,
          `RPG    : <b>${u.rpg ? 'Aktif' : 'Tidak'}</b>`,
        ].join('\n'),
        { parse_mode: 'HTML' },
      )
    }

    const amount = Number(args[args.length - 1])
    if (!Number.isFinite(amount)) return ctx.reply('❌ Jumlah harus angka.')

    if (command === 'addsaldo') {
      const bal = addBalance(DB, targetId, amount)
      return ctx.reply(`✅ Saldo <code>${targetId}</code> → ${config.economy.currency} <b>${fmtMoney(bal)}</b>`, {
        parse_mode: 'HTML',
      })
    }
    if (command === 'addlimit') {
      const lim = addLimit(DB, targetId, amount)
      return ctx.reply(`✅ Limit <code>${targetId}</code> → <b>${lim}</b>`, { parse_mode: 'HTML' })
    }
    if (command === 'resetlimit') {
      const lim = refillLimit(DB, targetId)
      return ctx.reply(`✅ Limit <code>${targetId}</code> diisi penuh → <b>${lim}</b>`, { parse_mode: 'HTML' })
    }
  },
}

async function resolveTarget(ctx, args, DB) {
  const reply = ctx.message?.reply_to_message?.from
  if (reply) return String(reply.id)

  for (const a of args) {
    const clean = String(a).replace(/[^0-9]/g, '')
    if (clean && DB.get('users', clean)) return clean
  }
  return null
}
