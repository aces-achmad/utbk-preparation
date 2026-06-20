# Model Data Konseptual

Dokumen ini menjabarkan model data konseptual untuk aplikasi UTBK Preparation berdasarkan hasil grilling. Fokusnya adalah relasi domain, tanggung jawab setiap entitas, dan aturan bisnis inti, bukan detail implementasi SQL final.

## Tujuan

Model data ini harus mendukung:

- import-first workflow;
- authoring minimal;
- package manual curated;
- attempt historis;
- snapshot runtime attempt yang konsisten;
- invalidasi package saat konten sumber berubah menjadi tidak sah.

## Prinsip Model

1. Pisahkan konten sumber aktif dari histori runtime.
2. Gunakan identitas stabil pada entitas domain yang menjadi pintu integrasi.
3. Hindari mencampur state authoring dengan state practice.
4. Simpan cukup data untuk audit import dan konsistensi review hasil.

## Gambaran Entitas Inti

Entitas inti v1:

- `AdminUser`
- `AuthSession`
- `Subject`
- `Topic`
- `Question`
- `QuestionOption`
- `QuestionPackage`
- `QuestionPackageItem`
- `ImportSession`
- `Attempt`
- `AttemptQuestionSnapshot`
- `AttemptAnswer`

## 1. AdminUser

Makna:

- satu akun admin internal yang dipakai untuk login ke aplikasi.

Tanggung jawab:

- menyimpan kredensial ter-hash;
- menjadi identitas operasional untuk perubahan manual bila nanti dibutuhkan;
- menjadi pemilik sesi autentikasi.

Atribut konseptual:

- `id`
- `username`
- `password_hash`
- `created_at`
- `updated_at`

Catatan:

- v1 hanya membutuhkan satu akun, tetapi model tidak perlu menutup kemungkinan lebih dari satu akun di masa depan.

## 2. AuthSession

Makna:

- sesi login berbasis cookie untuk admin internal.

Tanggung jawab:

- melacak sesi aktif;
- memungkinkan logout;
- mengelola masa berlaku sesi.

Atribut konseptual:

- `id`
- `admin_user_id`
- `session_token` atau `session_key`
- `expires_at`
- `created_at`
- `revoked_at`

## 3. Subject

Makna:

- area materi tingkat atas UTBK.

Tanggung jawab:

- mengelompokkan topic;
- memberi struktur navigasi dan filter.

Atribut konseptual:

- `id`
- `slug`
- `label`
- `display_order`
- `is_archived`
- `created_at`
- `updated_at`

Aturan:

- `slug` stabil;
- subject dapat diarsipkan hanya jika tidak lagi direferensikan oleh question aktif melalui topic aktif.

## 4. Topic

Makna:

- area materi yang berada tepat di bawah satu subject.

Tanggung jawab:

- mengelompokkan question;
- menjadi target klasifikasi question.

Atribut konseptual:

- `id`
- `slug`
- `subject_id`
- `label`
- `display_order`
- `is_archived`
- `created_at`
- `updated_at`

Aturan:

- topic milik tepat satu subject;
- topic yang sudah dipakai tidak boleh dipindah ke subject lain;
- topic boleh diarsipkan hanya jika tidak direferensikan question aktif.

## 5. Question

Makna:

- item soal aktif pada bank soal.

Tanggung jawab:

- menyimpan konten soal yang menjadi sumber untuk package dan attempt baru;
- menyimpan state authoring;
- menjadi target import dan edit manual.

Atribut konseptual:

- `id`
- `external_id`
- `topic_id`
- `type`
- `source`
- `difficulty`
- `status`
- `question_text`
- `explanation_text`
- `is_archived`
- `last_import_session_id` opsional
- `created_at`
- `updated_at`

Aturan:

- `external_id` unik global dan stabil;
- status hanya `draft` atau `published`;
- `published` mensyaratkan pembahasan ada;
- question yang diarsipkan tidak boleh dipakai untuk attempt baru;
- perubahan question hanya memengaruhi package/attempt baru;
- question boleh dipindah topic untuk sesi baru saja.

## 6. QuestionOption

Makna:

- opsi jawaban milik satu question aktif.

Tanggung jawab:

- menyimpan pilihan yang ditampilkan untuk question aktif;
- menyimpan kunci evaluasi.

Atribut konseptual:

- `id`
- `question_id`
- `option_key`
- `option_text`
- `is_correct`
- `display_order`

Aturan:

- `option_key` unik dalam scope question;
- `single_choice` harus tepat satu opsi benar;
- `multiple_response` menggunakan beberapa opsi benar sesuai kebutuhan.

## 7. ImportSession

Makna:

- satu kejadian import file JSON melalui UI authoring.

Tanggung jawab:

- menyimpan payload asli;
- menyimpan hasil preview;
- menyimpan hasil commit atau kegagalan;
- memberi jejak audit perubahan data.

Atribut konseptual:

- `id`
- `schema_version`
- `uploaded_filename`
- `payload_json`
- `status`
- `total_subjects`
- `total_topics`
- `total_questions`
- `valid_count`
- `invalid_count`
- `insert_count`
- `update_count`
- `error_report_json`
- `committed_at`
- `created_at`

Status yang disarankan:

- `uploaded`
- `validated`
- `validation_failed`
- `committed`

Aturan:

- import gagal tetap dicatat;
- payload asli disimpan;
- satu import session tidak identik dengan satu transaksi SQL literal, tetapi merupakan satu unit audit dan commit logis.

## 8. QuestionPackage

Makna:

- paket latihan terkurasi yang siap atau sedang disiapkan untuk dikerjakan.

Tanggung jawab:

- menjadi container latihan;
- memisahkan kurasi soal dari bank soal;
- menjadi anchor untuk attempt.

Atribut konseptual:

- `id`
- `slug`
- `name`
- `description`
- `status`
- `is_archived`
- `is_invalid`
- `invalid_reason` opsional
- `created_at`
- `updated_at`

Aturan:

- `slug` unik global dan tidak direuse;
- status hanya `draft` atau `published`;
- package published minimal berisi satu soal;
- perubahan komposisi atau canonical order mengembalikan status ke `draft`;
- package invalid tidak boleh dipakai untuk attempt baru;
- package boleh diarsipkan tanpa menghapus histori attempt.

## 9. QuestionPackageItem

Makna:

- relasi antara package dan question aktif, termasuk urutan kanonik authoring.

Tanggung jawab:

- mendefinisikan komposisi package;
- menyimpan canonical order.

Atribut konseptual:

- `id`
- `package_id`
- `question_id`
- `canonical_order`
- `created_at`

Aturan:

- hanya question `published` dan tidak archived yang boleh dimasukkan;
- perubahan pada item package mengubah bentuk package dan memicu draft.

## 10. Attempt

Makna:

- satu sesi pengerjaan package oleh user internal.

Tanggung jawab:

- menjadi root histori pengerjaan;
- menyimpan state attempt aktif atau selesai;
- menjadi container snapshot runtime, jawaban, dan hasil evaluasi.

Atribut konseptual:

- `id`
- `package_id`
- `status`
- `started_at`
- `submitted_at`
- `total_questions`
- `answered_count`
- `unanswered_count`
- `correct_count`
- `incorrect_count`
- `score_percentage`
- `question_order_json` atau atribut turunan serupa
- `created_at`
- `updated_at`

Status yang disarankan:

- `active`
- `submitted`

Aturan:

- maksimal satu attempt aktif per package;
- membuka package dengan attempt aktif harus me-resume attempt itu;
- retry setelah submit membuat attempt baru;
- package yang dipakai attempt baru adalah state package saat attempt dimulai.

## 11. AttemptQuestionSnapshot

Makna:

- snapshot runtime satu question dalam satu attempt.

Tanggung jawab:

- membekukan konten yang benar-benar dilihat user;
- menjaga attempt aktif dan review hasil tetap konsisten walaupun question sumber berubah.

Atribut konseptual:

- `id`
- `attempt_id`
- `question_id` opsional sebagai referensi asal
- `question_external_id`
- `question_type`
- `topic_label_snapshot`
- `subject_label_snapshot`
- `question_text_snapshot`
- `explanation_text_snapshot`
- `display_order_in_attempt`
- `options_snapshot_json`
- `created_at`

Aturan:

- snapshot dibuat saat attempt dimulai;
- snapshot memuat urutan acak dan opsi yang relevan untuk attempt itu;
- review hasil harus membaca snapshot ini, bukan question aktif.

## 12. AttemptAnswer

Makna:

- jawaban user untuk satu snapshot question dalam satu attempt.

Tanggung jawab:

- menyimpan state jawaban terbaru hasil autosave;
- menyimpan hasil evaluasi per question;
- mendukung review detail.

Atribut konseptual:

- `id`
- `attempt_id`
- `attempt_question_snapshot_id`
- `selected_option_keys_json`
- `is_answered`
- `is_correct`
- `evaluated_at`
- `updated_at`

Aturan:

- untuk `single_choice`, pilihan berisi satu opsi atau kosong;
- untuk `multiple_response`, pilihan berisi beberapa opsi;
- unanswered disimpan eksplisit;
- evaluasi v1 bersifat all-or-nothing untuk `multiple_response`.

## Relasi Antar Entitas

Relasi utama:

- satu `Subject` memiliki banyak `Topic`;
- satu `Topic` memiliki banyak `Question`;
- satu `Question` memiliki banyak `QuestionOption`;
- satu `QuestionPackage` memiliki banyak `QuestionPackageItem`;
- satu `QuestionPackageItem` menunjuk ke satu `Question`;
- satu `QuestionPackage` memiliki banyak `Attempt`;
- satu `Attempt` memiliki banyak `AttemptQuestionSnapshot`;
- satu `AttemptQuestionSnapshot` memiliki nol atau satu `AttemptAnswer` aktif;
- satu `ImportSession` dapat menjadi asal terakhir pembaruan banyak `Question`.

## Pemisahan State Aktif vs State Historis

Pemisahan paling penting dalam model ini:

- `Question` dan `QuestionOption` adalah state aktif authoring;
- `AttemptQuestionSnapshot` dan `AttemptAnswer` adalah state historis/runtime;
- package aktif tetap mengikuti question terbaru sampai attempt dibuat;
- setelah attempt dibuat, konten historis harus terisolasi penuh.

Ini adalah keputusan inti yang menjaga konsistensi review hasil dan autosave.

## Validitas dan Invalidation

Model ini membutuhkan aturan invalidasi package:

- package published menjadi invalid jika mereferensikan question yang tidak lagi layak dipakai;
- invalidasi dapat dipicu oleh:
  - question diarsipkan;
  - question tidak lagi published;
  - relasi package tidak lagi memenuhi aturan domain;
- invalidasi berlaku segera untuk attempt baru;
- histori attempt lama tetap sah.

## Konsekuensi untuk Desain Database

Walaupun ini belum schema final, model ini menyiratkan kebutuhan:

- unique constraint pada `Question.external_id`;
- unique constraint pada `Subject.slug`, `Topic.slug`, dan `QuestionPackage.slug`;
- soft delete/archive flags;
- struktur snapshot yang cukup kaya untuk memisahkan histori dari konten aktif;
- audit import yang menyimpan payload dan laporan error.

## Keputusan yang Masih Perlu Diturunkan ke Level Teknis

Hal yang masih perlu diputuskan pada desain teknis rinci:

- apakah `AttemptQuestionSnapshot.options_snapshot_json` tetap sebagai JSON atau dinormalisasi ke tabel snapshot option;
- bagaimana session store diimplementasikan;
- bagaimana invalidasi package dijalankan secara konsisten saat import dan edit manual;
- apakah `Attempt` menyimpan ringkasan hasil sebagai cache atau selalu dihitung dari `AttemptAnswer`.

## Ringkasan

Model data konseptual v1 dibangun di atas pemisahan yang tegas:

- konten aktif untuk authoring;
- konten snapshot untuk practice dan histori.

Dengan model ini, aplikasi dapat mendukung:

- import-first workflow;
- kurasi package manual;
- edit konten aktif;
- review hasil yang stabil;
- evolusi ke multi-user internal di masa depan tanpa membongkar fondasi domain.
