/**
 * Telebot © 2025 slowlyh — sistem menu interaktif.
 * Satu pesan saja berubah-ubah (edit caption + inline keyboard):
 *   home → kategori → detail plugin, plus panel pengaturan menu (owner).
 * Tampilan, gambar, dan tombol bisa diubah owner lewat /menu → ⚙️.
 */
import { Markup } from 'telegraf'
import config, { isOwner } from '#config'

const ICONS = {
  info: 'ℹ️',
  general: '📦',
  group: '👥',
  owner: '👑',
  tools: '🛠️',
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
const photoSource = (src) =>
  !src ? null : isFileId(src) ? src : /^https?:\/\//.test(src) ? { url: src } : src

async function remember(DB, chatId, msgId, type) {
  DB.set('menus', String(chatId), { msgId, type })
}

/** render (atau edit) tampilan tertentu dari menu tanpa spam pesan baru */
export async function showMenu(ctx, DB, registry, view = 'home', arg = null) {
  const s = menuSettings(DB)
  const cats = registry.categories()
  const catNames = Object.keys(cats).sort((a, b) => a.localeCompare(b))
  const chatId = ctx.chat.id
  let caption = ''
  let rows = []

  if (view === 'home') {
    const st = registry.stats()
    caption = [
      `🤖 <b>${escapeHtml(s.title)}</b>`,
      `<i>${escapeHtml(s.subtitle)}</i>`,
      '',
      `🧩 <b>${st.visible}</b> perintah · <b>${catNames.length}</b> kategori · <b>${st.plugins}</b> plugin`,
      `⏱️ Uptime <code>${fmtDuration(Math.floor(process.uptime()))}</code> · Node <code>${process.version}</code>`,
      '',
      '👇 Pilih kategori di bawah:',
    ].join('\n')
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
  const src = photoSource(s.photo)

  // coba edit pesan menu yang sudah ada (hemat pesan, tidak spam)
  if (saved?.msgId) {
    try {
      if (saved.type === 'text' || s.style === 'text') {
        await ctx.telegram.editMessageText(chatId, saved.msgId, undefined, caption, {
          parse_mode: 'HTML',
          reply_markup: kb,
        })
        return
      }
      await ctx.telegram.editMessageMedia(chatId, saved.msgId, undefined, {
        type: 'photo',
        media: src || { url: config.menu.photo },
        caption,
        parse_mode: 'HTML',
      })
      await ctx.telegram.editMessageReplyMarkup(chatId, saved.msgId, undefined, kb)
      return
    } catch {
      // pesan lama sudah hilang / tidak bisa diedit → kirim baru
    }
  }

  let msg
  if (s.style !== 'text' && src) {
    msg = await ctx.replyWithPhoto(src, {
      caption,
      parse_mode: 'HTML',
      reply_markup: kb,
    })
  } else {
    msg = await ctx.reply(caption, {
      parse_mode: 'HTML',
      reply_markup: kb,
    })
  }
  await remember(DB, chatId, msg.message_id, s.style !== 'text' && src ? 'photo' : 'text')
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
