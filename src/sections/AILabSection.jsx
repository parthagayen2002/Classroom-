'use client';

import { motion } from 'framer-motion';
import { aiLabModules } from '@/data/content';
import { SectionHeader } from '@/components/Navigation';

const moduleIcons = {
  brain: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.734-.988-2.386l-.548-.547z" />
    </svg>
  ),
  eye: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  cpu: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
  sparkles: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m10-12v4m2-2h4m-4 16v4m2-2h4M13 3l4 4-4 4m8-8l-4 4 4 4" />
    </svg>
  ),
  bot: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
};

const moduleColors = {
  brain: 'from-primary-cyan to-primary-cyan-bright',
  eye: 'from-primary-violet to-primary-violet-bright',
  cpu: 'from-primary-cyan to-primary-violet',
  sparkles: 'from-primary-violet to-primary-violet-bright',
  bot: 'from-primary-cyan to-primary-cyan-bright',
};

export function AIModuleCard({ module, index, isVisible }) {
  const icon = moduleIcons[module.icon] || moduleIcons.brain;
  const gradient = moduleColors[module.icon] || moduleColors.brain;
  
  return (
    <motion.article
      className="group relative glass-panel rounded-2xl p-6 md:p-8 border border-dark-border overflow-hidden flex flex-col h-full"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -8, scale: 1.01 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-cyan/5 via-transparent to-primary-violet/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
              {icon}
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-primary-cyan/70 block mb-1">
                MODULE
              </span>
              <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                {module.label}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold font-mono text-primary-cyan">
              {module.progress}%
            </div>
            <div className="text-xs text-slate-500">READINESS</div>
          </div>
        </div>
        
        <p className="text-slate-300 leading-relaxed mb-6 flex-1">
          {module.description}
        </p>
        
        <div className="mb-6">
          <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${module.progress}%` }}
              transition={{ duration: 1.5, delay: index * 0.1 + 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {module.technologies.map((tech, i) => (
            <span
              key={tech}
              className="px-3 py-1 text-xs font-mono text-slate-400 bg-dark-bg border border-dark-border rounded-full transition-all duration-300 group-hover:border-primary-cyan/30 group-hover:text-primary-cyan"
            >
              {tech}
            </span>
          ))}
        </div>
        
        <button className="btn-secondary text-sm w-full mt-auto group-hover:border-primary-cyan/50 group-hover:text-primary-cyan">
          EXPLORE MODULE
          <svg className="ml-2 w-4 h-4 inline-block transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>
    </motion.article>
  );
}

export function AILabSection({ isVisible }) {
  return (
    <section 
      id="ai-lab" 
      className={`section relative px-6 md:px-12 lg:px-24 pt-32 pb-20 ${isVisible ? 'is-visible' : ''}`}
      aria-labelledby="ai-lab-heading"
    >
      <div className="max-w-7xl mx-auto">
        <div className="reveal-text">
          <SectionHeader 
            title="AI LAB" 
            subtitle="RESEARCH MODULES" 
          />
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiLabModules.map((module, index) => (
            <AIModuleCard 
              key={module.id} 
              module={module} 
              index={index} 
              isVisible={isVisible}
            />
          ))}
        </div>
        
        <div className="mt-16 reveal-text">
          <div className="glass-panel rounded-2xl p-8 md:p-12 border border-dark-border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  EXPERIMENTAL RESEARCH
                </h3>
                <p className="text-slate-400 max-w-xl">
                  Active research in multimodal AI, neuromorphic computing, and 
                  quantum machine learning. Collaborating with academic institutions 
                  and industry partners.
                </p>
              </div>
              <button className="btn-primary px-8 py-3 whitespace-nowrap">
                VIEW RESEARCH
                <svg className="ml-2 w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
