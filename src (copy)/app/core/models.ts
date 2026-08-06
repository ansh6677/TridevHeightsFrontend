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

export interface Flat {
  id: string;
  flatNo: string;
  floor?: string;
  notes?: string;
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
}

export interface Occupant {
  id: string;
  name: string;
  email: string;
  phone: string;
  roomName: string;
  monthlyRent: number;
  securityDeposit?: number;
  joinDate?: string;
  status: TenantStatus;
  paidThisMonth: boolean;
  /** Absent when no receipt has gone out this month. */
  receiptNoThisMonth?: string;
}

export interface FlatCard {
  id: string;
  flatNo: string;
  floor?: string;
  notes?: string;
  rooms: RoomView[];
  totalSeats: number;
  filledSeats: number;
  vacantSeats: number;
  monthlyRentTotal: number;
  collectedThisMonth: number;
  pendingThisMonth: number;
}

export interface Receipt {
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

export interface Expense {
  id: string;
  remark: string;
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
  phone: string;
  monthlyRent: number;
}

export interface RecentExpense {
  id: string;
  remark: string;
  amount: number;
  expenseDate: string;
}

export interface DashboardSummary {
  currentMonth: string;
  currentMonthLabel: string;
  totalCollected: number;
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
