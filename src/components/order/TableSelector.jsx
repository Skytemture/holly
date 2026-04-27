import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';

const tables = [1, 2, 3, 4];

export default function TableSelector({ selected, onSelect }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
        選擇桌號 / 外帶
      </h3>
      <div className="grid grid-cols-5 gap-3">
        {tables.map((num) => (
          <motion.button
            key={num}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(num)}
            className={`relative py-4 rounded-xl text-lg font-semibold transition-all duration-200 ${
              selected === num
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'bg-card border border-border hover:border-primary/40 hover:shadow-md'
            }`}
          >
            {num}
            {selected === num && (
              <motion.div
                layoutId="table-indicator"
                className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-card"
              />
            )}
          </motion.button>
        ))}

        {/* Takeout button — table_no = 0 */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(0)}
          className={`relative py-4 rounded-xl text-sm font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
            selected === 0
              ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/20'
              : 'bg-card border border-border hover:border-accent/40 hover:shadow-md'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>外帶</span>
          {selected === 0 && (
            <motion.div
              layoutId="table-indicator"
              className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-card"
            />
          )}
        </motion.button>
      </div>
    </div>
  );
}