import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, AlertCircle, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { parseFile, ParseResult } from '../utils/parser';
import type { PayPeriod, ExcludedShift } from '../types';
import { savePayPeriod } from '../db/storage';

export const UploadPage: React.FC = () => {
    const navigate = useNavigate();
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<ParseResult | null>(null);

    const handleFile = async (file: File) => {

        setError(null);
        try {
            const result = await parseFile(file);
            if (result.errors.length > 0) {
                // Determine if fatal? For now, show errors and block if empty.
                if (result.shifts.length === 0) {
                    setError(result.errors.join('\n'));
                    setPreview(null);
                } else {
                    setPreview(result);
                }
            } else {
                setPreview(result);
            }
        } catch (error: unknown) {
            const message = Array.isArray(error)
                ? error.map(String).join('\n')
                : error instanceof Error
                    ? error.message
                    : typeof error === 'string'
                        ? error
                        : "Unknown error parsing file";
            setError(message);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => setIsDragging(false);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleContinue = async () => {
        if (!preview) return;

        // Create PayPeriod object
        const newPayPeriod: PayPeriod = {
            id: crypto.randomUUID(),
            startDate: preview.dates[0] || new Date().toISOString(), // Approximate
            endDate: preview.dates[preview.dates.length - 1] || new Date().toISOString(),
            originalStats: {
                totalRows: preview.shifts.length,
                totalPayableHours: preview.shifts.reduce((sum, s) => sum + s.payableHours, 0)
            },
            shifts: preview.shifts,
            dailyCash: [], // To be filled in step 2
            allocations: [], // To be filled in step 3
            excludedShifts: preview.excludedShifts
        };

        await savePayPeriod(newPayPeriod);

        // Navigate
        // Pass ID or just use latest? Let's use ID in URL if possible, or just local state.
        // For simplicity, let's assume single active session or store ID in localStorage "activePayPeriodId"
        localStorage.setItem('activePayPeriodId', newPayPeriod.id);
        navigate('/cash');
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Upload Toast Export</h1>
                <p className="text-slate-500 mt-2 text-lg">Upload the "Time Entries" CSV or Excel export from Toast to begin.</p>
            </div>

            {/* Upload Zone */}
            {!preview && (
                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`
                        border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
                        flex flex-col items-center justify-center min-h-[400px] bg-white shadow-sm hover:shadow-md
                        ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
                    `}
                    onClick={() => document.getElementById('file-input')?.click()}
                >
                    <input
                        type="file"
                        id="file-input"
                        className="hidden"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    <div className={`p-4 rounded-full mb-6 ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        <UploadCloud className={`h-10 w-10 ${isDragging ? 'text-blue-600' : 'text-slate-500'}`} />
                    </div>
                    <p className="text-xl font-semibold text-slate-900 mb-2">Drag and drop file here</p>
                    <p className="text-slate-500">or click to browse (CSV, XLSX)</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start">
                    <AlertCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                    <pre className="whitespace-pre-wrap font-sans text-sm">{error}</pre>
                </div>
            )}

            {/* Preview State */}
            {preview && (
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center border border-slate-200">
                        <div className="flex items-center space-x-3">
                            <div className="bg-green-100 p-2 rounded-full">
                                <FileSpreadsheet className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">File Processed Successfully</p>
                                <p className="text-sm text-slate-500">
                                    {preview.shifts.length} included shifts • {preview.dates.length} days found ({preview.dates[0]} to {preview.dates[preview.dates.length - 1]})
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setPreview(null)}
                            className="text-sm text-slate-600 hover:text-slate-900 underline"
                        >
                            Upload Different File
                        </button>
                    </div>

                    {preview.excludedShifts.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <h3 className="text-orange-800 font-medium flex items-center mb-2">
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                {preview.excludedShifts.length} Rows Excluded
                            </h3>
                            <div className="max-h-40 overflow-y-auto text-xs text-orange-700 space-y-1">
                                {preview.excludedShifts.slice(0, 50).map((row: ExcludedShift, i: number) => (
                                    <div key={i} className="flex justify-between">
                                        <span>{row.employeeName} ({row.job}):</span>
                                        <span className="font-medium">{row.reason}</span>
                                    </div>
                                ))}
                                {preview.excludedShifts.length > 50 && (
                                    <div className="pt-2 font-medium">...and {preview.excludedShifts.length - 50} more</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleContinue}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center shadow-sm"
                        >
                            Continue to Cash Entry
                            <CheckCircle2 className="ml-2 h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
