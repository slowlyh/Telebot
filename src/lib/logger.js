/**
 * Telebot © 2025 slowlyh — logger berwarna, timestamp WIB (TZ dari config).
 */
import config from '#config'

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bgRed: '\x1b[41m',
}

const stamp = () =>
  new Date().toLocaleString('id-ID', { timeZone: config.tz }).replace(',', ' ')

const paint = {
  info: (t) => `${C.bold}[${t}]${C.reset}`,
  warn: (t) => `${C.yellow}[${t}]${C.reset}`,
  error: (t) => `${C.bgRed}${C.reset} ${C.red}[${t}]${C.reset}`,
  debug: (t) => `${C.gray}[${t}]${C.reset}`,
}

const log = (type, message, error = null) => {
  const head = `${C.gray}${stamp()} WIB${C.reset} ${paint[type] ? paint[type](type.toUpperCase()) : type}`
  console.log(`${head} ${message}`)
  if (error instanceof Error) {
    console.log(`${C.red}Error: ${error.message}${C.reset}`)
    if (error.stack) console.log(`${C.gray}Stack: ${error.stack}${C.reset}`)
  } else if (error) {
    try {
      console.log(`Additional: ${JSON.stringify(error, null, 2)}`)
    } catch {}
  }
}

const logger = {
  info: (m) => log('info', m),
  warn: (m) => log('warn', m),
  error: (m, e) => log('error', m, e),
  debug: (m) => log('debug', m),
}

export const banner = (rows) => {
  const w = Math.max(...rows.map(([k]) => String(k).length))
  console.log(`${C.cyan}┌─ Telebot ${'─'.repeat(w + 2)}┐${C.reset}`)
  for (const [k, v] of rows)
    console.log(`${C.cyan} │${C.reset} ${String(k).padEnd(w)} : ${v}`)
  console.log(`${C.cyan}└${'─'.repeat(w + 15)}┘${C.reset}`)
}

export default logger
