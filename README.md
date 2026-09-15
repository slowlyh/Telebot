# Telebot

Bot Telegram berbasis [Telegraf](https://telegraf.js.org) dengan arsitektur plugin modular, hot-reload, database ganda (JSON / SQLite), dan menu interaktif berbasis gambar + inline button. Ringkas, mudah dirawat, tanpa dependensi API pihak ketiga — semua fitur eksternal yang sering error sudah dihapus.

## Fitur

- **Plugin arsitektur** — setiap fitur adalah satu file di `src/plugins/<Kategori>/`, auto-load + hot-reload (chokidar).
- **Menu interaktif full-button** — satu pesan saja yang berubah (edit, bukan kirim baru → anti-spam): home → kategori → detail plugin, lengkap dengan foto header dan inline button. Aksi user (Profil, Daily, Adventure, Shop, Balance) langsung tersedia sebagai tombol.
- **Sistem user** — pendaftaran (`/daftar`) dengan verifikasi **captcha gambar**, bonus awal; tiap user punya **saldo**, **limit**, **EXP/level**.
- **RPG dasar** — `/joinrpg` (wajib daftar dulu), `/adventure`, `/inventori`, `/shop`, `/sell`, `/equip` dengan HP, ATK/DEF, loot, dan level.
- **Owner dapat mengatur tampilan menu** dari bot: ganti gambar header (kirim foto), mode foto/teks, reset ke bawaan — tersimpan di database.
- **Database ganda** — default **JSON**, bisa diganti **SQLite** lewat config (`DB_TYPE=sqlite`). API penyimpanan identik untuk keduanya.
- **Plugin manager** — owner menambah/menghapus plugin langsung dari chat (`/plugins`).
- **Self-update** — `/update` menarik commit terbaru via `git pull` (tanpa API GitHub).
- **Tanpa API eksternal** — tidak ada endpoint pihak ketiga yang error; bot hanya bicara dengan Telegram API.

## Struktur

```
Telebot/
├── main.js              # supervisor: dashboard + auto-restart
├── package.json
├── .env.example         # semua konfigurasi
└── src/
    ├── config.js        # baca env → objek config terpusat
    ├── index.js         # bootstrap bot & wiring
    ├── core/
    │   ├── handler.js   # dispatcher perintah + cooldown + guard owner/grup
    │   ├── flow.js      # alur percakapan multi-langkah (wizard /daftar)
    │   ├── menu.js      # mesin menu interaktif full-button
    │   └── registry.js  # plugin loader + hot-reload
    ├── db/
    │   └── index.js     # store JSON/SQLite dengan API yang sama
    ├── lib/
    │   ├── captcha.js   # generator CAPTCHA PNG murni (tanpa dependensi)
    │   ├── user.js      # inti data user: limit, exp/level, balance
    │   ├── rpg.js       # item, shop, zone, simulasi adventure
    │   └── logger.js    # logger berwarna + banner dashboard
    └── plugins/         # fitur (1 folder = 1 kategori menu)
        ├── Info/        # menu, ping
        ├── User/        # daftar, profile, daily, balance
        ├── RPG/         # joinrpg, adventure, inventori, shop, sell, equip
        ├── Group/       # settitle, setdesc, pin, unpin, groupinfo
        ├── Tools/       # utilitas offline (hapus, halo, listuser, cek)
        └── Owner/       # plugins, update, exec/eval/reset, eco
```

## Instalasi

Syarat: **Node.js ≥ 22.5** (SQLite memakai `node:sqlite` bawaan Node).

```bash
git clone https://github.com/slowlyh/Telebot.git
cd Telebot
npm install
cp .env.example .env    # isi BOT_TOKEN & OWNER_IDS
npm start
```

`npm start` menjalankan supervisor (`main.js`) yang menampilkan dashboard lalu menjaga bot tetap hidup; kirim `/reset` dari owner untuk restart.

## Konfigurasi (`.env`)

| Key | Default | Keterangan |
|---|---|---|
| `BOT_TOKEN` | – | token dari @BotFather (wajib) |
| `OWNER_IDS` | – | id owner, pisahkan dengan koma |
| `BOT_PREFIX` | `/` | prefix perintah |
| `DB_TYPE` | `json` | `json` **atau** `sqlite` |
| `DB_DIR` | `data` | folder penyimpanan (file `telebot.db` / `*.json`) |
| `MENU_PHOTO` | (bawaan) | URL/`file_id` gambar header menu |
| `MENU_TITLE` / `MENU_SUBTITLE` | Telebot | teks header menu |
| `MENU_STYLE` | `photo` | `photo` (gambar+button) atau `text` |
| `MENU_REPO_URL` / `MENU_SITE_URL` | repo & hyuu.tech | tombol URL di menu |
| `ECO_REGISTER_BONUS` | `5000` | saldo bonus saat daftar berhasil |
| `ECO_REGISTER_LIMIT` | `25` | limit awal user baru |
| `ECO_DAILY_BONUS` | `1500` | bonus saldo hadiah harian |
| `ECO_CAPTCHA_LENGTH` | `5` | jumlah karakter captcha |
| `ECO_CAPTCHA_TTL_MS` | `300000` | masa berlaku captcha (ms) |
| `RPG_JOIN_COST` | `500` | biaya join RPG |
| `RPG_ADVENTURE_COST` | `1` | limit per adventure |
| `RPG_ADVENTURE_EXP` | `25` | EXP dasar adventure |

Ganti database cukup ubah `DB_TYPE` lalu restart. Data lama di `src/database/data` (struktur versi sebelumnya) dimigrasikan otomatis saat pertama kali jalan.

## Sistem User & Ekonomi

### Daftar (`/daftar`)
Alur berurutan — **nama → umur → captcha**:

1. Ketik `/daftar` (hanya di private chat) lalu kirim nama (3–32 karakter).
2. Masukkan umur (angka 5–99).
3. Bot mengirim **gambar captcha**; tulis ulang kodenya. Salah 3× → batal, ketik `/daftar` lagi. Ketik `/batal` untuk membatalkan kapan saja.
4. Berhasil → dapat **bonus saldo** dan **limit awal** otomatis.

Captcha digenerate sendiri (PNG murni via `zlib`, tanpa dependensi native) dan **state-nya disimpan di database**, jadi alur tetap lanjut walau bot di-restart supervisor.

### Atribut user

| Atribut | Keterangan |
|---|---|
| `balance` | saldo (mata uang dari `ECO_CURRENCY`) |
| `limit` / `maxLimit` | limit perintah berbayar; `maxLimit` naik tiap level |
| `exp` / `level` | EXP bertambah dari adventure/daily; naik level menambah `maxLimit` |
| `hp` | nyawa RPG; pulih otomatis 5 per 3 menit, atau pakai potion |
| `equip` | item terpasang (weapon, armor, accessory) |

### RPG dasar

- `/joinrpg` — gabung RPG (wajib `/daftar` dulu, biaya `RPG_JOIN_COST`).
- `/adventure` — bertualang: menang dapat EXP + gold + loot; kalah kehilangan HP. Butuh limit.
- `/inventori` — lihat tas dan stat (ATK/DEF/LUCK).
- `/shop` — beli item (`/shop <id> [jumlah]`); `/sell` menjual item; `/equip` memakai/memasang item.
- `/daily` — hadiah harian (saldo, EXP, isi ulang limit).
- `/balance` — cek saldo & limit; `/refill` mengisi limit dengan saldo.

### Owner

- `/seteco [key] [nilai]` — lihat/ubah parameter ekonomi saat runtime.
- `/addsaldo`, `/addlimit`, `/resetlimit`, `/userinfo` — kelola user (reply pesan user atau sertakan ID).

## Mengatur Tampilan Menu (Owner)

`/menu` → **⚙️ Settings**:

- **🖼️ Atur Gambar** — bot meminta satu foto; kirim foto dan foto itu jadi header menu (disimpan sebagai `file_id`, bebas re-upload).
- **🌄/📄 Mode Foto/Teks** — toggle menu bergambar vs teks polos.
- **🔄 Reset Bawaan** — kembali ke nilai `.env`.

Semua perubahan langsung terlihat pada pesan menu berikutnya (pesan lama diedit, tidak spam chat).

## Menulis Plugin

```js
// src/plugins/Tools/echo.js
export default {
  name: 'echo',
  description: 'Balas teks yang dikirim',
  command: ['echo'],
  category: 'tools',
  cooldown: 2,
  usage: '$prefix$command <teks>',
  handler: async ({ ctx, args }) => {
    await ctx.reply(args.join(' ') || 'kosong?')
  },
}
```

Tersedia di `handler({ ctx, args, command, DB, registry, config, isOwner, logger })`. File baru terdeteksi otomatis (hot-reload), atau via `/plugins add tools/echo` sambil reply kode plugin.

## Perintah Bawaan

- **info**: `/menu` `/help` `/ping` `/uptime` `/status`
- **user**: `/daftar` `/register` `/profile` `/me` `/daily` `/balance` `/saldo` `/limit` `/refill`
- **rpg**: `/joinrpg` `/adventure` `/inventori` `/shop` `/sell` `/equip`
- **group**: `/settitle` `/setdesc` `/pin` `/unpin` `/groupinfo`
- **tools**: `/hapus` `/halo` `/listuser` `/cek`
- **owner**: `/plugins add|del|list` `/update` `/exec` `/eval` `/reset` `/seteco` `/addsaldo` `/addlimit` `/resetlimit` `/userinfo`

## Lisensi & Kredit

© 2025 [slowlyh](https://github.com/slowlyh) — [hyuu.tech](https://hyuu.tech).
