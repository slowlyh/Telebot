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
  name: 'gemini',
  description: 'Gemini 2.5-Flash model — fast and helpful AI',
  command: ['gemini', 'flash'],
  category: 'ai',
  cooldown: 3,
  permissions: 'all',
  handler: async ({ ctx, args, Neko }) => {
    const text = args.join(' ').trim()
    if (!text) return ctx.reply('usage: /gemini <text>')
    const res = await Neko.get('/ai/gemini/2.5-flash', {
      text,
      systemPrompt: 'you are a helpful assistant',
    })
    const msg = res?.data?.result
    if (!msg) return ctx.reply('gagal mendapatkan respon dari Gemini.')
    await ctx.reply(msg)
  },
}
