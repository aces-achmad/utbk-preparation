# Spesifikasi Kontrak JSON v1

Dokumen ini mendefinisikan kontrak JSON internal v1 untuk import konten soal ke aplikasi UTBK Preparation.

Kontrak ini adalah:

- format kanonik internal;
- dipakai oleh alur import aplikasi;
- diasumsikan sudah dinormalisasi di luar aplikasi sebelum diupload.

Dokumen ini belum berupa schema teknis final, tetapi sudah cukup presisi untuk review domain, validasi, dan desain database.

## Tujuan

Kontrak JSON v1 dirancang agar:

- satu file bisa menjadi unit import yang jelas;
- identitas data stabil untuk proses upsert;
- validasi bisa dilakukan ketat;
- provenance dan audit import tetap terlacak.

## Prinsip Umum

1. Satu file JSON mewakili satu payload import.
2. Satu payload wajib self-contained.
3. Satu payload dapat memuat `Subject`, `Topic`, dan `Question` sekaligus.
4. Semua identifier domain penting harus stabil.
5. Semua `Question` dalam payload harus dapat divalidasi tanpa asumsi implisit dari luar file.
6. Payload yang invalid harus ditolak seluruhnya saat commit import.

## Struktur Tingkat Atas

Struktur tingkat atas yang disarankan:

```json
{
  "schema_version": "1.0",
  "subjects": [],
  "topics": [],
  "questions": []
}
```

## Field Tingkat Atas

### `schema_version`

Tipe:

- `string`

Aturan:

- wajib ada;
- untuk v1 nilainya harus sesuai format versi yang didukung aplikasi, misalnya `1.0`;
- dipakai importer untuk memilih validator yang tepat.

### `subjects`

Tipe:

- array of `Subject`

Aturan:

- wajib ada, walaupun bisa kosong hanya jika `topics` dan `questions` juga kosong;
- pada praktik v1, payload import normal seharusnya memuat subject yang benar-benar dipakai oleh topic/question dalam payload.

### `topics`

Tipe:

- array of `Topic`

Aturan:

- wajib ada;
- semua topic harus mereferensikan subject yang ada di payload;
- semua topic yang dikirim harus terpakai minimal sekali oleh question.

### `questions`

Tipe:

- array of `Question`

Aturan:

- wajib ada;
- maksimal `500` item per file import;
- semua question harus valid sepenuhnya sebelum import dapat di-commit.

## Subject

Representasi yang disarankan:

```json
{
  "slug": "tps",
  "label": "TPS",
  "display_order": 1
}
```

### Field `Subject`

#### `slug`

Tipe:

- `string`

Aturan:

- wajib;
- stabil;
- unik dalam scope seluruh subject;
- menjadi identitas domain, bukan label tampilan;
- tidak boleh bergantung pada urutan import.

#### `label`

Tipe:

- `string`

Aturan:

- wajib;
- nama tampilan subject;
- boleh berubah di masa depan tanpa mengubah identitas `slug`.

#### `display_order`

Tipe:

- `integer`

Aturan:

- wajib;
- dipakai untuk urutan tampil di authoring/practice;
- sebaiknya bernilai positif.

## Topic

Representasi yang disarankan:

```json
{
  "slug": "penalaran-umum",
  "subject_slug": "tps",
  "label": "Penalaran Umum",
  "display_order": 1
}
```

### Field `Topic`

#### `slug`

Tipe:

- `string`

Aturan:

- wajib;
- stabil;
- unik global pada level topic;
- menjadi identitas domain topic.

#### `subject_slug`

Tipe:

- `string`

Aturan:

- wajib;
- harus menunjuk ke `Subject.slug` yang ada dalam payload atau sudah dikenal sistem;
- pada v1, topic milik tepat satu subject.

#### `label`

Tipe:

- `string`

Aturan:

- wajib;
- nama tampilan topic.

#### `display_order`

Tipe:

- `integer`

Aturan:

- wajib;
- dipakai untuk urutan tampil topic dalam subject.

## Question

Representasi yang disarankan:

```json
{
  "external_id": "ext_q_0001",
  "topic_slug": "penalaran-umum",
  "type": "single_choice",
  "source": "modul-a:batch-01",
  "difficulty": "medium",
  "status": "draft",
  "question_text": "Contoh isi soal",
  "explanation_text": "Contoh pembahasan",
  "options": [
    {
      "option_key": "A",
      "option_text": "Pilihan A",
      "is_correct": false
    },
    {
      "option_key": "B",
      "option_text": "Pilihan B",
      "is_correct": true
    }
  ]
}
```

### Field `Question`

#### `external_id`

Tipe:

- `string`

Aturan:

- wajib;
- unik global;
- stabil antar-import;
- menjadi dasar proses upsert;
- bersifat teknis, tidak harus human-readable.

#### `topic_slug`

Tipe:

- `string`

Aturan:

- wajib;
- harus mereferensikan `Topic.slug` yang valid;
- setiap question hanya berada pada satu topic di v1.

#### `type`

Tipe:

- `string`

Nilai yang diizinkan:

- `single_choice`
- `multiple_response`

Aturan:

- `true_false` tidak disimpan sebagai tipe terpisah;
- soal true/false dimodelkan sebagai `single_choice` dengan dua opsi.

#### `source`

Tipe:

- `string`

Aturan:

- wajib;
- provenance soal;
- berupa label teks terstruktur;
- direkomendasikan memakai pola yang konsisten, misalnya `provider:batch` atau `module:chapter`.

#### `difficulty`

Tipe:

- `string`

Nilai yang diizinkan:

- `easy`
- `medium`
- `hard`

Aturan:

- wajib;
- dipakai untuk metadata, filter, dan authoring;
- tidak memengaruhi skor v1.

#### `status`

Tipe:

- `string`

Nilai yang diizinkan:

- `draft`
- `published`

Aturan:

- field ini boleh ada pada payload;
- importer tetap harus memvalidasi aturan publish;
- jika status `published`, maka pembahasan wajib ada dan struktur soal harus valid penuh.

#### `question_text`

Tipe:

- `string`

Aturan:

- wajib;
- teks utama soal;
- v1 teks biasa, tanpa embedded media.

#### `explanation_text`

Tipe:

- `string`

Aturan:

- boleh kosong hanya jika status `draft`;
- wajib terisi jika status `published`;
- v1 berupa plain text.

#### `options`

Tipe:

- array of `QuestionOption`

Aturan:

- wajib;
- harus memiliki minimal dua opsi;
- setiap opsi harus punya identitas stabil di dalam scope question;
- evaluator membaca kebenaran dari `is_correct`.

## Question Option

Representasi yang disarankan:

```json
{
  "option_key": "A",
  "option_text": "Pilihan A",
  "is_correct": false
}
```

### Field `QuestionOption`

#### `option_key`

Tipe:

- `string`

Aturan:

- wajib;
- unik dalam scope satu question;
- stabil di payload;
- direkomendasikan sederhana, misalnya `A`, `B`, `C`, `D`.

#### `option_text`

Tipe:

- `string`

Aturan:

- wajib;
- teks plain.

#### `is_correct`

Tipe:

- `boolean`

Aturan:

- wajib;
- menjadi sumber kebenaran jawaban untuk evaluator.

## Aturan Validasi Domain

### Validasi Subject

- `slug` subject tidak boleh duplikat dalam payload;
- `display_order` harus valid;
- subject yang dikirim harus terpakai minimal oleh satu topic/question melalui rantai referensi.

### Validasi Topic

- `slug` topic tidak boleh duplikat;
- `subject_slug` harus valid;
- topic harus dipakai minimal oleh satu question dalam payload.

### Validasi Question Umum

- `external_id` tidak boleh duplikat dalam payload;
- `topic_slug` harus valid;
- `question_text` wajib non-empty;
- `source` wajib non-empty;
- `difficulty` harus salah satu enum yang diizinkan;
- `status` harus salah satu enum yang diizinkan.

### Validasi `single_choice`

- harus memiliki tepat satu opsi dengan `is_correct = true`;
- harus memiliki minimal dua opsi.

### Validasi `multiple_response`

- harus memiliki lebih dari satu opsi;
- harus memiliki minimal dua opsi benar;
- evaluator v1 menggunakan `all-or-nothing`.

### Validasi Publish

Jika `status = published`:

- `explanation_text` wajib terisi;
- struktur `options` wajib valid penuh;
- question harus dapat dievaluasi tanpa ambiguitas.

## Aturan Upsert

Importer v1 memakai `external_id` sebagai kunci utama upsert.

Perilaku yang diharapkan:

- jika `external_id` belum ada di database, record dianggap `insert`;
- jika `external_id` sudah ada, record dianggap `update`;
- preview import harus menunjukkan jumlah `insert` dan `update`;
- update ke `published question` tetap diizinkan, tetapi membutuhkan konfirmasi eksplisit pada commit.

Aturan tambahan:

- commit tidak boleh hanya mempercayai preview yang tersimpan;
- commit harus menghitung ulang diff terhadap payload tersimpan dan state database saat itu;
- jika revalidation saat commit menemukan update ke `published question` yang tidak tercermin dalam preview terbaru yang dikonfirmasi user, commit harus berhenti dan meminta reconfirmation.

## Aturan Import Session

Satu file upload menghasilkan satu `ImportSession`.

Tahapan logis:

1. upload file;
2. parse payload;
3. validasi schema dan domain;
4. hitung dampak `insert/update`;
5. tampilkan preview;
6. commit eksplisit;
7. catat hasil sesi.

Catatan perilaku:

- preview bersifat indikatif, bukan janji final;
- commit adalah evaluasi ulang final atas payload tersimpan;
- hasil commit dapat berbeda dari preview lama bila state aktif berubah di antara dua langkah itu;
- bila perbedaan itu menyentuh area sensitif seperti update ke `published question`, sistem harus meminta reconfirmation sebelum commit diteruskan.

Jika ada error validasi:

- session tetap dicatat;
- payload asli tetap disimpan;
- commit ditolak seluruhnya.

## Contoh Payload Minimal

```json
{
  "schema_version": "1.0",
  "subjects": [
    {
      "slug": "tps",
      "label": "TPS",
      "display_order": 1
    }
  ],
  "topics": [
    {
      "slug": "penalaran-umum",
      "subject_slug": "tps",
      "label": "Penalaran Umum",
      "display_order": 1
    }
  ],
  "questions": [
    {
      "external_id": "ext_q_0001",
      "topic_slug": "penalaran-umum",
      "type": "single_choice",
      "source": "modul-a:batch-01",
      "difficulty": "medium",
      "status": "published",
      "question_text": "Manakah pernyataan yang paling tepat?",
      "explanation_text": "Jawaban benar adalah B karena ...",
      "options": [
        {
          "option_key": "A",
          "option_text": "Pilihan A",
          "is_correct": false
        },
        {
          "option_key": "B",
          "option_text": "Pilihan B",
          "is_correct": true
        }
      ]
    }
  ]
}
```

## Hal yang Sengaja Belum Masuk v1

Kontrak ini belum mencakup:

- gambar atau media;
- rich text/markdown;
- formula matematika terstruktur;
- multi-language content;
- weighted scoring;
- attachment lain di luar teks.

## Implikasi ke Desain Teknis

Kontrak ini mendorong beberapa konsekuensi:

- schema database harus mendukung `external_id` unik global;
- `Subject` dan `Topic` perlu `slug` stabil;
- preview import membutuhkan diff `insert/update`;
- attempt runtime snapshot harus terpisah dari sumber question aktif;
- validasi schema dan domain harus ketat dan eksplisit.

## Ringkasan

Kontrak JSON v1 harus dipandang sebagai pintu masuk resmi konten ke sistem:

- ketat;
- self-contained;
- dapat di-upsert;
- dapat diaudit;
- cukup sederhana untuk di-review dan diimplementasikan bertahap.
