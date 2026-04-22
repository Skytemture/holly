const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

export default function EditOrderDialog({ order, open, onClose, onSave }) {
  const [tableNo, setTableNo] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [selectedAddons, setSelectedAddons] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => db.entities.MenuItem.filter({ available: true }),
  });

  const mainItems = menuItems.filter(i => !i.is_addon);
  const addons10 = menuItems.filter(i => i.is_addon && i.addon_tier === '10');
  const addons15 = menuItems.filter(i => i.is_addon && i.addon_tier === '15');

  useEffect(() => {
    if (!order || !open) return;
    setTableNo(String(order.table_no));
    const qtyMap = {};
    order.items?.forEach(i => { qtyMap[i.name] = i.quantity; });
    setSelectedItems(qtyMap);
    const addonNames = new Set(order.addons?.map(a => a.name) || []);
    setSelectedAddons(addonNames);
  }, [order, open]);

  const toggleItem = (name) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[name]) delete next[name];
      else next[name] = 1;
      return next;
    });
  };

  const toggleAddon = (name) => {
    setSelectedAddons(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const itemMap = {};
    menuItems.forEach(i => { itemMap[i.name] = i; });

    const items = Object.entries(selectedItems).map(([name, quantity]) => ({
      name,
      price: itemMap[name]?.price || 0,
      quantity,
    }));
    const addons = [...selectedAddons].map(name => ({
      name,
      price: itemMap[name]?.price || 0,
    }));
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
                + addons.reduce((s, a) => s + a.price, 0);

    await onSave({ table_no: Number(tableNo), items, addons, total });
    setSaving(false);
    onClose();
  };

  const categoryOrder = ['豆花系列', '冰品系列', '仙草系列', '點心系列'];
  const grouped = {};
  mainItems.forEach(i => {
    if (!grouped[i.category]) grouped[i.category] = [];
    grouped[i.category].push(i);
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯訂單 #{order?.id?.slice(0, 8)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Table */}
          <div className="space-y-1.5">
            <Label>桌號</Label>
            <Select value={tableNo} onValueChange={setTableNo}>
              <SelectTrigger><SelectValue placeholder="選擇桌號" /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(n => (
                  <SelectItem key={n} value={String(n)}>桌號 {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Menu items */}
          {categoryOrder.map(cat => grouped[cat] ? (
            <div key={cat} className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">{cat}</Label>
              <div className="space-y-1.5">
                {grouped[cat].map(item => (
                  <label key={item.id} className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={!!selectedItems[item.name]}
                      onCheckedChange={() => toggleItem(item.name)}
                    />
                    <span className="text-sm flex-1">{item.name}</span>
                    <span className="text-sm text-muted-foreground">${item.price}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null)}

          {/* Addons */}
          {addons10.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">加料 $10</Label>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {addons10.map(a => (
                  <label key={a.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={selectedAddons.has(a.name)} onCheckedChange={() => toggleAddon(a.name)} />
                    <span className="text-sm">{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {addons15.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">加料 $15</Label>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {addons15.map(a => (
                  <label key={a.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={selectedAddons.has(a.name)} onCheckedChange={() => toggleAddon(a.name)} />
                    <span className="text-sm">{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '儲存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}