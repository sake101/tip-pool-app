import { describe, it, expect } from 'vitest';
import { allocateCash, calculateShiftWeights } from './calculations';
import type { Shift } from '../types';

describe('Calculations', () => {

    // Helper to make dummy shifts
    const makeShift = (
        id: string,
        emp: string,
        date: string,
        job: string,
        payableHours: number
    ): Shift => ({
        id,
        employeeName: emp,
        dateStr: date,
        job,
        payableHours,
        location: 'Bar',
        timeIn: '10:00',
        timeOut: '11:00',
        totalHours: 1,
        cashTipsDeclared: 0
    });

    describe('calculateShiftWeights', () => {
        it('applies correct points', () => {
            const s1 = makeShift('1', 'A', '2026-01-01', 'Server', 10);
            const w1 = calculateShiftWeights(s1);
            expect(w1.points).toBe(1.0);
            expect(w1.weightedHours).toBe(10);

            const s2 = makeShift('2', 'B', '2026-01-01', 'Server Assistant', 10);
            const w2 = calculateShiftWeights(s2);
            expect(w2.points).toBe(0.5);
            expect(w2.weightedHours).toBe(5);
        });
    });

    describe('allocateCash', () => {
        it('allocates correctly for a simple day', () => {
            // Day 1: 100 Cash.
            // Emp A (Server): 5 hours -> 5 weighted
            // Emp B (Server): 5 hours -> 5 weighted
            // Total weighted: 10. Rate: 10.
            // A: 50, B: 50.
            const shifts = [
                makeShift('1', 'A', '2026-01-01', 'Server', 5),
                makeShift('2', 'B', '2026-01-01', 'Server', 5)
            ];
            const cash = [{ dateStr: '2026-01-01', amount: 100 }];

            const result = allocateCash(shifts, cash);
            expect(result.allocations.length).toBe(2);

            const empA = result.allocations.find(e => e.employeeName === 'A');
            expect(empA?.totalCashOwed).toBe(50);
        });

        it('handles rounding with largest remainder', () => {
            // Day 1: $100 Cash.
            // Emp A (Server): 1 hour -> 1 weighted
            // Emp B (Server): 1 hour -> 1 weighted
            // Emp C (Server): 1 hour -> 1 weighted
            // Total weighted: 3. Rate = 33.3333...
            // Raw: 33.333 each. Sum: 99.999...
            // Remaining: 0.01 (approx)
            // Should be distributed to one of them.
            // Since remainders are equal (0.333...), it picks one (stable sort or index based).
            // Result should be 33.34, 33.33, 33.33 (order depends on algo stability/index).
            // Sum must be 100.00.

            const shifts = [
                makeShift('1', 'A', '2026-01-01', 'Server', 1),
                makeShift('2', 'B', '2026-01-01', 'Server', 1),
                makeShift('3', 'C', '2026-01-01', 'Server', 1)
            ];
            const cash = [{ dateStr: '2026-01-01', amount: 100 }];

            const result = allocateCash(shifts, cash);
            const total = result.allocations.reduce((acc, curr) => acc + curr.totalCashOwed, 0);
            expect(total).toBe(100.00);

            // Check distribution
            const values = result.allocations.map(a => a.totalCashOwed).sort((a, b) => b - a);
            expect(values[0]).toBe(33.34);
            expect(values[1]).toBe(33.33);
            expect(values[2]).toBe(33.33);
        });

        it('aggregates multiple days correctly', () => {
            // Emp A: Day 1 ($50), Day 2 ($50) -> Total $100
            const shifts = [
                makeShift('1', 'A', '2026-01-01', 'Server', 5), // $50 (if total $100 and total hrs 10)
                makeShift('2', 'B', '2026-01-01', 'Server', 5), // $50
                makeShift('3', 'A', '2026-01-02', 'Server', 5), // $50
                makeShift('4', 'B', '2026-01-02', 'Server', 5)  // $50
            ];
            const cash = [
                { dateStr: '2026-01-01', amount: 100 },
                { dateStr: '2026-01-02', amount: 100 }
            ];
            const result = allocateCash(shifts, cash);
            const empA = result.allocations.find(e => e.employeeName === 'A');
            expect(empA?.totalCashOwed).toBe(100);
        });

        it('errors if cash > 0 but no hours', () => {
            const shifts: Shift[] = [];
            const cash = [{ dateStr: '2026-01-01', amount: 100 }];
            const result = allocateCash(shifts, cash);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('no eligible weighted hours');
        });
    });
});
