/**
 * Telebot © 2025 slowlyh — plugin: pendaftaran user.
 * Alur: /daftar → nama → umur → kode verifikasi (teks) → ketik ulang kode → bonus awal.
 * State flow & kode captcha disimpan di DB agar tahan restart supervisor.
 */
import { generateCode } from '#lib/captcha'
import { registerFlow, startFlow, getFlow } from '#core/flow'
import config from '#config'
import logger from '#lib/logger'
import { ensureUser, maxLimitFor, fmtMoney, registerBonus, registerLimit } from '#lib/user'

const CAPTCHA_COL = 'captcha'
const MAX_TRIES = 3

registerFlow('daftar', {
  first: 'name',
  // dipanggil core/flow saat sesi berakhir (sukses, batal, kedaluwarsa, error):
  // pastikan kode captcha lama tidak tertinggal di DB
  onExpire(DB, userId) {
    DB.del(CAPTCHA_COL, String(userId))
  },
  steps: {
    async name(ctx) {
      const name = (ctx.message?.text || '').trim()
      if (name.length < 3 || name.length > 32) {
        await ctx.reply('❌ Nama harus 3–32 karakter. Coba tulis lagi:')
        return 'keep'
      }
      if (!/^[\p{L}\p{N} .'_-]+$/u.test(name)) {
        await ctx.reply('❌ Nama hanya boleh huruf, angka, spasi, dan . _ - Coba lagi:')
        return 'keep'
      }
      await ctx.reply(
        `👍 Nama: <b>${name}</b>\n\nSekarang masukkan <b>umur</b> kamu (angka, 5–99):`,
        {
          parse_mode: 'HTML',
        },
      )
      return { next: 'age', patch: { name } }
    },

    async age(ctx, { DB, userId }) {
      const raw = (ctx.message?.text || '').trim()
      // harus digit murni: tolak '0x14', '1e2', ' 12 ', '12.5' yang lolos Number()
      if (!/^\d{1,2}$/.test(raw)) {
        await ctx.reply('❌ Umur harus angka antara 5 sampai 99. Coba lagi:')
        return 'keep'
      }
      const age = Number(raw)
      if (age < 5 || age > 99) {
        await ctx.reply('❌ Umur harus angka antara 5 sampai 99. Coba lagi:')
        return 'keep'
      }

      const { code } = generateCode(config.economy.captchaLength)
      DB.set(CAPTCHA_COL, String(userId), {
        code,
        expiresAt: Date.now() + config.economy.captchaTtlMs,
        tries: 0,
      })

      await ctx.reply(
        `🔐 <b>Verifikasi Kode</b>\n\n` +
          `Kode kamu: <b>${code}</b>\n\n` +
          `Ketik ulang <b>kode di atas</b> persis seperti tertulis untuk melanjutkan ` +
          `(persis tapi huruf besar/kecil bebas).\n` +
          `Berlaku ${Math.round(config.economy.captchaTtlMs / 1000)} detik · maksimal ${MAX_TRIES} percobaan.\n\n` +
          `<i>Ketik /batal untuk membatalkan.</i>`,
        { parse_mode: 'HTML' },
      )

      logger.info(`kode verifikasi dibuat untuk ${userId}`)
      return { next: 'captcha', patch: { age } }
    },

    async captcha(ctx, { DB, userId }) {
      const answer = (ctx.message?.text || '').trim().toUpperCase().replace(/\s+/g, '')
      const entry = DB.get(CAPTCHA_COL, String(userId))

      if (!entry) {
        await ctx.reply('⚠️ Sesi verifikasi hilang. Kirim /daftar untuk memulai ulang.')
        return 'done'
      }
      if (Date.now() > entry.expiresAt) {
        DB.del(CAPTCHA_COL, String(userId))
        await ctx.reply('⌛ Kode kedaluwarsa. Kirim /daftar untuk memulai ulang.')
        return 'done'
      }
      if (answer !== entry.code) {
        entry.tries += 1
        DB.set(CAPTCHA_COL, String(userId), entry)
        if (entry.tries >= MAX_TRIES) {
          DB.del(CAPTCHA_COL, String(userId))
          await ctx.reply(
            `❌ Kode salah ${MAX_TRIES}x. Pendaftaran dibatalkan — kirim /daftar untuk mencoba lagi.`,
          )
          return 'done'
        }
        await ctx.reply(`❌ Kode salah. Sisa percobaan: <b>${MAX_TRIES - entry.tries}</b>`, {
          parse_mode: 'HTML',
        })
        return 'keep'
      }

      DB.del(CAPTCHA_COL, String(userId))
      const flow = getFlow(DB, userId)
      const name = flow?.data?.name
      const age = flow?.data?.age

      const bonus = registerBonus()
      const limit = registerLimit()

      ensureUser(DB, ctx.from)
      DB.update('users', String(userId), {
        registered: true,
        regName: name,
        age,
        balance: bonus,
        totalEarn: bonus,
        limit,
        maxLimit: maxLimitFor(1),
        level: 1,
        exp: 0,
        hp: 100,
        equip: {},
        createdAt: Date.now(),
      })

      await ctx.reply(
        [
          '🎉 <b>Pendaftaran Berhasil!</b>',
          '',
          `👤 Nama  : <b>${name}</b>`,
          `🎂 Umur  : <b>${age}</b>`,
          `🆔 ID    : <code>${userId}</code>`,
          '',
          '🎁 <b>Bonus Pendaftaran</b>',
          `• Saldo : ${config.economy.currency} <b>${fmtMoney(bonus)}</b>`,
          `• Limit : <b>${limit}</b> perintah`,
          '',
          '📋 Lihat profil: /profile',
          '⚔️ Mulai RPG: /joinrpg',
          '🗓️ Klaim hadiah harian: /daily',
        ].join('\n'),
        { parse_mode: 'HTML' },
      )
      logger.info(`user baru terdaftar: ${name} (${userId})`)
      return 'done'
    },
  },
})

export default {
  name: 'daftar',
  description: 'Daftar akun user (nama, umur, kode verifikasi teks) + bonus awal',
  command: ['daftar', 'register'],
  hidden: false,
  category: 'user',
  cooldown: 5,
  usage: '$prefix$command',

  handler: async ({ ctx, DB }) => {
    if (ctx.chat.type !== 'private') {
      const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=daftar`
      return ctx.reply(`🔐 Pendaftaran hanya bisa di private chat: ${link}`)
    }

    const u = ensureUser(DB, ctx.from)
    if (u.registered) {
      return ctx.reply(
        `✅ Kamu sudah terdaftar sebagai <b>${u.regName || u.name}</b>.\nLihat profil: /profile`,
        { parse_mode: 'HTML' },
      )
    }

    startFlow(DB, ctx.from.id, 'daftar')
    await ctx.reply(
      [
        '📝 <b>Pendaftaran Akun Telebot</b>',
        '',
        'Langkah: nama → umur → ketik ulang kode verifikasi.',
        'Bonus saldo & limit langsung diberikan setelah verifikasi berhasil.',
        '',
        'Ketik <b>nama lengkap</b> kamu sekarang:',
        '<i>(ketik /batal untuk membatalkan)</i>',
      ].join('\n'),
      { parse_mode: 'HTML' },
    )
  },
}
