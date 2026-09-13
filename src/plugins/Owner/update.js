/**
 * Telebot © 2025 slowlyh — plugin: update dari GitHub (git murni, tanpa API).
 */
import { execSync } from 'child_process'

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', cwd: process.cwd() })

export default {
  name: 'update',
  description: 'Tarik update terbaru dari repository (git pull)',
  command: ['update', 'pull'],
  hidden: false,
  category: 'owner',
  cooldown: 10,
  usage: '$prefix$command',
  owner: true,

  handler: async ({ ctx }) => {
    const loading = await ctx.reply('🔄 Memeriksa repository…')
    try {
      const local = sh('git rev-parse HEAD').trim().slice(0, 7)
      sh('git fetch origin main --quiet')
      const remote = sh('git rev-parse origin/main').trim()
      if (remote.slice(0, 7) === local) {
        return ctx.telegram.editMessageText(
          ctx.chat.id,
          loading.message_id,
          undefined,
          '✅ Bot sudah versi terbaru.',
        )
      }
      const info = sh(`git log -1 --format=%h|%an|%s ${remote}`).trim().split('|')
      sh('git pull origin main --quiet')
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loading.message_id,
        undefined,
        [
          '✅ Pembaruan selesai!',
          `🧾 Commit : ${info[0]}`,
          `👤 Author : ${info[1]}`,
          `💬 Pesan  : ${info[2]}`,
          '',
          '🚀 Kirim /reset untuk menerapkan.',
        ].join('\n'),
      )
    } catch (err) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loading.message_id,
        undefined,
        '❌ Update gagal: ' + String(err.message).slice(0, 300),
      )
    }
  },
}
