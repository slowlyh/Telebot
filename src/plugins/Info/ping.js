/**
 * Telebot © 2025 slowlyh — plugin: ping & info dasar.
 */
export default {
  name: 'ping',
  description: 'Uji kecepatan respons bot + ringkasan status',
  command: ['ping', 'uptime', 'status'],
  hidden: false,
  category: 'info',
  cooldown: 3,
  usage: '$prefix$command',

  handler: async ({ ctx, DB, registry }) => {
    const start = Date.now()
    const m = await ctx.reply('🏓 Mengetik…')
    const latency = Date.now() - start
    const up = Math.floor(process.uptime())
    const h = String(Math.floor(up / 3600)).padStart(2, '0')
    const mi = String(Math.floor((up % 3600) / 60)).padStart(2, '0')
    const s = String(Math.floor(up % 60)).padStart(2, '0')
    const st = registry.stats()
    const mem = (process.memoryUsage().rss / 1048576).toFixed(0)
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      m.message_id,
      undefined,
      [
        '📊 <b>Status Bot</b>',
        `🏓 Latency : <code>${latency} ms</code>`,
        `⏱️ Uptime  : <code>${h}:${mi}:${s}</code>`,
        `🧠 RAM     : <code>${mem} MB</code> · Node <code>${process.version}</code>`,
        `🧩 Plugin  : <code>${st.plugins}</code> aktif, <code>${st.visible}</code> di menu`,
        `👥 Users   : <code>${DB.size('users')}</code> · Groups <code>${DB.size('groups')}</code>`,
      ].join('\n'),
      { parse_mode: 'HTML' },
    )
  },
}
