import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrders } from '../hooks/useOrders';
import { useFilaments } from '../hooks/useFilaments';
import { usePrinters } from '../hooks/usePrinters';
import { useAuth } from '../hooks/useAuth';

// ============ Utility Functions ============

/**
 * Функция расчета прогноза прибыли на текущий месяц
 * Использует метод простого среднего скользящего окна (SMA) на основе последних 3 месяцев
 * 
 * Обоснование:
 * 1. SMA учитывает тренд без слишком большого отставания от текущих данных
 * 2. Для краткосрочного прогноза достаточно 3 месяцев (баланс между гладкостью и актуальностью)
 * 3. Предполагаем, что текущий месяц не завершен, поэтому прогноз экстраполирует имеющиеся данные
 */
const forecastMonthProfit = (monthlyProfits: number[]): number => {
  if (monthlyProfits.length === 0) return 0;
  if (monthlyProfits.length === 1) return monthlyProfits[0];
  
  // Берем последние 3 месяца для расчета SMA
  const sampleSize = Math.min(3, monthlyProfits.length);
  const lastMonths = monthlyProfits.slice(-sampleSize);
  const avgProfit = lastMonths.reduce((a, b) => a + b, 0) / sampleSize;
  
  // Если есть текущий месяц (неполный), считаем среднее в день
  const currentMonth = monthlyProfits[monthlyProfits.length - 1];
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const today = new Date().getDate();
  const projectedCurrent = (currentMonth / today) * daysInMonth;
  
  // Взвешенное среднее: 60% от среднего прибыльного месяца, 40% от проекции текущего
  return avgProfit * 0.6 + projectedCurrent * 0.4;
};

/**
 * Mock данные по прибыли за последние 5 месяцев (до текущего)
 * Используется для исторического тренда
 */
const getMockProfitData = (): { month: string; profit: number }[] => {
  const months = ['Май', 'Июнь', 'Июль', 'Август', 'Сентябрь'];
  
  // Генерируем реалистичные данные в диапазоне 5-15k с небольшой вариацией
  const baseProfits = [8500, 11200, 13900, 10800, 9500];
  
  return months.map((month, idx) => ({
    month,
    profit: baseProfits[idx]
  }));
};

// Chart component using SVG (no external library needed)
const PieChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-center text-gray-500">No data</div>;

  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const startAngle = angle;
    const endAngle = angle + sliceAngle;
    angle = endAngle;

    const radius = 80;
    const startX = 100 + radius * Math.cos(startAngle);
    const startY = 100 + radius * Math.sin(startAngle);
    const endX = 100 + radius * Math.cos(endAngle);
    const endY = 100 + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const path = `M 100 100 L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;

    return (
      <path key={i} d={path} fill={d.color} stroke="white" strokeWidth="2" />
    );
  });

  return (
    <div className="flex items-center gap-4">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {slices}
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-gray-700">
              {d.label}: {d.value} ({((d.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BarChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700 font-medium">{d.label}</span>
            <span className="text-gray-600">{d.value.toFixed(2)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: d.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const LineChart: React.FC<{ 
  data: { label: string; value: number; color: string; isForecast?: boolean }[] 
}> = ({ data }) => {
  if (data.length === 0) return <div className="text-center text-gray-500">No data</div>;

  const max = Math.max(...data.map(d => d.value), 1);
  const padding = 50;
  const width = 1200;
  const height = 350;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1 || 1)) * chartWidth,
    y: height - padding - (d.value / max) * chartHeight,
    ...d,
  }));

  // Разделяем на исторические и прогнозные точки
  const lastHistoricalIdx = points.findIndex(p => p.isForecast);
  const historicalPoints = lastHistoricalIdx === -1 ? points : points.slice(0, lastHistoricalIdx);
  const forecastPoints = lastHistoricalIdx === -1 ? [] : points.slice(lastHistoricalIdx - 1);

  // Путь для исторических данных (сплошная линия)
  const historyPathD = historicalPoints.length > 0 
    ? historicalPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  // Путь для прогноза (пунктирная линия)
  const forecastPathD = forecastPoints.length > 1 
    ? forecastPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  // Y-axis labels (значения)
  const yLabels: number[] = [];
  for (let i = 0; i <= 4; i++) {
    yLabels.push((max * (4 - i)) / 4);
  }

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="border border-gray-300 rounded">
        {/* Grid lines */}
        {[...Array(5)].map((_, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={padding}
              y1={padding + (i * chartHeight) / 4}
              x2={width - padding}
              y2={padding + (i * chartHeight) / 4}
              stroke="#e5e7eb"
              strokeDasharray="4"
            />
            {/* Y-axis labels */}
            <text
              x={padding - 10}
              y={padding + (i * chartHeight) / 4 + 4}
              textAnchor="end"
              className="text-xs fill-gray-500"
            >
              {Math.round(yLabels[i])}
            </text>
          </g>
        ))}

        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" strokeWidth="2" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" strokeWidth="2" />

        {/* Historical Path (solid) */}
        {historyPathD && (
          <path d={historyPathD} stroke="#ef4444" strokeWidth="2" fill="none" />
        )}

        {/* Forecast Path (dashed) */}
        {forecastPathD && (
          <path d={forecastPathD} stroke="#fbbf24" strokeWidth="2" fill="none" strokeDasharray="5,5" />
        )}

        {/* Points with values */}
        {points.map((p, i) => (
          <g key={`point-${i}`}>
            <circle 
              cx={p.x} 
              cy={p.y} 
              r="5" 
              fill={p.isForecast ? '#fbbf24' : p.color} 
              stroke="white" 
              strokeWidth="2" 
            />
            {/* Value label above point */}
            <text
              x={p.x}
              y={p.y - 15}
              textAnchor="middle"
              className="text-xs font-semibold fill-gray-700"
            >
              {Math.round(p.value)}
            </text>
          </g>
        ))}

        {/* Month Labels */}
        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={p.x}
            y={height - padding + 20}
            textAnchor="middle"
            className="text-xs fill-gray-600"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

export const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const { isAdmin, isAnalyst } = useAuth();
  const { orders, orderStatuses, loading: ordersLoading } = useOrders();
  const { filaments, loading: filamentsLoading } = useFilaments();
  const { printers, loading: printersLoading } = usePrinters();

  // Allow all authenticated users to view analytics
  // Full metrics only for Admin, basic for others

  // Orders by status (pie chart)
  const ordersByStatus = useMemo(() => {
    const statusMap = new Map<number, number>();
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    orders.forEach(order => {
      const statusId = order.statusId || 0;
      statusMap.set(statusId, (statusMap.get(statusId) || 0) + 1);
    });

    const result: { label: string; value: number; color: string }[] = [];
    let colorIdx = 0;

    statusMap.forEach((count, statusId) => {
      const status = orderStatuses.find(s => s.id === statusId);
      result.push({
        label: status?.description || `Status ${statusId}`,
        value: count,
        color: colors[colorIdx % colors.length],
      });
      colorIdx++;
    });

    return result;
  }, [orders, orderStatuses]);

  // Filaments by residue (bar chart)
  const filamentsByResidue = useMemo(() => {
    const colors = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'];
    return filaments
      .sort((a, b) => b.residue - a.residue)
      .slice(0, 5)
      .map((f, i) => ({
        label: f.color || `Filament ${f.id}`,
        value: f.residue,
        color: colors[i % colors.length],
      }));
  }, [filaments]);

  // Monthly profit data (line chart - 5 months historical + current month + forecast)
  const profitData = useMemo(() => {
    // Исторические данные (5 месяцев)
    const mockData = getMockProfitData();
    
    // Считаем текущий месяц из реальных завершенных заказов
    const now = new Date();
    const currentMonthCompleted = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      const statusName = orderStatuses.find(s => s.id === o.statusId)?.description?.toLowerCase() || '';
      const isCompleted = statusName.includes('завершён') || statusName.includes('завершено') || statusName.includes('completed');
      return isCompleted && orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    });
    
    const currentMonthRevenue = currentMonthCompleted.reduce((sum, o) => sum + o.totalPrice, 0);
    const currentMonthProfit = currentMonthRevenue * 0.25; // 25% маржа
    
    // Прогноз на следующий месяц (на основе SMA)
    const allHistoricalProfits = [...mockData.map(d => d.profit), currentMonthProfit];
    const forecastedProfit = forecastMonthProfit(allHistoricalProfits);
    
    // Формируем данные для графика
    const chartData = [
      ...mockData.map(d => ({
        label: d.month,
        value: d.profit,
        color: '#ef4444',
        isForecast: false
      })),
      {
        label: 'Октябрь (текущий)',
        value: currentMonthProfit,
        color: '#ef4444',
        isForecast: false
      },
      {
        label: 'Ноябрь (прогноз)',
        value: forecastedProfit,
        color: '#fbbf24',
        isForecast: true
      }
    ];
    
    return chartData;
  }, [orders, orderStatuses]);

  // Metrics for Admin only
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => {
      const statusName = orderStatuses.find(s => s.id === o.statusId)?.description?.toLowerCase() || '';
      return statusName.includes('завершён') || statusName.includes('завершено') || statusName.includes('completed');
    }).length;

    const totalSpentFilament = filaments.reduce((sum, f) => sum + (Number(f.residue) || 0), 0) / 1000;
    const activePrinters = printers.filter(p => p.isActive).length;

    const avgOrderPrice = totalOrders > 0 ? orders.reduce((sum, o) => sum + o.totalPrice, 0) / totalOrders : 0;
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    
    // Расчет прибыли (маржа 25% от всех завершенных заказов)
    const totalProfit = completedOrders > 0 ? (totalRevenue * 0.25) : 0;
    const avgProfitPerOrder = completedOrders > 0 ? totalProfit / completedOrders : 0;
    
    // Считаем текущий месяц из реальных данных
    const now = new Date();
    const currentMonthCompleted = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      const statusName = orderStatuses.find(s => s.id === o.statusId)?.description?.toLowerCase() || '';
      const isCompleted = statusName.includes('завершён') || statusName.includes('завершено') || statusName.includes('completed');
      return isCompleted && orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    });
    
    const currentMonthRevenue = currentMonthCompleted.reduce((sum, o) => sum + o.totalPrice, 0);
    const currentMonthProfit = currentMonthRevenue * 0.25;
    
    // Прогноз на следующий месяц
    const mockProfitDataMonth = getMockProfitData();
    const allHistoricalProfits = [...mockProfitDataMonth.map(d => d.profit), currentMonthProfit];
    const forecastedProfit = forecastMonthProfit(allHistoricalProfits);

    return {
      totalOrders,
      completedOrders,
      completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0,
      totalSpentFilament: totalSpentFilament.toFixed(2),
      activePrinters,
      avgOrderPrice: avgOrderPrice.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      avgProfitPerOrder: avgProfitPerOrder.toFixed(2),
      currentMonthProfit: currentMonthProfit.toFixed(2),
      forecastedProfit: forecastedProfit.toFixed(2),
    };
  }, [orders, orderStatuses, filaments, printers]);

  const loading = ordersLoading || filamentsLoading || printersLoading;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('analytics.title') || 'Analytics'}</h1>

      {/* Metrics (Admin only) */}
      {isAdmin && (
        <div>
          {/* Primary Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="text-blue-600 text-sm font-medium mb-1">{t('analytics.totalOrders') || 'Total Orders'}</div>
              <div className="text-3xl font-bold text-blue-900">{loading ? '...' : metrics.totalOrders}</div>
              <div className="text-xs text-blue-600 mt-2">Всего заказов в системе</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="text-green-600 text-sm font-medium mb-1">{t('analytics.completedOrders') || 'Completed'}</div>
              <div className="flex justify-between items-end">
                <div className="text-3xl font-bold text-green-900">{loading ? '...' : metrics.completedOrders}</div>
                <div className="text-sm text-green-700">{metrics.completionRate}%</div>
              </div>
              <div className="text-xs text-green-600 mt-2">Готово к сдаче</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <div className="text-purple-600 text-sm font-medium mb-1">{t('analytics.avgPrice') || 'Avg Order Price'}</div>
              <div className="text-3xl font-bold text-purple-900">{loading ? '...' : `${metrics.avgOrderPrice}`}</div>
              <div className="text-xs text-purple-600 mt-2">BYN за заказ</div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6 border border-amber-200">
              <div className="text-amber-600 text-sm font-medium mb-1">{t('analytics.filamentUsed') || 'Filament Used'}</div>
              <div className="text-3xl font-bold text-amber-900">{loading ? '...' : `${metrics.totalSpentFilament}`}</div>
              <div className="text-xs text-amber-600 mt-2">кг остатка</div>
            </div>
          </div>

          {/* Revenue & Profit Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border border-indigo-200">
              <div className="text-indigo-600 text-sm font-medium mb-1">Активные принтеры</div>
              <div className="text-3xl font-bold text-indigo-900">{loading ? '...' : metrics.activePrinters}</div>
              <div className="text-xs text-indigo-600 mt-2">Готовы к работе</div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg p-6 border border-rose-200">
              <div className="text-rose-600 text-sm font-medium mb-1">Общая выручка</div>
              <div className="text-3xl font-bold text-rose-900">{loading ? '...' : `${metrics.totalRevenue}`}</div>
              <div className="text-xs text-rose-600 mt-2">BYN всего</div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
              <div className="text-red-600 text-sm font-medium mb-1">Общая прибыль</div>
              <div className="text-3xl font-bold text-red-900">{loading ? '...' : `${metrics.totalProfit}`}</div>
              <div className="text-xs text-red-600 mt-2">Примерно 25% от выручки</div>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-6 border border-cyan-200">
              <div className="text-cyan-600 text-sm font-medium mb-1">Прибыль/заказ</div>
              <div className="text-3xl font-bold text-cyan-900">{loading ? '...' : `${metrics.avgProfitPerOrder}`}</div>
              <div className="text-xs text-cyan-600 mt-2">BYN на завершенный</div>
            </div>
          </div>

          {/* Forecast Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
              <div className="text-orange-600 text-sm font-medium mb-1">Прибыль этот месяц (текущие данные)</div>
              <div className="text-3xl font-bold text-orange-900">{loading ? '...' : `${metrics.currentMonthProfit}`}</div>
              <div className="text-xs text-orange-600 mt-2">BYN до {new Date().getDate()} числа</div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-6 border border-teal-200">
              <div className="text-teal-600 text-sm font-medium mb-1">Прогноз на месяц (SMA метод)</div>
              <div className="text-3xl font-bold text-teal-900">{loading ? '...' : `${metrics.forecastedProfit}`}</div>
              <div className="text-xs text-teal-600 mt-2">Расчет на основе последних 3 мес</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            {t('analytics.ordersByStatus') || 'Orders by Status'}
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <PieChart data={ordersByStatus} />
          )}
        </div>

        {/* Top filaments by residue */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            {t('analytics.topFilaments') || 'Top 5 Filaments by Residue'}
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <BarChart data={filamentsByResidue} />
          )}
        </div>

        {/* Profit by month (last 6 months + forecast) */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            Прибыль по месяцам (6 месяцев + прогноз)
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="flex gap-6">
              <div className="flex-1">
                <LineChart data={profitData} />
              </div>
              <div className="w-64 flex-shrink-0">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800 h-full">
                  <strong>📊 Методология прогноза:</strong>
                  <p className="mt-2 text-xs leading-relaxed">
                    Используется простое скользящее среднее (SMA) за последние 3 месяца.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed">
                    Для текущего месяца прогноз экстраполирует уже имеющиеся данные с весом 60%, и 40% влияния от проекции завершения месяца.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed">
                    Это дает баланс между стабильностью и реактивностью на текущие тренды.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info for Analyst about data limitations */}
      {isAnalyst && !isAdmin && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            {t('analytics.analystNote') || '💡 Tip: As an Analyst, you have access to production metrics. Sensitive financial data is hidden.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Analytics;
