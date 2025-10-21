/**
 * Copyright © 2025 [ slowlyh ]
 *
 * All rights reserved. This source code is the property of [ ChatGPT ].
 * Unauthorized copying, distribution, modification, or use of this file,
 * via any medium, is strictly prohibited without prior written permission.
 *
 * Contact: [ hyuuoffc@gmail.com ]
 * GitHub: https://github.com/slowlyh
 * Official: https://hyuu.tech
 */

export default {
  name: 'deepseek',
  description: 'Cloudflare DeepSeek-R1 — reasoning-style AI model',
  command: ['deepseek', 'think'],
  category: 'ai',
  cooldown: 4,
  permissions: 'all',
  handler: async ({ ctx, args, Neko }) => {
    const text = args.join(' ').trim()
    if (!text) return ctx.reply('usage: /deepseek <text>')
    const res = await Neko.get('/ai/cf/deepseek-r1', { text })
    const msg = res?.data?.result
    if (!msg) return ctx.reply('gagal mendapatkan respon dari DeepSeek.')
    // Optional: sembunyikan tag <think> agar lebih rapi
    await ctx.reply(msg.replace(/<think>|<\/think>/g, '').trim())
  },
}
