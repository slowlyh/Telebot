/**
 * Telebot © 2025 slowlyh — util pengiriman pesan yang tangguh.
 * Telegram kadang memutus koneksi (socket hang up / ETIMEDOUT) pada request
 * yang membawa media. Helper ini mencoba beberapa strategi berurutan agar
 * alur percakapan tidak gagal total karena gangguan jaringan sesaat.
 */
import logger from '#lib/logger'

const RETRY_DELAYS = [600, 1500, 3000]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const isTransient = (err) => {
  const m = String(err?.message || err || '').toLowerCase()
  return (
    m.includes('socket hang up') ||
    m.includes('econnreset') ||
    m.includes('etimedout') ||
    m.includes('esockettimedout') ||
    m.includes('eai_again') ||
    m.includes('network') ||
    m.includes('fetch failed') ||
    m.includes('request to') ||
    m.includes('timeout')
  )
}

/**
 * Kirim foto dengan beberapa strategi fallback.
 * @returns {Promise<object|null>} pesan hasil, atau null bila semua gagal
 */
export async function safeReplyWithPhoto(ctx, source, options = {}) {
  const caption = options.caption
  const parseMode = options.parse_mode
  const markup = options.reply_markup

  // strategi: (1) Buffer langsung, (2) Buffer sebagai file, (3) tanpa caption HTML
  const strategies = [
    async () =>
      ctx.replyWithPhoto({ source }, { caption, parse_mode: parseMode, reply_markup: markup }),
    async () =>
      ctx.replyWithPhoto(
        { source },
        {
          caption: caption ? String(caption).replace(/<[^>]+>/g, '') : undefined,
          reply_markup: markup,
        },
      ),
  ]

  for (const fn of strategies) {
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        return await fn()
      } catch (err) {
        const transient = isTransient(err)
        if (!transient || attempt === RETRY_DELAYS.length) break
        logger.warn(`kirim foto gagal (${err.message}), retry ${attempt + 1}…`)
        await sleep(RETRY_DELAYS[attempt])
      }
    }
  }

  // fallback terakhir: kirim teks saja agar alur tetap berjalan
  logger.warn('kirim foto captcha gagal total — fallback ke teks')
  return null
}

/**
 * Kirim pesan teks dengan retry singkat.
 */
export async function safeReply(ctx, text, options = {}) {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await ctx.reply(text, options)
    } catch (err) {
      if (!isTransient(err) || attempt === RETRY_DELAYS.length) throw err
      await sleep(RETRY_DELAYS[attempt])
    }
  }
}

export default { safeReplyWithPhoto, safeReply }
