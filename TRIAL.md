# Trial Internal Checklist

Dokumen ini untuk trial internal pertama aplikasi UTBK Preparation.

## Prasyarat

- MySQL aktif dan bisa diakses dari nilai pada `.env`
- `.env` root sudah terisi
- dependency sudah terpasang via `bun install`

## Menjalankan aplikasi

Pastikan `.env` root sudah berisi nilai dev berikut:

```env
APP_PORT=33000
APP_ORIGIN=http://127.0.0.1:5173
VITE_DEV_PROXY_TARGET=http://127.0.0.1:33000
```

Lalu jalankan:

```bash
bun run dev
```

Perintah itu akan menyalakan backend dan frontend sekaligus.

Buka:

- `http://127.0.0.1:5173`

Login default:

- username: `admin`
- password: `password123`

## Checklist trial

1. Login berhasil.
2. Buka area `Questions`.
3. Buat satu `Question` draft manual.
4. Publish `Question` itu.
5. Buka area `Packages`.
6. Buat satu `Question Package`.
7. Tambahkan 1-2 `Question` published ke package.
8. Publish `Question Package`.
9. Buka area `Practice`.
10. Mulai package.
11. Jawab satu soal lalu pindah soal.
12. Kembali ke soal sebelumnya dan pastikan jawaban tetap ada.
13. Submit attempt.
14. Cek summary hasil:
    - total soal
    - correct
    - incorrect
    - unanswered
    - percentage
15. Cek review per soal:
    - pilihan user
    - jawaban benar
    - pembahasan

## Hal yang perlu dicatat

- error message yang tidak jelas
- data yang tidak muncul atau tidak refresh
- tombol/alur yang membingungkan
- autosave yang terasa gagal atau lambat
- hasil review yang tidak sesuai ekspektasi

## Scope trial ini

Dokumen ini terutama memverifikasi:

- auth dasar
- question authoring dasar
- package authoring dasar
- practice
- autosave
- submit
- result review

Import workflow bisa diuji terpisah setelah trial dasar ini stabil.
