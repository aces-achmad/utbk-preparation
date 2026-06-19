# Arsitektur Teknis Awal

## Tujuan Teknis

Arsitektur tahap awal harus sederhana, mudah dikembangkan, dan tetap cukup rapi untuk bertumbuh. Stack yang diminta sudah cocok untuk aplikasi CRUD + latihan soal berbasis web dengan backend TypeScript modern.

Target teknis versi awal:

- monorepo ringan;
- backend API terpisah dari frontend;
- database MySQL untuk data utama;
- validasi input yang konsisten;
- deployment lokal/dev melalui Docker Compose tanpa perlu build image custom pada tahap awal.

## Stack yang Digunakan

Backend:

- `Bun`
- `Hono`
- `Drizzle ORM`
- `Zod`
- `MySQL`

Frontend:

- `Vite`
- `Vue 3`
- `PrimeVue`
- `Tailwind CSS`
- `Pinia`
- `vue-tsc`

Operasional/dev:

- `Docker Compose`
- image resmi `mysql`
- image resmi `oven/bun`

## Bentuk Arsitektur

Arsitektur yang disarankan:

- `frontend` sebagai SPA Vue;
- `backend` sebagai REST API Hono;
- `database` MySQL sebagai penyimpanan utama;
- komunikasi frontend ke backend melalui HTTP JSON.

Belum perlu:

- microservices;
- message queue;
- websocket;
- cache layer terpisah;
- SSR.

Untuk tahap review awal, pola ini paling efisien.

## Struktur Folder yang Disarankan

Contoh struktur monorepo:

```text
utbk-preparation/
  apps/
    frontend/
    backend/
  packages/
    shared/
  infra/
    docker/
  docs/
    draft-review/
```

Penjelasan:

- `apps/frontend`: aplikasi Vue + Vite.
- `apps/backend`: API Hono + akses database.
- `packages/shared`: schema validasi, tipe umum, konstanta bersama.
- `infra/docker`: file `docker-compose.yml`, env contoh, dan catatan lokal.
- `docs/draft-review`: dokumen konsep dan arsitektur.

## Komponen Backend

Tanggung jawab backend:

- autentikasi dan otorisasi;
- CRUD master materi;
- CRUD soal;
- CRUD paket latihan;
- penyimpanan hasil pengerjaan;
- penyajian data untuk halaman siswa.

Lapisan backend yang disarankan:

- `routes`: definisi endpoint Hono;
- `handlers/controllers`: logika request-response;
- `services`: aturan bisnis;
- `repositories`: query database via Drizzle;
- `schemas`: validasi Zod;
- `db`: koneksi dan schema Drizzle.

Contoh area modul:

- `auth`
- `users`
- `subjects`
- `topics`
- `questions`
- `question-packages`
- `attempts`
- `results`

## Komponen Frontend

Tanggung jawab frontend:

- autentikasi user;
- dashboard sesuai peran;
- form admin/editor untuk input soal;
- halaman daftar dan filter paket latihan;
- halaman pengerjaan latihan;
- halaman hasil dan pembahasan.

Pembagian frontend yang disarankan:

- `views`: halaman utama;
- `components`: komponen UI reusable;
- `stores`: state Pinia;
- `services`: HTTP client dan wrapper API;
- `schemas`: validasi form di sisi client bila perlu;
- `router`: route dan guard.

PrimeVue dipakai untuk:

- data table admin;
- form input;
- dialog;
- pagination;
- toast/feedback.

Tailwind CSS dipakai untuk:

- layout;
- spacing;
- utility styling;
- penyesuaian tampilan cepat tanpa CSS berlebihan.

## Model Data Awal

Entitas inti yang disarankan:

- `users`
- `roles`
- `subjects`
- `topics`
- `questions`
- `question_options`
- `question_explanations`
- `question_packages`
- `question_package_items`
- `attempts`
- `attempt_answers`

Gambaran relasi:

- satu `subject` punya banyak `topics`;
- satu `topic` punya banyak `questions`;
- satu `question` punya banyak `question_options`;
- satu `question` bisa punya satu `question_explanation`;
- satu `question_package` punya banyak item soal;
- satu `attempt` milik satu user dan satu package;
- satu `attempt` punya banyak `attempt_answers`.

Kolom penting pada `questions`:

- `id`
- `topic_id`
- `type`
- `question_text`
- `difficulty_level`
- `source_name`
- `status`
- `created_by`
- `created_at`
- `updated_at`

Kolom penting pada `attempts`:

- `id`
- `user_id`
- `package_id`
- `started_at`
- `submitted_at`
- `score`
- `total_questions`
- `correct_answers`

## Status Data yang Perlu Disiapkan

Status soal:

- `draft`
- `review`
- `published`
- `archived`

Status attempt:

- `in_progress`
- `submitted`
- `evaluated`

Peran user:

- `admin`
- `editor`
- `student`

## Pola API Awal

Gaya API cukup REST sederhana:

- `POST /auth/login`
- `GET /subjects`
- `POST /subjects`
- `GET /topics`
- `POST /questions`
- `GET /questions`
- `GET /questions/:id`
- `PATCH /questions/:id`
- `POST /packages`
- `GET /packages`
- `GET /packages/:id`
- `POST /attempts`
- `POST /attempts/:id/answers`
- `POST /attempts/:id/submit`
- `GET /attempts/:id/result`

Respons API sebaiknya konsisten:

- `success`
- `message`
- `data`
- `meta` untuk pagination bila perlu

## Validasi dan Tipe

Penggunaan `Zod` sebaiknya di dua area:

- validasi request payload di backend;
- validasi form penting di frontend.

Penggunaan `packages/shared` disarankan untuk:

- enum status;
- tipe DTO umum;
- schema Zod yang dapat dibagi bila struktur memungkinkan.

Catatan:

- jika schema frontend dan backend mulai banyak berbeda, jangan dipaksa seluruhnya shared;
- shared hanya untuk kontrak yang benar-benar stabil.

## Strategi Database dan Drizzle

Drizzle dipakai untuk:

- definisi schema tabel;
- migrasi database;
- query typed;
- menjaga konsistensi model TypeScript dan MySQL.

Praktik yang disarankan:

- semua tabel didefinisikan eksplisit;
- gunakan migrasi sejak awal;
- hindari query mentah kecuali benar-benar perlu;
- pisahkan query baca/tulis bila logika mulai kompleks.

## Autentikasi

Untuk versi awal, cukup sederhana:

- login email/username + password;
- session token atau JWT;
- route guard berdasarkan role.

Pilihan pragmatis:

- gunakan JWT access token sederhana untuk SPA;
- simpan password dengan hash yang aman;
- middleware Hono untuk autentikasi dan role check.

Jika ingin paling sederhana saat awal, autentikasi internal basic sudah cukup. OAuth belum perlu.

## Deployment Lokal dengan Docker

Karena belum perlu build image custom, pendekatan dev yang masuk akal:

- MySQL menggunakan image resmi `mysql`;
- aplikasi frontend/backend dijalankan memakai image resmi `oven/bun`;
- source code di-mount sebagai volume;
- command container menjalankan install dan dev server.

Konsep service awal:

- `mysql`
- `backend`
- `frontend`

Catatan penting:

- pendekatan ini cocok untuk development dan review;
- untuk production nanti biasanya lebih baik memakai image aplikasi yang dibuild khusus;
- namun untuk tahap sekarang, cukup `docker compose up` dengan image yang dipull.

## Konfigurasi Lingkungan

Variabel env minimal:

Backend:

- `APP_PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`

Frontend:

- `VITE_API_BASE_URL`

Database:

- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`

## Non-Functional Requirement Awal

Kebutuhan non-fungsional yang realistis:

- struktur kode mudah dipahami;
- validasi input cukup ketat;
- respons API konsisten;
- error handling standar;
- siap untuk penambahan test bertahap;
- aman untuk penggunaan internal skala kecil sampai menengah.

Belum perlu di awal:

- optimasi performa berat;
- horizontal scaling;
- observability kompleks;
- high availability.

## Risiko Teknis yang Perlu Direview

Hal yang perlu diputuskan sebelum implementasi:

- apakah frontend dan backend akan benar-benar dipisah app-nya;
- apakah editor soal perlu rich text editor;
- apakah rumus matematika butuh dukungan MathJax/KaTeX;
- apakah file gambar disimpan di local volume atau object storage;
- apakah package latihan perlu randomisasi per attempt;
- apakah sistem hasil perlu autosave jawaban.

Keputusan-keputusan ini akan memengaruhi struktur tabel, API, dan kompleksitas UI.

## Rekomendasi Implementasi Bertahap

Urutan pengerjaan teknis yang disarankan:

1. siapkan monorepo dan folder aplikasi;
2. siapkan Docker Compose untuk MySQL, frontend, backend;
3. siapkan backend Hono + Drizzle + koneksi MySQL;
4. buat migrasi tabel inti;
5. siapkan frontend Vue + PrimeVue + Tailwind + Pinia;
6. implementasikan autentikasi dasar;
7. implementasikan master materi dan CRUD soal;
8. implementasikan paket latihan;
9. implementasikan attempt dan hasil latihan.

## Kesimpulan

Arsitektur terbaik untuk tahap review awal adalah arsitektur sederhana dua aplikasi:

- `frontend` SPA Vue;
- `backend` API Hono;
- `MySQL` sebagai database utama;
- `Docker Compose` untuk local environment;
- `Bun` sebagai runtime dan package manager.

Pendekatan ini sesuai dengan kebutuhan sekarang: cukup modern, tetap ringan, dan tidak memaksa kompleksitas deployment lebih awal dari yang dibutuhkan.
