'use client';

import { motion } from 'framer-motion';
import { navigation, aboutContent } from '@/data/content';
import { AvatarPortrait } from '@/three/components/AvatarPortrait';

export function Navigation({ activeSection, setActiveSection, isMobile, toggleMobileMenu }) {
  return (
    <>
      <nav 
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-8 px-6 py-3 glass-panel transition-all duration-500 ${isMobile ? 'hidden' : ''}`}
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
            aria-current={activeSection === item.id ? 'page' : undefined}
          >
            {item.label}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 rounded-full bg-gradient-to-r from-primary-cyan to-primary-violet"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: activeSection === item.id ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        ))}
      </nav>

      <button
        onClick={toggleMobileMenu}
        className={`fixed top-6 right-6 z-50 p-3 glass-panel transition-all duration-300 hover:border-primary-cyan/30 ${!isMobile ? 'hidden md:block' : 'md:hidden'}`}
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
      <div className="w-24 h-px bg-gradient-to-r from-primary-cyan via-primary-violet to-primary-cyan-bright mx-auto" />
    </div>
  );
}

export function AboutSection({ isVisible }) {
  const { headline, subheadline, paragraphs, stats, skills } = aboutContent;
  
  return (
    <section 
      id="about" 
      className={`section relative px-6 md:px-12 lg:px-24 pt-32 pb-20 ${isVisible ? 'is-visible' : ''}`}
      aria-labelledby="about-heading"
    >
      <div className="max-w-7xl mx-auto">
        <SectionHeader 
          title="ABOUT" 
          subtitle="NEURAL PROFILE" 
          className="reveal-text"
        />
        
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div className="reveal-text" style={{ transitionDelay: '100ms' }}>
              <h3 id="about-heading" className="text-3xl md:text-4xl font-bold text-white mb-6">
                {headline}
              </h3>
              <p className="text-lg text-primary-cyan/80 font-mono tracking-wide mb-8">
                {subheadline}
              </p>
              <div className="space-y-6 text-slate-300 leading-relaxed text-base md:text-lg">
                {paragraphs.map((p, i) => (
                  <p key={i} className="reveal-text" style={{ transitionDelay: `${200 + i * 100}ms` }}>
                    {p}
                  </p>
                ))}
              </div>
            </div>
            
            <div className="reveal-text grid grid-cols-1 sm:grid-cols-3 gap-6" style={{ transitionDelay: '500ms' }}>
              {stats.map((stat, i) => (
                <div 
                  key={stat.label} 
                  className="glass-panel p-6 rounded-xl border border-dark-border hover:border-primary-cyan/30 transition-all duration-300"
                >
                  <div className="text-2xl md:text-3xl font-bold text-primary-cyan font-mono leading-tight break-words">
                    {stat.value}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mt-2">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="reveal-text" style={{ transitionDelay: '600ms' }}>
              <h4 className="text-sm font-medium uppercase tracking-widest text-primary-cyan/70 mb-4">
                CORE COMPETENCIES
              </h4>
              <div className="flex flex-wrap gap-3">
                {skills.map((skill, i) => (
                  <span
                    key={skill}
                    className="px-4 py-2 text-sm font-mono text-slate-300 bg-dark-card border border-dark-border rounded-lg hover:border-primary-cyan/30 hover:text-primary-cyan transition-all duration-300 cursor-default"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="relative reveal-text" style={{ transitionDelay: '200ms' }}>
            <div className="aspect-square max-w-md mx-auto relative">
              <div className="absolute inset-0 border-2 border-primary-cyan/20 rounded-3xl animate-rotate-slow" />
              <div className="absolute inset-4 border-1 border-primary-violet/10 rounded-2xl animate-rotate-slow" style={{ animationDirection: 'reverse' }} />
              <div className="absolute inset-8 border-1 border-primary-cyan-bright/10 rounded-xl animate-pulse-slow" />
              
              <div className="relative z-10 aspect-square bg-gradient-to-br from-dark-card to-dark-bg rounded-3xl p-8 glass-panel flex items-center justify-center">
                <div className="w-full h-full">
                  <AvatarPortrait />
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-gradient-to-br from-primary-cyan/10 to-primary-violet/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-8 -left-8 w-48 h-48 bg-gradient-to-br from-primary-cyan-bright/10 to-primary-cyan/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
