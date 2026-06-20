# Konsep Produk UTBK Preparation

## Tujuan

Web aplikasi ini ditujukan sebagai tempat terpusat untuk menampung, mengelola, dan mengerjakan soal-soal persiapan UTBK secara terstruktur. Fokus awal bukan pada fitur yang kompleks, tetapi pada alur yang rapi untuk:

- menyimpan bank soal;
- mengelompokkan soal berdasarkan materi dan submateri;
- menyediakan mode latihan yang sederhana;
- menampilkan pembahasan dan evaluasi dasar.

Produk tahap awal sebaiknya diposisikan sebagai **bank soal + latihan mandiri**, bukan platform tryout penuh. Dengan batasan ini, ruang lingkup tetap realistis untuk versi pertama.

## Sasaran Pengguna

Target awal:

- satu pengguna internal;
- dipakai sendiri untuk belajar mandiri;
- tetap disiapkan agar dapat berkembang ke lebih banyak pengguna internal di masa depan.

Peran pengguna v1:

- satu akun `admin` internal yang mengelola konten sekaligus mengerjakan latihan.

## Nilai Utama Produk

Nilai yang ingin dibangun pada versi awal:

- Soal tersusun jelas berdasarkan kategori UTBK.
- Soal mudah dicari dan dipakai ulang dalam berbagai paket latihan.
- Pembahasan bisa disimpan bersama soal agar konsisten.
- Hasil pengerjaan siswa dapat dicatat untuk evaluasi sederhana.

## Cakupan Materi

Struktur materi awal yang disarankan:

- `TPS`
- `Literasi Bahasa Indonesia`
- `Literasi Bahasa Inggris`
- `Penalaran Matematika`

Struktur pengelompokan materi v1:

- `Subject`
- `Topic`

Contoh:

- `TPS > Penalaran Umum`
- `Penalaran Matematika > Aljabar`

Struktur ini sengaja dibuat ketat agar:

- kontrak import tetap rapi;
- filter authoring jelas;
- bank soal tidak cepat berantakan saat jumlah soal bertambah.

## Bentuk Konten

Unit konten utama:

- `soal`
- `opsi jawaban`
- `kunci jawaban`
- `pembahasan`
- `tag materi`
- `tingkat kesulitan`
- `sumber soal`

Jenis soal yang layak didukung pada versi awal:

- `single_choice`;
- `multiple_response`;
- soal berbasis teks;
- pembahasan teks biasa.

Jenis soal yang bisa ditunda:

- `true_false` sebagai tipe terpisah;
- gambar atau media;
- rich text/markdown;
- isian numerik kompleks;
- esai;
- penilaian adaptif.

## Fitur Minimum yang Layak Direview

Fitur inti versi pertama:

- login minimal satu akun admin internal;
- manajemen bank soal;
- import soal berbasis kontrak JSON internal;
- manajemen `Subject` dan `Topic`;
- pembuatan paket latihan dari kumpulan soal;
- halaman pengerjaan latihan;
- hasil latihan per sesi;
- pembahasan setelah latihan selesai.

Fitur authoring/admin:

- tambah, ubah, duplikasi, dan arsipkan soal;
- atur status soal: `draft`, `published`;
- simpan pembahasan per soal;
- upload dan review `ImportSession`;
- susun paket latihan manual.

Fitur practice:

- melihat daftar paket latihan;
- resume `Attempt` aktif;
- mengerjakan latihan satu soal per halaman;
- autosave jawaban;
- submit jawaban;
- melihat skor, jawaban benar/salah, dan pembahasan.

## Alur Penggunaan

Alur authoring:

1. menyiapkan file JSON kanonik di luar aplikasi;
2. mengupload file ke area import;
3. meninjau hasil preview validasi;
4. commit import;
5. melakukan koreksi kecil bila perlu lewat UI;
6. menyusun paket latihan manual dari soal yang `published`.

Alur practice:

1. login;
2. memilih paket latihan;
3. mengerjakan soal dengan autosave;
4. submit hasil;
5. melihat skor dan pembahasan.

## Prinsip Desain Produk

Prinsip yang sebaiknya dijaga:

- antarmuka input soal harus sederhana dan cepat;
- alur import harus menjadi jalur utama masuknya konten;
- data materi harus konsisten dan mudah difilter;
- halaman pengerjaan harus fokus, minim distraksi;
- pembahasan harus mudah dibaca;
- struktur fitur awal jangan terlalu melebar ke gamifikasi atau sosial.

## Prioritas Tahapan

Tahap 1:

- autentikasi dasar;
- import kontrak JSON v1;
- master materi;
- CRUD soal;
- CRUD paket latihan;
- pengerjaan latihan;
- hasil latihan sederhana.

Tahap 2:

- pencarian dan filter soal yang lebih baik;
- statistik performa per materi;
- randomisasi urutan soal dan opsi.

Tahap 3:

- simulasi tryout berbatas waktu;
- ranking atau progress dashboard;
- rekomendasi latihan berdasarkan kelemahan siswa.

## Risiko Produk yang Perlu Direview Dini

Hal yang perlu diputuskan sejak awal:

- bentuk final kontrak JSON v1;
- cara snapshot runtime `Attempt` akan disimpan;
- cara invalidasi package dijalankan secara konsisten;
- batas editor web minimal dibanding jalur import;
- detail keamanan operasional saat aplikasi diakses lewat jaringan internal.

## Rekomendasi Arah Versi Pertama

Untuk versi pertama, arah yang paling aman:

- satu aplikasi web internal dengan satu akun admin;
- `single_choice` dan `multiple_response`;
- pembahasan plain text;
- paket latihan manual;
- import-first dengan editor web minimal;
- laporan hasil per sesi latihan;
- fokus pada kestabilan data dan alur kerja konten.

Dengan pendekatan ini, tim bisa lebih cepat mereview apakah kebutuhan inti sudah tepat sebelum masuk ke implementasi penuh.
