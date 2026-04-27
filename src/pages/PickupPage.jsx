const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, ChefHat, CheckCircle2, Leaf } from 'lucide-react';

const STEPS = [
  { key: 'pending',   icon: Clock,         label: '商家已接單', color: 'text-accent' },
  { key: 'preparing', icon: ChefHat,       label: '製作中',     color: 'text-primary' },
  { key: 'completed', icon: CheckCircle2,  label: '請取餐！',   color: 'text-green-600' },
];

export default function PickupPage() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');
  const urlNum = params.get('num');

  const [order, setOrder] = useState(null);

  const fetchOrder = async () => {
    if (!orderId) return;
    // list recent orders and find by id
    const results = await db.entities.Order.list('-created_date', 200);
    const found = results?.find(o => o.id === orderId);
    if (found) {
      setOrder(found);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  // Use order_number from DB (authoritative), fall back to URL param, then ???
  const pickupNum = order?.order_number
    ? String(order.order_number).padStart(3, '0')
    : (urlNum || '???');

  const status = order?.status || 'pending';
  const isReady = status === 'completed' || status === 'ready';

  const stepIndex = status === 'completed' || status === 'ready'
    ? 2
    : status === 'preparing'
      ? 1
      : 0;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-700 ${isReady ? 'bg-green-50' : 'bg-background'}`}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">豆花小町</h1>
            <p className="text-xs text-muted-foreground">取餐進度追蹤</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 space-y-10">
        {/* Pickup number */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-center space-y-3 transition-colors duration-700 ${isReady ? 'text-green-700' : ''}`}
        >
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">取餐號碼</p>
          <motion.div
            animate={isReady ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`text-8xl font-black tracking-tight ${isReady ? 'text-green-600' : 'text-foreground'}`}
          >
            #{pickupNum}
          </motion.div>
          {order && (
            <p className="text-xs text-muted-foreground">
              {order.table_no === 0 ? '外帶' : `桌號 ${order.table_no}`} · ${order.total}
            </p>
          )}
        </motion.div>

        {/* Progress steps */}
        <div className="w-full max-w-xs space-y-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === stepIndex;
            const isDone = idx < stepIndex;
            return (
              <motion.div
                key={step.key}
                initial={false}
                animate={{
                  opacity: isDone || isActive ? 1 : 0.35,
                  scale: isActive ? 1.03 : 1,
                }}
                transition={{ duration: 0.4 }}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-500 ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-md'
                    : isDone
                      ? 'border-green-300 bg-green-50'
                      : 'border-border bg-card'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-primary/15' : isDone ? 'bg-green-100' : 'bg-muted'
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? step.color : isDone ? 'text-green-600' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isActive ? step.color : isDone ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-muted-foreground mt-0.5"
                    >
                      {idx === 0 ? '正在等待製作...' : idx === 1 ? '努力製作中，請稍候 🍮' : '您的餐點已完成，請至櫃台取餐！'}
                    </motion.p>
                  )}
                </div>
                {isDone && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                {isActive && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full shrink-0"
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Ready banner */}
        <AnimatePresence>
          {isReady && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xs bg-green-500 text-white rounded-2xl px-6 py-5 text-center space-y-1 shadow-lg shadow-green-200"
            >
              <Sparkles className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xl font-black">餐點已完成！</p>
              <p className="text-sm opacity-90">請至櫃台憑號碼取餐 🎉</p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground text-center">每3秒自動更新狀態</p>
      </div>
    </div>
  );
}