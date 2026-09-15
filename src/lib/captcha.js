/**
 * Telebot © 2025 slowlyh — generator CAPTCHA PNG murni (tanpa dependensi native).
 * Menggambar teks ke bitmap lalu meng-encode PNG memakai zlib bawaan Node.
 */
import zlib from 'node:zlib'
import crypto from 'node:crypto'

// font 5x7 untuk karakter yang tidak ambigu (tanpa 0/O, 1/I)
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

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

/** kanvas RGB sederhana */
function makeCanvas(w, h) {
  const px = Buffer.alloc(w * h * 3)
  return {
    w,
    h,
    px,
    set(x, y, [r, g, b]) {
      if (x < 0 || y < 0 || x >= w || y >= h) return
      const i = (y * w + x) * 3
      px[i] = r
      px[i + 1] = g
      px[i + 2] = b
    },
  }
}

function encodePng(canvas) {
  const { w, h, px } = canvas
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0 // filter none
    px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function randInt(min, max) {
  return min + crypto.randomInt(max - min + 1)
}

/** gambar satu glyph 5x7 dengan skala + rotasi kasar */
function drawGlyph(canvas, ch, ox, oy, scale, color) {
  const glyph = FONT[ch]
  if (!glyph) return
  for (let gy = 0; gy < 7; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      if (glyph[gy][gx] !== '1') continue
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          canvas.set(ox + gx * scale + sx, oy + gy * scale + sy, color)
        }
      }
    }
  }
}

/**
 * Buat captcha baru.
 * @returns {{ text: string, png: Buffer }}
 */
export function generateCaptcha(length = 5) {
  const text = Array.from({ length }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('')

  const scale = 5
  const charW = 5 * scale
  const charH = 7 * scale
  const padX = 18
  const gap = 12
  const w = padX * 2 + length * charW + (length - 1) * gap
  const h = charH + 44

  const canvas = makeCanvas(w, h)
  const bg = [randInt(238, 252), randInt(238, 252), randInt(240, 254)]

  // latar
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) canvas.set(x, y, bg)

  // noise titik (jarang, sebelum karakter)
  for (let i = 0; i < Math.floor(w * h * 0.02); i++) {
    canvas.set(randInt(0, w - 1), randInt(0, h - 1), [
      randInt(180, 225),
      randInt(180, 225),
      randInt(180, 225),
    ])
  }

  // garis tipis (sebelum karakter, agar karakter tetap dominan)
  for (let i = 0; i < 2; i++) {
    const color = [randInt(170, 210), randInt(170, 210), randInt(170, 210)]
    let x = 0
    let y = randInt(10, h - 10)
    const dy = randInt(-1, 1)
    while (x < w) {
      canvas.set(x, y, color)
      x += 1
      y += dy
    }
  }

  // karakter dengan warna & offset acak (digambar terakhir = paling jelas)
  for (let i = 0; i < text.length; i++) {
    const color = [randInt(10, 70), randInt(10, 70), randInt(20, 90)]
    const ox = padX + i * (charW + gap)
    const oy = randInt(12, h - charH - 12)
    drawGlyph(canvas, text[i], ox, oy, scale, color)
  }

  return { text, png: encodePng(canvas) }
}

export default { generateCaptcha }
