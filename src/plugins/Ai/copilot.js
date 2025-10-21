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
  name: 'copilot',
  description: 'AI Copilot — friendly conversational assistant',
  command: ['copilot', 'ai'],
  category: 'ai',
  cooldown: 3,
  permissions: 'all',
  handler: async ({ ctx, args, Neko }) => {
    const text = args.join(' ').trim()
    if (!text) return ctx.reply('usage: /copilot <text>')
    const res = await Neko.get('/ai/copilot', { text })
    const msg = res?.data?.result?.text
    if (!msg) return ctx.reply('gagal mendapatkan respon dari copilot.')
    await ctx.reply(msg)
  },
}
