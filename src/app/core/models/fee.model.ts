/**
 * Fee/Contribution Model
 */
export interface Fee {
  id?: string;
  description: string;
  amount: number;
  createdAt: string;
  createdBy: string; // admin UID
  societyId?: string;
}

/**
 * Payment Record Model
 */
export interface Payment {
  id?: string;
  studentId: string;
  feeId: string;
  status: 'paid' | 'unpaid'; // Changed from enum to union type for simplicity
  paidAt?: string;
  paidBy?: string; // admin UID who marked as paid
  notes?: string;
  createdAt: string;
  societyId?: string;
}

/**
 * Student Payment Summary (for reports)
 */
export interface StudentPaymentSummary {
  studentId: string;
  email: string;
  society?: string;
  totalUnpaid: number;
  totalPaid: number;
  payments: Payment[];
  fees: Fee[];
}
