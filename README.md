# Telebot

Bot Telegram berbasis [Telegraf](https://telegraf.js.org) dengan arsitektur plugin modular, hot-reload, database ganda (JSON / SQLite), dan menu interaktif berbasis gambar + inline button. Ringkas, mudah dirawat, tanpa dependensi API pihak ketiga — semua fitur eksternal yang sering error sudah dihapus.

## Fitur

- **Plugin arsitektur** — setiap fitur adalah satu file di `src/plugins/<Kategori>/`, auto-load + hot-reload (chokidar).
- **Menu interaktif** — satu pesan saja yang berubah (edit, bukan kirim baru → anti-spam): home → kategori → detail plugin, lengkap dengan foto header dan inline button.
- **Owner dapat mengatur tampilan menu** dari bot: ganti gambar header (kirim foto), mode foto/teks, reset ke bawaan — tersimpan di database.
- **Database ganda** — default **JSON**, bisa diganti **SQLite** lewat config (`DB_TYPE=sqlite`). API penyimpanan identik untuk keduanya.
- **Plugin manager** — owner menambah/menghapus plugin langsung dari chat (`/plugins`).
- **Self-update** — `/update` menarik commit terbaru via `git pull` (tanpa API GitHub).
- **Tanpa API eksternal** — tidak ada lagi endpoint pihak ketiga yang error (downloader/AI hapus), bot hanya bicara dengan Telegram API.

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
    │   ├── menu.js      # mesin menu interaktif (tampilan bisa di-setting)
    │   └── registry.js  # plugin loader + hot-reload
    ├── db/
    │   └── index.js     # store JSON/SQLite dengan API yang sama
    ├── lib/
    │   └── logger.js    # logger berwarna + banner dashboard
    └── plugins/         # fitur (1 folder = 1 kategori menu)
        ├── Info/        # menu, ping
        ├── Group/       # settitle, setdesc, pin, unpin, groupinfo
        ├── Tools/       # utilitas offline (hapus, halo, listuser, cek)
        └── Owner/       # plugins, update, exec/eval/reset
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

Ganti database cukup ubah `DB_TYPE` lalu restart. Data lama di `src/database/data` (struktur versi sebelumnya) dimigrasikan otomatis saat pertama kali jalan.

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
- **group**: `/settitle` `/setdesc` `/pin` `/unpin` `/groupinfo`
- **tools**: `/hapus` `/halo` `/listuser` `/cek`
- **owner**: `/plugins add|del|list` `/update` `/exec` `/eval` `/reset`

## Lisensi & Kredit

© 2025 [slowlyh](https://github.com/slowlyh) — [hyuu.tech](https://hyuu.tech).
