const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';

// Per-item editor: handles addons for non-snack, spread for snack
function ItemEntryEditor({ cartEntry, menuItems, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const isSnack = cartEntry.menuItem?.category === '點心系列';
  const spreadOptions = cartEntry.menuItem?.spread_options || [];
  const hasSpread = isSnack && spreadOptions.length > 0;

  const addons10 = menuItems.filter(i => i.is_addon && i.addon_tier === '10');
  const addons15 = menuItems.filter(i => i.is_addon && i.addon_tier === '15');
  const hasAddons = addons10.length > 0 || addons15.length > 0;

  const toggleAddon = (addonItem) => {
    const already = cartEntry.addons.some(a => a.name === addonItem.name);
    const newAddons = already
      ? cartEntry.addons.filter(a => a.name !== addonItem.name)
      : [...cartEntry.addons, { name: addonItem.name, price: addonItem.price }];
    onUpdate({ ...cartEntry, addons: newAddons });
  };

  const selectSpread = (opt) => {
    // Spread is stored as suffix in name: "品項名（口味）"
    const baseName = cartEntry.menuItem?.name || cartEntry.name.replace(/（[^）]*）$/, '');
    const newName = opt ? `${baseName}（${opt}）` : baseName;
    onUpdate({ ...cartEntry, name: newName, spread: opt });
  };

  const currentSpread = cartEntry.spread || (cartEntry.name.match(/（([^）]*)）$/) || [])[1] || null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 bg-muted/30">
        <div className="flex-1">
          <p className="text-sm font-medium">{cartEntry.name}</p>
          {!isSnack && cartEntry.addons.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              加料：{cartEntry.addons.map(a => a.name).join('、')}
            </p>
          )}
          {hasSpread && !currentSpread && (
            <p className="text-xs text-destructive mt-0.5">請選擇口味 *</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(hasSpread || (!isSnack && hasAddons)) && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-primary hover:underline px-2 flex items-center gap-0.5"
            >
              {hasSpread ? '口味' : '加料'}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <button onClick={onRemove} className="w-7 h-7 rounded-full hover:bg-destructive/10 flex items-center justify-center">
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 py-2.5 border-t border-border bg-card space-y-3">
          {/* Snack: spread selection */}
          {hasSpread && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">選擇口味 <span className="text-destructive">*</span></p>
              <div className="grid grid-cols-2 gap-2">
                {spreadOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => selectSpread(opt)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all active:scale-95 ${
                      currentSpread === opt
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                  >
                    {currentSpread === opt && <Check className="w-3.5 h-3.5" />}
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Non-snack: addons */}
          {!isSnack && hasAddons && (
            <>
              {addons10.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">+$10</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {addons10.map(a => (
                      <label key={a.id} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={cartEntry.addons.some(x => x.name === a.name)}
                          onCheckedChange={() => toggleAddon(a)}
                        />
                        <span className="text-sm">{a.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {addons15.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">+$15</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {addons15.map(a => (
                      <label key={a.id} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={cartEntry.addons.some(x => x.name === a.name)}
                          onCheckedChange={() => toggleAddon(a)}
                        />
                        <span className="text-sm">{a.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function EditOrderDialog({ order, open, onClose, onSave }) {
  const [tableNo, setTableNo] = useState('');
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => db.entities.MenuItem.list(),
  });

  const mainItems = menuItems.filter(i => !i.is_addon);
  const categoryOrder = ['豆花系列', '冰品系列', '仙草系列', '點心系列', '冬季限定'];
  const grouped = {};
  mainItems.forEach(i => {
    if (!grouped[i.category]) grouped[i.category] = [];
    grouped[i.category].push(i);
  });

  const menuItemByBaseName = {};
  mainItems.forEach(mi => { menuItemByBaseName[mi.name] = mi; });

  useEffect(() => {
    if (!order || !open) return;
    setTableNo(String(order.table_no));

    const legacyAddons = order.addons || [];
    const newCart = (order.items || []).map((item, idx) => {
      const baseName = item.name.replace(/（[^）]*）$/, '');
      const menuItem = menuItemByBaseName[baseName] || null;
      const spreadMatch = item.name.match(/（([^）]*)）$/);
      const spread = spreadMatch ? spreadMatch[1] : null;
      const itemAddons = item.addons && item.addons.length > 0
        ? item.addons
        : (idx === 0 ? legacyAddons : []);
      return {
        cartId: Date.now() + Math.random() + idx,
        name: item.name,
        price: item.price,
        menuItem,
        spread,
        addons: itemAddons,
      };
    });
    setCart(newCart);
  }, [order, open, menuItems]);

  const addItem = (menuItem) => {
    setCart(prev => [...prev, {
      cartId: Date.now() + Math.random(),
      name: menuItem.name,
      price: menuItem.price,
      menuItem,
      spread: null,
      addons: [],
    }]);
  };

  const updateEntry = (cartId, updated) => {
    setCart(prev => prev.map(e => e.cartId === cartId ? updated : e));
  };

  const removeEntry = (cartId) => {
    setCart(prev => prev.filter(e => e.cartId !== cartId));
  };

  const handleSave = async () => {
    setSaving(true);
    const items = cart.map(e => ({
      name: e.name,
      price: e.price,
      quantity: 1,
      addons: e.addons,
    }));
    const total = cart.reduce((s, e) => s + e.price + e.addons.reduce((a, x) => a + x.price, 0), 0);
    await onSave({ table_no: Number(tableNo), items, addons: [], total });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order?.id ? `編輯訂單 #${order.id.slice(0, 8)}` : '手動新增訂單'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label>桌號</Label>
            <Select value={tableNo} onValueChange={setTableNo}>
              <SelectTrigger><SelectValue placeholder="選擇桌號" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">外帶</SelectItem>
                {[1, 2, 3, 4].map(n => (
                  <SelectItem key={n} value={String(n)}>桌號 {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {cart.length > 0 && (
            <div className="space-y-2">
              <Label>已選餐點</Label>
              <div className="space-y-2">
                {cart.map(entry => (
                  <ItemEntryEditor
                    key={entry.cartId}
                    cartEntry={entry}
                    menuItems={menuItems}
                    onUpdate={(updated) => updateEntry(entry.cartId, updated)}
                    onRemove={() => removeEntry(entry.cartId)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>新增餐點</Label>
            {categoryOrder.map(cat => grouped[cat] ? (
              <div key={cat} className="space-y-1.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{cat}</p>
                <div className="flex flex-wrap gap-2">
                  {grouped[cat].map(item => (
                    <button
                      key={item.id}
                      onClick={() => addItem(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm hover:border-primary/40 hover:bg-muted/30 transition-all active:scale-95"
                    >
                      <Plus className="w-3 h-3 text-primary" />
                      {item.name}
                      <span className="text-muted-foreground">${item.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null)}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={saving || cart.length === 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '儲存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}