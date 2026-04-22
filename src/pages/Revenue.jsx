const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, ShoppingBag, Lock } from 'lucide-react';
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
    validOrders.reduce((s, o) => s + (o.total || 0), 0),
    [validOrders]
  );

  const avgOrder = useMemo(() =>
    validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0,
    [validOrders, totalRevenue]
  );

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
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="今日營收" value={`$${todayRevenue}`} sub={`${todayCount} 筆訂單`} />
          <StatCard label="本月營收" value={`$${monthRevenue}`} />
          <StatCard label="累計總營收" value={`$${totalRevenue}`} />
          <StatCard label="平均客單價" value={`$${avgOrder}`} sub={`共 ${validOrders.length} 筆`} />
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
      </div>
    </div>
  );
}