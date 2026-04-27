const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Snowflake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_ORDER = ['豆花系列', '冰品系列', '仙草系列', '點心系列', '冬季限定', '加料'];

const SEASONAL_KEY = 'holly_seasonal_enabled';

export default function ItemAvailabilityPanel() {
  const [open, setOpen] = React.useState(false);
  const [seasonalEnabled, setSeasonalEnabled] = useState(
    () => localStorage.getItem(SEASONAL_KEY) === 'true'
  );
  const queryClient = useQueryClient();

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems-all'],
    queryFn: () => db.entities.MenuItem.list(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, available }) => db.entities.MenuItem.update(id, { available }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems-all'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });

  const toggleSeasonal = () => {
    const next = !seasonalEnabled;
    setSeasonalEnabled(next);
    localStorage.setItem(SEASONAL_KEY, String(next));
    // Dispatch storage event so OrderPage reacts
    window.dispatchEvent(new Event('seasonal-changed'));
  };

  const grouped = {};
  menuItems.forEach(item => {
    const cat = item.is_addon ? '加料' : (item.category || '其他');
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const soldOutCount = menuItems.filter(i => i.available === false).length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">品項管理</span>
          <span className="text-xs text-muted-foreground">
            ({soldOutCount} 項售罄)
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="px-5 py-4 space-y-4">

              {/* Seasonal toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">冬季限定</p>
                    <p className="text-xs text-blue-600">開啟後前台顯示冬季限定分類</p>
                  </div>
                </div>
                <button
                  onClick={toggleSeasonal}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all active:scale-95 ${
                    seasonalEnabled
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-blue-500 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {seasonalEnabled
                    ? <><ToggleRight className="w-4 h-4" /> 已開啟</>
                    : <><ToggleLeft className="w-4 h-4" /> 已關閉</>
                  }
                </button>
              </div>

              {/* Item availability toggles */}
              {CATEGORY_ORDER.map(cat => grouped[cat] ? (
                <div key={cat} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    {cat === '冬季限定' && <Snowflake className="w-3 h-3 text-blue-400" />}
                    {cat}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {grouped[cat].map(item => (
                      <button
                        key={item.id}
                        onClick={() => toggleMutation.mutate({ id: item.id, available: item.available === false ? true : false })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                          item.available !== false
                            ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                            : 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
                        }`}
                      >
                        {item.available !== false
                          ? <ToggleRight className="w-3.5 h-3.5" />
                          : <ToggleLeft className="w-3.5 h-3.5" />
                        }
                        {item.name}
                        {item.available === false && <span className="ml-1 opacity-70">售罄</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}