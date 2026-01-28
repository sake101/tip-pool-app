import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { getPayPeriod, savePayPeriod } from '../db/storage';
import { allocateCash } from '../utils/calculations';
import type { PayPeriod, EmployeeAllocation } from '../types';

export const ReviewPage: React.FC = () => {
    const navigate = useNavigate();
    const [payPeriod, setPayPeriod] = useState<PayPeriod | null>(null);
    const [allocations, setAllocations] = useState<EmployeeAllocation[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedEmp, setExpandedEmp] = useState<string | null>(null);

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

            // Run calculations
            const result = allocateCash(data.shifts, data.dailyCash);

            // Save results to persistence
            const updated = {
                ...data,
                allocations: result.allocations,
                // We don't overwrite excludedShifts here as parser did that, unless we want to recalc exclusions?
                // Parser exclusions are static. Calculation exclusions (if any) are distinct?
                // Actually allocateCash returns 'excludedShifts' but currently empty in implementation.
                // We'll keep parser exclusions.
            };
            await savePayPeriod(updated);

            setPayPeriod(updated);
            setAllocations(result.allocations);
            setErrors(result.errors);
            setIsLoading(false);
        };
        load();
    }, [navigate]);

    const toggleExpand = (empName: string) => {
        setExpandedEmp(expandedEmp === empName ? null : empName);
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Calculating allocations...</div>;
    if (!payPeriod) return null;

    const totalCash = allocations.reduce((sum, a) => sum + a.totalCashOwed, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Review Allocations</h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        Review distributions before exporting.
                    </p>
                </div>
                <div className="bg-emerald-50 px-6 py-4 rounded-2xl border border-emerald-100 shadow-sm">
                    <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider block mb-1">Total Distributed</span>
                    <div className="text-3xl font-bold text-emerald-700 tracking-tight">${totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
            </div>

            {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h3 className="text-red-800 font-medium flex items-center mb-2">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Calculation Errors
                    </h3>
                    <ul className="list-disc list-inside text-sm text-red-700">
                        {errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Hours</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Weighted Hours</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Cash ($)</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {allocations.map((emp) => (
                            <React.Fragment key={emp.employeeName}>
                                <tr
                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => toggleExpand(emp.employeeName)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        {emp.employeeName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {emp.totalPayableHours.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {emp.totalWeightedHours.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700 bg-green-50/50">
                                        ${emp.totalCashOwed.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-400">
                                        {expandedEmp === emp.employeeName ? <ChevronDown className="h-4 w-4 inline" /> : <ChevronRight className="h-4 w-4 inline" />}
                                    </td>
                                </tr>
                                {expandedEmp === emp.employeeName && (
                                    <tr className="bg-slate-50">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="text-xs font-medium text-slate-500 uppercase mb-2">Breakdown by Shift</div>
                                            <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                                                <thead className="bg-slate-100">
                                                    <tr>
                                                        <th className="px-4 py-2 text-xs">Date</th>
                                                        <th className="px-4 py-2 text-xs">Role</th>
                                                        <th className="px-4 py-2 text-xs">Hours</th>
                                                        <th className="px-4 py-2 text-xs">Points</th>
                                                        <th className="px-4 py-2 text-xs">Weighted</th>
                                                        <th className="px-4 py-2 text-xs">Allocated ($)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {emp.shifts.map((s, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-4 py-2 text-xs text-slate-700">{s.dateStr}</td>
                                                            <td className="px-4 py-2 text-xs text-slate-700">{s.job}</td>
                                                            <td className="px-4 py-2 text-xs text-slate-700">{s.payableHours.toFixed(2)}</td>
                                                            <td className="px-4 py-2 text-xs text-slate-700">{s.points}</td>
                                                            <td className="px-4 py-2 text-xs text-slate-700">{s.weightedHours.toFixed(2)}</td>
                                                            <td className="px-4 py-2 text-xs font-medium text-green-700">${s.cashAllocated.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between pt-4">
                <button
                    onClick={() => navigate('/cash')}
                    className="flex items-center text-slate-600 hover:text-slate-900 px-4 py-2"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Cash Entry
                </button>
                <button
                    onClick={() => navigate('/export')}
                    className="bg-blue-600 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold flex items-center shadow-lg shadow-blue-500/20 hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5"
                >
                    Continue to Export
                    <ArrowRight className="ml-2 h-5 w-5" />
                </button>
            </div>
        </div>
    );
};
