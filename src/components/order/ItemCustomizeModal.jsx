import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Check } from 'lucide-react';

export default function ItemCustomizeModal({ item, addons10, addons15, open, onClose, onConfirm }) {
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState(new Set());
  const [note, setNote] = useState('');

  if (!item) return null;

  const hasSpreadOptions = item.spread_options?.length > 0;
  const hasAddons = addons10.length > 0 || addons15.length > 0;
  const isSnack = item.category === '點心系列';

  const toggleAddon = (id) => {
    setSelectedAddons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm({
      item,
      spread: selectedSpread,
      addons: [...selectedAddons],
      note,
    });
    // reset
    setSelectedSpread(null);
    setSelectedAddons(new Set());
    setNote('');
  };

  const handleClose = () => {
    setSelectedSpread(null);
    setSelectedAddons(new Set());
    setNote('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {item.name}
            <span className="ml-2 text-accent font-bold">${item.price}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Spread options for snack items */}
          {hasSpreadOptions && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">選擇口味</p>
              <div className="flex flex-wrap gap-2">
                {item.spread_options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSelectedSpread(opt === selectedSpread ? null : opt)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      selectedSpread === opt
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {selectedSpread === opt && <Check className="inline w-3 h-3 mr-1" />}
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Addons — only show for non-snack items */}
          {!isSnack && hasAddons && (
            <>
              {addons10.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">加料 +$10</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {addons10.map(a => (
                      <label key={a.id} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={selectedAddons.has(a.id)} onCheckedChange={() => toggleAddon(a.id)} />
                        <span className="text-sm">{a.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {addons15.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">加料 +$15</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {addons15.map(a => (
                      <label key={a.id} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={selectedAddons.has(a.id)} onCheckedChange={() => toggleAddon(a.id)} />
                        <span className="text-sm">{a.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
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

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>取消</Button>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90">
            加入訂單
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}