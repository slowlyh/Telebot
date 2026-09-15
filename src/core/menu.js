/**
 * Telebot © 2025 slowlyh — sistem menu interaktif.
 * Satu pesan saja berubah-ubah (edit caption + inline keyboard):
 *   home → kategori → detail plugin, plus panel pengaturan menu (owner).
 * Tampilan, gambar, dan tombol bisa diubah owner lewat /menu → ⚙️.
 */
import { Markup } from 'telegraf'
import config, { isOwner } from '#config'
import logger from '#lib/logger'

const ICONS = {
  info: 'ℹ️',
  general: '📦',
  group: '👥',
  owner: '👑',
  tools: '🛠️',
  user: '👤',
  rpg: '⚔️',
}
const icon = (cat) => ICONS[cat.toLowerCase()] || '▫️'

export const escapeHtml = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const fmtDuration = (sec) => {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0')
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
  const s = String(Math.floor(sec % 60)).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/** pengaturan menu efektif: default (env) ditimpa oleh yang disimpan owner */
export function menuSettings(DB) {
  const saved = DB.get('settings', 'menu') || {}
  return { ...config.menu, ...saved }
}

const isFileId = (src) => typeof src === 'string' && /^AgA[AC]/.test(src)

/**
 * Selesaikan sumber foto: file_id dipakai apa adanya; URL diunduh sekali
 * sebagai Buffer lalu file_id hasil upload dik-cache ke DB (photo_cache),
 * supaya render berikutnya tidak menyentuh URL eksternal lagi.
 */
async function resolvePhoto(DB, photo) {
  if (!photo) return null
  if (isFileId(photo)) return { kind: 'file_id', value: photo }
  if (!/^https?:\/\//.test(photo)) return null
  const cached = DB.get('photo_cache', photo)
  if (cached) return { kind: 'file_id', value: cached }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20_000)
    const res = await fetch(photo, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 8 * 1024 * 1024) return null
    return { kind: 'buffer', value: buf }
  } catch {
    return null
  }
}

/** simpan file_id dari pesan foto yang baru terkirim */
function cachePhotoId(DB, url, msg) {
  const p = msg?.photo?.sort((a, b) => b.width - a.width)[0]
  if (p?.file_id) DB.set('photo_cache', url, p.file_id)
}

const stripTags = (t) => String(t).replace(/<\/?(?:b|i|code|u|s)>/g, '')

async function remember(DB, chatId, msgId, type) {
  DB.set('menus', String(chatId), { msgId, type })
}

/** render (atau edit) tampilan tertentu dari menu tanpa spam pesan baru */
export async function showMenu(ctx, DB, registry, view = 'home', arg = null) {
  // deep-link: /start daftar | profile | daily | shop | adventure | joinrpg
  if (typeof arg === 'string' && arg.startsWith('start:')) {
    const target = arg.slice('start:'.length).toLowerCase()
    const map = {
      daftar: 'u:daftar',
      register: 'u:daftar',
      profile: 'u:profile',
      daily: 'u:daily',
      balance: 'u:balance',
      limit: 'u:balance',
      shop: 'u:shop',
      adventure: 'u:adv',
      joinrpg: 'u:rpg',
      inventori: 'u:inv',
    }
    if (target === 'menu' || !map[target]) {
      view = 'home'
      arg = null
    } else {
      await showMenu(ctx, DB, registry, 'home')
      return userCallback(ctx, DB, registry, map[target], {})
    }
  }

  const s = menuSettings(DB)
  const cats = registry.categories()
  const catNames = Object.keys(cats).sort((a, b) => a.localeCompare(b))
  const chatId = ctx.chat.id
  let caption = ''
  let rows = []

  if (view === 'home') {
    const st = registry.stats()
    const u = ctx.from ? DB.get('users', String(ctx.from.id)) : null
    const reg = Boolean(u?.registered)
    const cur = config.economy.currency

    caption = [
      `🤖 <b>${escapeHtml(s.title)}</b>`,
      `<i>${escapeHtml(s.subtitle)}</i>`,
      '',
      ctx.from
        ? reg
          ? `👤 <b>${escapeHtml(u.regName || u.name || 'User')}</b> · Lv <b>${u.level || 1}</b>\n${cur} <b>${(u.balance || 0).toLocaleString('id-ID')}</b> · 🎫 <b>${u.limit ?? 0}</b> · ⚔️ <b>${u.rpg ? 'RPG aktif' : 'belum RPG'}</b>`
          : `👤 <b>${escapeHtml(ctx.from.first_name || 'User')}</b> — belum terdaftar\n<i>Tekan 📝 Daftar untuk mulai.</i>`
        : '',
      '',
      `🧩 <b>${st.visible}</b> perintah · <b>${catNames.length}</b> kategori · <b>${st.plugins}</b> plugin`,
      `⏱️ Uptime <code>${fmtDuration(Math.floor(process.uptime()))}</code> · Node <code>${process.version}</code>`,
    ]
      .filter((x) => x !== null)
      .join('\n')

    // baris aksi user (full button)
    if (ctx.from && !reg) {
      rows.push([Markup.button.callback('📝 Daftar Sekarang', 'u:daftar')])
    } else if (ctx.from) {
      rows.push([
        Markup.button.callback('👤 Profil', 'u:profile'),
        Markup.button.callback('🗓️ Daily', 'u:daily'),
      ])
      rows.push([
        Markup.button.callback('⚔️ Adventure', 'u:adv'),
        Markup.button.callback('🎒 Inventori', 'u:inv'),
      ])
      rows.push([
        Markup.button.callback('🛒 Shop', 'u:shop'),
        Markup.button.callback('💰 Balance', 'u:balance'),
      ])
    }

    // tombol kategori
    for (let i = 0; i < catNames.length; i += 2) {
      rows.push(
        catNames.slice(i, i + 2).map((n) =>
          Markup.button.callback(`${icon(n)} ${n[0].toUpperCase()}${n.slice(1)}`, `m:cat:${n}`),
        ),
      )
    }

    const bottom = [
      Markup.button.url('📦 Repo', s.repoUrl),
      Markup.button.url('🌐 Website', s.siteUrl),
    ]
    if (isOwner(ctx.from?.id)) bottom.push(Markup.button.callback('⚙️ Settings', 'os:main'))
    rows.push(bottom)
  } else if (view === 'cat') {
    const list = (cats[arg] || []).sort((a, b) => a.name.localeCompare(b.name))
    caption = [
      `${icon(arg)} <b>${escapeHtml(String(arg).toUpperCase())}</b>`,
      `<i>${list.length} plugin tersedia</i>`,
    ].join('\n')
    const names = list.map((p) => p.name)
    for (let i = 0; i < names.length; i += 2) {
      rows.push(
        names.slice(i, i + 2).map((n) => Markup.button.callback(`• ${n}`, `m:plg:${n}`)),
      )
    }
    rows.push([
      Markup.button.callback('🏠 Menu', 'm:home'),
      ...(catNames.length > 1 ? [Markup.button.callback('📂 Kategori', 'm:picks')] : []),
    ])
  } else if (view === 'picks') {
    caption = '📂 <b>Pilih kategori</b>'
    for (let i = 0; i < catNames.length; i += 2) {
      rows.push(
        catNames.slice(i, i + 2).map((n) =>
          Markup.button.callback(`${icon(n)} ${n}`, `m:cat:${n}`),
        ),
      )
    }
    rows.push([Markup.button.callback('🏠 Menu', 'm:home')])
  } else if (view === 'plg') {
    const meta = registry.map.get(arg)
    if (!meta) return showMenu(ctx, DB, registry, 'home')
    const usage = (meta.usage || '$prefix$command').replace('$prefix', config.prefix)
    caption = [
      `🔌 <b>${escapeHtml(meta.name)}</b> <i>(${escapeHtml(meta.category)})</i>`,
      escapeHtml(meta.description || 'Tanpa deskripsi.'),
      '',
      `🧾 Perintah: <code>${meta.commands.map((c) => config.prefix + c).join('</code>, <code>')}</code>`,
      `📖 Pemakaian: <code>${escapeHtml(usage.replace('$command', meta.commands[0]))}</code>`,
      meta.cooldown ? `⏳ Cooldown: <code>${meta.cooldown}s</code>` : null,
    ]
      .filter(Boolean)
      .join('\n')
    rows.push([
      Markup.button.callback('⬅️ Kategori', `m:cat:${meta.category}`),
      Markup.button.callback('🏠 Menu', 'm:home'),
    ])
  } else if (view === 'owner') {
    caption = [
      '⚙️ <b>Pengaturan Menu</b> (khusus owner)',
      `🎨 Tampilan saat ini: <b>${s.style === 'text' ? 'teks (tanpa gambar)' : 'foto + tombol'}</b>`,
      `🖼️ Gambar: <code>${escapeHtml(isFileId(s.photo) ? 'file Telegram (tersimpan)' : s.photo || 'belum diatur')}</code>`,
      `📌 Judul: <b>${escapeHtml(s.title)}</b>`,
      '',
      'Ubah tampilan lewat tombol di bawah. Kirim foto setelah “Atur Gambar” untuk memakai foto itu sebagai header menu.',
    ].join('\n')
    rows.push([
      Markup.button.callback('🖼️ Atur Gambar', 'os:photo'),
      Markup.button.callback(
        s.style === 'text' ? '🌄 Mode Foto' : '📄 Mode Teks',
        'os:style',
      ),
    ])
    rows.push([
      Markup.button.callback('🔄 Reset Bawaan', 'os:reset'),
      Markup.button.callback('🏠 Menu', 'm:home'),
    ])
  }

  const kb = Markup.inlineKeyboard(rows).reply_markup
  const saved = DB.get('menus', String(chatId))
  const wantPhoto = s.style !== 'text'
  const photo = await resolvePhoto(DB, s.photo)

  // coba edit pesan menu yang sudah ada (hemat pesan, tidak spam)
  if (saved?.msgId) {
    try {
      if (!wantPhoto || saved.type === 'text') {
        await ctx.telegram.editMessageText(chatId, saved.msgId, undefined, caption, {
          parse_mode: 'HTML',
          reply_markup: kb,
        })
        return
      }
      if (photo?.kind === 'file_id') {
        await ctx.telegram.editMessageMedia(chatId, saved.msgId, undefined, {
          type: 'photo',
          media: photo.value,
          caption,
          parse_mode: 'HTML',
        })
        await ctx.telegram.editMessageReplyMarkup(chatId, saved.msgId, undefined, kb)
        return
      }
    } catch {
      // pesan lama sudah hilang / tidak bisa diedit → kirim baru
    }
  }

  let msg = null
  if (wantPhoto && photo) {
    const media = photo.kind === 'file_id' ? photo.value : { source: photo.value }
    for (let attempt = 0; attempt < 2 && !msg; attempt++) {
      try {
        msg = await ctx.replyWithPhoto(media, {
          caption,
          parse_mode: 'HTML',
          reply_markup: kb,
        })
      } catch (e) {
        if (attempt === 1) logger.warn('foto menu gagal, fallback teks: ' + e.message)
      }
    }
    if (msg && photo.kind === 'buffer') cachePhotoId(DB, s.photo, msg)
  }
  if (!msg) {
    // fallback: kirim teks polos (tag HTML dilucuti kalau parse gagal)
    try {
      msg = await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: kb })
    } catch {
      msg = await ctx.reply(stripTags(caption), { reply_markup: kb })
    }
  }
  await remember(DB, chatId, msg.message_id, wantPhoto && photo ? 'photo' : 'text')
}

/** tangani callback menu — return true bila data callback termasuk milik menu */
export async function menuCallback(ctx, DB, registry, data) {
  if (!data?.startsWith('m:') && !data?.startsWith('os:')) return false

  if (data === 'os:main') {
    if (!isOwner(ctx.from?.id)) return ctx.answerCbQuery('Khusus owner 😅', { show_alert: true })
    await showMenu(ctx, DB, registry, 'owner')
    return ctx.answerCbQuery()
  }
  if (data === 'os:style') {
    const s = menuSettings(DB)
    const next = s.style === 'text' ? 'photo' : 'text'
    DB.update('settings', 'menu', { style: next })
    // hapus state agar render ulang sesuai mode
    DB.set('menus', String(ctx.chat.id), null)
    await showMenu(ctx, DB, registry, 'owner')
    return ctx.answerCbQuery(`Tampilan: ${next}`)
  }
  if (data === 'os:photo') {
    if (!isOwner(ctx.from?.id)) return ctx.answerCbQuery('Khusus owner 😅')
    DB.set('pending', String(ctx.chat.id), { type: 'menu_photo', at: Date.now() })
    return ctx.answerCbQuery('Oke — kirim fotonya sekarang 📸')
  }
  if (data === 'os:reset') {
    if (!isOwner(ctx.from?.id)) return ctx.answerCbQuery('Khusus owner 😅')
    DB.del('settings', 'menu')
    DB.set('menus', String(ctx.chat.id), null)
    await showMenu(ctx, DB, registry, 'owner')
    return ctx.answerCbQuery('Pengaturan menu direset ↺')
  }

  const [, view, ...rest] = data.split(':')
  const arg = rest.join(':') || null
  await showMenu(ctx, DB, registry, view, arg)
  return ctx.answerCbQuery()
}

/** tombol aksi user/RPG (prefix `u:`) — dipanggil dari index.js */
export async function userCallback(ctx, DB, registry, data, deps) {
  if (data === 'u:daftar') {
    const meta = registry.resolve('daftar')
    if (!meta) {
      await ctx.answerCbQuery('Fitur daftar belum tersedia.', { show_alert: true })
      return true
    }
    await ctx.answerCbQuery()
    await meta.handler({
      ctx,
      args: [],
      command: 'daftar',
      DB,
      registry,
      config: deps?.config || config,
      isOwner: isOwner(ctx.from?.id),
      logger: deps?.logger || logger,
    })
    return true
  }

  const map = {
    'u:profile': 'profile',
    'u:daily': 'daily',
    'u:balance': 'balance',
    'u:inv': 'inventori',
    'u:adv': 'adventure',
    'u:shop': 'shop',
    'u:rpg': 'joinrpg',
    'u:refill': 'balance',
  }
  const item = data.startsWith('u:buy:') ? 'shop' : map[data]
  if (!item) return false

  const meta = registry.resolve(item)
  if (!meta) {
    await ctx.answerCbQuery('Fitur belum tersedia.', { show_alert: true })
    return true
  }

  await ctx.answerCbQuery()
  const args = data.startsWith('u:buy:')
    ? [data.slice('u:buy:'.length)]
    : data === 'u:refill'
      ? ['refill']
      : []
  try {
    await meta.handler({
      ctx,
      args,
      command: args[0] === 'refill' ? 'refill' : meta.commands[0],
      DB,
      registry,
      config: deps?.config || config,
      isOwner: isOwner(ctx.from?.id),
      logger: deps?.logger || logger,
    })
  } catch (e) {
    logger.error('user callback error', e)
    await ctx.reply('❌ Terjadi kesalahan: ' + String(e.message).slice(0, 200)).catch(() => {})
  }
  return true
}

/** simpan foto menu yang baru dikirim owner (dipanggil dari index.js) */
export async function applyMenuPhoto(ctx, DB) {
  const photo = (ctx.message.photo || []).sort((a, b) => b.width - a.width)[0]
  if (!photo) return false
  DB.update('settings', 'menu', { photo: photo.file_id, style: 'photo' })
  DB.set('menus', String(ctx.chat.id), null)
  DB.del('pending', String(ctx.chat.id))
  await ctx.reply('✅ Foto menu diperbarui. Kirim /menu untuk melihat.')
  return true
}
