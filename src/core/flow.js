/**
 * Telebot © 2025 slowlyh — manajer alur percakapan (multi-langkah).
 * State dipersist ke DB (bukan memori) agar tetap hidup walau proses
 * di-restart oleh supervisor main.js.
 *
 * Struktur DB:
 *   collection 'flows', key = userId, value = { type, step, data, at }
 *   collection 'flow_defs', key = type,  value = { steps: [nama...], first }
 *     (definisi handler tetap di memori; hanya urutan langkah yang disimpan)
 */
import logger from '#lib/logger'
import config from '#config'

const handlers = new Map()
const TTL_MS = 10 * 60 * 1000

export function registerFlow(type, def) {
  handlers.set(type, def)
  return def
}

export function startFlow(DB, userId, type, data = {}, step = null) {
  const def = handlers.get(type)
  if (!def) throw new Error('flow tidak terdaftar: ' + type)
  const first = step || def.first || Object.keys(def.steps)[0]
  const state = { type, step: first, data, at: Date.now() }
  DB.set('flows', String(userId), state)
  return first
}

export function getFlow(DB, userId) {
  const f = DB.get('flows', String(userId))
  if (!f) return null
  if (Date.now() - f.at > TTL_MS) {
    DB.del('flows', String(userId))
    return null
  }
  return f
}

export function clearFlow(DB, userId) {
  return DB.del('flows', String(userId))
}

export function hasFlow(DB, userId) {
  return Boolean(getFlow(DB, userId))
}

export function setStep(DB, userId, step, patch = {}) {
  const f = getFlow(DB, userId)
  if (!f) return null
  const next = { ...f, step, data: { ...f.data, ...patch }, at: Date.now() }
  DB.set('flows', String(userId), next)
  return next
}

/**
 * Terapkan hasil langkah flow ke state.
 * @returns {boolean} true bila pesan/callback sudah ditangani flow
 */
function applyStepResult(DB, userId, f, result) {
  // 'keep' → tetap di langkah ini (refresh TTL agar sesi tidak mati di tengah
  // serangkaian input yang ditolak validasi)
  // 'done'/false/null/undefined → selesai
  // { next, patch } → lanjut ke langkah berikutnya
  // 'namaLangkah' → lanjut ke langkah itu
  if (result === 'keep') {
    setStep(DB, userId, f.step)
    return true
  }

  if (result === 'done' || result === false || result === null || result === undefined) {
    clearFlow(DB, userId)
    return true
  }

  if (typeof result === 'string') {
    setStep(DB, userId, result)
    return true
  }

  if (typeof result === 'object' && result.next) {
    setStep(DB, userId, result.next, result.patch || {})
    return true
  }

  clearFlow(DB, userId)
  return true
}

/**
 * Jalankan langkah aktif untuk pesan user.
 * @returns {boolean} true bila pesan dikonsumsi oleh flow
 */
export async function runFlow(ctx, deps) {
  const DB = deps.DB
  const userId = ctx.from?.id

  // beri tahu bila sesi baru saja kedaluwarsa — jangan diamkan pesan user
  const raw = DB.get('flows', String(userId))
  if (raw && Date.now() - raw.at > TTL_MS) {
    clearFlow(DB, userId)
    handlers.get(raw.type)?.onExpire?.(DB, userId) // bersihkan milik flow (mis. captcha)
    await ctx
      .reply('⌛ Sesi percakapan berakhir. Kirim perintah lagi untuk mengulang.')
      .catch(() => {})
    // lanjut: pesan ini boleh ditangani dispatcher biasa setelah notifikasi
  }

  const f = getFlow(DB, userId)
  if (!f) return false

  const def = handlers.get(f.type)
  if (!def) {
    clearFlow(DB, userId)
    return false
  }

  const stepFn = def.steps[f.step]
  if (!stepFn) {
    clearFlow(DB, userId)
    return false
  }

  const text = (ctx.message?.text || ctx.message?.caption || '').trim()
  if (/^(\/)?(batal|cancel)$/i.test(text)) {
    clearFlow(DB, userId)
    def.onExpire?.(DB, userId) // bersihkan data pendamping (mis. captcha)
    await ctx.reply('❌ Dibatalkan. Kirim perintah lagi kapan saja.')
    return true
  }

  // perintah lain (berprefix) membatalkan flow agar user tidak terjebak
  if (text.startsWith(config.prefix) && text.length > config.prefix.length) {
    clearFlow(DB, userId)
    def.onExpire?.(DB, userId)
    return false
  }

  try {
    const result = await stepFn(ctx, { ...deps, flow: f, data: f.data, userId })
    const consumed = applyStepResult(DB, userId, f, result)
    // flow selesai (bukan 'keep' / lanjut langkah) → hook bersih data pendamping
    if (consumed && result !== 'keep' && typeof result !== 'string' && !(result && result.next))
      def.onExpire?.(DB, userId)
    return consumed
  } catch (err) {
    const msg = String(err?.message || err || '').toLowerCase()
    const transient =
      msg.includes('socket hang up') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('fetch failed') ||
      msg.includes('request to')

    if (transient) {
      // gangguan jaringan: pertahankan state agar user bisa lanjut, jangan reset
      logger.warn('flow terganggu jaringan, state dipertahankan: ' + msg)
      await ctx
        .reply('⚠️ Koneksi ke Telegram terganggu. Coba kirim ulang pesan terakhirmu.')
        .catch(() => {})
      return true
    }

    logger.error('flow error', err)
    clearFlow(DB, userId)
    def.onExpire?.(DB, userId)
    await ctx.reply('❌ Terjadi kesalahan pada alur. Silakan ulangi perintah.').catch(() => {})
    return true
  }
}

export default {
  registerFlow,
  startFlow,
  getFlow,
  clearFlow,
  hasFlow,
  setStep,
  runFlow,
}
