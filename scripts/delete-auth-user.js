const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const uid = args.find(arg => arg.startsWith('--uid='))?.split('=')[1];
const email = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
const serviceAccountPath = args.find(arg => arg.startsWith('--serviceAccount='))?.split('=')[1] || './serviceAccountKey.json';

if (!uid && !email) {
    console.error('Error: Please provide either --uid or --email');
    console.log('Usage: node scripts/delete-auth-user.js --uid=<uid> [--serviceAccount=<path>]');
    console.log('   or: node scripts/delete-auth-user.js --email=<email> [--serviceAccount=<path>]');
    process.exit(1);
}

// Initialize Firebase Admin
if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Error: Service account file not found at ${serviceAccountPath}`);
    console.log('Please download your service account key from Firebase Console -> Project Settings -> Service Accounts');
    process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function deleteUser() {
    try {
        let targetUid = uid;

        if (!targetUid && email) {
            console.log(`Looking up user by email: ${email}...`);
            try {
                const userRecord = await admin.auth().getUserByEmail(email);
                targetUid = userRecord.uid;
                console.log(`Found user ${email} with UID: ${targetUid}`);
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    console.error(`Error: No user found with email ${email}`);
                    process.exit(1);
                }
                throw error;
            }
        }

        console.log(`Deleting user ${targetUid} from Authentication...`);
        await admin.auth().deleteUser(targetUid);
        console.log('Successfully deleted user from Authentication.');

        // Optional: Check if Firestore doc exists and warn
        const userDoc = await admin.firestore().collection('users').doc(targetUid).get();
        if (userDoc.exists) {
            console.log('Warning: User document still exists in Firestore. You may want to delete it manually or via the app.');
        }

    } catch (error) {
        console.error('Error deleting user:', error);
        process.exit(1);
    }
}

deleteUser();
