import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Check, Star, Trash2 } from 'lucide-react';
import ItemCustomizeModal from './ItemCustomizeModal';

export default function RecommendModal({ open, onClose, onConfirm, recommendedItems, addons10, addons15 }) {
  // pendingItem: the item currently being customized
  const [pendingItem, setPendingItem] = useState(null);
  // selectedEntries: array of { item, spread, addons, addonPricingMap, note } — fully customized
  const [selectedEntries, setSelectedEntries] = useState([]);

  const handleItemClick = (item) => {
    // If already selected, remove it
    if (selectedEntries.find(e => e.item.id === item.id)) {
      setSelectedEntries(prev => prev.filter(e => e.item.id !== item.id));
    } else {
      // Open customize modal
      setPendingItem(item);
    }
  };

  const handleCustomizeConfirm = ({ item, spread, addons, addonsData, addonPricingMap, note, quantity }) => {
    setSelectedEntries(prev => [...prev, { item, spread, addons, addonsData, addonPricingMap, note, quantity: quantity || 1 }]);
    setPendingItem(null);
  };

  const handleConfirm = () => {
    onConfirm(selectedEntries);
    setSelectedEntries([]);
  };

  const handleSkip = () => {
    onConfirm([]);
    setSelectedEntries([]);
  };

  const handleClose = () => {
    // Only close recommend modal if customize modal is not open
    if (!pendingItem) handleSkip();
  };

  const isSelected = (item) => !!selectedEntries.find(e => e.item.id === item.id);

  return (
    <>
      <Dialog open={open && !pendingItem} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-accent" />
              還要加點嗎？
            </DialogTitle>
            <p className="text-xs text-muted-foreground">店家推薦人氣餐點，點選後可選口味/加料</p>
          </DialogHeader>

          <div className="space-y-2 py-1">
            {recommendedItems.map(item => {
              const selected = isSelected(item);
              const entry = selectedEntries.find(e => e.item.id === item.id);
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all active:scale-95 ${
                      selected
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-border hover:border-primary/40 hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {selected
                        ? <Check className="w-4 h-4 shrink-0" />
                        : <Plus className="w-4 h-4 shrink-0 text-muted-foreground" />
                      }
                      <div className="text-left">
                        <p className="text-sm font-medium">{item.name}</p>
                        {selected && entry?.spread && (
                          <p className="text-xs text-primary/70">（{entry.spread}）</p>
                        )}
                        {selected && entry?.addons?.length > 0 && (
                          <p className="text-xs text-primary/70">加料已選</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-accent">
                        {item.spread_options_with_price?.length > 0
                          ? (() => {
                              const prices = item.spread_options_with_price.map(o => o.price);
                              const min = Math.min(...prices);
                              const max = Math.max(...prices);
                              return min === max ? `$${min}` : `$${min}~${max}`;
                            })()
                          : `$${item.price}`
                        }
                      </span>
                      {selected && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedEntries(prev => prev.filter(en => en.item.id !== item.id)); }}
                          className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </button>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 flex-col items-stretch pt-1">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSkip} className="flex-1">不用了，直接送出</Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedEntries.length === 0}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                加入購物車 {selectedEntries.length > 0 ? `(${selectedEntries.length})` : ''}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customize modal for the pending item */}
      <ItemCustomizeModal
        item={pendingItem}
        addons10={addons10 || []}
        addons15={addons15 || []}
        open={!!pendingItem}
        onClose={() => setPendingItem(null)}
        onConfirm={handleCustomizeConfirm}
      />
    </>
  );
}