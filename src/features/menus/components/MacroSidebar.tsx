import React from 'react';
import { Droplets } from 'lucide-react';
import { MacroSummaryCard, type MacroStats } from '@/components/nutrition/MacroSummaryCard';

export type MicronutrientStats = Record<
    string,
    { amount: number; unit: string; name: string; category: string }
>;

interface MacroSidebarProps {
    focusedMealName?: string;
    focusedStats: MacroStats;
    globalStats: MacroStats;
    focusedMicros?: MicronutrientStats;
    globalMicros?: MicronutrientStats;
}

export type { MacroStats } from '@/components/nutrition/MacroSummaryCard';

export const MacroSidebar: React.FC<MacroSidebarProps> = ({
    focusedMealName,
    focusedStats,
    globalStats,
    focusedMicros = {},
    globalMicros = {},
}) => {
    const [activeTab, setActiveTab] = React.useState<'macros' | 'micros'>('macros');

    return (
        <div className="flex w-full flex-col gap-6">
            <div className="flex rounded-2xl bg-gray-100 p-1">
                <button
                    onClick={() => setActiveTab('macros')}
                    className={`flex-1 rounded-xl py-2 text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === 'macros'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    Macros
                </button>
                <button
                    onClick={() => setActiveTab('micros')}
                    className={`flex-1 rounded-xl py-2 text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === 'micros'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    Micros
                </button>
            </div>

            {activeTab === 'macros' ? (
                <div className="grid grid-cols-2 gap-6">
                    <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/50">
                        <MacroSummaryCard
                            stats={focusedStats}
                            title="Estimacion nutricional (basada en equivalencias)"
                            subtitle={focusedMealName || 'Cargando...'}
                            showGlycemicLoad
                        />
                    </div>

                    <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/50">
                        <MacroSummaryCard
                            stats={globalStats}
                            title="Estimacion nutricional (basada en equivalencias)"
                            subtitle="Plan Completo"
                            showGlycemicLoad
                        />
                    </div>
                </div>
            ) : (
                <div className="grid max-h-[85vh] grid-cols-2 gap-6 overflow-y-auto custom-scrollbar">
                    <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-xl">
                        <h2 className="mb-1 text-lg font-black uppercase leading-none tracking-tight text-emerald-500">
                            {focusedMealName || 'Comida Actual'}
                        </h2>
                        <p className="mb-6 text-[10px] font-black uppercase leading-none tracking-widest text-gray-800">
                            Micronutrientes
                        </p>

                        {Object.keys(focusedMicros).length > 0 ? (
                            <div className="space-y-2">
                                {Object.values(focusedMicros)
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((micro) => (
                                        <div
                                            key={micro.name}
                                            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-700">
                                                    {micro.name}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                                    {micro.category}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm font-black text-emerald-600">
                                                    {micro.amount.toFixed(1)}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase text-gray-400">
                                                    {micro.unit}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-8 text-gray-300">
                                <Droplets className="h-8 w-8 opacity-50" />
                                <p className="text-center text-xs font-bold uppercase tracking-widest">
                                    Sin micronutrientes
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/50">
                        <h2 className="mb-1 text-lg font-black uppercase leading-none tracking-tight text-emerald-500">
                            Plan Completo
                        </h2>
                        <p className="mb-6 text-[10px] font-black uppercase leading-none tracking-widest text-gray-800">
                            Total Micronutrientes
                        </p>

                        {Object.keys(globalMicros).length > 0 ? (
                            <div className="space-y-2">
                                {Object.values(globalMicros)
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((micro) => (
                                        <div
                                            key={micro.name}
                                            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-700">
                                                    {micro.name}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                                    {micro.category}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm font-black text-emerald-600">
                                                    {micro.amount.toFixed(1)}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase text-gray-400">
                                                    {micro.unit}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-8 text-gray-300">
                                <Droplets className="h-8 w-8 opacity-50" />
                                <p className="text-center text-xs font-bold uppercase tracking-widest">
                                    Sin datos de micronutrientes
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
