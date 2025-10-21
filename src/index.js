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
import { Telegraf } from 'telegraf'
import config from '#config/index'
import { Registry } from '#core/registry'
import API, { Velyn, Neko } from '#lib/API/request'
import logger from '#lib/logger'
import DB from '#db/index'
import uploader from '#lib/uploader'

if (!config.token) {
  console.log('BOT_TOKEN missing')
  process.exit(1)
}

const bot = new Telegraf(config.token, { handlerTimeout: 30000 })
const registry = new Registry(new URL('./plugins/', import.meta.url).pathname)
await registry.loadAll()
registry.watch()

const isOwner = (id) => config.owners.includes(String(id))
const cooldown = new Map()

bot.on('text', async (ctx) => {
  const text = ctx.message.text || ''
  if (!text.startsWith(config.prefix)) return
  const [cmd, ...rest] = text.slice(config.prefix.length).trim().split(/\s+/)
  const command = (cmd || '').toLowerCase()
  const args = rest
  const meta = registry.resolve(command)
  if (!meta) return
  if (meta.owner && !isOwner(ctx.from.id)) return ctx.reply('owner only')
  if (meta.group && ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')
    return ctx.reply('hanya di grup')
  if (meta.private && ctx.chat.type !== 'private') return ctx.reply('hanya di private')
  const key = `${ctx.from.id}:${meta.name}`
  const now = Date.now()
  if (meta.cooldown && meta.cooldown > 0) {
    const last = cooldown.get(key) || 0
    const ms = meta.cooldown * 1000
    if (now - last < ms) {
      const wait = Math.ceil((ms - (now - last)) / 1000)
      return ctx.reply(`cooldown ${wait}s`)
    }
    cooldown.set(key, now)
  }
  const userTag = `${ctx.from.username ? '@' + ctx.from.username : ctx.from.id}`
  const place = `${ctx.chat.type}(${ctx.chat.id})`
  logger.info(`cmd ${config.prefix}${command} by ${userTag} in ${place}`)
  let waitMsgId = null
  if (meta.wait) {
    const m = await ctx.reply(typeof meta.wait === 'string' ? meta.wait : 'processing...')
    waitMsgId = m.message_id
  }
  try {
    await meta.handler({
      ctx,
      bot,
      args,
      command,
      registry,
      isOwner: isOwner(ctx.from.id),
      Velyn,
      Neko,
      API,
      DB,
      uploader,
    })
  } catch (e) {
    const failed = meta.failed || 'Failed to execute %command: %error'
    await ctx.reply(failed.replace('%command', command).replace('%error', e?.message || String(e)))
  } finally {
    if (waitMsgId) {
      try {
        await ctx.deleteMessage(waitMsgId)
      } catch {}
    }
  }
})

await bot.launch({ dropPendingUpdates: true })
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
