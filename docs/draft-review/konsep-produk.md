# Konsep Produk UTBK Preparation

## Tujuan

Web aplikasi ini ditujukan sebagai tempat terpusat untuk menampung, mengelola, dan mengerjakan soal-soal persiapan UTBK secara terstruktur. Fokus awal bukan pada fitur yang kompleks, tetapi pada alur yang rapi untuk:

- menyimpan bank soal;
- mengelompokkan soal berdasarkan materi dan submateri;
- menyediakan mode latihan yang sederhana;
- menampilkan pembahasan dan evaluasi dasar.

Produk tahap awal sebaiknya diposisikan sebagai **bank soal + latihan mandiri**, bukan platform tryout penuh. Dengan batasan ini, ruang lingkup tetap realistis untuk versi pertama.

## Sasaran Pengguna

Target utama:

- siswa kelas 11 dan 12 yang sedang menyiapkan UTBK;
- pengajar atau admin internal yang menginput dan merapikan soal;
- reviewer materi yang memeriksa kualitas soal dan pembahasan.

Peran pengguna awal yang disarankan:

- `admin`: mengelola user, master data, dan keseluruhan konten;
- `editor`: membuat dan mengubah soal, pembahasan, kategori, dan paket;
- `siswa`: mengerjakan latihan dan melihat hasilnya.

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

Setiap materi dapat memiliki beberapa level pengelompokan:

- `materi utama`
- `submateri`
- `topik rinci`

Contoh:

- `TPS > Penalaran Umum > Analisis Argumen`
- `Penalaran Matematika > Aljabar > Fungsi`

Struktur ini penting agar bank soal tidak cepat berantakan ketika jumlah soal bertambah.

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

- pilihan ganda satu jawaban benar;
- soal berbasis teks;
- soal dengan gambar pendukung opsional.

Jenis soal yang bisa ditunda:

- drag and drop;
- isian numerik kompleks;
- esai;
- penilaian adaptif.

## Fitur Minimum yang Layak Direview

Fitur inti versi pertama:

- login sederhana untuk admin/editor/siswa;
- manajemen bank soal;
- manajemen kategori materi;
- pembuatan paket latihan dari kumpulan soal;
- halaman pengerjaan latihan;
- hasil latihan per sesi;
- pembahasan setelah latihan selesai.

Fitur admin/editor:

- tambah, ubah, hapus, dan arsipkan soal;
- atur status soal: `draft`, `review`, `published`;
- simpan pembahasan per soal;
- susun paket latihan manual.

Fitur siswa:

- melihat daftar paket latihan;
- mengerjakan latihan satu per satu;
- submit jawaban;
- melihat skor, jawaban benar/salah, dan pembahasan.

## Alur Penggunaan

Alur admin/editor:

1. membuat kategori materi;
2. memasukkan soal dan opsi jawaban;
3. menambahkan pembahasan dan tingkat kesulitan;
4. mengubah status soal menjadi siap pakai;
5. menyusun paket latihan.

Alur siswa:

1. login;
2. memilih paket latihan;
3. mengerjakan soal;
4. submit hasil;
5. melihat skor dan pembahasan.

## Prinsip Desain Produk

Prinsip yang sebaiknya dijaga:

- antarmuka input soal harus sederhana dan cepat;
- data materi harus konsisten dan mudah difilter;
- halaman pengerjaan harus fokus, minim distraksi;
- pembahasan harus mudah dibaca;
- struktur fitur awal jangan terlalu melebar ke gamifikasi atau sosial.

## Prioritas Tahapan

Tahap 1:

- autentikasi dasar;
- master materi;
- CRUD soal;
- CRUD paket latihan;
- pengerjaan latihan;
- hasil latihan sederhana.

Tahap 2:

- pencarian dan filter soal yang lebih baik;
- statistik performa per materi;
- import soal massal;
- upload gambar untuk soal;
- randomisasi urutan soal dan opsi.

Tahap 3:

- simulasi tryout berbatas waktu;
- ranking atau progress dashboard;
- rekomendasi latihan berdasarkan kelemahan siswa.

## Risiko Produk yang Perlu Direview Dini

Hal yang perlu diputuskan sejak awal:

- apakah fokus hanya bank soal internal atau juga portal siswa publik;
- apakah pembahasan mendukung format rich text penuh;
- apakah soal perlu mendukung gambar dan rumus matematika sejak versi pertama;
- apakah paket latihan bersifat statis atau bisa dirakit otomatis dari filter materi;
- apakah ada kebutuhan multi-tenant atau cukup satu institusi.

## Rekomendasi Arah Versi Pertama

Untuk versi pertama, arah yang paling aman:

- satu aplikasi web untuk admin/editor dan siswa;
- soal pilihan ganda standar;
- pembahasan teks dengan dukungan gambar opsional;
- paket latihan manual;
- laporan hasil per sesi latihan;
- fokus pada kestabilan data dan alur kerja konten.

Dengan pendekatan ini, tim bisa lebih cepat mereview apakah kebutuhan inti sudah tepat sebelum masuk ke implementasi penuh.
