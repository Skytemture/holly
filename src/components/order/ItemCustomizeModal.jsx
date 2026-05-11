import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, AlertCircle, Plus, Minus } from 'lucide-react';

// Items requiring at least 1 mandatory addon
const REQUIRE_ONE_ADDON = ['招牌豆花（任選一樣料）', '綜合豆花（任選三樣料）', '豆漿豆花（任選三樣料）', '黑糖剉冰（任選四種料）', '嫩仙草（任選兩種料）'];

// Parse free addon count from item name, e.g. "任選三樣料" → 3
const CHINESE_NUM = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
function parseFreeAddonCount(name) {
  const m = name.match(/任選([一二三四五六\d]+)樣/);
  if (!m) return 0;
  return CHINESE_NUM[m[1]] ?? parseInt(m[1], 10) ?? 0;
}

const ICE_CATEGORIES = ['豆花系列'];

function QtyButton({ onDec, onInc, value, min = 0 }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onDec}
        disabled={value <= min}
        className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-5 text-center text-sm font-semibold">{value}</span>
      <button
        onClick={onInc}
        className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function ItemCustomizeModal({ item, addons10, addons15, open, onClose, onConfirm }) {
  const [selectedSpread, setSelectedSpread] = useState(null);
  // addonQty: Map<addonId, qty>
  const [addonQty, setAddonQty] = useState({});
  const [crushedIce, setCrushedIce] = useState(null);
  const [itemQty, setItemQty] = useState(1);
  const [note, setNote] = useState('');

  const allAddons = useMemo(() => [...addons10, ...addons15], [addons10, addons15]);

  const isSnack = item?.category === '點心系列';
  const hasIceOption = ICE_CATEGORIES.includes(item?.category) && item?.spread_options?.includes('碎冰');
  const requiresAddon = REQUIRE_ONE_ADDON.includes(item?.name);
  const freeAddonCount = item ? parseFreeAddonCount(item.name) : 0;

  const pricedOptions = useMemo(() =>
    item?.spread_options_with_price
      ? [...item.spread_options_with_price].sort((a, b) => a.price - b.price)
      : null
  , [item]);

  const simpleOptions = useMemo(() =>
    (!pricedOptions && item?.spread_options?.length > 0 && !hasIceOption)
      ? item.spread_options
      : null
  , [pricedOptions, item, hasIceOption]);

  const hasPricedSpread = !!pricedOptions && pricedOptions.length > 0;
  const hasSimpleSpread = !!simpleOptions && simpleOptions.length > 0;
  const hasAddons = allAddons.length > 0;

  // Selected addon ids (those with qty > 0), expanded by quantity
  const selectedAddonIds = useMemo(() =>
    Object.entries(addonQty)
      .filter(([, q]) => q > 0)
      .flatMap(([id, q]) => Array(q).fill(id))
  , [addonQty]);

  const currentUnitPrice = useMemo(() =>
    (hasPricedSpread && selectedSpread)
      ? (pricedOptions.find(o => o.name === selectedSpread)?.price ?? item?.price ?? 0)
      : (item?.price ?? 0)
  , [hasPricedSpread, selectedSpread, pricedOptions, item]);

  // Build addon pricing map: for freeAddonCount items, cheapest qty-expanded addons are free
  const addonPricingMap = useMemo(() => {
    if (freeAddonCount === 0) return {};
    // Expand each addon by its quantity, keeping track of id
    const expanded = selectedAddonIds.map(id => {
      const a = allAddons.find(a => a.id === id);
      return { id, price: a?.price ?? 0 };
    }).sort((a, b) => a.price - b.price);
    // Build map: id → effective price (cheapest freeAddonCount slots are 0)
    // Since same id can appear multiple times, accumulate per-id free slots
    const freeSlots = {};
    expanded.forEach((entry, idx) => {
      if (idx < freeAddonCount) {
        freeSlots[entry.id] = (freeSlots[entry.id] || 0) + 1;
      }
    });
    // For display/submit we store per-id how much each unit costs on average isn't ideal;
    // instead store effective unit price as: (totalPrice - freeCount*price) / qty
    // Simpler: build full per-occurrence map keyed by id+index, but since OrderPage expects id→price,
    // we store the reduced price per id (first freeSlots[id] units free)
    const map = {};
    Object.entries(addonQty).forEach(([id, qty]) => {
      if (qty === 0) return;
      const a = allAddons.find(a => a.id === id);
      const unitPrice = a?.price ?? 0;
      const freeForId = freeSlots[id] || 0;
      const chargedQty = Math.max(qty - freeForId, 0);
      // effective price per unit that gets stored (for pricing map usage)
      map[id] = chargedQty > 0 ? Math.round((chargedQty * unitPrice) / qty * 10) / 10 : 0;
    });
    return map;
  }, [selectedAddonIds, freeAddonCount, allAddons, addonQty]);

  const addonsExtraTotal = useMemo(() => {
    return Object.entries(addonQty).reduce((s, [id, qty]) => {
      if (qty === 0) return s;
      const a = allAddons.find(a => a.id === id);
      const unitPrice = a?.price ?? 0;
      if (freeAddonCount > 0) {
        // use pricing map effective price × qty
        return s + (addonPricingMap[id] ?? 0) * qty;
      }
      return s + unitPrice * qty;
    }, 0);
  }, [addonQty, allAddons, freeAddonCount, addonPricingMap]);

  const totalDisplayPrice = (currentUnitPrice + addonsExtraTotal) * itemQty;

  if (!item) return null;

  const totalSelectedAddonQty = Object.values(addonQty).reduce((s, q) => s + q, 0);

  const spreadValid = !hasPricedSpread || !!selectedSpread;
  const iceValid = !hasIceOption || crushedIce !== null;
  const addonValid = !requiresAddon || !hasAddons || totalSelectedAddonQty >= 1;
  const canConfirm = spreadValid && iceValid && addonValid;

  const changeAddonQty = (id, delta) => {
    setAddonQty(prev => {
      const cur = prev[id] || 0;
      const next = Math.max(cur + delta, 0);
      return { ...prev, [id]: next };
    });
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    let spread = selectedSpread;
    if (hasIceOption && crushedIce) {
      const iceLabel = crushedIce === 'crushed' ? '碎冰' : '不要碎冰';
      spread = spread ? `${spread}・${iceLabel}` : iceLabel;
    }
    // Build addons array: each addon entry with name+price, expanded by qty
    const addonsArray = Object.entries(addonQty)
      .filter(([, q]) => q > 0)
      .flatMap(([id, qty]) => {
        const a = allAddons.find(a => a.id === id);
        const effectiveUnitPrice = freeAddonCount > 0
          ? (addonPricingMap[id] ?? 0)
          : (a?.price ?? 0);
        return Array(qty).fill({ id, name: a?.name || '', price: effectiveUnitPrice });
      });

    onConfirm({
      item: { ...item, price: currentUnitPrice },
      quantity: itemQty,
      spread,
      addons: addonsArray.map(a => a.id),
      addonsData: addonsArray, // full data for submit
      addonPricingMap: freeAddonCount > 0 ? addonPricingMap : null,
      note,
    });
    reset();
  };

  const reset = () => {
    setSelectedSpread(null);
    setAddonQty({});
    setCrushedIce(null);
    setItemQty(1);
    setNote('');
  };

  const handleClose = () => { reset(); onClose(); };

  const AddonRow = ({ a }) => {
    const qty = addonQty[a.id] || 0;
    return (
      <div className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all ${
        qty > 0 ? 'bg-primary/10 border-primary' : 'border-border'
      }`}>
        {a.is_recommended && (
          <span className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[9px]">⭐</span>
        )}
        <span className={`text-sm font-medium ${qty > 0 ? 'text-primary' : ''}`}>{a.name}</span>
        <QtyButton
          value={qty}
          onDec={() => changeAddonQty(a.id, -1)}
          onInc={() => changeAddonQty(a.id, 1)}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center justify-between">
            <span>{item.name}</span>
            <span className="text-accent font-bold">${currentUnitPrice}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* Item quantity */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">數量</p>
            <QtyButton
              value={itemQty}
              min={1}
              onDec={() => setItemQty(q => Math.max(q - 1, 1))}
              onInc={() => setItemQty(q => q + 1)}
            />
          </div>

          {/* Priced spread options */}
          {hasPricedSpread && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                選擇口味 <span className="text-destructive">*</span>
                <span className="normal-case font-normal">(必選)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {pricedOptions.map(opt => (
                  <button
                    key={opt.name}
                    onClick={() => setSelectedSpread(opt.name === selectedSpread ? null : opt.name)}
                    className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all active:scale-95 ${
                      selectedSpread === opt.name
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {selectedSpread === opt.name && <Check className="w-3.5 h-3.5 shrink-0" />}
                      {opt.name}
                    </span>
                    <span className={`text-xs font-bold shrink-0 ${selectedSpread === opt.name ? 'text-primary-foreground/80' : 'text-accent'}`}>
                      ${opt.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Simple spread options */}
          {hasSimpleSpread && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                選擇口味 <span className="text-destructive">*</span>
                <span className="normal-case font-normal">(必選)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {simpleOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSelectedSpread(opt === selectedSpread ? null : opt)}
                    className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all active:scale-95 ${
                      selectedSpread === opt
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                  >
                    {selectedSpread === opt && <Check className="w-4 h-4" />}
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Crushed ice */}
          {hasIceOption && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                碎冰 <span className="text-destructive">*</span>
                <span className="normal-case font-normal">(必選)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'crushed', label: '要碎冰' },
                  { value: 'no-crushed', label: '不要碎冰' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setCrushedIce(opt.value)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all active:scale-95 ${
                      crushedIce === opt.value
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                  >
                    {crushedIce === opt.value && <Check className="w-4 h-4" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Non-snack addons */}
          {!isSnack && hasAddons && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                加料
                {requiresAddon && <span className="text-destructive">*</span>}
                {requiresAddon
                  ? <span className="normal-case font-normal text-muted-foreground">(必選1樣)</span>
                  : <span className="normal-case font-normal text-muted-foreground">(選填)</span>
                }
              </p>
              {addons10.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">+$10 / 份</p>
                  <div className="space-y-2">
                    {addons10.map(a => <AddonRow key={a.id} a={a} />)}
                  </div>
                </div>
              )}
              {addons15.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">+$15 / 份</p>
                  <div className="space-y-2">
                    {addons15.map(a => <AddonRow key={a.id} a={a} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">備註</p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="甜度、冰量或其他需求..."
              className="bg-muted/30 rounded-xl resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 flex-col items-stretch">
          {!canConfirm && (
            <p className="text-xs text-destructive flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {!spreadValid ? '請選擇口味' : !iceValid ? '請選擇是否需要碎冰' : '請選擇配料'}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">取消</Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              加入訂單 {itemQty > 1 ? `×${itemQty} ` : ''}${totalDisplayPrice}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}