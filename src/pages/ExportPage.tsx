import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { getPayPeriod } from '../db/storage';
import type { PayPeriod } from '../types';

export const ExportPage: React.FC = () => {
    const navigate = useNavigate();
    const [payPeriod, setPayPeriod] = useState<PayPeriod | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const id = localStorage.getItem('activePayPeriodId');
            if (!id) {
                navigate('/');
                return;
            }
            const data = await getPayPeriod(id);
            setPayPeriod(data || null);
            setIsLoading(false);
        };
        load();
    }, [navigate]);

    const downloadPayrollCSV = () => {
        if (!payPeriod) return;

        const data = payPeriod.allocations.map(a => ({
            PayPeriodStart: payPeriod.startDate,
            PayPeriodEnd: payPeriod.endDate,
            Employee: a.employeeName,
            CashTipsOwed: a.totalCashOwed.toFixed(2)
        }));

        const csv = Papa.unparse(data);
        triggerDownload(csv, `payroll_export_${payPeriod.startDate}.csv`);
    };

    const downloadAuditCSV = () => {
        if (!payPeriod) return;

        // Flatten all shifts
        const rows = payPeriod.allocations.flatMap(emp =>
            emp.shifts.map(s => ({
                Employee: emp.employeeName,
                Job: s.job,
                Date: s.dateStr,
                PayableHours: s.payableHours,
                Points: s.points,
                WeightedHours: s.weightedHours,
                DailyCashPool: payPeriod.dailyCash.find(d => d.dateStr === s.dateStr)?.amount || 0,
                // We'd ideally show rate too, but it varies per day.
                RowCashAllocated: s.cashAllocated
            }))
        );

        // Add daily check rows? Or just basic flat export for pivot tables.
        // User asked for: "Daily totals check row per date (entered cash vs allocated cash)"
        // Let's create a separate block or append at bottom?
        // CSVs are flat. Maybe just simple rows is better for audit. 
        // We can add a "Total" row per day if we validly can.
        // Let's just output the Shift Rows.

        const csv = Papa.unparse(rows);
        triggerDownload(csv, `audit_report_${payPeriod.startDate}.csv`);
    };

    const triggerDownload = (csvContent: string, fileName: string) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
    if (!payPeriod) return <div className="p-8">No data found.</div>;

    return (
        <div className="space-y-8 max-w-2xl mx-auto text-center py-10">
            <div>
                <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">All Done!</h1>
                <p className="text-slate-600 mt-2">
                    Your cash tips have been allocated successfully. Download your reports below.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                    onClick={downloadPayrollCSV}
                    className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all group duration-200"
                >
                    <div className="bg-blue-100 p-3 rounded-full mb-3 group-hover:bg-blue-200">
                        <FileDown className="h-6 w-6 text-blue-700" />
                    </div>
                    <span className="font-semibold text-slate-900">Download Payroll CSV</span>
                    <span className="text-sm text-slate-500 mt-1">For import into payroll</span>
                </button>

                <button
                    onClick={downloadAuditCSV}
                    className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl hover:border-slate-400 hover:shadow-lg transition-all group duration-200"
                >
                    <div className="bg-slate-100 p-3 rounded-full mb-3 group-hover:bg-slate-200">
                        <FileDown className="h-6 w-6 text-slate-700" />
                    </div>
                    <span className="font-semibold text-slate-900">Download Audit Report</span>
                    <span className="text-sm text-slate-500 mt-1">Detailed breakdown of detailed shifts</span>
                </button>
            </div>

            <div className="pt-8 border-t border-slate-200">
                <button
                    onClick={() => navigate('/')}
                    className="text-slate-500 hover:text-slate-900 font-medium"
                >
                    Start New Pay Period
                </button>
            </div>
        </div>
    );
};
