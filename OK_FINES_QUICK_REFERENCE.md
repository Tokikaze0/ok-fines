# OK FINES Quick Reference Guide

## 🎯 System Endpoints

### Public Routes (No Auth Required)
- `http://localhost/home` - Home page
- `http://localhost/register` - User registration
- `http://localhost/student-fees` - Student fee lookup portal

### Admin Routes (AdminGuard Required)
- `http://localhost/dashboard` - Admin dashboard
- `http://localhost/student-user-management` - Manage student accounts
- `http://localhost/manage-fees` - Add/edit/delete fees
- `http://localhost/track-payments` - Update payment status
- `http://localhost/outstanding-report` - View outstanding balances

---

## 📊 Data Models

### Fee Document (Firestore: `/fees/{feeId}`)
```typescript
{
  id?: string;
  description: string;      // e.g., "April Contribution"
  amount: number;            // e.g., 100 (₱)
  createdAt: timestamp;
  createdBy: string;         // Admin UID
}
```

### Payment Document (Firestore: `/payments/{paymentId}`)
```typescript
{
  id?: string;
  studentId: string;         // e.g., "MMC20**-*****"
  feeId: string;
  status: 'paid' | 'unpaid';
  paidAt?: timestamp;
  paidBy?: string;           // Admin UID
  notes?: string;
  createdAt: timestamp;
}
```

---

## 🔐 Firebase Auth Roles

- `admin` - Full system access, manages fees and payments
- `student` - Read-only access to own fees/payments
- `homeroom` - Homeroom management (existing)

---

## 🛠️ Development Commands

### Build
```bash
npm run build
```

### Development Server
```bash
ng serve
```

### Run on Device
```bash
ionic build
ionic cap add (ios|android)
ionic cap open (ios|android)
```

---

## 🔗 API Service Usage Examples

### Get Student's Fee Summary
```typescript
constructor(private paymentService: PaymentService) {}

async showStudentFees(studentId: string) {
  const summary = await this.paymentService.getStudentPaymentSummary(studentId);
  console.log(`Total Paid: ₱${summary.totalPaid}`);
  console.log(`Total Unpaid: ₱${summary.totalUnpaid}`);
}
```

### Add a New Fee (Admin Only)
```typescript
constructor(private feeService: FeeService) {}

async createFee() {
  const feeId = await this.feeService.addFee('Monthly Dues', 500);
  // Automatically creates payment records for all students
  await this.feeService.createPaymentsForFee(feeId);
}
```

### Update Payment Status (Admin Only)
```typescript
constructor(private paymentService: PaymentService) {}

async markAsPaid(paymentId: string) {
  await this.paymentService.updatePaymentStatus(
    paymentId,
    'paid',
    'Admin Name',  // paidBy
    'Verified receipt'  // notes
  );
}
```

### Get Outstanding Balance Report
```typescript
constructor(private paymentService: PaymentService) {}

async generateReport() {
  const outstanding = await this.paymentService.getOutstandingBalanceReport();
  // Returns StudentPaymentSummary[] for all students with unpaid fees
  outstanding.forEach(student => {
    console.log(`${student.studentId}: ₱${student.totalUnpaid}`);
  });
}
```

---

## 🔄 Real-time Subscriptions

### Subscribe to Fees
```typescript
const unsubscribe = this.feeService.subscribeFees(fees => {
  console.log('Fees updated:', fees);
  // Component automatically re-renders when fees change
});

// Don't forget to unsubscribe on component destroy
ngOnDestroy() {
  if (unsubscribe) unsubscribe();
}
```

### Subscribe to Payments
```typescript
const unsubscribe = this.paymentService.subscribePayments(payments => {
  console.log('Payments updated:', payments);
});
```

---

## 📋 Firestore Collections

### Collections that must exist:
1. **users** (existing)
   - Stores user accounts with role field
   - Required fields: uid, email, role

2. **fees** (NEW)
   - Stores all contribution fees
   - Admin-managed

3. **payments** (NEW)
   - Stores payment records for each student-fee combination
   - Automatically generated when fees are added

4. **surveys** (existing)
5. **homerooms** (existing)

---

## ✅ Admin Guard Behavior

When non-admin tries to access admin routes:
1. AdminGuard checks StorageService for `user_role`
2. If not 'admin' or missing `access_token`:
   - Redirect to `/home`
   - No error message (security)
3. If admin:
   - Allow route access

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module" errors in routing
**Solution**: All module files must be created before they're imported in routing

### Issue: Real-time updates not reflecting
**Solution**: Ensure Firestore security rules allow read access for the user role

### Issue: AdminGuard redirects unexpectedly
**Solution**: 
1. Check StorageService has `user_role` set correctly
2. Verify `access_token` exists in storage
3. Check user document in Firestore has correct role field

### Issue: Payment creation fails when adding fee
**Solution**: Ensure all students in 'users' collection have role='student'

---

## 📈 Performance Tips

1. **Use Real-time Subscriptions**: Avoid repeated HTTP calls
2. **Unsubscribe on Destroy**: Prevent memory leaks and unused subscriptions
3. **Batch Operations**: Create multiple payments in single batch write
4. **Indexes**: Add Firestore composite index for complex queries

---

## 🔐 Security Checklist

- [ ] AdminGuard applied to all admin routes
- [ ] Firestore rules deployed and tested
- [ ] Users cannot access other students' payment data
- [ ] Only admins can modify fees and payments
- [ ] Firebase Auth configured with email/password providers
- [ ] API calls use interceptor with valid tokens

---

## 📞 Emergency Contacts

**If Firestore permissions error**:
1. Check security rules in Firebase Console
2. Verify user role in Firestore 'users' collection
3. Try signing out and signing back in

**If routes not working**:
1. Clear browser cache
2. Rebuild project: `ng build`
3. Check app-routing.module.ts for syntax errors

**If real-time updates stop**:
1. Check Firestore connection in browser DevTools
2. Verify subscription not unsubscribed prematurely
3. Check Firestore read quota usage
