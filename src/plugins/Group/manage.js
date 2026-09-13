/**
 * Telebot © 2025 slowlyh — plugin: manajemen grup.
 */
export default {
  name: 'group',
  description: 'Kelola grup (title, deskripsi, pin, info)',
  command: ['settitle', 'setdesc', 'pin', 'unpin', 'groupinfo'],
  hidden: false,
  category: 'group',
  cooldown: 2,
  usage: '$prefix$command <args>',
  group: true,

  handler: async ({ ctx, command, args }) => {
    const chat = ctx.chat
    const me = await ctx.telegram.getChatMember(chat.id, ctx.botInfo.username).catch(() => null)
    const isAdmin = me && ['administrator', 'creator'].includes(me.status)

    if (command === 'settitle') {
      if (!isAdmin) return ctx.reply('⛔ Bot harus jadi admin.')
      const title = args.join(' ').trim()
      if (!title) return ctx.reply('📖 /settitle <judul baru>')
      await ctx.telegram.setChatTitle(chat.id, title)
      return ctx.reply('✅ Judul diubah.')
    }
    if (command === 'setdesc') {
      if (!isAdmin) return ctx.reply('⛔ Bot harus jadi admin.')
      const d = args.join(' ').trim()
      if (!d) return ctx.reply('📖 /setdesc <deskripsi>')
      await ctx.telegram.setChatDescription(chat.id, d)
      return ctx.reply('✅ Deskripsi diubah.')
    }
    if (command === 'pin') {
      if (!isAdmin) return ctx.reply('⛔ Bot harus jadi admin.')
      const msg = ctx.message.reply_to_message
      if (!msg) return ctx.reply('↩️ Reply pesan yang mau di-pin.')
      await ctx.telegram.pinChatMessage(chat.id, msg.message_id, {
        disable_notification: true,
      })
      return ctx.reply('✅ Ter-pin.')
    }
    if (command === 'unpin') {
      if (!isAdmin) return ctx.reply('⛔ Bot harus jadi admin.')
      await ctx.telegram.unpinAllChatMessages(chat.id)
      return ctx.reply('✅ Semua unpin.')
    }
    if (command === 'groupinfo') {
      const info = await ctx.telegram.getChat(chat.id)
      return ctx.reply(
        [
          `👥 <b>${info.title}</b>`,
          `🆔 ID : <code>${chat.id}</code>`,
          `📝 Deskripsi : ${info.description || '-'}`,
          `👤 Member : ±${info.approximate_member_count || '?'} (est.)`,
        ].join('\n'),
        { parse_mode: 'HTML' },
      )
    }
  },
}
