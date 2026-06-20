# Hasil Grilling Rencana Proyek

Dokumen ini merangkum keputusan yang sudah terkunci dari sesi grilling, asumsi default lanjutan yang dapat dipakai untuk tahap desain berikutnya, dan titik keputusan yang masih layak dikonfirmasi sebelum implementasi.

## 1. Keputusan yang Sudah Terkunci

### 1.1 Posisi Produk

- aplikasi dipakai untuk kebutuhan internal;
- pengguna awal adalah satu orang untuk belajar sendiri;
- target awal bukan multi-user publik;
- coding belum dimulai, fase sekarang masih review dan penguncian keputusan.

### 1.2 Scope Produk v1

Produk v1 difokuskan pada:

- bank soal;
- import soal;
- authoring minimal;
- paket latihan;
- pengerjaan latihan;
- histori attempt;
- review hasil per soal.

Yang tidak diprioritaskan di v1:

- dashboard analitik lintas attempt;
- multi-user penuh;
- workflow editorial kompleks;
- timer ujian;
- media gambar;
- rich text pembahasan;
- scoring berbobot.

### 1.3 Model User dan Akses

- aplikasi akan diakses lewat jaringan;
- karena network-accessible, v1 tetap memakai login minimal;
- hanya ada satu akun admin tetap pada v1;
- satu login yang sama dipakai untuk seluruh aplikasi;
- kredensial awal dibootstrap dari environment lalu disimpan hashed di database;
- ada fitur ganti password dari UI;
- session menggunakan cookie-based session;
- sesi standar tanpa `remember me`.

### 1.4 Bentuk Konten dan Tipe Soal

- `Question` mendukung:
  - `single_choice`
  - `multiple_response`
- `true_false` diperlakukan sebagai kasus `single_choice` dengan dua opsi;
- `multiple_response` memakai skoring `all-or-nothing`;
- pembahasan wajib untuk `Question` yang `published`;
- pembahasan v1 berupa `plain text`;
- v1 teks saja, tanpa media embedded atau referensi media;
- `Question` tidak punya `title` terpisah, prompt adalah identitas utama.

### 1.5 Hirarki Materi

- struktur materi memakai hirarki ketat `Subject -> Topic`;
- `Topic` milik tepat satu `Subject`;
- `Subject` dan `Topic` memiliki `slug` stabil;
- `slug` dikelola aplikasi sebagai identitas stabil;
- label tampilan boleh diubah;
- `Topic` yang sudah dipakai tidak boleh dipindah ke `Subject` lain;
- `Subject` dan `Topic` punya `display_order` eksplisit;
- `Question` tidak punya `display_order` global di level topic.

### 1.6 Metadata Soal

- `difficulty` wajib dan sederhana:
  - `easy`
  - `medium`
  - `hard`
- `difficulty` hanya metadata, tidak memengaruhi skor;
- `source` wajib sebagai label teks terstruktur;
- `external_id` wajib, unik global, stabil, dan bersifat teknis/opaque;
- `Question` manual dari UI akan memperoleh `external_id` yang dihasilkan aplikasi dengan namespace/prefix internal.

### 1.7 Status dan Siklus Soal

- status `Question` v1 hanya:
  - `draft`
  - `published`
- `Question` boleh diedit manual secara terbatas, termasuk konten inti dan metadata;
- `external_id` tidak boleh diedit manual;
- perubahan manual atau import pada `Question` hanya berlaku untuk attempt baru;
- `Question` dapat dipindah ke `Topic` lain walaupun sudah pernah dipakai, tetapi hanya memengaruhi sesi baru;
- riwayat edit manual penuh belum diperlukan, cukup `latest state + updated_at`;
- `Question` dapat diarsipkan, bukan dihapus permanen;
- arsip tetap terlihat di area authoring lewat filter;
- `Question` boleh diduplikasi, hasil duplikasi menjadi soal baru berstatus `draft`.

### 1.8 Authoring Soal

- area authoring dipisahkan dari area practice;
- aplikasi bersifat `import-first`;
- tetap ada editor web minimal sebagai fallback dan koreksi cepat;
- UI authoring boleh membuat `Question` baru manual;
- UI authoring juga boleh membuat `Subject` dan `Topic` manual;
- ada pencarian dan filter dasar untuk `Question` berdasarkan:
  - `status`
  - `subject`
  - `topic`
  - `difficulty`
  - teks soal atau `external_id`
- ada bulk action dasar untuk `Question`;
- bulk action `publish` bersifat `partial success` dengan laporan per item;
- bulk action belum perlu untuk `Question Package`.

### 1.9 Import dan Kontrak JSON

- konten masuk lewat satu kontrak JSON internal yang ketat;
- normalisasi ke JSON kanonik dilakukan di luar aplikasi;
- import memakai konsep `ImportSession`;
- satu import session dimulai dari upload satu file JSON via UI;
- file di-preview dan divalidasi dulu sebelum commit;
- preview harus menampilkan:
  - valid/invalid
  - insert/update
- jika preview berisi update ke `published question`, perlu konfirmasi tambahan;
- commit harus menghitung ulang diff terhadap payload tersimpan;
- jika revalidation commit menemukan update sensitif yang belum tercermin dalam preview terakhir yang dikonfirmasi user, commit harus berhenti dan meminta reconfirmation;
- import session bersifat atomik secara logis:
  - jika ada record invalid, seluruh sesi gagal commit;
- import yang gagal juga tetap disimpan sebagai histori;
- payload asli JSON disimpan per `ImportSession`;
- import bersifat `append with explicit import session`;
- update soal existing dilakukan via `upsert` berdasarkan `external_id`;
- `published question` boleh diupdate lewat import dengan jejak `import session` dan timestamp;
- kontrak JSON wajib memiliki `schema_version`;
- satu payload boleh self-contained, memuat `Subject`, `Topic`, dan `Question` sekaligus;
- semua `Subject` dan `Topic` yang dikirim harus terpakai minimal sekali oleh `Question`;
- ukuran import v1 dibatasi maksimal `500 Question` per file;
- laporan error import harus detail per record dan per field.

### 1.10 Paket Latihan

- `QuestionPackage` dibuat manual dengan memilih soal satu per satu;
- package boleh berisi campuran `Subject` dan `Topic`;
- package memiliki:
  - `slug` stabil
  - `name`
  - `description` opsional
- `slug` package unik global dan tidak boleh direuse;
- package hanya boleh berisi `published question`;
- package punya `canonical order` yang disimpan di authoring;
- status package v1:
  - `draft`
  - `published`
- package kosong tidak boleh dipublish; minimum satu soal;
- perubahan komposisi soal atau canonical order membuat package kembali menjadi `draft`;
- perubahan metadata ringan seperti `description` tidak menurunkan status publish;
- package boleh diduplikasi, dengan isi dan canonical order yang sama persis, hasilnya `draft`;
- package boleh diarsipkan;
- package yang diarsipkan tidak dipakai lagi, tetapi histori attempt tetap bisa diakses;
- package invalid tetap terlihat di authoring, tetapi hilang dari practice.

### 1.11 Validitas Package

- jika ada `Question` diarsipkan atau menjadi tidak sah, `published package` yang memakainya menjadi invalid untuk attempt baru;
- invalidasi package berlaku segera;
- package invalid disembunyikan dari area practice sampai diperbaiki dan dipublish ulang;
- package mengikuti state `Question` terbaru sampai `Attempt` dimulai.

### 1.12 Attempt dan Practice Flow

- `Attempt` terikat ke `QuestionPackage`;
- satu package dapat memiliki banyak attempt historis;
- maksimal satu attempt aktif per package;
- jika ada attempt aktif, membuka package akan me-resume attempt itu;
- setelah attempt `submitted`, package boleh di-retry dengan attempt baru;
- retry menggunakan versi package terbaru saat attempt baru dimulai;
- package saat practice menampilkan soal dan opsi secara acak;
- urutan acak soal dan opsi disimpan per attempt;
- mode practice: satu soal per halaman dengan navigasi nomor;
- user boleh lompat bebas antar nomor soal;
- ada progress eksplisit:
  - nomor soal saat ini
  - jumlah terjawab
  - jumlah belum terjawab
  - status soal aktif
- user boleh submit walaupun masih ada soal kosong, dengan konfirmasi eksplisit;
- soal kosong dihitung salah;
- hasil utama berupa:
  - total soal
  - jumlah benar
  - jumlah salah
  - jumlah kosong
  - persentase skor

### 1.13 Autosave dan Konsistensi Attempt

- jawaban di-autosave per perubahan;
- autosave bersifat implisit;
- UI harus menunjukkan status `saved/saving/error`;
- jika autosave gagal:
  - state lokal tetap dipertahankan;
  - submit diblok;
  - ada jalur retry yang jelas;
- jika ada state belum sinkron, aplikasi memberi leave warning;
- `Attempt` aktif harus terisolasi dari perubahan konten;
- karena itu, snapshot runtime attempt harus mencakup:
  - teks soal
  - opsi
  - urutan acak
  - pembahasan
- review hasil menampilkan detail pilihan user vs kunci, khususnya untuk `multiple_response`.

## 2. Asumsi Default Lanjutan

Bagian ini belum digrill satu per satu, tetapi aman dipakai sebagai default desain berikutnya sampai ada keputusan lain.

### 2.1 Kontrak JSON

Asumsi default:

- satu payload memiliki struktur tingkat atas yang eksplisit, misalnya:
  - `schema_version`
  - `subjects`
  - `topics`
  - `questions`
- `Question` mereferensikan `Topic` lewat slug stabil;
- `Topic` mereferensikan `Subject` lewat slug stabil;
- `source` memakai format label terstruktur sederhana, misalnya `provider:batch` atau `module:chapter`;
- opsi jawaban memiliki identifier internal payload yang stabil per question;
- kebenaran jawaban disimpan sebagai `is_correct` pada setiap opsi.

Asumsi validasi tambahan:

- `multiple_response` memiliki minimal dua opsi benar agar tidak tumpang tindih dengan `single_choice`.

### 2.2 Auth dan Session

Asumsi default:

- login memakai username + password;
- session cookie memakai mekanisme server-side session store;
- logout tersedia dan menghapus sesi aktif;
- bootstrap akun admin terjadi hanya jika akun belum ada.

### 2.3 Authoring Rules

Asumsi default:

- soal manual baru langsung berstatus `draft`;
- soal hasil import baru juga default ke `draft` kecuali payload eksplisit menyatakan `published` dan lolos validasi aturan publish;
- perubahan manual pada `published question` tetap diizinkan tanpa approval tambahan;
- archive pada `Question`, `Subject`, `Topic`, dan `Package` bersifat soft delete.

### 2.4 Package Rules

Asumsi default:

- package draft tidak bisa dimulai sebagai attempt;
- package invalid tetap bisa dibuka di authoring untuk diperbaiki;
- duplicate package menyalin metadata utama selain slug.

### 2.5 Practice Rules

Asumsi default:

- review hasil selalu berbasis snapshot attempt, bukan konten terbaru;
- retry package tidak mewarisi jawaban attempt sebelumnya;
- unanswered disimpan eksplisit sebagai status jawaban kosong, bukan sekadar null yang ambigu.

## 3. Titik Berisiko Tinggi yang Tetap Perlu Konfirmasi Sebelum Implementasi

Walaupun banyak keputusan sudah cukup jelas, ada beberapa area yang sebaiknya dikonfirmasi lagi saat masuk desain teknis rinci:

### 3.1 Bentuk Persis Kontrak JSON

Yang masih perlu dikunci:

- struktur field final per `Question`;
- format identifier opsi;
- format `source`;
- apakah payload mengizinkan metadata tambahan yang diabaikan importer;
- apakah status publish boleh dikirim dari payload atau hanya ditentukan aplikasi.

### 3.2 Snapshot Attempt

Sudah diputuskan bahwa snapshot cukup kaya, tetapi implementasi teknisnya masih perlu dipilih:

- apakah snapshot disimpan sebagai JSON blob per attempt;
- atau dipecah ke tabel snapshot tersendiri;
- bagaimana relasi snapshot dengan jawaban dan evaluasi.

### 3.3 Invalidasi Package

Sudah diputuskan invalidasi berlaku segera, tetapi trigger teknisnya masih perlu dipastikan:

- validasi ulang saat import commit;
- validasi saat edit manual question;
- validasi saat archive;
- strategi agar status package tetap konsisten tanpa race condition.

### 3.4 Session dan Keamanan Jaringan Internal

Masih perlu keputusan teknis rinci:

- aturan cookie secure/same-site;
- apakah reverse proxy dipakai;
- bagaimana bootstrap secret dan rotasi password dijalankan secara operasional.

### 3.5 Scope Editor Minimal

Sudah diputuskan `import-first dengan editor minimal`, tetapi batas minimal itu masih perlu dinyatakan secara operasional:

- form question create/edit penuh atau semi-penuh;
- apakah package editor memakai drag-drop atau urutan tombol sederhana;
- apakah bulk publish memerlukan preview constraint di UI.

## 4. Implikasi untuk Langkah Berikutnya

Setelah dokumen ini, langkah paling tepat bukan coding penuh, tetapi:

1. mengunci bentuk `CONTEXT.md` dan memperbarui istilah bila ada yang perlu dipersempit;
2. menurunkan keputusan ini ke spesifikasi kontrak JSON v1;
3. menurunkan ke model data konseptual;
4. menurunkan ke arsitektur teknis revisi;
5. baru setelah itu menyusun scaffold project.

## 5. Ringkasan Singkat

Rencana proyek ini sekarang sudah mengarah ke bentuk yang cukup jelas:

- internal, single-user, tetapi network-accessible;
- login minimal satu admin;
- import-first dengan kontrak JSON ketat;
- bank soal dengan `single_choice` dan `multiple_response`;
- authoring dan practice dipisahkan;
- package manual curated;
- attempt historis, autosave, randomisasi, dan snapshot runtime penuh untuk menjaga konsistensi belajar.

Dengan keputusan ini, implementasi nanti dapat dimulai dari domain dan kontrak data yang relatif stabil, bukan dari scaffold teknis yang masih kabur.
