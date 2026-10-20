import { describe, expect, it } from 'vitest';
import { processData } from './parser';

const row = (overrides: Record<string, string> = {}) => ({
    Employee: 'Synthetic Server',
    Location: 'Bar',
    Job: 'Server',
    Date: '2026-01-12T12:00:00',
    'Time In': '10:00',
    'Time Out': '18:00',
    'Total Hours': '8',
    'Cash Tips Declared': '12.50',
    'Payable Hours': '7.5',
    ...overrides,
});

describe('processData', () => {
    it('converts a valid row into a shift and records its date', () => {
        const result = processData([row()]);

        expect(result.shifts).toHaveLength(1);
        expect(result.shifts[0]).toMatchObject({
            employeeName: 'Synthetic Server',
            job: 'Server',
            totalHours: 8,
            payableHours: 7.5,
            cashTipsDeclared: 12.5,
        });
        expect(result.dates).toEqual([result.shifts[0].dateStr]);
        expect(result.excludedShifts).toEqual([]);
    });

    it('keeps unknown roles out of included shifts with an exclusion reason', () => {
        const result = processData([row({ Job: 'Synthetic Unknown Role' })]);

        expect(result.shifts).toEqual([]);
        expect(result.excludedShifts).toHaveLength(1);
        expect(result.excludedShifts[0].reason).toContain('Unknown role');
    });

    it('reports missing required columns before processing rows', () => {
        const result = processData([{ Employee: 'Synthetic Server' }]);

        expect(result.shifts).toEqual([]);
        expect(result.errors[0]).toContain('Missing required columns');
    });
});
