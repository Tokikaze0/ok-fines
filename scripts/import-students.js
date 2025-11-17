#!/usr/bin/env node
/*
  Import students CSV into Firestore using Firebase Admin SDK.

  Usage:
    1) Install deps: npm install firebase-admin csv-parse
    2) Place your service account JSON somewhere safe, e.g. ./serviceAccountKey.json
    3) Run dry-run (no writes):
         node scripts/import-students.js --csv=src/environments/students.csv --serviceAccount=./serviceAccountKey.json
    4) To actually commit writes:
         node scripts/import-students.js --csv=src/environments/students.csv --serviceAccount=./serviceAccountKey.json --commit
    5) Optional flags:
         --target=students    (default)
         --target=users       (will write to `users` collection; note: no auth created)
         --overwrite         (overwrite existing documents with same id)

  Notes:
    - The script uses the CSV header fields as observed in the project's `students.csv`.
    - Document ID is set to `studentNum` (the MMC... value) by default.
    - This script writes using the Admin SDK and bypasses Firestore security rules; run carefully.
*/

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [k, v] = arg.slice(2).split('=');
      args[k] = v === undefined ? true : v;
    }
  });
  return args;
}

async function main() {
  const args = parseArgs();
  const csvPath = args.csv || 'src/environments/students.csv';
  const serviceAccountPath = args.serviceAccount || './serviceAccountKey.json';
  const target = args.target || 'students';
  const doCommit = !!args.commit;
  const overwrite = !!args.overwrite;

  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csvText, { columns: true, skip_empty_lines: true });

  console.log(`Parsed ${records.length} rows from ${csvPath}`);
  console.log(`Target collection: ${target}`);
  console.log(`Mode: ${doCommit ? 'COMMIT (will write to Firestore)' : 'DRY-RUN (no writes)'}`);
  if (!doCommit) console.log('Use --commit to actually write to Firestore.');

  // Safe preview: show first 3 normalized rows
  const preview = records.slice(0, 3).map(normalizeRow);
  console.log('Preview (first 3 rows):');
  console.dir(preview, { depth: null });

  if (!doCommit) return;

  // For commit mode: attempt to initialize firebase-admin from --serviceAccount path
  // or from Application Default Credentials via GOOGLE_APPLICATION_CREDENTIALS.
  const admin = require('firebase-admin');
  let db;
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
  } else if (gac && fs.existsSync(gac)) {
    // Use Application Default Credentials when the env var points to a key file
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    db = admin.firestore();
  } else if (gac) {
    // If env var is set but path doesn't exist, warn and exit
    console.error('GOOGLE_APPLICATION_CREDENTIALS is set but file not found:', gac);
    process.exit(1);
  } else {
    console.error('Service account JSON not found and GOOGLE_APPLICATION_CREDENTIALS not set.');
    console.error('Provide --serviceAccount=path or set the env var GOOGLE_APPLICATION_CREDENTIALS=path');
    process.exit(1);
  }

  let batch = db.batch();
  let ops = 0;
  let written = 0;
  for (const row of records) {
    const doc = normalizeRow(row);
    const docId = (doc.studentId || doc.studentNum || doc.studentNumRaw || '').toString();
    if (!docId) {
      console.warn('Skipping row with no student id:', row);
      continue;
    }

    const ref = db.collection(target).doc(docId);
    if (!overwrite) {
      // check existence synchronously via await
      // to avoid too many reads, we do a read and then write
      const snap = await ref.get();
      if (snap.exists) {
        console.log(`Skipping existing doc ${docId} (use --overwrite to replace)`);
        continue;
      }
    }

    batch.set(ref, doc, { merge: !!overwrite });
    ops++;
    written++;

    if (ops >= 450) {
      await batch.commit();
      console.log(`Committed batch of ${ops} writes...`);
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${ops} writes.`);
  }

  console.log(`Import complete. Documents written: ${written}`);
  process.exit(0);
}

function normalizeRow(row) {
  // Map the CSV headers to our Firestore fields.
  // Observed CSV columns: ID,lastName,firstName,middleName,studentNum,rfid,programID,collegeID,yearLevelID,sectionID
  const studentNumRaw = (row.studentNum || row.studentnum || '').trim();
  return {
    studentId: studentNumRaw, // primary id field in our system
    studentNum: studentNumRaw,
    studentNumRaw,
    id: row.ID || row.Id || row.id || null,
    firstName: (row.firstName || row.firstname || '').trim(),
    middleName: (row.middleName || row.middlename || '').trim(),
    lastName: (row.lastName || row.lastname || '').trim(),
    rfid: (row.rfid || '').toString(),
    programId: row.programID || row.programId || null,
    collegeId: row.collegeID || row.collegeId || null,
    yearLevelId: row.yearLevelID || row.yearLevelId || null,
    sectionId: row.sectionID || row.sectionId || null,
    displayName: buildDisplayName(row),
    createdAt: new Date().toISOString()
  };
}

function buildDisplayName(row) {
  const parts = [];
  if (row.firstName) parts.push(row.firstName.trim());
  if (row.middleName) parts.push(row.middleName.trim());
  if (row.lastName) parts.push(row.lastName.trim());
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

main().catch(err => {
  console.error('Error during import:', err);
  process.exit(1);
});
