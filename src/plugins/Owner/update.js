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

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import axios from 'axios'

export default {
  name: 'update',
  description: 'Update bot otomatis dari GitHub repo atau file raw URL',
  command: ['update'],
  hidden: false,
  failed: 'Failed to execute %command: %error',
  wait: null,
  category: 'owner',
  cooldown: 5,
  limit: false,
  usage: '$prefix$command [optional raw url]',
  owner: true,

  handler: async ({ ctx, args }) => {
    const repo = 'slowlyh/Telebot'
    const branch = 'main'
    const rawUrl = args[0]

    const loading = await ctx.reply('🔄 *Memeriksa pembaruan...*', {
      parse_mode: 'Markdown',
    })

    try {
      // MODE 2️⃣ : Update via raw URL
      if (rawUrl && /^https:\/\/raw\.githubusercontent\.com\//.test(rawUrl)) {
        await ctx.editMessageText('📥 *Mengunduh file dari raw URL...*', {
          parse_mode: 'Markdown',
        })
        const filename = rawUrl.split('/').pop()
        const targetPath = path.join(process.cwd(), 'src', findRelativePath(rawUrl))
        const { data } = await axios.get(rawUrl, { responseType: 'arraybuffer' })
        fs.mkdirSync(path.dirname(targetPath), { recursive: true })
        fs.writeFileSync(targetPath, data)
        await ctx.deleteMessage(loading.message_id)
        return ctx.reply(`✅ File *${filename}* berhasil diperbarui!`, {
          parse_mode: 'Markdown',
        })
      }

      // MODE 1️⃣ : Normal GitHub update
      await ctx.editMessageText('📡 *Mengambil informasi repository...*', {
        parse_mode: 'Markdown',
      })

      const res = await axios.get(`https://api.github.com/repos/${repo}/commits/${branch}`)
      const latestCommit = res.data?.sha?.substring(0, 7)
      const message = res.data?.commit?.message
      const author = res.data?.commit?.author?.name

      const localCommit = execSync('git rev-parse HEAD').toString().trim().substring(0, 7)

      if (latestCommit === localCommit) {
        await ctx.deleteMessage(loading.message_id)
        return ctx.reply('✅ Bot sudah versi terbaru!\nTidak ada pembaruan yang tersedia.')
      }

      await ctx.editMessageText('📥 *Menarik update terbaru dari repository...*', {
        parse_mode: 'Markdown',
      })
      const result = execSync('git pull origin main', { encoding: 'utf8' })

      await ctx.deleteMessage(loading.message_id)
      await ctx.reply(
        [
          '✅ *Pembaruan selesai!*',
          `🧾 Commit: *${latestCommit}*`,
          `👤 Author: *${author}*`,
          `💬 Pesan: _${message}_`,
          '',
          '```',
          result.trim().slice(0, 1500),
          '```',
          '\n🚀 Silakan restart bot untuk menerapkan update.',
        ].join('\n'),
        { parse_mode: 'Markdown' },
      )
    } catch (err) {
      console.error('Update Error:', err)
      await ctx.reply(`❌ Terjadi kesalahan saat update.\n${err.message}`)
    }
  },
}

/**
 * Mendeteksi path relatif file berdasarkan URL raw GitHub
 * Contoh:
 * https://raw.githubusercontent.com/slowlyh/Telebot/main/src/plugins/AI/gpt5.js
 * → src/plugins/AI/gpt5.js
 */
function findRelativePath(rawUrl) {
  const idx = rawUrl.indexOf('/main/')
  if (idx === -1) return rawUrl.split('/').slice(-2).join('/')
  return rawUrl.substring(idx + 6)
}
