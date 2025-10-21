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

import uploader from '#lib/uploader'
import axios from 'axios'

export default {
  name: 'gpt5',
  description: 'Neko GPT-5 — advanced reasoning & image-aware AI model',
  command: ['gpt5', 'gpt'],
  category: 'ai',
  cooldown: 3,
  permissions: 'all',
  usage: '/gpt5 <text> [optional image]',
  handler: async ({ ctx, args, Neko }) => {
    let text = args.join(' ').trim()
    let imageUrl = null

    // 1️⃣ kalau user reply ke gambar
    if (ctx.message?.reply_to_message?.photo?.length) {
      try {
        const fileId = ctx.message.reply_to_message.photo.pop().file_id
        const file = await ctx.telegram.getFile(fileId)
        const fileLink = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`
        const buffer = (await axios.get(fileLink, { responseType: 'arraybuffer' })).data
        // upload ke pixhost
        imageUrl = await uploader.providers.pixHost.upload(Buffer.from(buffer))
      } catch (err) {
        console.error('Gagal upload gambar ke Pixhost:', err)
        return ctx.reply('❌ Gagal mengupload gambar ke server, coba lagi.')
      }
    }

    if (!imageUrl && /(https?:\/\/[^\s]+)/.test(text)) {
      const match = text.match(/(https?:\/\/[^\s]+)/)
      imageUrl = match?.[1]
      text = text.replace(imageUrl, '').trim()
    }

    if (!text) return ctx.reply('usage: /gpt5 <text> [optional image or reply image]')

    // 3️⃣ tampilkan pesan loading
    const loadingMsg = await ctx.reply('⏳ *GPT-5 sedang menganalisis...*', {
      parse_mode: 'Markdown',
    })

    try {
      const params = {
        text,
        systemPrompt: 'you are a helpful assistant',
      }
      if (imageUrl) params.imageUrl = imageUrl

      const res = await Neko.get('/ai/gpt/5', params)
      const msg = res?.data?.result

      try {
        await ctx.deleteMessage(loadingMsg.message_id)
      } catch {}

      if (!msg) return ctx.reply('❌ Tidak ada respon dari GPT-5.')

      await ctx.reply(msg)
    } catch (err) {
      console.error('GPT-5 Error:', err)
      await ctx.reply('❌ Terjadi kesalahan saat memproses permintaan.')
    }
  },
}
