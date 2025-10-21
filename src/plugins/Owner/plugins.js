/**
 * Copyright © 2025 [ slowlyh ]
 *
 * All rights reserved. This source code is the property of [ ChatGPT ].
 * Unauthorized copying, distribution, modification, or use of this file,
 * via any medium, is strictly prohibited without prior written permission.
 *
 * This software is protected under international copyright laws.
 *
 * Contact: [ hyuuoffc@gmail.com ]
 * GitHub: https://github.com/slowlyh
 * Official: https://hyuu.tech
 */

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import logger from '#lib/logger'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PLUGINS_BASE = path.join(__dirname, '..')

export default {
  name: 'plugins',
  description: 'Kelola plugin (add/del/get/list)',
  command: ['plugins'],
  permissions: 'all',
  hidden: false,
  failed: 'Failed to execute %command: %error',
  wait: null,
  category: 'owner',
  cooldown: 2,
  limit: false,
  usage: '$prefix$command <add|del|get|list> [path/file.js]',
  group: false,
  private: false,
  owner: true,

  handler: async ({ ctx, args, DB, registry }) => {
    const sub = (args[0] || '').toLowerCase()
    const store = DB.getCollection('plugins')

    // 🧩 list plugins
    if (!sub || sub === 'list') {
      const list = store.keys().sort()
      await ctx.reply(
        list.length ? `📦 *Daftar Plugin:*\n${list.join('\n')}` : 'Tidak ada plugin.',
        {
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // ➕ add plugin
    if (sub === 'add') {
      const rawPath = args[1] || ''
      if (!rawPath) return ctx.reply('Format: /plugins add <path/file.js> (reply dengan kode)')
      const rel = rawPath.endsWith('.js') ? rawPath : rawPath + '.js'
      const target = path.join(PLUGINS_BASE, rel)

      const reply =
        ctx.message.reply_to_message &&
        (ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption)
      if (!reply) return ctx.reply('❗ Balas kode plugin untuk disimpan.')

      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, reply)
      logger.info('plugin saved: ' + target)
      await registry.loadFile(target)
      store.set(rel, { path: target, at: Date.now() })

      await ctx.reply(`✅ Plugin *${rel}* berhasil ditambahkan.`, {
        parse_mode: 'Markdown',
      })
      return
    }

    // ❌ delete plugin
    if (sub === 'del') {
      const rawPath = args[1] || ''
      if (!rawPath) return ctx.reply('Format: /plugins del <path/file.js>')
      const rel = rawPath.endsWith('.js') ? rawPath : rawPath + '.js'
      const target = path.join(PLUGINS_BASE, rel)

      try {
        await fs.promises.unlink(target)
      } catch {}
      registry.unloadByName(path.parse(rel).name)
      store.del(rel)

      await ctx.reply(`🗑️ Plugin *${rel}* berhasil dihapus.`, {
        parse_mode: 'Markdown',
      })
      return
    }

    // 🧾 get plugin (as image)
    if (sub === 'get') {
      const rawPath = args[1] || ''
      if (!rawPath) return ctx.reply('Format: /plugins get <path/file.js>')
      const rel = rawPath.endsWith('.js') ? rawPath : rawPath + '.js'
      const target = path.join(PLUGINS_BASE, rel)

      if (!fs.existsSync(target)) return ctx.reply('❌ Plugin tidak ditemukan.')

      const code = fs.readFileSync(target, 'utf-8').slice(0, 5000)
      const loading = await ctx.reply('🖼️ *Membuat preview kode...*', {
        parse_mode: 'Markdown',
      })

      try {
        const encoded = encodeURIComponent(code)
        const imageUrl = `https://api.nekolabs.my.id/canvas/carbonify?code=${encoded}`
        await ctx.deleteMessage(loading.message_id)
        await ctx.replyWithPhoto(
          { url: imageUrl },
          {
            caption: `📄 *${rel}*\nKode ditampilkan sebagai gambar.`,
            parse_mode: 'Markdown',
          },
        )
      } catch (err) {
        console.error('Error carbonify:', err)
        await ctx.deleteMessage(loading.message_id)
        await ctx.reply('❌ Gagal membuat gambar kode.')
      }
      return
    }

    await ctx.reply('❓ Subcommand tidak dikenal.\nGunakan: add | del | get | list')
  },
}
