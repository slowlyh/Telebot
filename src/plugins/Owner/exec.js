/**
 * Telebot © 2025 slowlyh — plugin: kendali bot untuk owner.
 */
import { execSync } from 'child_process'

const truncate = (s, n = 3500) => {
  s = String(s)
  return s.length > n ? s.slice(0, n) + '\n…(truncated)' : s
}

export default {
  name: 'owner-tools',
  description: 'exec (evaluate JS), eval, reset, restart bot',
  command: ['exec', 'eval', 'reset', 'restart'],
  hidden: false,
  category: 'owner',
  cooldown: 2,
  usage: '$prefix$command <kode/perintah>',
  owner: true,

  handler: async ({ ctx, command, args }) => {
    const code = args.join(' ').trim()

    if (command === 'reset' || command === 'restart') {
      await ctx.reply('♻️ Merestart bot…')
      try {
        process.send?.('reset')
      } catch {}
      return process.exit(0)
    }

    if (!code) return ctx.reply(`📖 /${command} <kode>`)

    const run = async () => {
      if (command === 'exec') {
        // jalankan shell command
        return execSync(code, { encoding: 'utf8', timeout: 30_000, cwd: process.cwd() })
      }
      // eval: dukung expression & async IIFE
      const fn = new Function('ctx', '"use strict";return (async () => {' + code + '})()')
      return await fn(ctx)
    }

    try {
      const out = await run()
      const text = typeof out === 'string' ? out : out === undefined ? '(undefined)' : JSON.stringify(out, null, 2)
      return ctx.reply(`📤 Hasil:\n<code>${truncate(text).replace(/</g, '&lt;')}</code>`, {
        parse_mode: 'HTML',
      })
    } catch (err) {
      return ctx.reply(`❌ Error:\n<code>${String(err.stack || err.message).slice(0, 3000).replace(/</g, '&lt;')}</code>`, {
        parse_mode: 'HTML',
      })
    }
  },
}
