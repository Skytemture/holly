const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useMemo } from 'react';

import { useQuery, useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Leaf, Sparkles, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import TableSelector from '@/components/order/TableSelector';
import ItemCustomizeModal from '@/components/order/ItemCustomizeModal';
import { Button } from '@/components/ui/button';

export default function OrderPage() {
  const { toast } = useToast();
  const [tableNo, setTableNo] = useState(null);
  // cart: array of { cartId, item, spread, addons (array of addon objects {id,name,price}), note }
  const [cart, setCart] = useState([]);
  const [customizingItem, setCustomizingItem] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => db.entities.MenuItem.filter({ available: true }),
  });

  const mainItems = useMemo(() => menuItems.filter(i => !i.is_addon), [menuItems]);
  const addons10 = useMemo(() => menuItems.filter(i => i.is_addon && i.addon_tier === '10'), [menuItems]);
  const addons15 = useMemo(() => menuItems.filter(i => i.is_addon && i.addon_tier === '15'), [menuItems]);

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
      const addonsTotal = entry.addons.reduce((s, a) => s + (addonMap[a]?.price || 0), 0);
      return sum + entry.item.price + addonsTotal;
    }, 0)
  , [cart, addonMap]);

  const createOrder = useMutation({
    mutationFn: (data) => db.entities.Order.create(data),
    onSuccess: () => setOrderPlaced(true),
  });

  const handleItemTap = (item) => {
    setCustomizingItem(item);
  };

  const handleCustomizeConfirm = ({ item, spread, addons, note }) => {
    setCart(prev => [...prev, {
      cartId: Date.now() + Math.random(),
      item,
      spread,
      addons, // array of addon ids
      note,
    }]);
    setCustomizingItem(null);
  };

  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(e => e.cartId !== cartId));
  };

  const handleSubmit = () => {
    if (!tableNo) {
      toast({ title: '請先選擇桌號', variant: 'destructive' });
      return;
    }
    if (cart.length === 0) {
      toast({ title: '請至少選擇一項餐點', variant: 'destructive' });
      return;
    }

    // Build order items from cart
    const items = cart.map(entry => ({
      name: entry.item.name + (entry.spread ? `（${entry.spread}）` : ''),
      price: entry.item.price,
      quantity: 1,
      note: entry.note || undefined,
    }));

    const addons = cart.flatMap(entry =>
      entry.addons.map(aid => ({
        name: addonMap[aid]?.name || '',
        price: addonMap[aid]?.price || 0,
      }))
    );

    createOrder.mutate({
      table_no: tableNo,
      items,
      addons,
      total,
      status: 'pending',
    });
  };

  const handleReset = () => {
    setTableNo(null);
    setCart([]);
    setOrderPlaced(false);
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full"
          >
            <Sparkles className="w-10 h-10 text-primary" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold">訂單已送出！</h2>
            <p className="text-muted-foreground mt-2">桌號 {tableNo} · 共 ${total}</p>
            <p className="text-sm text-muted-foreground mt-1">請稍候，美味即將送達 ✨</p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            再點一份
          </button>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const categoryOrder = ['豆花系列', '冰品系列', '仙草系列', '點心系列'];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">豆花小町</h1>
              <p className="text-xs text-muted-foreground">手工現做 · 天然食材</p>
            </div>
          </div>
          <div />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8 pb-10">
        <TableSelector selected={tableNo} onSelect={setTableNo} />

        {/* Menu categories */}
        {categoryOrder.map(cat =>
          categories[cat] ? (
            <div key={cat} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories[cat].map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleItemTap(item)}
                    className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/40 hover:shadow-md transition-all text-left active:scale-95"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      {item.spread_options?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.spread_options.join('、')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className="text-sm font-semibold text-accent">${item.price}</span>
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null
        )}

        {/* Cart */}
        {cart.length > 0 && (
          <div className="space-y-3">
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
                          <p className="text-xs text-muted-foreground">
                            加料：{entryAddons.map(a => a.name).join('、')}
                          </p>
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
              disabled={!tableNo || createOrder.isPending}
              className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90"
            >
              {createOrder.isPending ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                '送出訂單'
              )}
            </Button>
            {!tableNo && (
              <p className="text-center text-xs text-destructive">請先選擇桌號</p>
            )}
          </div>
        )}
      </div>

      {/* Item customize modal */}
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