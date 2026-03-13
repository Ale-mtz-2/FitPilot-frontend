import { Droplets, Pizza, Wheat } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export interface MacroStats {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    glycemicLoad?: number;
}

type MacroSummaryCardProps = {
    stats: MacroStats;
    title: string;
    subtitle: string;
    className?: string;
    showFiber?: boolean;
    showGlycemicLoad?: boolean;
};

const MACRO_COLORS = {
    protein: '#ff5c5c',
    carbs: '#3b82f6',
    fat: '#fb923c',
} as const;

function getMacroBreakdown(stats: MacroStats) {
    return [
        {
            key: 'protein',
            label: 'PROTEINA',
            value: stats.protein * 4,
            grams: stats.protein,
            color: MACRO_COLORS.protein,
            icon: Pizza,
        },
        {
            key: 'carbs',
            label: 'CARBS',
            value: stats.carbs * 4,
            grams: stats.carbs,
            color: MACRO_COLORS.carbs,
            icon: Wheat,
        },
        {
            key: 'fat',
            label: 'GRASAS',
            value: stats.fat * 9,
            grams: stats.fat,
            color: MACRO_COLORS.fat,
            icon: Droplets,
        },
    ];
}

export function MacroSummaryCard({
    stats,
    title,
    subtitle,
    className,
    showFiber = true,
    showGlycemicLoad = false,
}: MacroSummaryCardProps) {
    const macroBreakdown = getMacroBreakdown(stats);
    const chartData = macroBreakdown.filter((item) => item.value > 0);
    const totalKcal = stats.calories || stats.protein * 4 + stats.carbs * 4 + stats.fat * 9 || 1;

    return (
        <div className={className}>
            <div className="space-y-4">
                <div className="space-y-0.5 px-2">
                    <h2 className="text-lg font-black uppercase leading-none tracking-tight text-emerald-500">
                        {subtitle}
                    </h2>
                    <p className="text-[10px] font-black uppercase leading-none tracking-widest text-gray-800">
                        {title}
                    </p>
                </div>

                <div className="relative flex h-48 w-full items-center justify-center">
                    <div className="relative h-40 w-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={0}
                                    dataKey="value"
                                    stroke="none"
                                    startAngle={90}
                                    endAngle={450}
                                >
                                    {chartData.map((entry) => (
                                        <Cell key={entry.key} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black leading-none text-gray-900">
                                {stats.calories.toFixed(0)}
                            </span>
                            <span className="mt-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
                                KCAL
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    {macroBreakdown.map((item) => {
                        const Icon = item.icon;
                        const percentage = (item.value / totalKcal) * 100;

                        return (
                            <div
                                key={item.key}
                                className="flex flex-col gap-2 rounded-xl border border-gray-50 bg-[#f8fafc] p-3 shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-white p-1.5 text-gray-400 shadow-sm">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-tight text-gray-600">
                                            {item.label}
                                        </span>
                                    </div>
                                    <span className="text-xs font-black text-gray-900">
                                        {item.grams.toFixed(1)}g
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, percentage)}%`,
                                                backgroundColor: item.color,
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <span className="text-[8px] font-black text-gray-400">
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {showFiber ? (
                        <div className="flex flex-col gap-2 rounded-xl border border-gray-50 bg-[#f8fafc] p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-white p-1.5 text-gray-400 shadow-sm">
                                        <Wheat className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-tight text-gray-600">
                                        FIBRA
                                    </span>
                                </div>
                                <span className="text-xs font-black text-gray-900">
                                    {(stats.fiber || 0).toFixed(1)}g
                                </span>
                            </div>
                        </div>
                    ) : null}

                    {showGlycemicLoad && stats.glycemicLoad !== undefined ? (
                        <div className="flex flex-col gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-tight text-emerald-800">
                                    Carga Glucemica
                                </span>
                                <span className="text-lg font-black text-emerald-600">
                                    {stats.glycemicLoad.toFixed(1)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div
                                    className={`h-1.5 flex-1 rounded-full ${
                                        stats.glycemicLoad < 10 ? 'bg-emerald-400' : 'bg-emerald-200'
                                    }`}
                                />
                                <div
                                    className={`h-1.5 flex-1 rounded-full ${
                                        stats.glycemicLoad >= 10 && stats.glycemicLoad < 20
                                            ? 'bg-yellow-400'
                                            : 'bg-yellow-200'
                                    }`}
                                />
                                <div
                                    className={`h-1.5 flex-1 rounded-full ${
                                        stats.glycemicLoad >= 20 ? 'bg-red-400' : 'bg-red-200'
                                    }`}
                                />
                            </div>
                            <div className="flex justify-between text-[8px] font-bold uppercase text-gray-400">
                                <span>Baja</span>
                                <span>Media</span>
                                <span>Alta</span>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
