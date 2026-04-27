const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo, useEffect, useRef } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Pencil, Trash2, Eraser, Lock, TrendingUp, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import moment from 'moment';
import EditOrderDialog from '@/components/admin/EditOrderDialog';
import ItemAvailabilityPanel from '@/components/admin/ItemAvailabilityPanel';

const ADMIN_PASSWORD = '7777';

const statusConfig = {
  pending:   { label: '待處理', color: 'bg-accent/15 text-accent border-accent/20' },
  preparing: { label: '製作中', color: 'bg-primary/10 text-primary border-primary/20' },
  ready:     { label: '可取餐', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  completed: { label: '已完成', color: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: '已取消', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

// Parse Taiwan time correctly
const twFormat = (date, fmt) => moment.utc(date).utcOffset('+08:00').format(fmt);
const twDate = (date) => twFormat(date, 'YYYY-MM-DD');

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [editingOrder, setEditingOrder] = useState(null);
  const [addingOrder, setAddingOrder] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed'
  const [searchId, setSearchId] = useState('');
  const knownIdsRef = React.useRef(null);
  const flashIntervalRef = React.useRef(null);

  const todayTW = moment().utcOffset('+08:00').format('YYYY-MM-DD');
  const [selectedDate, setSelectedDate] = useState(() => moment().utcOffset('+08:00').format('YYYY-MM-DD'));

  const { data: allOrders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => db.entities.Order.list('-created_date', 500),
    refetchInterval: 3000,
  });

  // New order notification: sound + title flash
  React.useEffect(() => {
    if (!unlocked) return;
    const ids = new Set(allOrders.map(o => o.id));
    if (knownIdsRef.current === null) {
      knownIdsRef.current = ids;
      return;
    }
    const newOnes = allOrders.filter(o => !knownIdsRef.current.has(o.id));
    knownIdsRef.current = ids;
    if (newOnes.length === 0) return;

    // Play ding sound via AudioContext
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.3].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.6, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.4);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.4);
      });
    } catch (_) {}

    // Flash title
    if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
    let toggle = true;
    const originalTitle = document.title;
    flashIntervalRef.current = setInterval(() => {
      document.title = toggle ? '【新訂單！】' : originalTitle;
      toggle = !toggle;
    }, 800);
    setTimeout(() => {
      clearInterval(flashIntervalRef.current);
      document.title = originalTitle;
    }, 10000);
  }, [allOrders, unlocked]);

  const dateOrders = useMemo(() =>
    allOrders.filter(o => twDate(o.created_date) === selectedDate),
    [allOrders, selectedDate]
  );

  const orders = useMemo(() => {
    let result = dateOrders;
    if (statusFilter === 'pending') result = result.filter(o => o.status === 'pending');
    if (statusFilter === 'completed') result = result.filter(o => o.status === 'completed');
    if (searchId.trim()) result = result.filter(o =>
      o.order_number != null && String(o.order_number).padStart(3, '0').includes(searchId.trim())
    );
    return result;
  }, [dateOrders, statusFilter, searchId]);

  const prevDay = () => setSelectedDate(d => moment(d).subtract(1, 'day').format('YYYY-MM-DD'));
  const nextDay = () => setSelectedDate(d => moment(d).add(1, 'day').format('YYYY-MM-DD'));

  const deleteOrder = useMutation({
    mutationFn: (id) => db.entities.Order.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, data }) => db.entities.Order.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const createOrder = useMutation({
    mutationFn: (data) => db.entities.Order.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setAddingOrder(false);
    },
  });

  const cycleStatus = (order) => {
    const cycle = { pending: 'preparing', preparing: 'completed', completed: 'pending' };
    const newStatus = cycle[order.status] || 'preparing';
    updateOrder.mutate({ id: order.id, data: { status: newStatus } });
  };

  const clearDay = async () => {
    if (!window.confirm(`確定要清空 ${selectedDate} 的所有訂單？`)) return;
    await Promise.all(dateOrders.map(o => db.entities.Order.delete(o.id)));
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleDelete = (order) => {
    if (!window.confirm(`確定刪除桌 ${order.table_no} 的訂單？`)) return;
    deleteOrder.mutate(order.id);
  };

  const isToday = selectedDate === todayTW;
  const displayDate = isToday ? `今天 (${selectedDate})` : selectedDate;

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm shadow-lg space-y-5 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">店家管理</h2>
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold">訂單管理系統</h1>
            <p className="text-xs text-muted-foreground">
              {displayDate} · {dateOrders.length} 筆 · {dateOrders.filter(o => o.status === 'pending').length} 筆待處理
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/revenue">
              <Button variant="outline" size="sm" className="rounded-xl">
                <TrendingUp className="w-4 h-4 mr-1" /> 營收報表
              </Button>
            </Link>
            <Button size="sm" onClick={() => setAddingOrder(true)} className="rounded-xl bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1" /> 手動新增訂單
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
              <RefreshCw className="w-4 h-4 mr-1" /> 重新整理
            </Button>
            {dateOrders.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearDay} className="rounded-xl text-destructive hover:text-destructive">
                <Eraser className="w-4 h-4 mr-1" /> 清空當日
              </Button>
            )}
          </div>
        </div>

        {/* Date navigator + status filter */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex items-center gap-2 flex-wrap">
          <button onClick={prevDay} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted-foreground/15 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={nextDay}
            disabled={isToday}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted-foreground/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday && (
            <button onClick={() => setSelectedDate(todayTW)} className="text-xs text-primary hover:underline px-2">
              回今天
            </button>
          )}

          {/* Status filter */}
          <div className="flex gap-1 ml-2">
            {[
              { key: 'all', label: '全部' },
              { key: 'pending', label: '待處理' },
              { key: 'completed', label: '已完成' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted-foreground/15'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Pickup number search */}
          <input
            type="text"
            placeholder="搜尋取餐號..."
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            className="h-8 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring w-32"
          />
        </div>
      </div>

      {/* Item availability panel */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <ItemAvailabilityPanel />
      </div>

      {/* Table */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl mb-2">🍃</p>
            <p className="text-muted-foreground font-medium">{displayDate} 沒有符合的訂單</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">狀態切換</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">訂單編號</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">桌號</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">時間</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">餐點（含加料）</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">狀態</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">總金額</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => {
                  const sc = statusConfig[order.status] || statusConfig.pending;
                  const isCompleted = order.status === 'completed';

                  // Build per-item addon map: each item name → addons belonging to it
                  // Since addons are stored flat, we annotate them by position matching cart entries.
                  // We store items with note field if spread was embedded in name.
                  return (
                    <tr key={order.id} className={`border-b border-border last:border-0 transition-colors ${isCompleted ? 'opacity-50' : ''} ${idx % 2 === 0 ? '' : 'bg-muted/10'} hover:bg-muted/20`}>
                      {/* Status cycle button */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => cycleStatus(order)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all hover:opacity-80 active:scale-95 ${sc.color}`}
                        >
                          {sc.label}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        <div>#{order.id?.slice(0, 8)}</div>
                        {order.order_number && (
                          <div className="text-base font-bold text-foreground mt-0.5">
                            取餐 {String(order.order_number).padStart(3, '0')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {order.table_no === 0 ? '外' : order.table_no}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                        {twFormat(order.created_date, 'HH:mm')}
                      </td>
                      {/* Items with per-item addons */}
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          {order.items?.map((item, i) => {
                            // Per-item addons (new format) or legacy flat addons on first item
                            const itemAddons = item.addons?.length > 0
                              ? item.addons
                              : (i === 0 && order.items.length === 1 ? (order.addons || []) : []);
                            return (
                              <div key={i}>
                                <div className="text-sm font-medium">
                                  {item.name}
                                  {item.quantity > 1 && <span className="text-muted-foreground ml-1">×{item.quantity}</span>}
                                  {item.note && <span className="text-muted-foreground ml-1 text-xs">({item.note})</span>}
                                </div>
                                {itemAddons.length > 0 && (
                                  <div className="text-xs text-primary/70 pl-2 border-l-2 border-primary/20 mt-0.5">
                                    加料：{itemAddons.map(a => a.name).join('、')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={`${sc.color} border text-xs`}>{sc.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-accent">${order.total}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-primary/10" onClick={() => setEditingOrder(order)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-destructive/10 text-destructive" onClick={() => handleDelete(order)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Day total */}
            <div className="px-4 py-3 bg-muted/30 flex justify-between items-center border-t border-border">
              <span className="text-sm text-muted-foreground">當日合計（未取消）</span>
              <span className="font-bold text-accent text-lg">
                ${dateOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      <EditOrderDialog
        order={editingOrder}
        open={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        onSave={(data) => updateOrder.mutateAsync({ id: editingOrder.id, data })}
      />
      {/* Manual new order dialog — pass a dummy order with empty items */}
      <EditOrderDialog
        order={addingOrder ? { id: null, table_no: 1, items: [], addons: [], total: 0, status: 'pending' } : null}
        open={!!addingOrder}
        onClose={() => setAddingOrder(false)}
        onSave={(data) => createOrder.mutateAsync({ ...data, status: 'pending' })}
      />
    </div>
  );
}