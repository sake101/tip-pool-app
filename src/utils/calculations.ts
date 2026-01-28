import { ROLE_POINTS } from '../types';
import type { Shift, ComputedShift, DailyCashEntry, EmployeeAllocation, ExcludedShift } from '../types';

/**
 * Calculates weighted hours for a single shift based on its role.
 */
export const calculateShiftWeights = (shift: Shift): ComputedShift => {
    const points = ROLE_POINTS[shift.job] || 0;
    const weightedHours = shift.payableHours * points;
    return {
        ...shift,
        points,
        weightedHours,
        cashAllocated: 0 // Will be filled later
    };
};

/**
 * Groups shifts by date string (YYYY-MM-DD).
 */
const groupShiftsByDate = (shifts: ComputedShift[]) => {
    const groups: Record<string, ComputedShift[]> = {};
    for (const s of shifts) {
        if (!groups[s.dateStr]) groups[s.dateStr] = [];
        groups[s.dateStr].push(s);
    }
    return groups;
};

/**
 * Core allocation logic.
 * Distributes daily cash to shifts on that day based on weighted hours.
 * Enforces penny-perfect rounding using Largest Remainder Method per date.
 */
export const allocateCash = (
    shifts: Shift[],
    dailyCashEntries: DailyCashEntry[]
): { allocations: EmployeeAllocation[], excludedShifts: ExcludedShift[], errors: string[] } => {

    // 1. Pre-calculate weights for valid shifts
    // Note: 'shifts' here are determining included shifts. 
    // We should assume 'shifts' passed here are ALREADY filtered for excluded roles 
    // (Brewer/Unknown) by the parser? 
    // The parser returns 'shifts' (valid) and 'excludedShifts'.
    // However, we should double check if points > 0 just in case.

    const computedShifts: ComputedShift[] = shifts.map(calculateShiftWeights);
    const shiftsByDate = groupShiftsByDate(computedShifts);
    const errors: string[] = [];

    // Map cash entries for easy lookup
    const cashMap: Record<string, number> = {};
    dailyCashEntries.forEach(d => cashMap[d.dateStr] = d.amount);

    // Process each date present in the shifts OR cash entries
    // We need to cover all dates that have cash, to check for orphans
    const allDates = new Set([...Object.keys(shiftsByDate), ...Object.keys(cashMap)]);

    const finalShifts: ComputedShift[] = [];

    for (const date of allDates) {
        const dayShifts = shiftsByDate[date] || [];
        const cash = cashMap[date] || 0;

        const totalWeighted = dayShifts.reduce((sum, s) => sum + s.weightedHours, 0);

        if (cash > 0 && totalWeighted === 0) {
            errors.push(`Date ${date}: Has $${cash.toFixed(2)} cash but no eligible weighted hours.`);
            continue;
        }

        if (totalWeighted === 0) {
            // No cash, no hours. Nothing to do.
            continue;
        }

        // Allocation Mode
        const rawRate = cash / totalWeighted;

        // First pass: Floor to cents
        let distributed = 0;
        const shiftsWithRemainder = dayShifts.map(s => {
            const rawAlloc = s.weightedHours * rawRate;
            const floored = Math.floor(rawAlloc * 100) / 100;
            return {
                ...s,
                cashAllocated: floored,
                remainder: rawAlloc - floored
            };
        });

        distributed = shiftsWithRemainder.reduce((sum, s) => sum + s.cashAllocated, 0);

        // Calculate cents remaining to distribute
        // Use Math.round to avoid floating point dust e.g. 0.0099999999
        let centsRemaining = Math.round((cash - distributed) * 100);

        // Sort by remainder descending
        shiftsWithRemainder.sort((a, b) => b.remainder - a.remainder);

        // Distribute cents
        for (let i = 0; i < centsRemaining; i++) {
            // Wrap around if needed (unlikely unless cents > rows, which shouldn't happen with floor)
            const index = i % shiftsWithRemainder.length;
            shiftsWithRemainder[index].cashAllocated += 0.01;
        }

        // Fix floating point precision on final result (e.g. 12.010000001)
        shiftsWithRemainder.forEach(s => {
            s.cashAllocated = Math.round(s.cashAllocated * 100) / 100;
            finalShifts.push(s); // Add to huge list
        });
    }

    // Aggregate by Employee
    const empMap: Record<string, EmployeeAllocation> = {};

    for (const s of finalShifts) {
        if (!empMap[s.employeeName]) {
            empMap[s.employeeName] = {
                employeeName: s.employeeName,
                totalPayableHours: 0,
                totalWeightedHours: 0,
                totalCashOwed: 0,
                shifts: []
            };
        }
        const emp = empMap[s.employeeName];
        emp.totalPayableHours += s.payableHours;
        emp.totalWeightedHours += s.weightedHours;
        emp.totalCashOwed += s.cashAllocated;
        emp.shifts.push(s);
    }

    // Final rounding for display? No, sum of rounded days is the truth. 
    // Just ensure totalCashOwed is clean.
    Object.values(empMap).forEach(e => {
        e.totalPayableHours = Math.round(e.totalPayableHours * 100) / 100;
        e.totalWeightedHours = Math.round(e.totalWeightedHours * 100) / 100;
        e.totalCashOwed = Math.round(e.totalCashOwed * 100) / 100;
    });

    return {
        allocations: Object.values(empMap).sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
        excludedShifts: [], // passed through or managed elsewhere
        errors
    };
};
