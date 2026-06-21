
import { motion, AnimatePresence } from 'motion/react';
import React, { useEffect, useState } from 'react';

export default function ThemeTransitionOverlay({ isDark, origin }: { isDark: boolean, origin: { x: number, y: number } }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => setShow(false), 800);
    return () => clearTimeout(timer);
  }, [isDark]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
          initial={{ clipPath: `circle(0% at ${origin.x}px ${origin.y}px)` }}
          animate={{ clipPath: `circle(150% at ${origin.x}px ${origin.y}px)` }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={`absolute inset-0 ${isDark ? 'bg-black' : 'bg-white'}`} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
