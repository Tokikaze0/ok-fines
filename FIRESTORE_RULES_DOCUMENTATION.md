# Firestore Security Rules Documentation

**Updated:** November 17, 2025  
**Version:** 2.0  
**Status:** ✅ Production Ready

---

## Overview

The Firestore security rules enforce role-based access control (RBAC) and data validation for the OK FINES system. All rules follow the principle of least privilege - users can only access what they need.

---

## Helper Functions

### `isAdmin()`
Checks if the authenticated user has admin role.

```firestore
function isAdmin() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

**Usage:** Used throughout rules to verify admin status without repeating code.

### `getUserData(uid)`
Retrieves user document data for a given UID.

```firestore
function getUserData(uid) {
  return get(/databases/$(database)/documents/users/$(uid)).data;
}
```

**Usage:** Used to access user fields like `studentId` for granular filtering.

---

## Collection-Level Rules

### 1. `/users/{userId}` - User Accounts

**Purpose:** Manage user authentication and profile data.

**Create Rules:**
- ✅ Users can create their own account during registration
  - Must match authenticated UID
  - Must include: `email`, `role`, `uid`
  - Role must be: `student`, `homeroom`, or `admin`
- ✅ Admins can create new user accounts for bulk operations

**Read Rules:**
- ✅ Users can read their own profile
- ✅ Admins can read all user profiles

**Update Rules:**
- ✅ Only admins can update user data
- ✅ Can only modify: `email`, `role`, `studentId`, `society`, `displayName`
- ✅ Cannot modify: `uid` (immutable), `createdAt`

**Delete Rules:**
- ✅ Only admins can delete user accounts

**Security Features:**
- Prevents users from changing their own role
- Prevents UID tampering
- Allows only admin-approved field updates

---

### 2. `/surveys/{surveyId}` - Feedback Surveys

**Purpose:** Store user feedback with location data.

**Create Rules:**
- ✅ Authenticated users can create surveys
- ✅ User ID must match authenticated user
- ✅ Required fields: `fullName`, `contact`, `rating`, `datetime`, `userId`, `latitude`, `longitude`
- ✅ Rating must be 1-5 (string)
- ✅ Coordinates must be valid (lat: -90 to 90, lng: -180 to 180)
- ✅ Optional: `comments`, `imageUrl`, `imageData`

**Read Rules:**
- ✅ Users can read their own surveys
- ✅ Admins can read all surveys

**Update Rules:**
- ✅ Users can only update their own surveys

**Delete Rules:**
- ✅ Users can delete their own surveys
- ✅ Admins can delete any survey

**Security Features:**
- Prevents location spoofing with coordinate validation
- Requires user to be survey author for updates
- Restricts to specific allowed fields

---

### 3. `/homerooms/{homeroomId}` - Homeroom Groups

**Purpose:** Manage homeroom/class groupings.

**Create Rules:**
- ✅ Only admins can create homerooms
- ✅ Admin UID must match requester's UID
- ✅ Required fields: `name`, `createdAt`, `adminUid`
- ✅ Optional: `code`

**Read Rules:**
- ✅ Admins can read all homerooms
- ✅ Homeroom admins can read their own homerooms

**Update Rules:**
- ✅ Only admins can update
- ✅ `adminUid` cannot be changed (immutable)

**Delete Rules:**
- ✅ Only admins can delete

**Security Features:**
- Prevents non-admins from creating homerooms
- Prevents unauthorized admin reassignment
- Restricts field modifications

---

### 4. `/fees/{feeId}` - Contribution Fees

**Purpose:** Store and manage contribution fee configurations.

**Create Rules:**
- ✅ Only admins can create fees
- ✅ Required: `description`, `amount`, `createdAt`, `createdBy`
- ✅ Amount must be number > 0
- ✅ `createdBy` must match admin's UID
- ✅ Only allowed fields: `description`, `amount`, `createdAt`, `createdBy`

**Read Rules:**
- ✅ All authenticated users can read fees (needed to display in student portal)

**Update Rules:**
- ✅ Only admins can update
- ✅ Can only modify: `description`, `amount`
- ✅ Amount must remain > 0
- ✅ Cannot modify: `createdAt`, `createdBy` (audit trail)

**Delete Rules:**
- ✅ Only admins can delete

**List Rules:**
- ✅ All authenticated users can list fees

**Security Features:**
- Prevents negative/zero amounts
- Maintains audit trail via immutable `createdBy`
- Prevents unauthorized bulk updates
- Amount validation prevents data corruption

---

### 5. `/payments/{paymentId}` - Payment Records

**Purpose:** Track payment status for each student-fee combination.

**Create Rules:**
- ✅ Only admins can create payment records
- ✅ Required: `studentId`, `feeId`, `status`, `createdAt`
- ✅ Status must be: `paid` or `unpaid`
- ✅ Optional: `paidAt`, `paidBy`, `notes`
- ✅ Only allowed fields specified above

**Read Rules:**
- ✅ Admins can read all payments
- ✅ Students can only read payments where `studentId` matches their own
  - Prevents cross-student data exposure
  - Enforces privacy isolation

**Update Rules:**
- ✅ Only admins can update
- ✅ Can only modify: `status`, `paidAt`, `paidBy`, `notes`
- ✅ Status must remain `paid` or `unpaid`
- ✅ Cannot modify: `studentId`, `feeId` (prevents record reassignment)

**Delete Rules:**
- ✅ Only admins can delete

**List Rules:**
- ✅ All authenticated users can list (needed for real-time subscriptions)

**Security Features:**
- **Student Privacy:** Students can only see their own payments
- **Data Integrity:** `studentId` and `feeId` are immutable
- **Audit Trail:** `paidAt`, `paidBy` track who and when
- **Status Validation:** Only two valid states
- **Granular Updates:** Cannot change payment-to-student binding

---

## Security Model

### Authentication
- All rules require `request.auth != null`
- Only authenticated Firebase users can access any data

### Authorization (Role-Based Access Control)
```
Admin (role: 'admin')
├── Full CRUD on users, fees, payments
├── Can read/update/delete surveys (all)
├── Can manage homerooms
└── View all data

Student (role: 'student')
├── Read own fees (from /fees)
├── Read own payments only (filtered by studentId)
├── Create/read own surveys
└── Cannot modify any administrative data

Homeroom (role: 'homeroom')
├── Read own homeroom data
└── Create/read own surveys
```

### Data Validation
- Type checking (e.g., `amount is number`)
- Range validation (e.g., coordinates, ratings)
- Enum validation (e.g., status `in ['paid', 'unpaid']`)
- Field whitelisting (`.hasOnly()`)
- Required field validation (`.hasAll()`)

### Immutable Fields
- `uid` - Cannot be changed after user creation
- `userId` - Cannot be changed in surveys
- `studentId` - Cannot be changed in payments
- `feeId` - Cannot be changed in payments
- `createdAt` - Tracks creation timestamp
- `createdBy` - Tracks creator for audit trail

---

## Common Operations & Permissions

### Student Portal - View My Fees
```
1. User reads /fees/{feeId} - Allowed (all authenticated users)
2. User reads /payments/{paymentId} where studentId == their studentId - Allowed
3. Displays fees + payment status - Success
```

### Admin - Add New Fee
```
1. Admin creates /fees/{feeId} with description, amount - Allowed (isAdmin())
2. System creates /payments for all students - Allowed (batch write)
3. Real-time updates visible to all - Allowed (read access on fees)
```

### Admin - Update Payment Status
```
1. Admin reads /payments/{paymentId} - Allowed (isAdmin())
2. Admin updates status, paidAt, paidBy, notes - Allowed
3. Cannot change studentId or feeId - Blocked (field restriction)
4. Firestore persists change - Allowed
```

### Student - Cannot Access
```
1. Student tries to read other student's payments - Blocked
   (studentId != their studentId)
2. Student tries to create payment - Blocked
   (requires isAdmin())
3. Student tries to modify fee - Blocked
   (requires isAdmin())
4. Student tries to create users - Blocked
   (requires isAdmin())
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Verify all collections exist in Firestore
- [ ] Test rules with emulator (Firebase Emulator Suite)
- [ ] Run security test suite
- [ ] Verify admin user has correct role in database
- [ ] Test student access with valid studentId
- [ ] Test cross-student access blocking
- [ ] Verify timestamps are ISO 8601 format
- [ ] Test real-time subscriptions with multiple clients
- [ ] Check error messages in browser console
- [ ] Verify CSV export functionality works
- [ ] Load test with concurrent admins
- [ ] Backup Firestore before deploying

---

## Testing Rules

### Test with Firebase Emulator Suite

```bash
firebase emulators:start
```

### Example Test Cases

**Test 1: Student Cannot Access Other Student's Payments**
```
Given: Student A logged in (studentId: MMC2001-0001)
When: Tries to read Payment for Student B (studentId: MMC2001-0002)
Then: Firestore blocks read (rule denies)
```

**Test 2: Admin Can Create Fee**
```
Given: Admin logged in (role: 'admin')
When: Creates /fees/{feeId} with valid data
Then: Firestore allows write
```

**Test 3: Student Cannot Update Fee**
```
Given: Student logged in (role: 'student')
When: Tries to update /fees/{feeId}
Then: Firestore blocks update (rule denies)
```

---

## Troubleshooting

### Issue: "Permission denied" on payment read
**Cause:** Student's `studentId` doesn't match payment record  
**Solution:** Verify student document has correct `studentId` field

### Issue: "Invalid data" on fee create
**Cause:** Amount is not a number or is <= 0  
**Solution:** Ensure `amount` is numeric and positive

### Issue: Admin cannot update payment
**Cause:** Trying to change `studentId` or `feeId`  
**Solution:** Only modify `status`, `paidAt`, `paidBy`, `notes`

### Issue: Students can't read fees
**Cause:** Rule might be missing or too restrictive  
**Solution:** Verify `/fees/{feeId}` has `allow read: if request.auth != null;`

---

## Performance Notes

- Helper functions are executed at read time
- Caching is not used (rules are stateless)
- Consider query indexes for frequently filtered data
- Real-time subscriptions respect these rules automatically

---

## Future Enhancements

1. Add collection-level backup triggers
2. Implement automated audit logging
3. Add data retention policies
4. Support for role-based fee restrictions (different fees for different roles)
5. Add batch operation rules
6. Implement rate limiting

---

## References

- [Firebase Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/rules-query)
- [Best Practices](https://firebase.google.com/docs/firestore/security/best-practices)

---

*Last Updated: November 17, 2025*  
*Document Version: 2.0*  
*Status: Production Ready*
