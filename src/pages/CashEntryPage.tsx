import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getPayPeriod, savePayPeriod } from '../db/storage';
import type { PayPeriod, DailyCashEntry } from '../types';

export const CashEntryPage: React.FC = () => {
    const navigate = useNavigate();
    const [payPeriod, setPayPeriod] = useState<PayPeriod | null>(null);
    const [cashEntries, setCashEntries] = useState<Record<string, string>>({}); // Store as string for input handling
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const id = localStorage.getItem('activePayPeriodId');
            if (!id) {
                navigate('/');
                return;
            }
            const data = await getPayPeriod(id);
            if (!data) {
                navigate('/');
                return;
            }
            setPayPeriod(data);

            // Initialize inputs
            // We need unique dates from shifts
            const uniqueDates = Array.from(new Set(data.shifts.map(s => s.dateStr))).sort();

            const initial: Record<string, string> = {};
            uniqueDates.forEach(d => initial[d] = '');

            // Pre-fill if already exists
            data.dailyCash.forEach(dc => {
                initial[dc.dateStr] = dc.amount.toString();
            });

            setCashEntries(initial);
            setIsLoading(false);
        };
        load();
    }, [navigate]);

    const handleInputChange = (date: string, value: string) => {
        // Allow valid float regex or empty
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setCashEntries(prev => ({ ...prev, [date]: value }));
        }
    };

    const handleSave = async (andContinue: boolean) => {
        if (!payPeriod) return;

        const entries: DailyCashEntry[] = Object.entries(cashEntries).map(([date, val]) => ({
            dateStr: date,
            amount: parseFloat(val) || 0
        }));

        const updated = { ...payPeriod, dailyCash: entries };
        await savePayPeriod(updated);

        if (andContinue) {
            navigate('/review');
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading pay period...</div>;
    if (!payPeriod) return null;

    const dates = Object.keys(cashEntries).sort();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Daily Cash Tips</h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        Enter the total cash tips collected for each date.
                    </p>
                </div>
                <button
                    onClick={() => setCashEntries(prev => {
                        const next = { ...prev };
                        Object.keys(next).forEach(k => next[k] = '0');
                        return next;
                    })}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    Set all to 0
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Shifts</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-48">Daily Cash Total ($)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {dates.map(date => {
                            const shiftCount = payPeriod.shifts.filter(s => s.dateStr === date).length;
                            return (
                                <tr key={date} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        {date}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {shiftCount} shifts
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                        <div className="relative rounded-md shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <span className="text-slate-500 sm:text-sm">$</span>
                                            </div>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={cashEntries[date]}
                                                onChange={(e) => handleInputChange(date, e.target.value)}
                                                className="block w-full rounded-md border-0 py-1.5 pl-7 pr-12 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between pt-4">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-slate-500 hover:text-slate-800 font-medium transition-colors px-4 py-2"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Upload
                </button>
                <button
                    onClick={() => handleSave(true)}
                    className="bg-blue-600 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold flex items-center shadow-lg shadow-blue-500/20 hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5"
                >
                    Save & Review
                    <ArrowRight className="ml-2 h-5 w-5" />
                </button>
            </div>
        </div>
    );
};
