/**
 * Copyright © 2025 [ slowlyh ]
 * All rights reserved. This source code is the property of [ ChatGPT ].
 */

export default {
  name: 'ssweb',
  description: 'Screenshot website (desktop/mobile/tablet)',
  command: ['ssweb', 'ss'],
  hidden: false,
  failed: 'Failed to execute %command: %error',
  wait: null,
  category: 'tools',
  cooldown: 3,
  limit: false,
  usage: '$prefix$command <url> [device]',
  handler: async ({ ctx, args, Neko }) => {
    const url = args[0]
    const device = args[1] || 'desktop'
    if (!url) return ctx.reply('usage: /ssweb <url> [device: desktop|mobile|tablet]')

    const loading = await ctx.reply('📸 *Mengambil screenshot...*', { parse_mode: 'Markdown' })
    const res = await Neko.get('/tools/ssweb', { url, device, fullPage: true })
    const img = res?.data?.result
    await ctx.deleteMessage(loading.message_id)
    if (!img) return ctx.reply('Gagal mengambil screenshot.')
    await ctx.replyWithPhoto({ url: img }, { caption: `Screenshot ${device} untuk ${url}` })
  },
}
