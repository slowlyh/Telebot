/**
 * Telebot © 2025 slowlyh — supervisor: dashboard + auto-restart.
 * Jalankan: `npm start`. Untuk restart dari bot, kirim 'reset' via IPC.
 */
import { spawn } from 'child_process'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCRIPT = path.join(__dirname, 'src', 'index.js')

let child = null
let stopping = false

const countPlugins = (dir) => {
  let n = 0
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) n += countPlugins(path.join(dir, e.name))
      else if (e.name.endsWith('.js')) n++
    }
  } catch {}
  return n
}

function dashboard() {
  const min = (s) => `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`
  const mem = (b) => `${(b / 1048576).toFixed(0)}MB`
  const rows = [
    ['app', 'Telebot v3'],
    ['node', process.version],
    ['host', `${os.platform()}/${os.arch()}`],
    ['mem', `${mem(os.totalmem() - os.freemem())}/${mem(os.totalmem())}`],
    ['uptime', min(os.uptime())],
    ['prefix', process.env.BOT_PREFIX || '/'],
    ['owners', process.env.OWNER_IDS || '-'],
    ['token', process.env.BOT_TOKEN ? 'set' : 'MISSING'],
    ['plugins', String(countPlugins(path.join(__dirname, 'src', 'plugins')))],
    ['db', process.env.DB_TYPE || 'json'],
  ]
  const w = Math.max(...rows.map(([k]) => k.length))
  const box = rows.map(([k, v]) => ` │ ${k.padEnd(w)} : ${v}`).join('\n')
  console.log('┌─ BOT DASHBOARD ' + '─'.repeat(w + 10) + '┐')
  console.log(box)
  console.log('└' + '─'.repeat(w + 13) + '┘\n')
}

function start() {
  child = spawn(process.execPath, [SCRIPT], { stdio: 'inherit', ipc: true })
  child.on('message', (m) => {
    if (m === 'reset') {
      stopping = true
      child.kill()
    }
  })
  child.on('exit', (code) => {
    if (stopping) {
      stopping = false
      start() // reset diminta → langsung nyalakan lagi
      return
    }
    if (code === 2) {
      console.log('[supervisor] berhenti permanen (konfigurasi fatal, misal token salah).')
      process.exit(2)
    }
    console.log(`[supervisor] bot exit (code ${code}), restart in 5s…`)
    setTimeout(start, 5000)
  })
}

dashboard()
if (!process.env.BOT_TOKEN) {
  console.log('[!] BOT_TOKEN belum di-set — cek .env (lihat .env.example)')
  process.exit(1)
}
const dbDir = path.join(__dirname, process.env.DB_DIR || 'data')
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
start()
process.once('SIGINT', () => {
  if (child) child.kill()
  process.exit(0)
})
process.once('SIGTERM', () => {
  if (child) child.kill()
  process.exit(0)
})
