const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo, useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, ShoppingBag, Lock, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import moment from 'moment';

const ADMIN_PASSWORD = '7777';
const VIEWS = ['日', '月', '年'];

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-accent">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function Revenue() {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [view, setView] = useState('日');

  // Date range filter
  const todayStr = moment().utcOffset('+08:00').format('YYYY-MM-DD');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const { data: orders = [] } = useQuery({
    queryKey: ['orders-revenue'],
    queryFn: () => db.entities.Order.list('-created_date', 500),
    refetchInterval: 30000,
  });

  // Only completed/non-cancelled orders count toward revenue
  const validOrders = useMemo(
    () => orders.filter(o => o.status !== 'cancelled'),
    [orders]
  );

  // Date range filtered orders (for stat cards + export)
  const rangeOrders = useMemo(() => {
    if (!rangeStart && !rangeEnd) return validOrders;
    return validOrders.filter(o => {
      const d = moment(o.created_date).utcOffset('+08:00').format('YYYY-MM-DD');
      if (rangeStart && d < rangeStart) return false;
      if (rangeEnd && d > rangeEnd) return false;
      return true;
    });
  }, [validOrders, rangeStart, rangeEnd]);

  const hasRangeFilter = !!(rangeStart || rangeEnd);
  const displayOrders = hasRangeFilter ? rangeOrders : validOrders;

  const chartData = useMemo(() => {
    if (view === '日') {
      // Last 14 days
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = moment().subtract(i, 'days').format('MM/DD');
        const dayOrders = validOrders.filter(o =>
          moment(o.created_date).format('MM/DD') === d
        );
        days.push({
          label: d,
          revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
          count: dayOrders.length,
        });
      }
      return days;
    } else if (view === '月') {
      // Last 12 months
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const m = moment().subtract(i, 'months').format('YYYY/MM');
        const mOrders = validOrders.filter(o =>
          moment(o.created_date).format('YYYY/MM') === m
        );
        months.push({
          label: moment().subtract(i, 'months').format('MM月'),
          revenue: mOrders.reduce((s, o) => s + (o.total || 0), 0),
          count: mOrders.length,
        });
      }
      return months;
    } else {
      // Last 3 years
      const years = [];
      for (let i = 2; i >= 0; i--) {
        const y = moment().subtract(i, 'years').format('YYYY');
        const yOrders = validOrders.filter(o =>
          moment(o.created_date).format('YYYY') === y
        );
        years.push({
          label: y + '年',
          revenue: yOrders.reduce((s, o) => s + (o.total || 0), 0),
          count: yOrders.length,
        });
      }
      return years;
    }
  }, [validOrders, view]);

  const todayRevenue = useMemo(() =>
    validOrders
      .filter(o => moment(o.created_date).isSame(moment(), 'day'))
      .reduce((s, o) => s + (o.total || 0), 0),
    [validOrders]
  );

  const todayCount = useMemo(() =>
    validOrders.filter(o => moment(o.created_date).isSame(moment(), 'day')).length,
    [validOrders]
  );

  const monthRevenue = useMemo(() =>
    validOrders
      .filter(o => moment(o.created_date).isSame(moment(), 'month'))
      .reduce((s, o) => s + (o.total || 0), 0),
    [validOrders]
  );

  const totalRevenue = useMemo(() =>
    displayOrders.reduce((s, o) => s + (o.total || 0), 0),
    [displayOrders]
  );

  const avgOrder = useMemo(() =>
    displayOrders.length > 0 ? Math.round(totalRevenue / displayOrders.length) : 0,
    [displayOrders, totalRevenue]
  );

  const exportExcel = () => {
    // Build CSV content (Excel can open CSV)
    const twFmt = (d) => moment(d).utcOffset('+08:00').format('YYYY-MM-DD HH:mm');
    const rows = [
      ['訂單編號', '桌號', '時間', '餐點', '加料', '狀態', '金額'],
      ...displayOrders.map(o => [
        o.id?.slice(0, 8),
        o.table_no === 0 ? '外帶' : `桌${o.table_no}`,
        twFmt(o.created_date),
        o.items?.map(i => `${i.name}${i.quantity > 1 ? `x${i.quantity}` : ''}`).join(' / ') || '',
        o.addons?.map(a => a.name).join(' / ') || '',
        { pending:'待處理', preparing:'製作中', ready:'可取餐', completed:'已完成', cancelled:'已取消' }[o.status] || o.status,
        o.total,
      ])
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `豆花小町訂單_${moment().format('YYYYMMDD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm shadow-lg space-y-5 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">營收報表</h2>
            <p className="text-sm text-muted-foreground mt-1">請輸入管理密碼</p>
          </div>
          <Input
            type="password"
            placeholder="密碼"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (input === ADMIN_PASSWORD) setUnlocked(true);
                else setError(true);
              }
            }}
            className={`text-center text-lg tracking-widest ${error ? 'border-destructive' : ''}`}
          />
          {error && <p className="text-sm text-destructive">密碼錯誤，請再試一次</p>}
          <Button className="w-full" onClick={() => {
            if (input === ADMIN_PASSWORD) setUnlocked(true);
            else setError(true);
          }}>進入</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted-foreground/10 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">營收報表</h1>
              <p className="text-xs text-muted-foreground">每30秒自動更新</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={exportExcel} className="rounded-xl">
              <Download className="w-4 h-4 mr-1" /> 匯出 Excel
            </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Date range filter */}
        <div className="bg-card border border-border rounded-xl px-5 py-4 space-y-3">
          <p className="text-sm font-semibold">篩選日期區間</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">從</span>
              <input
                type="date"
                value={rangeStart}
                max={rangeEnd || todayStr}
                onChange={e => setRangeStart(e.target.value)}
                className="h-8 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">到</span>
              <input
                type="date"
                value={rangeEnd}
                min={rangeStart || undefined}
                max={todayStr}
                onChange={e => setRangeEnd(e.target.value)}
                className="h-8 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {hasRangeFilter && (
              <button
                onClick={() => { setRangeStart(''); setRangeEnd(''); }}
                className="text-xs text-destructive hover:underline"
              >
                清除篩選
              </button>
            )}
          </div>
          {hasRangeFilter && (
            <p className="text-xs text-muted-foreground">
              共 {rangeOrders.length} 筆訂單 · 總營收 <span className="font-semibold text-accent">${totalRevenue}</span>
            </p>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="今日營收" value={`$${todayRevenue}`} sub={`${todayCount} 筆訂單`} />
          <StatCard label="本月營收" value={`$${monthRevenue}`} />
          <StatCard label={hasRangeFilter ? '區間總營收' : '累計總營收'} value={`$${totalRevenue}`} sub={hasRangeFilter ? `${rangeOrders.length} 筆` : undefined} />
          <StatCard label="平均客單價" value={`$${avgOrder}`} sub={`共 ${displayOrders.length} 筆`} />
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">營收趨勢</h2>
            <div className="flex gap-1">
              {VIEWS.map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    view === v
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted-foreground/15'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={view === '年' ? 40 : 20}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`$${v}`, '營收']}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order count chart */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm">訂單數量趨勢</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={view === '年' ? 40 : 20}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [v, '筆數']}
              />
              <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly heatmap */}
        <HourlyHeatmap orders={validOrders} />
      </div>
    </div>
  );
}

function HourlyHeatmap({ orders }) {
  const data = useMemo(() => {
    const counts = Array(24).fill(0);
    orders.forEach(o => {
      const h = moment(o.created_date).utcOffset('+08:00').hour();
      counts[h]++;
    });
    const max = Math.max(...counts, 1);
    return counts.map((count, h) => ({ hour: h, count, pct: count / max }));
  }, [orders]);

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-sm">尖峰時段分析</h2>
        <p className="text-xs text-muted-foreground mt-0.5">24小時訂單量分佈</p>
      </div>
      <div className="grid grid-cols-12 gap-1.5">
        {data.map(({ hour, count, pct }) => (
          <div key={hour} className="flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end" style={{ height: 60 }}>
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${Math.max(pct * 100, count > 0 ? 8 : 2)}%`,
                  background: pct > 0.7
                    ? 'hsl(var(--destructive))'
                    : pct > 0.4
                      ? 'hsl(var(--accent))'
                      : 'hsl(var(--primary))',
                  opacity: count === 0 ? 0.15 : 0.7 + pct * 0.3,
                }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground leading-none">{hour}</span>
            {count > 0 && <span className="text-[9px] font-semibold text-foreground leading-none">{count}</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary/70 inline-block" />低峰</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-accent/70 inline-block" />中峰</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive/70 inline-block" />高峰</span>
      </div>
    </div>
  );
}