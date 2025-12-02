/*
Backfill script for Firestore: fills missing `societyId` on `fees` and `payments`.

Usage (recommended dry-run first):

# In PowerShell (set path to your service account JSON or use gcloud auth application-default login)
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\serviceAccountKey.json'
node ./scripts/backfill-fees-payments.js --dry

# To apply updates (be careful):
node ./scripts/backfill-fees-payments.js --apply

Notes:
- Script uses Firebase Admin SDK. Install deps before running:
  npm install firebase-admin
- Dry-run (--dry) will only log planned updates, not write.
- --apply will perform batched writes (500 ops per batch).
- Script tries to infer societyId in this order:
  1) For fees: from users/{createdBy}.societyId
  2) For payments: from fee.societyId, else students/{studentId}.societyId, else users (student record)
- Test in a non-production project or take a backup snapshot before applying.
*/

const admin = require('firebase-admin');
const argv = require('minimist')(process.argv.slice(2));

const DRY = argv.dry || !argv.apply; // default to dry unless --apply provided

if (!admin.apps.length) {
  // Initialize using Application Default Credentials (set GOOGLE_APPLICATION_CREDENTIALS)
  admin.initializeApp();
}

const db = admin.firestore();

async function chunkedCommit(updates) {
  const BATCH_SIZE = 500;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const slice = updates.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    slice.forEach(u => batch.update(u.ref, u.data));
    if (DRY) {
      console.log(`DRY RUN: would commit batch with ${slice.length} updates`);
    } else {
      console.log(`Committing batch with ${slice.length} updates...`);
      await batch.commit();
      console.log('Batch committed');
    }
  }
}

async function backfillFees() {
  console.log('Scanning fees collection for missing societyId...');
  const feesSnap = await db.collection('fees').get();
  const updates = [];
  for (const doc of feesSnap.docs) {
    const data = doc.data();
    if (!data || data.societyId) continue; // has societyId already
    const createdBy = data.createdBy;
    if (!createdBy) {
      console.warn(`Fee ${doc.id} has no createdBy; skipping`);
      continue;
    }
    const userDoc = await db.collection('users').doc(createdBy).get();
    if (!userDoc.exists) {
      console.warn(`User ${createdBy} not found for fee ${doc.id}; skipping`);
      continue;
    }
    const userData = userDoc.data();
    const soc = userData && userData.societyId ? userData.societyId : null;
    if (!soc) {
      console.warn(`User ${createdBy} has no societyId; cannot infer for fee ${doc.id}; skipping`);
      continue;
    }
    updates.push({ ref: doc.ref, data: { societyId: soc } });
    console.log(`Plan: set fees/${doc.id}.societyId = ${soc}`);
  }

  console.log(`Planned fee updates: ${updates.length}`);
  await chunkedCommit(updates);
}

async function backfillPayments() {
  console.log('Scanning payments collection for missing societyId...');
  const paymentsSnap = await db.collection('payments').get();
  const updates = [];
  for (const doc of paymentsSnap.docs) {
    const data = doc.data();
    if (!data) continue;
    if (data.societyId) continue; // already set

    const paymentId = doc.id;
    let soc = null;

    // Try fee -> societyId
    if (data.feeId) {
      const feeDoc = await db.collection('fees').doc(data.feeId).get();
      if (feeDoc.exists) {
        const feeData = feeDoc.data();
        if (feeData && feeData.societyId) soc = feeData.societyId;
      }
    }

    // Try student document
    if (!soc && data.studentId) {
      const studentDoc = await db.collection('students').doc(data.studentId).get();
      if (studentDoc.exists) {
        const sd = studentDoc.data();
        if (sd && sd.societyId) soc = sd.societyId;
      }
    }

    // Try users collection by studentId
    if (!soc && data.studentId) {
      const usersSnap = await db.collection('users').where('studentId', '==', data.studentId).limit(1).get();
      if (!usersSnap.empty) {
        const ud = usersSnap.docs[0].data();
        if (ud && ud.societyId) soc = ud.societyId;
      }
    }

    if (!soc) {
      console.warn(`Could not infer societyId for payment ${paymentId}; skipping`);
      continue;
    }

    updates.push({ ref: doc.ref, data: { societyId: soc } });
    console.log(`Plan: set payments/${paymentId}.societyId = ${soc}`);
  }

  console.log(`Planned payment updates: ${updates.length}`);
  await chunkedCommit(updates);
}

async function main() {
  console.log('Backfill script started. DRY RUN:', DRY);
  try {
    await backfillFees();
    await backfillPayments();
    console.log('Backfill completed');
    if (DRY) console.log('Dry run finished. To apply changes, run with --apply');
  } catch (err) {
    console.error('Migration failed', err);
    process.exitCode = 2;
  }
}

main();
