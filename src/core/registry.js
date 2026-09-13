/**
 * Telebot © 2025 slowlyh — registry plugin: load, hot-reload, resolve, list.
 * Plugin = satu file .js berisi `export default { command: [...], handler }`.
 */
import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import { pathToFileURL } from 'url'
import logger from '#lib/logger'

export class Registry {
  constructor(dir) {
    this.dir = dir
    this.map = new Map() // name -> meta
    this.watcher = null
  }

  walk(dir) {
    const out = []
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) out.push(...this.walk(full))
      else if (full.endsWith('.js')) out.push(full)
    }
    return out
  }

  async loadAll() {
    this.map.clear()
    let files = []
    try {
      files = this.walk(this.dir)
    } catch {
      logger.warn('plugins dir kosong / tidak ada: ' + this.dir)
      return
    }
    for (const f of files) await this.loadFile(f)
    logger.info(`plugins: ${this.map.size} aktif`)
  }

  async loadFile(file) {
    try {
      const href = pathToFileURL(file).href + `?t=${Date.now()}`
      const mod = await import(href)
      const exp = mod.default || mod
      if (!exp || !exp.name || typeof exp.handler !== 'function') return
      const commands = Array.isArray(exp.commands)
        ? exp.commands
        : Array.isArray(exp.command)
          ? exp.command
          : []
      if (!commands.length) return
      this.map.set(exp.name, {
        name: exp.name,
        description: exp.description || '',
        commands,
        hidden: Boolean(exp.hidden),
        failed: exp.failed || 'Gagal menjalankan %command: %error',
        wait: exp.wait === undefined ? null : exp.wait,
        category: exp.category || 'General',
        cooldown: Number.isFinite(exp.cooldown) ? exp.cooldown : 0,
        usage: exp.usage || '',
        group: Boolean(exp.group),
        owner: Boolean(exp.owner),
        file,
        handler: exp.handler,
      })
      return true
    } catch (e) {
      logger.error('gagal load ' + file, e)
      return false
    }
  }

  unloadByName(name) {
    return this.map.delete(name)
  }

  watch() {
    if (this.watcher) return
    this.watcher = chokidar.watch(this.dir, { ignoreInitial: true })
    this.watcher.on('add', (f) => this.loadFile(f))
    this.watcher.on('change', async (f) => {
      const item = [...this.map.values()].find((x) => x.file === f)
      if (item) this.unloadByName(item.name)
      await this.loadFile(f)
      logger.info('reloaded ' + path.basename(f))
    })
    this.watcher.on('unlink', (f) => {
      const item = [...this.map.values()].find((x) => x.file === f)
      if (item) this.unloadByName(item.name)
    })
    logger.info('hot-reload aktif untuk ' + this.dir)
  }

  resolve(cmd) {
    for (const meta of this.map.values()) {
      if (meta.commands.includes(cmd)) return meta
    }
    return this.map.get(cmd) || null
  }

  /** kategori -> plugin yang tampil di menu (non-hidden) */
  categories() {
    const groups = {}
    for (const meta of this.map.values()) {
      if (meta.hidden) continue
      if (!groups[meta.category]) groups[meta.category] = []
      groups[meta.category].push(meta)
    }
    return groups
  }

  stats() {
    let visible = 0
    for (const m of this.map.values()) if (!m.hidden) visible++
    return { plugins: this.map.size, visible, categories: Object.keys(this.categories()).length }
  }
}
