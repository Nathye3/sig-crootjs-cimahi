# SIG GoRide – Simulasi Rute Perjalanan Cimahi/Bandung

**Tugas Mata Kuliah: Sistem Informasi Geografis (SIG)**

Aplikasi web peta interaktif yang menampilkan simulasi rute perjalanan GoRide dari ULBI (Universitas Logistik dan Bisnis Internasional) menuju Cihanjuang, menggunakan data GeoJSON dan library **CrootJS**.

🌐 **Live Demo:** [Buka di GitHub Pages](https://nathye3.github.io/sig-crootjs-cimahi/)

---

## 📋 Fitur Aplikasi

- ✅ Membaca data GeoJSON (FeatureCollection, LineString)
- ✅ Menampilkan rute polyline sebagai SVG interaktif
- ✅ Menampilkan titik awal (A) dan titik tujuan (B)
- ✅ Menghitung panjang rute (formula Haversine)
- ✅ Panel informasi: nama rute, jenis transportasi, koordinat, tarif
- ✅ Tarif simulasi: **Rp10.000** (bukan tarif resmi GoRide)
- ✅ Tombol pusatkan tampilan dan muat ulang
- ✅ Pesan error jika GeoJSON tidak valid
- ✅ Responsif untuk desktop dan perangkat seluler
- ✅ Dapat dihosting sebagai situs statis (GitHub Pages)

---

## 🛠️ Teknologi

| Komponen | Teknologi |
|----------|-----------|
| HTML/CSS/JS | Vanilla (tanpa framework) |
| Library JavaScript eksternal | **CrootJS `element.js`** v0.0.16 |
| Visualisasi Peta | Tile OpenStreetMap + overlay rute SVG (renderer vanilla khusus aplikasi) |
| Data | GeoJSON (geojson.io) |
| Hosting | GitHub Pages |

### Implementasi Peta

Peta dasar menggunakan tile OpenStreetMap, sedangkan rute dan marker digambar sebagai SVG. Renderer pan, zoom, dan proyeksi Web Mercator ditulis dengan API bawaan browser. Tidak ada library JavaScript pihak ketiga; satu-satunya library JavaScript eksternal adalah modul CrootJS yang dipin pada versi `0.0.16`.

### API CrootJS yang Digunakan

```javascript
import { onClick } from "https://cdn.jsdelivr.net/gh/crootjs/lib@0.0.16/element.js";
```

HTML, CSS, dan JavaScript berada di file terpisah. JavaScript dimuat sebagai ES module, tanpa blok script/style inline, atribut style, atau atribut event inline.

---

## 📁 Struktur File

```
├── index.html           # Halaman utama (root GitHub Pages)
├── style.css            # Gaya antarmuka modern
├── app.js               # Logika aplikasi (ES Module)
├── rute-cimahi.geojson  # Data rute ULBI → Cihanjuang
└── README.md            # Dokumentasi ini
```

---

## 🚀 Cara Menjalankan Secara Lokal

Karena `app.js` menggunakan ES Modules dan `fetch()`, file **tidak dapat dibuka langsung** dengan `file://` di browser (CORS error). Gunakan salah satu cara berikut:

### Opsi 1: VS Code Live Server (Direkomendasikan)
1. Install ekstensi **Live Server** di VS Code
2. Klik kanan `index.html` → **Open with Live Server**
3. Browser otomatis membuka `http://127.0.0.1:5500`

### Opsi 2: Python HTTP Server
```bash
# Python 3
python -m http.server 8080

# Buka browser: http://localhost:8080
```

---

## 📖 Tutorial Deployment ke GitHub Pages

### Langkah 1: Pastikan Berkas Ada di Root Repository

Repository ini adalah `Nathye3/sig-crootjs-cimahi`. Pastikan `index.html`, `style.css`, `app.js`, dan `rute-cimahi.geojson` berada langsung di root repository, bukan di dalam subfolder.

### Langkah 2: Upload Semua File Proyek

#### Cara A – Melalui GitHub Web (Termudah)
1. Di halaman repository, klik **"Add file" → "Upload files"**.
2. Seret dan lepas (drag-and-drop) semua file berikut ke area upload:
   - `index.html`
   - `style.css`
   - `app.js`
   - `rute-cimahi.geojson`
   - `README.md`
3. Isi pesan commit: `feat: upload aplikasi SIG GoRide`
4. Klik **"Commit changes"**.

#### Cara B – Melalui Git di Terminal
```bash
# Jalankan dari root repository
git add .
git commit -m "feat: upload aplikasi SIG GoRide"

# Hubungkan ke repository GitHub jika belum ada remote
git remote add origin https://github.com/Nathye3/sig-crootjs-cimahi.git
git push -u origin main
```

### Langkah 3: Aktifkan GitHub Pages

1. Buka repository di GitHub.
2. Klik tab **Settings** (⚙️).
3. Scroll ke bagian **"Pages"** di menu kiri.
4. Di bawah **"Source"**, pilih:
   - Branch: **`main`**
   - Folder: **`/ (root)`**
5. Klik **"Save"**.

### Langkah 4: Tunggu Deployment

- GitHub Pages membutuhkan **1–3 menit** untuk build pertama.
- Segarkan halaman Settings → Pages hingga muncul pesan:
  > ✅ Your site is live at `https://nathye3.github.io/sig-crootjs-cimahi/`

### Langkah 5: Buka URL Website

- Buka: [https://nathye3.github.io/sig-crootjs-cimahi/](https://nathye3.github.io/sig-crootjs-cimahi/)

### Langkah 6: Verifikasi Aplikasi

Pastikan hal-hal berikut berjalan dengan baik:
- [ ] Tile OpenStreetMap tampil dengan polyline rute biru
- [ ] Titik A (awal) dan B (akhir) terlihat
- [ ] Panel informasi menampilkan nama rute dan koordinat
- [ ] Tarif simulasi menunjukkan **Rp10.000**
- [ ] Tombol "Pusatkan Rute" dan "Muat Ulang" berfungsi
- [ ] Tidak ada error di console browser (F12)

---

## ✅ Checklist Pengujian

| No. | Item Uji | Status |
|-----|----------|--------|
| 1 | File GeoJSON berhasil dibaca (HTTP 200) | ⬜ |
| 2 | Koordinat ditampilkan dengan urutan yang benar (lon, lat) | ⬜ |
| 3 | Polyline sesuai dengan data asli (51 titik) | ⬜ |
| 4 | Titik awal (A) = koordinat pertama GeoJSON | ⬜ |
| 5 | Titik akhir (B) = koordinat terakhir GeoJSON | ⬜ |
| 6 | Tarif simulasi menunjukkan Rp10.000 | ⬜ |
| 7 | Panjang rute dihitung dan ditampilkan | ⬜ |
| 8 | Panel error muncul jika GeoJSON tidak valid | ⬜ |
| 9 | Tampilan responsif di mobile (≤480px) | ⬜ |
| 10 | Aplikasi dapat dibuka melalui GitHub Pages | ⬜ |
| 11 | Tidak ada error JavaScript di console browser | ⬜ |
| 12 | Tidak ada file yang gagal dimuat (Network tab) | ⬜ |

---

## 📊 Data GeoJSON

**File:** `rute-cimahi.geojson`

| Properti | Nilai |
|----------|-------|
| Tipe | FeatureCollection |
| Jumlah Fitur | 1 |
| Geometri | LineString |
| Jumlah Koordinat | 51 titik |
| Titik Awal | 107.57582, -6.87450 (ULBI) |
| Titik Akhir | 107.56677, -6.86152 (Cihanjuang) |
| Tarif Simulasi | Rp10.000 |

---

## ⚠️ Catatan Penting

1. **Tarif Rp10.000** hanya merupakan tarif simulasi untuk keperluan tugas akademik. Ini **bukan** harga resmi atau tarif aktual GoRide.
2. Aplikasi membutuhkan server HTTP untuk berjalan (tidak bisa dibuka dengan `file://`).
3. Aplikasi memakai tile OpenStreetMap dan menggambar rute serta marker sebagai SVG. Renderer peta ditulis dengan JavaScript bawaan browser; tidak ada library pemetaan pihak ketiga. CrootJS juga menyediakan modul map.js, tetapi aplikasi ini mempertahankan renderer khusus yang sudah sesuai dengan antarmuka proyek.

---

## 👤 Informasi Tugas

- **Mata Kuliah:** Sistem Informasi Geografis (SIG)
- **Library:** CrootJS v0.0.16
- **Wilayah:** Cimahi / Bandung, Jawa Barat
- **Rute:** ULBI → Cihanjuang
