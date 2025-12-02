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
  targetYearLevel?: string;
  targetSection?: string;
}

/**
 * Payment Record Model
 */
export interface Payment {
  id?: string;
  studentId: string;
  feeId: string;
  status: 'paid' | 'unpaid' | 'pending'; // 'pending' = collected by homeroom, waiting for admin
  paidAt?: string;
  paidBy?: string; // admin/homeroom UID who marked as paid/pending
  notes?: string;
  createdAt: string;
  societyId?: string;
}

/**
 * Student Payment Summary (for reports)
 */
export interface StudentPaymentSummary {
  studentId: string;
  fullName?: string;
  email: string;
  society?: string;
  totalUnpaid: number;
  totalPaid: number;
  payments: Payment[];
  fees: Fee[];
}
