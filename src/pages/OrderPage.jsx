const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo, useRef, useEffect } from 'react';

import { useQuery, useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Leaf, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import TableSelector from '@/components/order/TableSelector';
import ItemCustomizeModal from '@/components/order/ItemCustomizeModal';
import { Button } from '@/components/ui/button';

const CATEGORY_ORDER = ['豆花系列', '冰品系列', '仙草系列', '點心系列', '冬季限定'];
const CATEGORY_SHORT = { '豆花系列': '豆花', '冰品系列': '冰品', '仙草系列': '仙草', '點心系列': '點心', '冬季限定': '冬季' };
const SEASONAL_KEY = 'holly_seasonal_enabled';

export default function OrderPage() {
  const { toast } = useToast();
  const [tableNo, setTableNo] = useState(null);
  const [cart, setCart] = useState([]);
  const [customizingItem, setCustomizingItem] = useState(null);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [seasonalEnabled, setSeasonalEnabled] = useState(
    () => localStorage.getItem(SEASONAL_KEY) === 'true'
  );

  useEffect(() => {
    const handler = () => setSeasonalEnabled(localStorage.getItem(SEASONAL_KEY) === 'true');
    window.addEventListener('seasonal-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('seasonal-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const cartRef = useRef(null);
  const sectionRefs = useRef({});

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => db.entities.MenuItem.list(),
  });

  const mainItems = useMemo(() => menuItems.filter(i => !i.is_addon), [menuItems]);
  const addons10 = useMemo(() => menuItems.filter(i => i.is_addon && i.addon_tier === '10' && i.available !== false), [menuItems]);
  const addons15 = useMemo(() => menuItems.filter(i => i.is_addon && i.addon_tier === '15' && i.available !== false), [menuItems]);

  const addonMap = useMemo(() => {
    const m = {};
    menuItems.filter(i => i.is_addon).forEach(a => { m[a.id] = a; });
    return m;
  }, [menuItems]);

  const categories = useMemo(() => {
    const cats = {};
    mainItems.forEach(item => {
      if (!cats[item.category]) cats[item.category] = [];
      cats[item.category].push(item);
    });
    return cats;
  }, [mainItems]);

  const total = useMemo(() =>
    cart.reduce((sum, entry) => {
      const addonsTotal = entry.addons.reduce((s, aid) => s + (addonMap[aid]?.price || 0), 0);
      return sum + entry.item.price + addonsTotal;
    }, 0)
  , [cart, addonMap]);

  const createOrder = useMutation({
    mutationFn: (data) => db.entities.Order.create(data),
    onSuccess: (created) => {
      setPlacedOrderId({ id: created.id, orderNum: created.order_number });
    },
  });

  // After order placed, redirect to pickup page
  useEffect(() => {
    if (placedOrderId && placedOrderId.orderNum !== undefined) {
      window.location.href = `/pickup?id=${placedOrderId.id}&num=${String(placedOrderId.orderNum).padStart(3, '0')}`;
    }
  }, [placedOrderId]);

  const scrollToCategory = (cat) => {
    sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToCart = () => {
    cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCustomizeConfirm = ({ item, spread, addons, note }) => {
    setCart(prev => [...prev, {
      cartId: Date.now() + Math.random(),
      item, spread,
      addons, // array of addon ids
      note,
    }]);
    setCustomizingItem(null);
  };

  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(e => e.cartId !== cartId));
  };

  const handleSubmit = () => {
    if (tableNo === null) {
      toast({ title: '請先選擇桌號或外帶', variant: 'destructive' });
      return;
    }
    const items = cart.map(entry => {
      const itemAddons = entry.addons.map(aid => ({
        name: addonMap[aid]?.name || '',
        price: addonMap[aid]?.price || 0,
      }));
      return {
        name: entry.item.name + (entry.spread ? `（${entry.spread}）` : ''),
        price: entry.item.price,
        quantity: 1,
        note: entry.note || undefined,
        addons: itemAddons,
      };
    });
    // Generate a 3-digit numeric pickup number (100–999)
    const orderNumber = Math.floor(Math.random() * 900) + 100;
    createOrder.mutate({ table_no: tableNo, items, addons: [], total, status: 'pending', order_number: orderNumber });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const availableCategories = CATEGORY_ORDER.filter(c => {
    if (c === '冬季限定' && !seasonalEnabled) return false;
    return !!categories[c];
  });

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">豆花小町</h1>
            <p className="text-xs text-muted-foreground">手工現做 · 天然食材</p>
          </div>
        </div>

        {/* Category nav */}
        <div className="max-w-2xl mx-auto px-4 pb-2 overflow-x-auto flex gap-2 scrollbar-none">
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => scrollToCategory(cat)}
              className="shrink-0 px-4 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-all"
            >
              {CATEGORY_SHORT[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <TableSelector selected={tableNo} onSelect={setTableNo} />

        {/* Menu categories */}
        {CATEGORY_ORDER.filter(c => c !== '冬季限定' || seasonalEnabled).map(cat =>
          categories[cat] ? (
            <div
              key={cat}
              ref={el => sectionRefs.current[cat] = el}
              className="space-y-3 scroll-mt-28"
            >
              <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories[cat].map(item => (
                  <button
                    key={item.id}
                    onClick={() => item.available !== false && setCustomizingItem(item)}
                    disabled={item.available === false}
                    className={`flex items-center justify-between bg-card border rounded-xl px-4 py-3 transition-all text-left ${
                      item.available === false
                        ? 'border-border opacity-50 cursor-not-allowed'
                        : 'border-border hover:border-primary/40 hover:shadow-md active:scale-95'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      {item.available === false
                        ? <p className="text-xs text-destructive mt-0.5">已售完</p>
                        : item.spread_options?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.spread_options.join('、')}
                          </p>
                        )
                      }
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className="text-sm font-semibold text-accent">${item.price}</span>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${item.available === false ? 'bg-muted' : 'bg-primary/10'}`}>
                        <Plus className={`w-4 h-4 ${item.available === false ? 'text-muted-foreground' : 'text-primary'}`} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null
        )}

        {/* Cart section */}
        {cart.length > 0 && (
          <div ref={cartRef} className="space-y-3 scroll-mt-28">
            <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">已選項目</h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <AnimatePresence>
                {cart.map((entry) => {
                  const entryAddons = entry.addons.map(aid => addonMap[aid]).filter(Boolean);
                  const entryTotal = entry.item.price + entryAddons.reduce((s, a) => s + a.price, 0);
                  return (
                    <motion.div
                      key={entry.cartId}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start justify-between px-4 py-3 border-b border-border last:border-0"
                    >
                      <div className="space-y-0.5 flex-1">
                        <p className="text-sm font-medium">
                          {entry.item.name}
                          {entry.spread && <span className="text-muted-foreground ml-1">（{entry.spread}）</span>}
                        </p>
                        {entryAddons.length > 0 && (
                          <p className="text-xs text-muted-foreground">加料：{entryAddons.map(a => a.name).join('、')}</p>
                        )}
                        {entry.note && (
                          <p className="text-xs text-muted-foreground">備註：{entry.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <span className="text-sm font-semibold text-accent">${entryTotal}</span>
                        <button
                          onClick={() => removeFromCart(entry.cartId)}
                          className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div className="px-4 py-3 bg-muted/30 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">合計</span>
                <span className="text-lg font-bold text-accent">${total}</span>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={tableNo === null || createOrder.isPending}
              className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90"
            >
              {createOrder.isPending ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : '送出訂單'}
            </Button>
            {tableNo === null && (
              <p className="text-center text-xs text-destructive">請先選擇桌號或外帶</p>
            )}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 pt-2"
          >
            <button
              onClick={scrollToCart}
              className="w-full max-w-2xl mx-auto flex items-center justify-between bg-foreground text-background rounded-2xl px-5 py-4 shadow-2xl hover:opacity-90 transition-all active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-accent text-accent-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                    {cart.length}
                  </span>
                </div>
                <span className="font-semibold text-sm">已選 {cart.length} 份餐點</span>
              </div>
              <span className="font-bold text-lg text-accent">${total}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ItemCustomizeModal
        item={customizingItem}
        addons10={addons10}
        addons15={addons15}
        open={!!customizingItem}
        onClose={() => setCustomizingItem(null)}
        onConfirm={handleCustomizeConfirm}
      />
    </div>
  );
}