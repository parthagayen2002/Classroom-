'use client';

import { motion } from 'framer-motion';
import { DURATION, EASE } from '@/config/motion';

export function ExperienceCard({ item, index, isVisible }) {
  return (
    <motion.article
      className="group relative glass-panel rounded-2xl p-6 md:p-8 border border-dark-border overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      // Gated on `isVisible` for the same reason as ProjectCard (see
      // ProjectsSection.jsx) - AchievementsSection now forwards its own
      // `isVisible` prop down into each card.
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: DURATION.cardEnter, delay: index * DURATION.cardStagger, ease: EASE.standard }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-primary-cyan to-primary-violet transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-cyan/20 to-primary-violet/20 flex items-center justify-center text-primary-cyan glass-panel border border-dark-border">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 21V9a2 2 0 012-2h2a2 2 0 012 2v12m-6 0h6m-6 0H5a2 2 0 01-2-2V5a2 2 0 012-2h2m10 18h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m0 4h.01M7 7h.01M7 11h.01M7 15h.01" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <span className="inline-block px-3 py-1 mb-2 text-xs font-mono uppercase tracking-widest text-primary-cyan border border-primary-cyan/30 rounded-full glass-panel">
            {item.type}
          </span>
          <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">
            {item.title}
          </h3>
          {item.duration && (
            <span className="text-xs font-mono text-slate-500 mt-1 block">{item.duration}</span>
          )}
          <p className="text-slate-300 leading-relaxed mt-3">
            {item.description}
          </p>

          <div className="flex flex-wrap gap-2 mt-5">
            {item.technologies.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 text-xs font-mono text-slate-300 bg-dark-card border border-dark-border rounded-full group-hover:border-primary-cyan/30 group-hover:text-primary-cyan transition-all duration-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// The standalone "Experience" section this card used to live in was removed
// on request; ExperienceCard (above) is reused directly inside
// AchievementsSection.jsx now instead.
