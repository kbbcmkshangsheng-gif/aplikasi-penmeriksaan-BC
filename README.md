# Aplikasi Pemeriksaan BC

Aplikasi web untuk sistem pemeriksaan dokumen pabean (Bea Cukai) berbasis React + Firebase.

## Tech Stack
- **React 18** + TypeScript
- **Firebase** (Auth + Firestore)
- **Tailwind CSS** + Framer Motion
- **Vite** (build tool)
- **jsPDF** (export laporan PDF)

## Fitur
- Login dengan Email/Password atau Google
- Buat & kelola dokumen pemeriksaan (BC 2.3 / BC 4.0)
- Input barang dengan foto, nomor seri, jumlah
- Input & kelola kontainer
- Export laporan ke PDF
- Download foto barang/kontainer
- Role admin (melihat semua data)

## Cara Setup

1. Clone repo ini
2. Install dependencies:
   ```bash
   npm install
   ```
3. Buat file `firebase-applet-config.json` dengan konfigurasi Firebase Anda:
   ```json
   {
     "apiKey": "...",
     "authDomain": "...",
     "projectId": "...",
     "storageBucket": "...",
     "messagingSenderId": "...",
     "appId": "...",
     "firestoreDatabaseId": "(default)"
   }
   ```
4. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
5. Jalankan dev server:
   ```bash
   npm run dev
   ```
