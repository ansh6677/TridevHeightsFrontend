export type TenantStatus = 'ACTIVE' | 'VACATED';

export const PAYMENT_MODES = ['UPI', 'Bank transfer', 'Cash', 'Cheque', 'Card'] as const;

/** Suggestions only — the field accepts anything you type. */
export const ROOM_SUGGESTIONS = [
  'Hall', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3',
  'Master bedroom', 'Balcony room', 'Studio'
] as const;

export interface RoomSpec {
  name: string;
  capacity: number;
}

/**
 * The hall is the shared room rather than a private bedroom, so it is drawn
 * in its own colour and kept in its own band on the Flats screen. One test,
 * used everywhere, so a hall never reads as a bedroom on one screen and not
 * on another.
 */
export function isHallRoom(name: string | null | undefined): boolean {
  return !!name && /^\s*(hall|living|lounge|common|drawing)/i.test(name);
}

export type FlatGender = 'BOYS' | 'GIRLS';

export interface Flat {
  id: string;
  flatNo: string;
  floor?: string;
  notes?: string;
  gender?: FlatGender;
  rooms: RoomSpec[];
}

export interface RoomView {
  name: string;
  capacity: number;
  filled: number;
  vacant: number;
  occupants: Occupant[];
}

/** 0 = full access, 1 = view only. Matches the `role` column in Mongo. */
export const ROLE_ADMIN = 0;
export const ROLE_VIEWER = 1;

export interface DeskUser {
  id: string;
  name: string;
  email: string;
  role: number;
  roleLabel: string;
  active: boolean;
  /** The protected login. Cannot be edited, deactivated or deleted. */
  superAdmin: boolean;
}

export interface Occupant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roomName: string;
  monthlyRent: number;
  securityDeposit?: number;
  agreementCharge?: number;
  joinDate?: string;
  status: TenantStatus;
  paidThisMonth: boolean;
  /** Absent when no receipt has gone out this month. */
  receiptNoThisMonth?: string;
  /** ISO instant, absent if no reminder has gone out for this month. */
  lastReminderAt?: string;

  /** This tenant's own cycle for the current month, yyyy-MM-dd. */
  dueDate?: string;
  periodFrom?: string;
  periodTo?: string;
  /** Fee accrued so far, and rent plus that fee. */
  lateFee?: number;
  payableNow?: number;

  /** True once a receipt has collected the deposit. It never goes back. */
  depositCollected?: boolean;

  /** Notice period, if one is running. */
  noticeGivenOn?: string;
  noticeEndsOn?: string;
  onNotice?: boolean;
  welcomeSentAt?: string;
  securityDepositDue?: number;
  agreementChargeDue?: number;
}

export interface FlatCard {
  id: string;
  flatNo: string;
  floor?: string;
  notes?: string;
  gender?: FlatGender;
  rooms: RoomView[];
  totalSeats: number;
  filledSeats: number;
  vacantSeats: number;
  monthlyRentTotal: number;
  collectedThisMonth: number;
  pendingThisMonth: number;
}

export interface Receipt {
  /** Present on receipts that cover more than rent. */
  rentAmount?: number;
  depositAmount?: number;
  agreementCharge?: number;
  id: string;
  receiptNo: string;
  tenantId: string;
  tenantName: string;
  flatNo: string;
  roomName?: string;
  month: string;
  fromDate: string;
  toDate: string;
  amount: number;
  paymentMode: string;
  transactionId?: string;
  paidOn: string;
  notes?: string;
}

/** Must match Payers.ALL on the backend. */
export const PG_PAYER = 'Tridev Heights';
export const PARTNER_PAYERS = ['Anshul', 'Atul', 'Prashant'] as const;
export const EXPENSE_PAYERS = [PG_PAYER, ...PARTNER_PAYERS] as const;

/** What the partners have spent personally, kept off the PG books. */
export interface PartnerDashboard {
  month: string;
  monthLabel: string;
  isCurrentMonth: boolean;
  partners: {
    name: string;
    thisMonth: number;
    allTime: number;
    entriesThisMonth: number;
    sharePercent: number;
  }[];
  spentThisMonth: number;
  spentAllTime: number;
  entriesThisMonth: number;
  entries: Expense[];
  months: { month: string; label: string; amount: number }[];
}

export interface Expense {
  id: string;
  remark: string;
  paidBy: string;
  amount: number;
  expenseDate: string;
  month: string;
}

export interface MonthPoint {
  month: string;
  label: string;
  collected: number;
  expense: number;
  net: number;
}

export interface PendingTenant {
  id: string;
  name: string;
  flatNo: string;
  roomName: string;
  phone?: string;
  monthlyRent: number;
  /** ISO instant, absent if no reminder has gone out for this month. */
  lastReminderAt?: string;

  /** This tenant's own cycle for the current month, yyyy-MM-dd. */
  dueDate?: string;
  periodFrom?: string;
  periodTo?: string;
  /** Fee accrued so far, and rent plus that fee. */
  lateFee?: number;
  payableNow?: number;

  /** True once a receipt has collected the deposit. It never goes back. */
  depositCollected?: boolean;

  /** Notice period, if one is running. */
  noticeGivenOn?: string;
  noticeEndsOn?: string;
  onNotice?: boolean;
  welcomeSentAt?: string;
  securityDepositDue?: number;
  agreementChargeDue?: number;
}

export interface ReminderResult {
  month: string;
  monthLabel: string;
  sent: number;
  sentTo: string[];
  skipped: { name: string; reason: string }[];
}

export interface RecentExpense {
  id: string;
  remark: string;
  amount: number;
  expenseDate: string;
}

export interface DashboardSummary {
  /** The month on screen, yyyy-MM. Not always the current one. */
  month: string;
  monthLabel: string;
  isCurrentMonth: boolean;
  totalCollected: number;
  depositsThisMonth: number;
  totalDeposits: number;
  agreementThisMonth: number;
  totalAgreement: number;
  receivedThisMonth: number;
  totalReceived: number;
  totalExpense: number;
  netBalance: number;
  expectedThisMonth: number;
  collectedThisMonth: number;
  expenseThisMonth: number;
  pendingThisMonth: number;
  netThisMonth: number;
  collectionRatePercent: number;
  flatCount: number;
  totalSeats: number;
  filledSeats: number;
  vacantSeats: number;
  occupancyPercent: number;
  activeTenants: number;
  vacatedTenants: number;
  receiptsThisMonth: number;
  pendingTenants: PendingTenant[];
  recentExpenses: RecentExpense[];
  months: MonthPoint[];
}
