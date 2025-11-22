# Bulk Student Import Guide

## Overview
The student management module now supports bulk CSV import of students. Two import modes are available:

### Import Modes

#### 1. **Collection Only** (Default - Recommended for `students_filtered.csv`)
- Imports student records directly into the Firestore `students` collection
- No Firebase Authentication accounts created
- Suitable for data that you'll use for lookup/queries
- **Use case:** Initial load of student roster from `students_filtered.csv`

#### 2. **With Auth Accounts**
- Creates Firebase Authentication accounts for each student
- Adds user records to the `users` collection with `role: 'student'`
- Students can log in with auto-generated credentials
- **Use case:** Setting up student login accounts

## CSV Format Support

### Format 1: `students_filtered.csv` (Column-based)
```
ID,lastName,firstName,middleName,studentNum,programID,collegeID,yearLevelID,sectionID
1,AALA,KEIZY,ATIENZA,MMC2024-00531,1,1,2,5
2,ABARINTOS,RUSSEL ANTHONY,ORTEGA,MMC2024-00554,1,1,2,5
```

**Auto-generation:**
- **Email:** `{studentNum}@student.edu` (e.g., `mmc2024-00531@student.edu`)
- **Temporary Password:** `{FirstInitial}{LastInitial}@{LastFourDigits}` (e.g., `KA@0531`)
- **Society:** Empty (optional, can be updated later)

### Format 2: Legacy Format
```
email,password,studentId,society
john@example.com,password123,MMC2024-00531,Engineering
```

**Requirements:**
- `email`: Valid email address
- `password`: Strong password
- `studentId`: Format `MMC20**-*****`
- `society`: Any string value

## How to Use

### Step 1: Navigate to Student Management
- Log in as an admin user
- Go to Dashboard → Student User Management

### Step 2: Select Import Mode
- **For `students_filtered.csv`:** Select "Collection Only"
- **To create auth accounts:** Select "With Auth Accounts"

### Step 3: Upload CSV
- Click the "Bulk Upload CSV" button
- Select your CSV file (`.csv` extension required)
- Wait for processing to complete

### Step 4: Review Results
- Success message shows how many students were imported
- Any errors are displayed with details
- Refresh the student list to see new entries

## Example: Importing `students_filtered.csv`

1. Click "Bulk Upload CSV"
2. Select `src/environments/students_filtered.csv`
3. Keep import mode as "Collection Only"
4. Click "Bulk Upload CSV" again to confirm
5. Wait for the import to complete (~5-10 seconds for 300+ students)
6. Results show: "Successfully created 369 students"

## Important Notes

- **Import mode toggle is located in the card header** alongside the upload button
- **Collection-only imports do not require password management** - students can still be queried and managed
- **Temporary passwords generated for auth mode** - students should be instructed to change them on first login
- **Duplicate student IDs are handled gracefully** - the error will be shown and import continues
- **Student emails are auto-generated from studentNum** - ensure studentNum is valid in the CSV

## Firestore Collections

After import:

- **`students` collection:** Contains all imported student records (Collection Only mode)
- **`users` collection:** Contains student + admin records (Auth Accounts mode)

### Student Document Structure
```json
{
  "studentId": "MMC2024-00531",
  "email": "mmc2024-00531@student.edu",
  "society": "",
  "createdAt": "2025-11-18T15:30:00.000Z",
  "createdBy": "admin_uid"
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Please select a CSV file" | Ensure file has `.csv` extension |
| "Unknown CSV format" | Check headers match expected format |
| "Invalid student ID format" | Verify student ID column contains valid IDs (MMC20**-***** or C##-####) |
| Import fails midway | Check Firestore quota and permissions |
| Students not visible after import | Reload the page to refresh the student list |

## Security & Best Practices

- **For Collection-Only imports:** No sensitive auth data is created; records are read-only unless queried by the app
- **For Auth imports:** Auto-generated passwords should not be stored; communicate passwords through secure channels
- **Admin-only operation:** Only users with `role: 'admin'` can perform bulk imports
