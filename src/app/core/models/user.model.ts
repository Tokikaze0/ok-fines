/**
 * User Model
 * Represents user data structure in the application
 */
export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'student' | 'homeroom';
  createdAt: string; // ISO 8601 timestamp
  createdBy?: string; // UID of the admin who created this user
  studentId?: string; // Format: MMC20**-*****
  society?: string;
}

/**
 * Bulk student import from CSV
 */
export interface BulkStudentImport {
  email: string;
  password: string;
  studentId: string;
  society: string;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: string[];
  errors: Array<{
    email: string;
    error: string;
  }>;
}
