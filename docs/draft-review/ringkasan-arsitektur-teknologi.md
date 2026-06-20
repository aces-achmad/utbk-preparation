# Ringkasan Arsitektur Teknologi

Dokumen ini merangkum keputusan final arsitektur teknologi v1 berdasarkan sesi grilling. Tujuannya adalah menjadi jembatan antara fase review dan fase scaffold implementasi, tanpa langsung masuk ke coding aplikasi.

## 1. Bentuk Arsitektur

Arsitektur v1 ditetapkan sebagai:

- `frontend` SPA Vue;
- `backend` API Hono;
- `database` MySQL;
- tiga komponen ini dipisahkan dengan jelas.

Alasan:

- boundary UI, domain behavior, dan persistence memang nyata;
- auth session, import preview/commit, invalidasi package, dan snapshot attempt akan lebih mudah dijaga dengan seam yang tegas;
- struktur ini cukup ringan untuk v1 tetapi tetap sehat untuk berkembang.

## 2. Bentuk Repo

Repo ditetapkan sebagai `monorepo ringan`.

Struktur target tingkat tinggi:

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
    adr/
    agents/
    draft-review/
```

## 3. Aturan `packages/shared`

`packages/shared` ada sejak awal, tetapi harus kecil dan ketat.

Boleh memuat:

- enum stabil;
- DTO lintas app yang benar-benar kanonik;
- `Zod schema` untuk kontrak yang benar-benar kanonik;
- utilitas kecil yang benar-benar lintas app.

Tidak boleh menjadi:

- tempat logika domain backend;
- tempat schema form frontend yang lokal;
- tempat dependency campuran dari app.

Aturan keras:

- `packages/shared` tidak boleh mengimpor dari `apps/frontend`;
- `packages/shared` tidak boleh mengimpor dari `apps/backend`;
- dependency harus satu arah.

## 4. Arsitektur Frontend

Frontend v1 adalah `SPA murni` dengan:

- `Vite`
- `Vue 3`
- `PrimeVue`
- `Tailwind CSS`
- `Pinia`

Prinsip frontend:

- `Pinia` hanya untuk global state;
- state halaman dan practice tetap lokal pada modul/halaman;
- HTTP client memakai wrapper kecil di atas `fetch`;
- frontend berkomunikasi ke backend hanya lewat API DTO;
- frontend tidak boleh mengakses model database atau repository.

Boundary frontend:

- grouping mengikuti domain secara kasar;
- komponen umum yang benar-benar reusable boleh di layer bersama;
- komponen domain-specific tetap tinggal di modul domain masing-masing.

Route application:

- satu shell aplikasi setelah login;
- route domain eksplisit, misalnya:
  - `/imports`
  - `/questions`
  - `/packages`
  - `/practice`
  - `/attempts/:id`

Styling:

- `PrimeVue` dipakai terutama untuk komponen kerja fungsional;
- `Tailwind` memegang layout dan tampilan utama;
- token/theme lokal harus disiapkan sejak awal.

## 5. Arsitektur Backend

Backend v1 menggunakan:

- `Bun`
- `Hono`
- `Drizzle ORM`
- `Zod`
- `MySQL`

Lapisan backend:

- `routes`
- `services`
- `repositories`

Aturan keras:

- `routes` tidak boleh memanggil `repositories` langsung;
- `routes` wajib lewat `services`;
- `repositories` hanya menangani persistence;
- logika domain ada di `services`.

Struktur service:

- service per area domain;
- method/use case harus eksplisit;
- contoh:
  - `previewImport`
  - `commitImport`
  - `publishQuestion`
  - `publishPackage`
  - `startOrResumeAttempt`
  - `submitAttempt`

Aturan lintas-domain:

- service antar-domain boleh saling berinteraksi;
- tetapi harus terbatas dan eksplisit;
- satu use case harus menjadi owner utama orkestrasi.

Transaksi database:

- transaksi dibuka di level use case owner;
- repository tidak membuka boundary transaksi sendiri secara diam-diam.

## 6. Modul Backend Target

Boundary modul backend ditetapkan eksplisit sejak awal:

- `auth`
- `imports`
- `subjects`
- `topics`
- `questions`
- `packages`
- `attempts`

Catatan:

- `imports` adalah modul mandiri, bukan sekadar subfitur `questions`;
- `imports` punya lifecycle, audit, preview, dan commit yang khas.

## 7. Struktur Folder Target

Struktur folder target sampai level modul utama:

```text
apps/backend/
  src/
    app/
    config/
    db/
      schema/
      migrations/
    modules/
      auth/
        routes/
        services/
        repositories/
        schemas/
        dto/
      imports/
        routes/
        services/
        repositories/
        schemas/
        dto/
      subjects/
      topics/
      questions/
      packages/
      attempts/
    middleware/
    lib/

apps/frontend/
  src/
    app/
    router/
    modules/
      auth/
      imports/
      questions/
      packages/
      practice/
      attempts/
    components/
    services/
    stores/
    lib/
    styles/

packages/shared/
  src/
    imports/
    api/
    enums/
    lib/
```

## 8. Database dan Drizzle

Keputusan database:

- MySQL adalah database utama;
- schema Drizzle dikelompokkan per modul domain;
- migrasi harus dikomit sejak awal.

Bukan pendekatan yang dipilih:

- satu file schema raksasa;
- push schema tanpa history migrasi.

## 9. Auth dan Session

Auth v1:

- satu akun `Admin` internal;
- `username + password`;
- cookie-based session;
- session disimpan di MySQL;
- tabel session menjadi bagian dari model aplikasi sendiri.

Alasan:

- aplikasi diakses lewat jaringan;
- no-auth tidak cukup jujur terhadap risiko;
- JWT-first belum memberi leverage pada arsitektur v1.

Seluruh route aplikasi diproteksi penuh oleh session valid.

## 10. Import Architecture

Import adalah jalur utama masuknya konten.

Keputusan inti:

- upload file JSON via `multipart/form-data`;
- payload diproses buffered penuh di backend;
- payload asli disimpan langsung di database;
- `ImportSession` dibuat sejak tahap preview;
- preview dan commit memakai `ImportSession` yang sama;
- preview dan commit adalah dua use case terpisah;
- commit menghitung ulang validasi dan diff dari payload tersimpan;
- preview bersifat indikatif;
- commit adalah keputusan final;
- preview bisa menjadi `stale` berdasarkan state/timestamp session.

Aturan commit sensitif:

- jika revalidation saat commit menemukan update ke `published question` yang tidak tercermin dalam preview terakhir yang sudah dikonfirmasi, commit harus berhenti dan meminta reconfirmation;
- preview tidak boleh dianggap otorisasi permanen untuk commit sensitif.

Representasi hasil import:

- angka penting seperti `insert_count`, `update_count`, `invalid_count` disimpan sebagai kolom;
- detail preview/error tetap disimpan sebagai JSON.

## 11. Practice dan Attempt Runtime

Keputusan practice/runtime:

- autosave dilakukan dengan debounce singkat;
- source of truth di frontend saat practice adalah local component state;
- backend adalah persistence dan final authority;
- autosave mengacu ke `attempt + snapshot_id`;
- submit attempt menghitung hasil final saat submit;
- autosave setelah submit harus ditolak eksplisit;
- submit endpoint harus idempotent secara praktis berbasis status attempt.

Snapshot runtime:

- arsitektur memakai model hybrid yang condong ke JSON snapshot;
- `AttemptQuestionSnapshot` menjadi tabel terpisah per soal;
- opsi snapshot disimpan sebagai JSON array dalam row snapshot;
- `AttemptAnswer` memakai satu bentuk umum:
  - array `selected option keys`

Catatan tipe soal:

- `multiple_response` tetap diperlakukan sebagai tipe yang berbeda dari `single_choice`;
- karena itu, validasi kontrak harus mensyaratkan minimal dua opsi benar pada `multiple_response`.

## 12. Invalidasi Package

Keputusan invalidasi:

- invalid state package dipersist, bukan dihitung dinamis di setiap read;
- invalidasi diperbarui sinkron di use case utama;
- invalidasi adalah bagian dari domain behavior backend, bukan logika frontend.

Availability package untuk practice harus ditentukan backend.

## 13. API Design

API v1:

- `REST JSON` biasa;
- resource names plural dan konsisten;
- boleh memakai action endpoints eksplisit untuk use case command-heavy.

Contoh:

- `/imports/preview`
- `/imports/:id/commit`
- `/attempts/start-or-resume`
- `/attempts/:id/submit`

Envelope respons:

- minimal dan konsisten;
- bentuk dasar:
  - `success`
  - `data`
  - `message`
  - `meta`

Error handling:

- error code eksplisit harus distandarkan;
- backend memakai domain error model;
- middleware pusat memetakan error ke HTTP response.

DTO policy:

- model API dipisahkan tegas dari model database;
- mapping DTO dilakukan eksplisit;
- input `schemas` dan output `dto` dipisahkan secara folder dan tanggung jawab.

## 14. Search, List, dan Query

Authoring list:

- server-side pagination sejak awal;
- search cukup `LIKE` sederhana dulu;
- filter digabung dalam satu endpoint list dengan query parameter kaya.

Read complexity:

- mulai dari repository per domain;
- bila kompleksitas query naik, query service khusus diperbolehkan nanti.

## 15. Testing Architecture

Testing adalah bagian eksplisit dari arsitektur v1.

Keputusan:

- `Vitest` menjadi test runner utama;
- fokus awal pada backend domain/service tests;
- semua test memakai MySQL sungguhan;
- service tests dan repository tests tetap dipisah secara struktur walaupun sama-sama memakai MySQL;
- MySQL test environment dijalankan sebagai service terpisah;
- test suite bertanggung jawab meng-apply migration sendiri;
- reset/seed dilakukan per suite.

Yang tidak dipilih untuk awal:

- frontend component tests sebagai prioritas awal;
- database test yang berbagi instance dengan dev;
- schema test yang disiapkan manual.

## 16. Logging dan Observability

Observability v1:

- structured logs sederhana;
- request logging baseline di middleware global;
- log domain eksplisit untuk event penting.

Event penting minimal:

- login
- logout
- change password
- import preview
- import commit
- autosave error
- attempt submit

Log harus menyertakan identifier domain relevan bila ada, misalnya:

- `import_session_id`
- `attempt_id`
- `admin_user_id`

## 17. Konfigurasi dan Env

Konfigurasi harus divalidasi eksplisit saat startup.

Aturan:

- backend memakai schema env startup;
- frontend juga memvalidasi env yang memang dipakai;
- env frontend harus tetap minimal.

## 18. Docker dan Runtime Dev

Runtime dev:

- frontend dan backend sama-sama berjalan dalam container Bun;
- MySQL berjalan dalam container sendiri;
- source code di-mount dengan bind mount;
- container menjalankan dev server command;
- belum perlu Dockerfile custom untuk aplikasi di fase ini.

Network access:

- akses eksternal/internal menggunakan `Nginx Proxy Manager` yang sudah ada;
- arsitektur akses memakai `single public origin`;
- frontend tetap memakai path relatif `/api`;
- reverse proxy eksternal menjadi pintu masuk utama;
- dev proxy internal frontend tidak menjadi requirement v1.

Konsekuensi operasional:

- frontend dev tidak diasumsikan diakses langsung ke port Vite dari browser;
- akses browser yang benar untuk workflow normal adalah melalui host yang diproxy oleh `Nginx Proxy Manager`;
- jika frontend dibuka langsung tanpa reverse proxy itu, path relatif `/api` tidak dijamin bekerja.

## 19. Opsi Penting yang Ditolak

Opsi yang secara eksplisit tidak dipilih untuk v1:

- SSR/hybrid frontend;
- JWT-first auth;
- no-auth untuk aplikasi jaringan;
- query langsung dari route handler;
- repository memuat logika domain;
- invalidasi package dinamis saat read;
- single blob besar snapshot di level attempt;
- filesystem storage untuk payload import;
- GraphQL/RPC style sebagai API utama;
- Pinia sebagai tempat state halaman/practice utama;
- Axios sebagai keharusan awal;
- Docker image custom untuk fase awal;
- drag-and-drop package ordering sejak awal;
- full-text search sejak awal;
- shared package yang bebas bergantung ke app;
- frontend yang bocor melewati API seam.

## 20. Ringkasan Final

Arsitektur teknologi v1 didesain untuk:

- menjaga seam yang tegas antara frontend, backend, dan database;
- memusatkan domain behavior di backend service layer;
- menjadikan import JSON dan attempt snapshot sebagai fondasi utama;
- menjaga implementasi cukup ringan untuk fase awal;
- tetap memberi struktur yang sehat agar tidak cepat berantakan saat mulai dikodingkan.

Dokumen ini harus dipakai sebagai acuan scaffold dan boundary implementasi berikutnya.
