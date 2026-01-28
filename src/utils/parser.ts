import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ROLE_POINTS } from '../types';
import type { Shift, ExcludedShift } from '../types';

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
    } catch (e) {
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
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
                    resolve(processData(jsonData));
                } catch (err) {
                    reject(["Failed to parse Excel file."]);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
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

const processData = (data: any[]): ParseResult => {
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
        const employee = String(row["Employee"] || "").trim();
        const job = String(row["Job"] || "").trim();
        const dateRaw = String(row["Date"] || "").trim();

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
        const payableHours = parseFloat(row["Payable Hours"]);
        if (isNaN(payableHours)) {
            excludedShifts.push({
                ...mapRowToShift(row, rowNum),
                reason: `Invalid Payable Hours: '${row["Payable Hours"]}'`
            });
            return;
        }

        // Valid Row
        const date = normalizeDate(dateRaw);
        datesSet.add(date);

        shifts.push({
            id: crypto.randomUUID(),
            employeeName: employee,
            location: String(row["Location"] || ""),
            job: job,
            dateStr: date, // Normalized
            timeIn: String(row["Time In"] || ""),
            timeOut: String(row["Time Out"] || ""),
            totalHours: parseFloat(row["Total Hours"] || "0"),
            payableHours: payableHours,
            cashTipsDeclared: parseFloat(row["Cash Tips Declared"] || "0")
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

const mapRowToShift = (row: any, index: number): any => {
    return {
        id: `row-${index}`,
        employeeName: String(row["Employee"] || ""),
        location: String(row["Location"] || ""),
        job: String(row["Job"] || ""),
        dateStr: String(row["Date"] || ""),
        timeIn: String(row["Time In"] || ""),
        timeOut: String(row["Time Out"] || ""),
        totalHours: parseFloat(row["Total Hours"] || "0"),
        payableHours: parseFloat(row["Payable Hours"] || "0"),
        cashTipsDeclared: parseFloat(row["Cash Tips Declared"] || "0")
    };
}
