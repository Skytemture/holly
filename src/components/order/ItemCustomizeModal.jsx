import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, AlertCircle } from 'lucide-react';

// Items requiring exactly 1 mandatory addon
const REQUIRE_ONE_ADDON = ['招牌豆花（任選一樣料）', '綜合豆花（任選三樣料）', '豆漿豆花（任選三樣料）', '黑糖剉冰（任選四種料）', '嫩仙草（任選兩種料）'];

// Items with crushed ice option (豆花系列, 仙草系列 excluded)
const ICE_CATEGORIES = ['豆花系列'];

export default function ItemCustomizeModal({ item, addons10, addons15, open, onClose, onConfirm }) {
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState(new Set());
  const [crushedIce, setCrushedIce] = useState(null); // null | 'crushed' | 'no-crushed'
  const [note, setNote] = useState('');

  if (!item) return null;

  const isSnack = item.category === '點心系列';
  const hasIceOption = ICE_CATEGORIES.includes(item.category) && item.spread_options?.includes('碎冰');
  const requiresAddon = REQUIRE_ONE_ADDON.includes(item.name);
  const allAddons = [...addons10, ...addons15];
  const hasAddons = allAddons.length > 0;

  // spread_options_with_price: options with individual prices, sorted ascending
  const pricedOptions = item.spread_options_with_price
    ? [...item.spread_options_with_price].sort((a, b) => a.price - b.price)
    : null;

  // simple spread_options (no price diff, e.g. 碎冰/不要碎冰 already handled separately)
  const simpleOptions = (!pricedOptions && item.spread_options?.length > 0 && !hasIceOption)
    ? item.spread_options
    : null;

  const hasPricedSpread = !!pricedOptions && pricedOptions.length > 0;
  const hasSimpleSpread = !!simpleOptions && simpleOptions.length > 0;

  // Current price = base price or selected priced option's price
  const currentPrice = (hasPricedSpread && selectedSpread)
    ? (pricedOptions.find(o => o.name === selectedSpread)?.price ?? item.price)
    : item.price;

  // Validation
  const spreadValid = !hasPricedSpread || !!selectedSpread;
  const iceValid = !hasIceOption || crushedIce !== null;
  const addonValid = !requiresAddon || !hasAddons || selectedAddons.size >= 1;
  const canConfirm = spreadValid && iceValid && addonValid;

  const toggleAddon = (id) => {
    setSelectedAddons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    // Build final spread label
    let spread = selectedSpread;
    if (hasIceOption && crushedIce) {
      const iceLabel = crushedIce === 'crushed' ? '碎冰' : '不要碎冰';
      spread = spread ? `${spread}・${iceLabel}` : iceLabel;
    }
    onConfirm({ item: { ...item, price: currentPrice }, spread, addons: [...selectedAddons], note });
    reset();
  };

  const reset = () => {
    setSelectedSpread(null);
    setSelectedAddons(new Set());
    setCrushedIce(null);
    setNote('');
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {item.name}
            <span className="ml-2 text-accent font-bold">${currentPrice}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* Priced spread options (點心等有不同價格) */}
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

          {/* Simple spread options (no price diff, non-snack non-ice) */}
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

          {/* Crushed ice radio (豆花系列) */}
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
                  <p className="text-xs text-muted-foreground">+$10</p>
                  <div className="grid grid-cols-2 gap-2">
                    {addons10.map(a => (
                      <button
                        key={a.id}
                        onClick={() => toggleAddon(a.id)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all active:scale-95 ${
                          selectedAddons.has(a.id)
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-border hover:border-primary/40 hover:bg-muted/20'
                        }`}
                      >
                        {selectedAddons.has(a.id) && <Check className="w-3.5 h-3.5 shrink-0" />}
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {addons15.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">+$15</p>
                  <div className="grid grid-cols-2 gap-2">
                    {addons15.map(a => (
                      <button
                        key={a.id}
                        onClick={() => toggleAddon(a.id)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all active:scale-95 ${
                          selectedAddons.has(a.id)
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-border hover:border-primary/40 hover:bg-muted/20'
                        }`}
                      >
                        {selectedAddons.has(a.id) && <Check className="w-3.5 h-3.5 shrink-0" />}
                        {a.name}
                      </button>
                    ))}
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
              加入訂單 ${currentPrice}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}