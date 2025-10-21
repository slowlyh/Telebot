/**
 * Copyright © 2025 [ slowlyh ]
 * All rights reserved. This source code is the property of [ ChatGPT ].
 */

export default {
  name: 'fdroid',
  description: 'Cari aplikasi open-source dari F-Droid',
  command: ['fdroid'],
  hidden: false,
  failed: 'Failed to execute %command: %error',
  wait: null,
  category: 'tools',
  cooldown: 3,
  limit: false,
  usage: '$prefix$command <search | url>',
  handler: async ({ ctx, args, Neko }) => {
    const q = args.join(' ').trim()
    if (!q) return ctx.reply('usage: /fdroid <query|url>')

    const loading = await ctx.reply('🔎 *Mencari aplikasi di F-Droid...*', {
      parse_mode: 'Markdown',
    })
    let res

    if (/^https?:\/\//.test(q)) {
      res = await Neko.get('/discovery/fdroid/detail', { url: q })
      const d = res?.data?.result
      if (!d) return ctx.reply('Aplikasi tidak ditemukan.')
      const versions = d.versions
        .map((v) => `• ${v.version} — ${v.size}\n📅 ${v.added}\n🔗 [Download](${v.url})`)
        .join('\n\n')
      const caption = `📱 *${d.name}*\n${d.summary}\n\n${versions}`
      await ctx.deleteMessage(loading.message_id)
      return ctx.reply(caption, { parse_mode: 'Markdown' })
    } else {
      res = await Neko.get('/discovery/fdroid/search', { q })
      const list = res?.data?.result
      if (!list?.length) return ctx.reply('Tidak ada hasil.')
      const text = list
        .slice(0, 5)
        .map((v, i) => `*${i + 1}. ${v.name}*\n${v.summary}\n🪪 ${v.license}\n🔗 ${v.url}`)
        .join('\n\n')
      await ctx.deleteMessage(loading.message_id)
      await ctx.reply(text, { parse_mode: 'Markdown' })
    }
  },
}
