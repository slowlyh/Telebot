/**
 * Copyright © 2025 [ slowlyh ]
 * All rights reserved. This source code is the property of [ ChatGPT ].
 */

export default {
  name: 'dafont',
  description: 'Cari font dari dafont.com',
  command: ['dafont'],
  hidden: false,
  failed: 'Failed to execute %command: %error',
  wait: null,
  category: 'tools',
  cooldown: 3,
  limit: false,
  usage: '$prefix$command <search | url>',
  handler: async ({ ctx, args, Neko }) => {
    const q = args.join(' ').trim()
    if (!q) return ctx.reply('usage: /dafont <query|url>')

    const loading = await ctx.reply('🔍 *Mencari font di Dafont...*', { parse_mode: 'Markdown' })
    let res

    if (/^https?:\/\//.test(q)) {
      res = await Neko.get('/discovery/dafont/detail', { url: q })
      const d = res?.data?.result
      if (!d) return ctx.reply('Font tidak ditemukan.')
      const caption =
        `🖋 *${d.title}* by *${d.author}*\n` +
        `🎨 Theme: ${d.theme}\n📥 Downloads: ${d.totalDownloads}\n` +
        `📂 File: ${d.filename.join(', ')}\n\n${d.note.slice(0, 500)}\n\n🔗 [Download Font](${d.downloadUrl})`
      await ctx.deleteMessage(loading.message_id)
      return ctx.replyWithPhoto({ url: d.image }, { caption, parse_mode: 'Markdown' })
    } else {
      res = await Neko.get('/discovery/dafont/search', { q })
      const list = res?.data?.result
      if (!list?.length) return ctx.reply('Tidak ada hasil.')
      const text = list
        .slice(0, 5)
        .map(
          (v, i) =>
            `*${i + 1}. ${v.title}*\n👤 ${v.author.name}\n🎨 ${v.theme}\n📥 ${v.totalDownloads}\n🔗 ${v.url}`,
        )
        .join('\n\n')
      await ctx.deleteMessage(loading.message_id)
      await ctx.reply(text, { parse_mode: 'Markdown' })
    }
  },
}
