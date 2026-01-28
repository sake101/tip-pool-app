export interface Shift {
  id: string; // Unique ID (generated)
  employeeName: string; // "Last, First"
  location: string;
  job: string;
  dateStr: string; // "Jan 12, 2026"
  timeIn: string;
  timeOut: string;
  totalHours: number;
  payableHours: number;
  cashTipsDeclared: number;
}

export interface DailyCashEntry {
  dateStr: string; // YYYY-MM-DD or matching the input format (we need to normalize)
  amount: number;
}

export interface EmployeeAllocation {
  employeeName: string;
  totalPayableHours: number;
  totalWeightedHours: number;
  totalCashOwed: number;
  shifts: ComputedShift[];
}

export interface ComputedShift extends Shift {
  points: number;
  weightedHours: number;
  cashAllocated: number;
}

export interface PayPeriod {
  id: string;
  startDate: string;
  endDate: string;
  originalStats: {
    totalRows: number;
    totalPayableHours: number;
  };
  shifts: Shift[];
  dailyCash: DailyCashEntry[];
  allocations: EmployeeAllocation[];
  excludedShifts: ExcludedShift[];
}

export interface ExcludedShift extends Shift {
  reason: string;
}

export const ROLE_POINTS: Record<string, number> = {
  "Server": 1.0,
  "Comedy Server": 1.0,
  "Bartender": 1.0,
  "Comedy Bartender": 1.0,
  "Server Assistant": 0.5,
  "Host": 0.25,
};
