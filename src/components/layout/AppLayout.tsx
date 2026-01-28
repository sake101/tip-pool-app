import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Upload, DollarSign, FileCheck, Download, History } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const steps = [
    { path: '/', label: 'Upload', icon: Upload },
    { path: '/cash', label: 'Cash Entry', icon: DollarSign },
    { path: '/review', label: 'Review', icon: FileCheck },
    { path: '/export', label: 'Export', icon: Download },
    { path: '/history', label: 'History', icon: History },
];

export const AppLayout: React.FC = () => {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="font-bold text-xl text-slate-900 tracking-tight">TipPool<span className="text-blue-600">.io</span></span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <a href="https://github.com/willi-codes" target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                                By Willi Codes
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {/* Stepper */}
                <nav aria-label="Progress" className="mb-10">
                    <ol role="list" className="flex items-center">
                        {steps.map((step, stepIdx) => {
                            // Determine status: current, complete, or upcoming
                            // This is a simplified "active" check based on path.
                            // In a real app we might track "max completed step".
                            const isActive = location.pathname === step.path;
                            // For now, let's just highlight active.

                            return (
                                <li key={step.label} className={cn(stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : '', 'relative')}>
                                    {stepIdx !== steps.length - 1 && (
                                        <div className="absolute top-4 left-0 -right-8 sm:-right-20 h-0.5 bg-slate-200" aria-hidden="true"></div>
                                    )}
                                    <NavLink
                                        to={step.path}
                                        className={({ isActive }) => cn(
                                            "relative flex flex-col items-center group",
                                            isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        <span className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center border-2 bg-white z-10 transition-colors",
                                            isActive ? "border-blue-600 bg-blue-50" : "border-slate-300 group-hover:border-slate-400"
                                        )}>
                                            <step.icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-500")} />
                                        </span>
                                        <span className="mt-2 text-xs font-medium uppercase tracking-wide">{step.label}</span>
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ol>
                </nav>

                <main className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 min-h-[500px]">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
