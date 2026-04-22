import React from 'react';
import { motion } from 'framer-motion';

const tables = [1, 2, 3, 4];

export default function TableSelector({ selected, onSelect }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
        選擇桌號
      </h3>
      <div className="grid grid-cols-4 gap-3">
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
      </div>
    </div>
  );
}