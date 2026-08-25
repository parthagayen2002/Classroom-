'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { navigation } from '@/data/content';

export function Navigation({ activeSection, setActiveSection, isMobile, toggleMobileMenu }) {
  return (
    <>
      <nav
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-40 hidden md:flex items-center gap-8 px-6 py-3 glass-panel transition-all duration-500 ${isMobile ? 'md:hidden' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`relative px-3 py-2 text-xs font-medium uppercase tracking-widest transition-all duration-300 ${
              activeSection === item.id
                ? 'text-primary-cyan'
                : 'text-slate-400 hover:text-primary-cyan/70'
            }`}
            style={activeSection === item.id ? { textShadow: '0 0 12px rgba(255, 45, 149, 0.55), 0 0 24px rgba(155, 92, 255, 0.35)' } : undefined}
            aria-current={activeSection === item.id ? 'page' : undefined}
          >
            {item.label}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 rounded-full bg-gradient-to-r from-primary-cyan to-primary-violet"
              style={{ boxShadow: '0 0 8px rgba(255, 45, 149, 0.7), 0 0 16px rgba(155, 92, 255, 0.4)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: activeSection === item.id ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        ))}
      </nav>

      <button
        onClick={toggleMobileMenu}
        className="fixed top-6 right-6 z-50 p-3 glass-panel transition-all duration-300 hover:border-primary-cyan/30 md:hidden"
        aria-label={isMobile ? 'Close menu' : 'Open menu'}
        aria-expanded={isMobile}
      >
        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobile ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      <AnimatePresence>
      {isMobile && (
        <motion.div
          className="fixed inset-0 z-40 bg-dark-bg/95 backdrop-blur-sm flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={toggleMobileMenu}
            className="absolute top-6 right-6 p-3 text-slate-400 hover:text-primary-cyan"
            aria-label="Close menu"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <nav className="flex flex-col items-center gap-8" role="navigation" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  toggleMobileMenu();
                }}
                className={`text-2xl md:text-3xl font-medium uppercase tracking-widest transition-all duration-300 ${
                  activeSection === item.id
                    ? 'text-primary-cyan'
                    : 'text-slate-400 hover:text-primary-cyan'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-current={activeSection === item.id ? 'page' : undefined}
              >
                {item.label}
              </motion.button>
            ))}
          </nav>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}

export function SectionHeader({ title, subtitle, className = '' }) {
  return (
    <div className={`text-center mb-16 ${className}`}>
      <span className="inline-block px-4 py-1.5 mb-6 text-xs font-mono uppercase tracking-widest text-primary-cyan/70 border border-primary-cyan/30 rounded-full glass-panel">
        {subtitle}
      </span>
      <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tighter text-white mb-4">
        <span className="text-gradient">{title}</span>
      </h2>
      <div className="w-24 h-px bg-gradient-to-r from-primary-cyan via-primary-violet to-primary-green mx-auto" />
    </div>
  );
}