export type UserRole = "admin" | "teacher" | "student" | "parent";

export interface pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface user {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  school?: string;
  studentClass?: Class;
  teacherSubject?: subject[];
  children?: user[];
  schoolContext?: {
    _id: string;
    slug: string;
    name: string;
    features: string[];
    isTrial: boolean;
    status: string;
    planName: string;
  };
}

export interface term {
  _id?: string;
  term: string;
  startDate: Date;
  endDate: Date;
}

export interface academicYear {
  _id: string;
  name: string; // "2024-2025"
  fromYear: Date; // "2024-09-01"
  toYear: Date; // "2025-06-30"
  isCurrent: boolean; // true/false
  term: string; // Legacy
  activeTerm: string; // "Term 1"
  terms?: term[];
  currentTermDates?: { startDate: Date; endDate: Date };
}

export interface Class {
  _id: string;
  name: string; // e.g., "Grade 10"
  academicYear: academicYear; // Link to "2024-2025"
  classTeacher: user; // The main teacher in charge
  subjects: subject[]; // List of subjects taught in this class
  students: user[]; // List of students enrolled
  capacity: number; // Max students allowed (optional)
}

export interface subject {
  _id: string;
  name: string; // "Mathematics"
  code: string; // "MATH101"
  teacher?: user[]; // Default teacher for this subject
  isActive: boolean; // Indicates if the subject is currently active
}

export interface question {
  _id: string;
  questionText: string;
  type: string;
  options: string[]; // Array of strings e.g. ["A", "B", "C", "D"]
  correctAnswer: string; // Hidden from students in default queries
  points: number;
}

export interface exam {
  _id: string;
  title: string;
  subject: subject;
  class: Class;
  teacher: user;
  duration: number; // in minutes
  questions: question[];
  dueDate: Date;
  isActive: boolean;
  hasSubmitted?: boolean;
}

export interface Submission {
  _id: string;
  score: number;
  exam: exam; // The populated exam with answers
  answers: { questionId: string; answer: string; feedback?: string }[];
}

export interface period {
  _id: string;
  subject: { _id: string; name: string; code: string };
  teacher: { _id: string; name: string };
  startTime: string; // e.g., "08:00"
  endTime: string; // e.g., "08:45"
  name?: string;
}

export interface schedule {
  day: string; // "Monday", "Tuesday", etc.
  periods: period[];
}

export interface FeeStructure {
  _id: string;
  name: string;
  amount: number;
  class: Class | string;
  academicYear: academicYear | string;
  dueDate: string | Date;
  description?: string;
  category: "tuition" | "exam" | "library" | "sport" | "other";
}

export interface FeeTransaction {
  _id?: string;
  amount: number;
  date: string | Date;
  method: "cash" | "bank_transfer" | "card" | "other";
  receiptNumber?: string;
  notes?: string;
}

export interface StudentFee {
  _id: string;
  student: user | string;
  feeStructure: FeeStructure | string;
  class: Class | string;
  academicYear: academicYear | string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
  transactions: FeeTransaction[];
}

export interface Expense {
  _id: string;
  title: string;
  amount: number;
  category: "salary" | "utilities" | "maintenance" | "supplies" | "equipment" | "other";
  description?: string;
  date: string | Date;
  paymentMethod: "cash" | "bank_transfer" | "card" | "other";
  receipt?: string;
  recordedBy: user | string;
  academicYear: academicYear | string;
}

export interface SalaryRecord {
  _id: string;
  employee: user | string;
  academicYear: academicYear | string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "pending" | "paid";
  paymentDate?: string | Date;
  paymentMethod?: "cash" | "bank_transfer" | "card" | "other";
  notes?: string;
}
