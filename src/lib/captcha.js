/**
 * Telebot © 2025 slowlyh — generator CAPTCHA berbasis canvas.
 * Memakai @napi-rs/canvas (binary prebuilt, tanpa kompilasi) bila tersedia,
 * dengan fallback ke renderer PNG murni (zlib) bila canvas tidak terpasang.
 */
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// ---------- util umum ----------
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const pick = (n = 1) => {
  let s = ''
  for (let i = 0; i < n; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)]
  return s
}
const rnd = (min, max) => min + crypto.randomInt(max - min + 1)

let canvasLib = null
let canvasChecked = false
function loadCanvas() {
  if (canvasChecked) return canvasLib
  canvasChecked = true
  try {
    canvasLib = require('@napi-rs/canvas')
  } catch {
    canvasLib = null
  }
  return canvasLib
}

export function captchaRendererKind() {
  return loadCanvas() ? 'canvas' : 'builtin'
}

// ============================================================
//  RENDERER 1 — CANVAS (tampilan bagus)
// ============================================================
function renderWithCanvas(text) {
  const { createCanvas } = loadCanvas()

  const W = 340
  const H = 130
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // latar gradasi lembut
  const grad = ctx.createLinearGradient(0, 0, W, H)
  const hue = rnd(0, 360)
  grad.addColorStop(0, `hsl(${hue}, 45%, 94%)`)
  grad.addColorStop(0.5, `hsl(${(hue + 40) % 360}, 50%, 97%)`)
  grad.addColorStop(1, `hsl(${(hue + 80) % 360}, 45%, 92%)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // bintik noise (halus, tidak menutupi karakter)
  for (let i = 0; i < 110; i++) {
    ctx.fillStyle = `hsla(${rnd(0, 360)}, 65%, ${rnd(50, 80)}%, ${(rnd(8, 22) / 100).toFixed(2)})`
    const r = rnd(1, 2)
    ctx.beginPath()
    ctx.arc(rnd(0, W), rnd(0, H), r, 0, Math.PI * 2)
    ctx.fill()
  }

  // garis gelombang tipis (di belakang teks, samar)
  for (let i = 0; i < 2; i++) {
    ctx.strokeStyle = `hsla(${rnd(0, 360)}, 55%, 60%, 0.22)`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const y0 = rnd(20, H - 20)
    ctx.moveTo(0, y0)
    for (let x = 0; x <= W; x += 20) {
      ctx.lineTo(x, y0 + Math.sin(x / rnd(20, 45)) * rnd(4, 12))
    }
    ctx.stroke()
  }

  // karakter
  const slot = W / (text.length + 1)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const x = slot * (i + 1)
    const y = H / 2 + rnd(-8, 8)
    const size = rnd(46, 60)
    const angle = (rnd(-22, 22) * Math.PI) / 180

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)

    ctx.font = `bold ${size}px "DejaVu Sans", "Liberation Sans", Arial, sans-serif`
    ctx.lineWidth = rnd(3, 4)
    ctx.strokeStyle = `hsla(${rnd(200, 320)}, 55%, 22%, 0.85)`
    ctx.strokeText(ch, 0, 0)

    ctx.fillStyle = `hsl(${rnd(0, 359)}, ${rnd(60, 85)}%, ${rnd(35, 52)}%)`
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  }

  // garis depan tipis (efek gangguan halus)
  for (let i = 0; i < 1; i++) {
    ctx.strokeStyle = `hsla(${rnd(0, 360)}, 60%, 50%, 0.18)`
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(0, rnd(15, H - 15))
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, rnd(15, H - 15))
    ctx.stroke()
  }

  return canvas.toBuffer('image/png')
}

// ============================================================
//  RENDERER 2 — BUILTIN (fallback PNG murni, tanpa dependensi)
// ============================================================
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function renderBuiltin(text) {
  const scale = 5
  const charW = 5 * scale
  const charH = 7 * scale
  const padX = 18
  const gap = 12
  const w = padX * 2 + text.length * charW + (text.length - 1) * gap
  const h = charH + 44
  const px = Buffer.alloc(w * h * 3)
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const i = (y * w + x) * 3
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
  }

  const bg = [rnd(238, 252), rnd(238, 252), rnd(240, 254)]
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, bg)

  for (let i = 0; i < Math.floor(w * h * 0.02); i++) {
    set(rnd(0, w - 1), rnd(0, h - 1), [rnd(180, 225), rnd(180, 225), rnd(180, 225)])
  }
  for (let i = 0; i < 2; i++) {
    const color = [rnd(170, 210), rnd(170, 210), rnd(170, 210)]
    let x = 0
    let y = rnd(10, h - 10)
    const dy = rnd(-1, 1)
    while (x < w) {
      set(x, y, color)
      x += 1
      y += dy
    }
  }

  for (let i = 0; i < text.length; i++) {
    const color = [rnd(10, 70), rnd(10, 70), rnd(20, 90)]
    const glyph = FONT[text[i]]
    if (!glyph) continue
    const ox = padX + i * (charW + gap)
    const oy = rnd(12, h - charH - 12)
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (glyph[gy][gx] !== '1') continue
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) set(ox + gx * scale + sx, oy + gy * scale + sy, color)
        }
      }
    }
  }

  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0
    px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * Buat captcha baru.
 * @param {number} length jumlah karakter (default 5)
 * @returns {{ text: string, png: Buffer, renderer: string }}
 */
export function generateCaptcha(length = 5) {
  const text = pick(length)
  const useCanvas = Boolean(loadCanvas())
  let png
  let renderer = 'builtin'

  if (useCanvas) {
    try {
      png = renderWithCanvas(text)
      renderer = 'canvas'
    } catch {
      png = renderBuiltin(text)
    }
  } else {
    png = renderBuiltin(text)
  }

  return { text, png, renderer }
}

export default { generateCaptcha, captchaRendererKind }
