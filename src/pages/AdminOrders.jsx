const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Pencil, Trash2, Eraser, Lock, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import moment from 'moment';
import EditOrderDialog from '@/components/admin/EditOrderDialog';

const ADMIN_PASSWORD = '7777';

const statusConfig = {
  pending:   { label: '待處理', color: 'bg-accent/15 text-accent border-accent/20' },
  preparing: { label: '製作中', color: 'bg-primary/10 text-primary border-primary/20' },
  ready:     { label: '可取餐', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  completed: { label: '已完成', color: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: '已取消', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [editingOrder, setEditingOrder] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  // Date filter: default to today
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));

  const { data: allOrders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => db.entities.Order.list('-created_date', 500),
    refetchInterval: 10000,
  });

  // Filter orders by selected date
  const orders = useMemo(() =>
    allOrders.filter(o => moment(o.created_date).format('YYYY-MM-DD') === selectedDate),
    [allOrders, selectedDate]
  );

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

  const clearDay = async () => {
    if (!window.confirm(`確定要清空 ${selectedDate} 的所有訂單？`)) return;
    await Promise.all(orders.map(o => db.entities.Order.delete(o.id)));
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleDelete = (order) => {
    if (!window.confirm(`確定刪除桌 ${order.table_no} 的訂單？`)) return;
    deleteOrder.mutate(order.id);
  };

  const isToday = selectedDate === moment().format('YYYY-MM-DD');
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
          <div className="flex items-center gap-3">
            <Link to="/" className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted-foreground/10 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">訂單管理系統</h1>
              <p className="text-xs text-muted-foreground">
                {displayDate} · {orders.length} 筆 · {orders.filter(o => o.status === 'pending').length} 筆待處理
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/revenue">
              <Button variant="outline" size="sm" className="rounded-xl">
                <TrendingUp className="w-4 h-4 mr-1" /> 營收報表
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
              <RefreshCw className="w-4 h-4 mr-1" /> 重新整理
            </Button>
            {orders.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearDay} className="rounded-xl text-destructive hover:text-destructive">
                <Eraser className="w-4 h-4 mr-1" /> 清空當日
              </Button>
            )}
          </div>
        </div>

        {/* Date navigator */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex items-center gap-2">
          <button onClick={prevDay} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted-foreground/15 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 max-w-[180px] h-8 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={nextDay}
            disabled={isToday}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted-foreground/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(moment().format('YYYY-MM-DD'))}
              className="text-xs text-primary hover:underline px-2"
            >
              回今天
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl mb-2">🍃</p>
            <p className="text-muted-foreground font-medium">{displayDate} 沒有訂單</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">訂單編號</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">桌號</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">時間</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">餐點</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">加料</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">狀態</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">總金額</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => {
                  const sc = statusConfig[order.status] || statusConfig.pending;
                  return (
                    <tr key={order.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">#{order.id?.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {order.table_no}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {moment(order.created_date).format('HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {order.items?.map((item, i) => (
                            <div key={i}>{item.name} {item.quantity > 1 && <span className="text-muted-foreground">×{item.quantity}</span>}</div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {order.addons?.length > 0 ? (
                          <div className="space-y-0.5">
                            {order.addons.map((a, i) => (
                              <div key={i} className="text-muted-foreground">{a.name}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">無</span>
                        )}
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
              <span className="text-sm text-muted-foreground">當日合計</span>
              <span className="font-bold text-accent text-lg">
                ${orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0)}
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
    </div>
  );
}