import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Users, Clock, TrendingUp, AlertCircle, Info } from 'lucide-react';

interface LineOccupancyChartProps {
  lineId: string;
  lineColor?: string;
}

interface HourlyOccupancy {
  hour: number;
  label: string;
  occupancy: number; // 0 - 100%
  isCurrent: boolean;
  statusText: string;
  color: string;
}

export const LineOccupancyChart: React.FC<LineOccupancyChartProps> = ({
  lineId,
  lineColor = '#f59e0b',
}) => {
  const currentHour = new Date().getHours();

  // Generate deterministic historical occupancy distribution per hour (06:00 to 23:00)
  const data: HourlyOccupancy[] = useMemo(() => {
    // Hash function on lineId for consistent per-line variance
    let hash = 0;
    for (let i = 0; i < lineId.length; i++) {
      hash = (hash << 5) - hash + lineId.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash) % 15;

    const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

    return hours.map((h) => {
      let base = 25;

      // Morning peak: 07h to 09h
      if (h === 7) base = 75 + (seed % 15);
      else if (h === 8) base = 88 + (seed % 10);
      else if (h === 9) base = 72 + (seed % 12);
      // Midday: 12h to 14h
      else if (h >= 12 && h <= 14) base = 52 + (seed % 15);
      // Afternoon / Evening peak: 17h to 19h
      else if (h === 17) base = 82 + (seed % 12);
      else if (h === 18) base = 90 + (seed % 8);
      else if (h === 19) base = 74 + (seed % 10);
      // Night taper
      else if (h >= 20) base = Math.max(15, 60 - (h - 19) * 14 + (seed % 8));
      // Mid-morning lull
      else if (h === 10 || h === 11) base = 42 + (seed % 10);
      // Mid-afternoon
      else if (h === 15 || h === 16) base = 58 + (seed % 12);

      const occupancy = Math.min(100, Math.max(10, Math.round(base)));
      const isCurrent = h === currentHour;

      let statusText = 'Baixa lotação';
      let color = '#10b981'; // green-500
      if (occupancy >= 80) {
        statusText = 'Muito lotado (hora de ponta)';
        color = '#ef4444'; // red-500
      } else if (occupancy >= 65) {
        statusText = 'Lotação elevada';
        color = '#f97316'; // orange-500
      } else if (occupancy >= 40) {
        statusText = 'Lotação moderada';
        color = '#f59e0b'; // amber-500
      }

      return {
        hour: h,
        label: `${String(h).padStart(2, '0')}h`,
        occupancy,
        isCurrent,
        statusText,
        color,
      };
    });
  }, [lineId, currentHour]);

  // Current hour status
  const currentData = useMemo(() => {
    return data.find((d) => d.isCurrent) || data[data.length - 1];
  }, [data]);

  return (
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-white text-xs">
          <Users className="w-4 h-4 text-amber-400" />
          <span>Lotação Histórica da Carreira</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Médias diárias</span>
      </div>

      {/* Current Hour Indicator Banner */}
      {currentData && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/70 border border-slate-700/70 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: currentData.color }}
            />
            <div>
              <span className="font-semibold text-white block">
                Agora ({currentData.label}): ~{currentData.occupancy}%
              </span>
              <span className="text-[11px] text-slate-400">{currentData.statusText}</span>
            </div>
          </div>
          <span
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full font-mono"
            style={{
              backgroundColor: `${currentData.color}25`,
              color: currentData.color,
              borderColor: `${currentData.color}50`,
            }}
          >
            {currentData.occupancy > 75 ? 'Cheio' : currentData.occupancy > 45 ? 'Médio' : 'Livre'}
          </span>
        </div>
      )}

      {/* Recharts Bar Chart */}
      <div className="h-32 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tick={{ fill: '#94a3b8', fontSize: 9 }}
              interval={1}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 9 }}
              domain={[0, 100]}
              ticks={[25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as HourlyOccupancy;
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg shadow-xl text-xs space-y-1 z-50">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {d.label} - {String(d.hour + 1).padStart(2, '0')}h
                        </span>
                        {d.isCurrent && (
                          <span className="text-[9px] bg-amber-400 text-slate-950 font-bold px-1 rounded">
                            Agora
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-slate-400">Ocupação média:</span>
                        <strong style={{ color: d.color }}>{d.occupancy}%</strong>
                      </div>
                      <div className="text-[10px] text-slate-400">{d.statusText}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="occupancy" radius={[3, 3, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isCurrent ? '#f59e0b' : entry.color}
                  opacity={entry.isCurrent ? 1 : 0.75}
                  stroke={entry.isCurrent ? '#fde68a' : 'transparent'}
                  strokeWidth={entry.isCurrent ? 1.5 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend / Tips */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-emerald-500" /> &lt;40% Livre
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-amber-500" /> 40-75% Médio
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-rose-500" /> &gt;75% Cheio
          </span>
        </div>
        <span className="flex items-center gap-1 text-amber-400 font-medium">
          <span className="w-2 h-2 rounded-xs bg-amber-400 border border-amber-200" /> Hora atual
        </span>
      </div>
    </div>
  );
};
