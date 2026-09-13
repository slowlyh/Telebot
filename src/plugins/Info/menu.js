/**
 * Telebot © 2025 slowlyh — plugin: menu interaktif.
 */
import { showMenu } from '#core/menu'

export default {
  name: 'menu',
  description: 'Membuka menu utama bot (gambar + tombol kategori)',
  command: ['menu', 'help'],
  hidden: false,
  category: 'info',
  cooldown: 3,
  usage: '$prefix$command',

  handler: async ({ ctx, DB, registry }) => {
    if (ctx.chat.type !== 'private') {
      const link = `https://t.me/${ctx.botInfo?.username || 'thisbot'}?start=menu`
      return ctx.reply(`🤖 Menu tersedia di private chat: ${link}`)
    }
    await showMenu(ctx, DB, registry, 'home')
  },
}
