/**
 * Telebot © 2025 slowlyh — generator kode verifikasi teks.
 * Tanpa gambar: kode dikirim sebagai teks dan user mengetik ulang.
 * Alphabet bebas ambiguitas (tanpa 0/O, 1/I/L).
 */
import crypto from 'node:crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Buat kode verifikasi baru.
 * @param {number} length jumlah karakter (default 5)
 * @returns {{ code: string }} kode huruf besar
 */
export function generateCode(length = 5) {
  let s = ''
  for (let i = 0; i < Math.max(3, Math.min(8, length)); i++)
    s += ALPHABET[crypto.randomInt(ALPHABET.length)]
  return { code: s }
}

export default { generateCode }
