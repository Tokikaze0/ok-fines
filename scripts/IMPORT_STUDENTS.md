Import students CSV into Firestore
=================================

Prerequisites
 - Node.js installed (v14+ recommended)
 - A Firebase service account JSON (create from Firebase Console -> Project Settings -> Service accounts)

Install dependencies (run from project root, PowerShell example):

  npm install firebase-admin csv-parse

Usage examples (PowerShell):

  # Dry run (no writes). Shows preview only:
  node .\scripts\import-students.js --csv=src\environments\students.csv --serviceAccount=.\serviceAccountKey.json

  # Commit writes to Firestore (writes documents to `students` collection):
  node .\scripts\import-students.js --csv=src\environments\students.csv --serviceAccount=.\serviceAccountKey.json --commit

  # Overwrite existing documents with the same ID:
  node .\scripts\import-students.js --csv=src\environments\students.csv --serviceAccount=.\serviceAccountKey.json --commit --overwrite

Options
 - `--csv=PATH`         Path to CSV (default: `src/environments/students.csv`)
 - `--serviceAccount=PATH`  Path to Firebase service account JSON (required to commit)
 - `--target=COL`       Target collection name (default: `students`). Use `users` to write to `users` collection.
 - `--commit`           Actually write to Firestore. Without this flag the script is a dry-run.
 - `--overwrite`        Overwrite existing documents with same ID.

Safety notes
 - This script uses the Firebase Admin SDK and bypasses Firestore security rules. Only run with a service account you trust.
 - The script uses `studentNum` (the MMC... string) as document ID by default.
 - If you want to create Firebase Auth accounts for students, do that in a separate controlled process (not included here).

If you want, I can:
 - Add an option to create Auth accounts (generate passwords) while importing.
 - Add stricter validation and transform rules for fields (e.g., normalize `studentId` format).
