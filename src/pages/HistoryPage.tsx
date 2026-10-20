import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Trash2, ArrowRight, Calendar } from 'lucide-react';
import { getPayPeriods, deletePayPeriod } from '../db/storage';
import type { PayPeriod } from '../types';

export const HistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        void getPayPeriods().then((data) => {
            if (!active) return;
            setPayPeriods(data);
            setIsLoading(false);
        });
        return () => {
            active = false;
        };
    }, []);

    const handleLoad = (id: string) => {
        localStorage.setItem('activePayPeriodId', id);
        navigate('/review');
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this pay period?')) {
            await deletePayPeriod(id);
            setIsLoading(true);
            const data = await getPayPeriods();
            setPayPeriods(data);
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading history...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Payroll History</h1>
                    <p className="text-slate-600 mt-1">View and manage previously saved payroll allocations.</p>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
                >
                    New Upload
                </button>
            </div>

            {payPeriods.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No saved payrolls found.</p>
                    <p className="text-sm text-slate-400">Upload a file to get started.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {payPeriods.map((pp) => (
                        <div
                            key={pp.id}
                            className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => handleLoad(pp.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
                                        <Calendar className="h-6 w-6 text-blue-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 text-lg">
                                            {pp.startDate} <span className="text-slate-400 mx-1">to</span> {pp.endDate}
                                        </h3>
                                        <div className="flex items-center text-sm text-slate-500 mt-1 space-x-4">
                                            <span>{pp.originalStats.totalRows} shifts</span>
                                            <span>•</span>
                                            <span>{pp.allocations.length} employees</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={(e) => handleDelete(e, pp.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                    <div className="bg-slate-50 px-3 py-1.5 rounded-md flex items-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                                        <span className="text-sm font-medium mr-2">Load</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
