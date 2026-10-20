import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ROLE_POINTS } from '../types';
import type { Shift, ExcludedShift } from '../types';

type RawRow = Record<string, unknown>;

const cellText = (row: RawRow, column: string): string => {
    const value = row[column];
    return value === 0 ? '0' : String(value || '');
};

export interface ParseResult {
    shifts: Shift[];
    excludedShifts: ExcludedShift[];
    dates: string[]; // List of unique YYYY-MM-DD dates found
    errors: string[];
}

const REQUIRED_COLUMNS = [
    "Employee",
    "Location",
    "Job",
    "Date",
    "Time In",
    "Time Out",
    "Total Hours",
    "Cash Tips Declared",
    "Payable Hours"
];

// Helper to normalize date to YYYY-MM-DD
// Input: "Jan 12, 2026"
export const normalizeDate = (dateStr: string): string => {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr; // Fallback
        // Format to YYYY-MM-DD manually to avoid timezone shifts
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return dateStr;
    }
};

export const parseFile = async (file: File): Promise<ParseResult> => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    return new Promise((resolve, reject) => {
        if (isExcel) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json<RawRow>(firstSheet, { defval: "" });
                    resolve(processData(jsonData));
                } catch {
                    reject(["Failed to parse Excel file."]);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse<RawRow>(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve(processData(results.data));
                },
                error: (err) => {
                    reject([err.message]);
                }
            });
        }
    });
};

export const processData = (data: RawRow[]): ParseResult => {
    const shifts: Shift[] = [];
    const excludedShifts: ExcludedShift[] = [];
    const errors: string[] = [];
    const datesSet = new Set<string>();

    if (data.length === 0) {
        return { shifts: [], excludedShifts: [], dates: [], errors: ["File is empty"] };
    }

    // specific validation: check if all required columns exist in the first row
    // Note: PapaParse header: true puts keys in the object. check first row keys.
    const firstRow = data[0];
    const missingColumns = REQUIRED_COLUMNS.filter(col => !(col in firstRow));
    if (missingColumns.length > 0) {
        return {
            shifts: [],
            excludedShifts: [],
            dates: [],
            errors: [`Missing required columns: ${missingColumns.join(", ")}`]
        };
    }

    data.forEach((row, index) => {
        const rowNum = index + 2; // Header is 1

        // Basic extraction
        const employee = cellText(row, "Employee").trim();
        const job = cellText(row, "Job").trim();
        const dateRaw = cellText(row, "Date").trim();

        if (!employee || !dateRaw) return; // Skip completely empty rows?

        // 1. Check Brewer
        if (job.toLowerCase().includes("brewer")) {
            excludedShifts.push({
                ...mapRowToShift(row, rowNum),
                reason: "Role 'Brewer' is always excluded"
            });
            return;
        }

        // 2. Check Role Mapping
        if (!(job in ROLE_POINTS)) {
            excludedShifts.push({
                ...mapRowToShift(row, rowNum),
                reason: `Unknown role: '${job}'`
            });
            return;
        }

        // 3. Parse Numbers
        const payableHours = parseFloat(cellText(row, "Payable Hours"));
        if (isNaN(payableHours)) {
            excludedShifts.push({
                ...mapRowToShift(row, rowNum),
                reason: `Invalid Payable Hours: '${cellText(row, "Payable Hours")}'`
            });
            return;
        }

        // Valid Row
        const date = normalizeDate(dateRaw);
        datesSet.add(date);

        shifts.push({
            id: crypto.randomUUID(),
            employeeName: employee,
            location: cellText(row, "Location"),
            job: job,
            dateStr: date, // Normalized
            timeIn: cellText(row, "Time In"),
            timeOut: cellText(row, "Time Out"),
            totalHours: parseFloat(cellText(row, "Total Hours") || "0"),
            payableHours: payableHours,
            cashTipsDeclared: parseFloat(cellText(row, "Cash Tips Declared") || "0")
        });
    });

    const sortedDates = Array.from(datesSet).sort();

    return {
        shifts,
        excludedShifts,
        dates: sortedDates,
        errors
    };
};

const mapRowToShift = (row: RawRow, index: number): Shift => {
    return {
        id: `row-${index}`,
        employeeName: cellText(row, "Employee"),
        location: cellText(row, "Location"),
        job: cellText(row, "Job"),
        dateStr: cellText(row, "Date"),
        timeIn: cellText(row, "Time In"),
        timeOut: cellText(row, "Time Out"),
        totalHours: parseFloat(cellText(row, "Total Hours") || "0"),
        payableHours: parseFloat(cellText(row, "Payable Hours") || "0"),
        cashTipsDeclared: parseFloat(cellText(row, "Cash Tips Declared") || "0")
    };
}
