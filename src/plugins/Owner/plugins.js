/**
 * Telebot © 2025 slowlyh — plugin: tambah/hapus/list plugin (tanpa API eksternal).
 */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGINS_BASE = path.join(__dirname, '..')

const rel = (p) => (p.endsWith('.js') ? p : p + '.js')

export default {
  name: 'plugins',
  description: 'Kelola plugin: add / del / list (reply dengan kode untuk add)',
  command: ['plugins', 'plugin'],
  hidden: false,
  category: 'owner',
  cooldown: 2,
  usage: '$prefix$command <add|del|list> [kategori/file]',
  owner: true,

  handler: async ({ ctx, args, DB, registry }) => {
    const sub = (args[0] || 'list').toLowerCase()

    if (sub === 'list') {
      const list = [...registry.map.values()].sort((a, b) => a.name.localeCompare(b.name))
      const txt = list
        .map((p) => `• ${p.name} <i>(${p.category})</i> — ${p.commands.join(', ')}`)
        .join('\n')
      return ctx.reply(`🧩 <b>${list.length} plugin aktif</b>\n\n${txt}`, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      })
    }

    if (sub === 'add') {
      const raw = args[1] || ''
      if (!raw) return ctx.reply('📖 /plugins add <kategori/nama> — lalu reply kode plugin.')
      const target = path.join(PLUGINS_BASE, rel(raw))
      if (!target.startsWith(PLUGINS_BASE)) return ctx.reply('⛔ Path tidak valid.')
      const code =
        ctx.message.reply_to_message &&
        (ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption)
      if (!code) return ctx.reply('↩️ Reply pesan berisi kode plugin.')
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, code)
      const ok = await registry.loadFile(target)
      DB.update('plugins_index', 'map', {
        [rel(raw)]: { path: target, at: Date.now() },
      })
      return ctx.reply(
        ok ? `✅ Plugin <code>${rel(raw)}</code> ditambahkan.` : '⚠️ File tersimpan, tapi gagal dimuat (cek struktur plugin/log).',
        { parse_mode: 'HTML' },
      )
    }

    if (sub === 'del') {
      const raw = args[1] || ''
      if (!raw) return ctx.reply('📖 /plugins del <kategori/nama>')
      const file = rel(raw)
      const target = path.join(PLUGINS_BASE, file)
      if (!target.startsWith(PLUGINS_BASE)) return ctx.reply('⛔ Path tidak valid.')
      try {
        fs.unlinkSync(target)
      } catch {}
      registry.unloadByName(path.parse(file).name)
      const map = DB.get('plugins_index', 'map') || {}
      delete map[file]
      DB.set('plugins_index', 'map', map)
      return ctx.reply(`🗑️ Plugin <code>${file}</code> dihapus.`, { parse_mode: 'HTML' })
    }

    return ctx.reply('❓ Subcommand: add | del | list')
  },
}
