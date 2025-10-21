/**
 * Copyright © 2025 [ slowlyh ]
 *
 * All rights reserved. This source code is the property of [ ChatGPT ].
 * Unauthorized copying, distribution, modification, or use of this file,
 * via any medium, is strictly prohibited without prior written permission.
 *
 * This software is protected under international copyright laws.
 *
 * Contact: [ hyuuoffc@gmail.com ]
 * GitHub: https://github.com/slowlyh
 * Official: https://hyuu.tech
 */

import { Markup } from 'telegraf'

export default {
  name: 'menu',
  description: 'Menampilkan daftar fitur dan deskripsi singkatnya',
  command: ['menu', 'help'],
  permissions: 'all',
  hidden: false,
  failed: 'Failed to execute %command: %error',
  wait: null,
  category: 'info',
  cooldown: 0,
  limit: false,
  usage: '$prefix$command',
  group: false,
  private: false,
  owner: false,

  handler: async ({ ctx, registry }) => {
    const groups = registry.listByCategory()
    const lines = []

    // Header utama
    lines.push('– *Telebot – Fitur Menu*')
    lines.push('────────────────────────────')

    for (const cat of Object.keys(groups).sort()) {
      lines.push('')
      lines.push(`📂 *${cat.toUpperCase()}*`)
      for (const it of groups[cat].sort((a, b) => a.name.localeCompare(b.name))) {
        const cmds = it.command ? it.command.join(', ') : it.name
        lines.push(`• *${cmds}*`)
      }
    }

    const caption = lines.slice(0, 40).join('\n')
    const rest = lines.slice(40).join('\n')

    try {
      await ctx.replyWithPhoto(
        { url: 'https://img1.pixhost.to/images/9569/653523193_image.jpg' },
        {
          caption,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            Markup.button.url('📦 Repository', 'https://github.com/slowlyh/Telebot'),
            Markup.button.url('🌐 Website', 'https://hyuu.tech'),
          ]),
        },
      )
    } catch (err) {
      await ctx.reply(caption, { parse_mode: 'Markdown' })
    }

    if (rest.trim().length) {
      await ctx.reply(rest, { parse_mode: 'Markdown' })
    }
  },
}
