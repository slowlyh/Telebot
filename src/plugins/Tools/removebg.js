/**
 * Copyright © 2025 [ slowlyh ]
 * All rights reserved. This source code is the property of [ ChatGPT ].
 */

import uploader from '#lib/uploader'
import axios from 'axios'

export default {
  name: 'removebg',
  description: 'Hapus background dari gambar',
  command: ['removebg', 'rmbg'],
  hidden: false,
  failed: 'Failed to execute %command: %error',
  wait: null,
  category: 'tools',
  cooldown: 3,
  limit: false,
  usage: '$prefix$command [image/url]',
  handler: async ({ ctx, args, Neko }) => {
    let imageUrl = args[0]

    const loading = await ctx.reply('🧹 *Menghapus background...*', { parse_mode: 'Markdown' })

    if (ctx.message?.reply_to_message?.photo?.length) {
      const fileId = ctx.message.reply_to_message.photo.pop().file_id
      const file = await ctx.telegram.getFile(fileId)
      const link = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`
      const buffer = (await axios.get(link, { responseType: 'arraybuffer' })).data
      imageUrl = await uploader.providers.pixHost.upload(Buffer.from(buffer))
    }

    if (!imageUrl) return ctx.reply('Kirim atau reply gambar / berikan URL gambar.')

    const res = await Neko.get('/tools/remove-bg/v1', { imageUrl })
    const result = res?.data?.result
    await ctx.deleteMessage(loading.message_id)

    if (!result) return ctx.reply('❌ Gagal menghapus background.')
    await ctx.replyWithPhoto({ url: result }, { caption: '✅ Background berhasil dihapus!' })
  },
}
