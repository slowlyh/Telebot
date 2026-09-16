/**
 * Harness simulasi alur /daftar: DB asli (sqlite/ json via env), plugin daftar,
 * core flow — tanpa Telegram. Mock ctx mencatat balasan.
 * Jalankan: node test/daftar-flow.test.mjs
 */
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'telebot-test-'))
process.env.DB_TYPE = process.env.DB_TYPE || 'sqlite'
process.env.DB_DIR = dir

const { initDB } = await import('../src/db/index.js')
const { runFlow, getFlow } = await import('../src/core/flow.js')
await import('../src/plugins/User/daftar.js') // registrasi flow 'daftar'
const plugin = (await import('../src/plugins/User/daftar.js')).default
const config = (await import('../src/config.js')).default

const DB = await initDB()
const USER = { id: 111, first_name: 'Tester', username: 'tester' }
const CHAT = { id: 111, type: 'private' }

let sent = []
function makeCtx() {
  return {
    from: USER,
    chat: CHAT,
    botInfo: { username: 'testbot' },
    message: null,
    reply(text, _opts) {
      sent.push({ kind: 'text', text: String(text) })
      return Promise.resolve({ message_id: sent.length })
    },
    replyWithPhoto(_media, opts) {
      sent.push({ kind: 'photo', caption: String(opts?.caption || '') })
      return Promise.resolve({ message_id: sent.length })
    },
  }
}

async function feed(ctx, text) {
  ctx.message = { text }
  const consumed = await runFlow(ctx, { DB, config, logger: console })
  return consumed
}

function last() {
  return sent[sent.length - 1]
}
const USER_ID_STR = String(USER.id)

function reset() {
  sent = []
  DB.del('flows', USER_ID_STR)
  DB.del('captcha', USER_ID_STR)
  DB.del('users', USER_ID_STR)
}

// ---------- test 1: alur sukses ----------
{
  reset()
  const ctx = makeCtx()
  await plugin.handler({ ctx, args: [], command: 'daftar', DB })
  assert.ok(last().text.includes('nama'), 'harus minta nama')
  await feed(ctx, 'Budi Santoso')
  assert.ok(last().text.includes('umur'), 'harus minta umur')
  await feed(ctx, '17')
  assert.equal(last().kind, 'text', 'verifikasi harus berupa teks, bukan foto')
  assert.ok(last().text.includes('Verifikasi Kode'), 'header verifikasi: ' + last().text)
  const m = last().text.match(/Kode kamu: <b>(\w+)<\/b>/)
  assert.ok(m, 'kode harus tercantum di pesan')
  const cap = DB.get('captcha', USER_ID_STR)
  assert.ok(cap?.code, 'captcha tersimpan di DB')
  assert.equal(cap.code, m[1], 'kode DB = kode pesan')
  await feed(ctx, 'XXXXX')
  assert.ok(cap.code !== 'XXXXX', 'hindari kebetulan benar')
  assert.ok(last().text.includes('Sisa percobaan'), 'harus info sisa percobaan')
  await feed(ctx, cap.code.toLowerCase()) // huruf kecil harus tetap benar
  assert.ok(last().text.includes('Pendaftaran Berhasil'), 'sukses: ' + last().text)
  const u = DB.get('users', USER_ID_STR)
  assert.equal(u.registered, true)
  assert.equal(u.regName, 'Budi Santoso')
  assert.equal(u.age, 17)
  assert.equal(u.balance, config.economy.registerBonus)
  console.log('✓ test 1 — alur sukses + captcha case-insensitive')
}

// ---------- test 2: captcha salah 3x membatalkan ----------
{
  reset()
  const ctx = makeCtx()
  await plugin.handler({ ctx, args: [], command: 'daftar', DB })
  await feed(ctx, 'Coba Gagal')
  await feed(ctx, '20')
  for (let i = 0; i < 3; i++) await feed(ctx, 'ZZZZZ')
  assert.ok(last().text.includes('dibatalkan'), 'pesan batal: ' + last().text)
  assert.equal(getFlow(DB, USER.id), null, 'flow harus dibersihkan')
  assert.equal(DB.get('captcha', USER_ID_STR), null, 'captcha harus dibersihkan')
  console.log('✓ test 2 — 3x salah → batal bersih')
}

// ---------- test 3: tanpa gambar + toleransi spasi/case ----------
{
  reset()
  const ctx = makeCtx()
  let photoCalls = 0
  const origPhoto = ctx.replyWithPhoto
  ctx.replyWithPhoto = (...a) => {
    photoCalls++
    return origPhoto.call(ctx, ...a)
  }
  await plugin.handler({ ctx, args: [], command: 'daftar', DB })
  await feed(ctx, 'Kode Teks')
  await feed(ctx, '25')
  assert.equal(photoCalls, 0, 'tidak boleh ada kiriman foto sama sekali')
  const m = last().text.match(/Kode kamu: <b>(\w+)<\/b>/)
  assert.ok(m, 'kode harus tercantum')
  await feed(ctx, ' ' + m[1].toLowerCase().split('').join(' ') + ' ') // case + spasi
  assert.ok(last().text.includes('Berhasil'), 'sukses meski beda case/spasi')
  console.log('✓ test 3 — verifikasi murni teks, toleran spasi & case')
}

// ---------- test 4: ketahanan restart (state di DB) ----------
{
  reset()
  const ctx = makeCtx()
  await plugin.handler({ ctx, args: [], command: 'daftar', DB })
  await feed(ctx, 'Tahan Restart')
  await feed(ctx, '30')
  // 'restart' = modul flow yang sama; state di DB sudah membuktikan persisten.
  const f = getFlow(DB, USER.id)
  assert.equal(f.step, 'captcha', 'step tersimpan')
  const cap = DB.get('captcha', USER_ID_STR)
  await feed(ctx, cap.code)
  assert.ok(last().text.includes('Berhasil'))
  console.log('✓ test 4 — state flow + captcha persist di DB')
}

// ---------- test 5: input tidak valid ----------
{
  reset()
  const ctx = makeCtx()
  await plugin.handler({ ctx, args: [], command: 'daftar', DB })
  await feed(ctx, 'ab') // terlalu pendek
  assert.ok(last().text.includes('3–32'), 'tolak nama pendek')
  await feed(ctx, 'nama<script>') // karakter terlarang
  assert.ok(last().text.includes('hanya boleh'), 'tolak nama invalid')
  await feed(ctx, 'lima belas') // umur bukan angka
  assert.ok(last().text.includes('angka'), 'tolak umur non-angka')
  await feed(ctx, '0x14') // lolos Number() tapi bukan umur sah
  assert.ok(last().text.includes('angka'), 'tolak umur 0x14')
  await feed(ctx, '1e2')
  assert.ok(last().text.includes('angka'), 'tolak umur 1e2')
  await feed(ctx, '100')
  assert.ok(last().text.includes('antara 5 sampai 99'), 'tolak umur >99')
  await feed(ctx, '/batal')
  assert.ok(last().text.includes('Dibatalkan'))
  assert.equal(getFlow(DB, USER.id), null)
  assert.equal(DB.get('captcha', USER_ID_STR), null, 'captcha dibersihkan via onExpire')
  console.log('✓ test 5 — validasi input + /batal')
}

// ---------- test 6: sudah terdaftar ----------
{
  reset()
  DB.set('users', USER_ID_STR, { registered: true, regName: 'Budi Santoso' })
  const ctx = makeCtx()
  await plugin.handler({ ctx, args: [], command: 'daftar', DB })
  assert.ok(last().text.includes('sudah terdaftar'), 'pesan sudah daftar')
  console.log('✓ test 6 — user terdaftar ditolak ulang')
}

// ---------- test 7: sesi flow kedaluwarsa → dinotifikasi + captcha dibersihkan ----------
{
  reset()
  const ctx = makeCtx()
  await plugin.handler({ ctx, args: [], command: 'daftar', DB })
  await feed(ctx, 'Sesi Lama')
  await feed(ctx, '21')
  assert.ok(DB.get('captcha', USER_ID_STR), 'captcha ada sebelum expire')
  const f = DB.get('flows', USER_ID_STR)
  DB.set('flows', USER_ID_STR, { ...f, at: Date.now() - 11 * 60 * 1000 }) // mundur 11 menit
  await feed(ctx, 'halo')
  assert.ok(last().text.includes('Sesi percakapan berakhir'), 'harus dinotifikasi: ' + last().text)
  assert.equal(DB.get('captcha', USER_ID_STR), null, 'captcha ikut dibersihkan')
  assert.equal(getFlow(DB, USER.id), null)
  console.log('✓ test 7 — TTL expire dinotifikasi + bersih')
}

fs.rmSync(dir, { recursive: true, force: true })
console.log('\nSEMUA TEST LULUS ✅')
