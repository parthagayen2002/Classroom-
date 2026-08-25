'use client';

import { motion } from 'framer-motion';
import { achievements, certificatesLink, experience } from '@/data/content';
import { ExperienceCard } from '@/sections/ExperienceSection';
import { DURATION, EASE } from '@/config/motion';

export function AchievementsSection({ isVisible }) {
  return (
    <section
      id="achievements"
      className={`section relative px-6 md:px-12 lg:px-24 pt-32 pb-20 ${isVisible ? 'is-visible' : ''}`}
      aria-labelledby="achievements-heading"
    >
      <div className="max-w-4xl mx-auto w-full text-center">
        <h2
          id="achievements-heading"
          className="reveal-text text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]"
        >
          Hard Earned &amp;
          <br />
          <span className="text-gradient">Achievements</span>
        </h2>

        <motion.div
          className="reveal-text glass-panel rounded-3xl border border-dark-border p-10 md:p-16 mt-12"
          style={{ transitionDelay: '150ms' }}
          initial={{ opacity: 0, y: 30 }}
          // This element also carries the CSS `.reveal-text` class, but
          // framer-motion writes opacity/transform as inline styles which
          // win over the CSS rule - so an unconditional `animate` here was
          // silently short-circuiting the same scroll-triggered reveal
          // every other `.reveal-text` element already gets "for free".
          // Gating on `isVisible` (same fix as ProjectCard/ContactCard)
          // makes the two systems agree instead of fighting.
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: DURATION.cardEnter, ease: EASE.standard }}
        >
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-cyan/20 to-primary-violet/20 flex items-center justify-center text-primary-cyan glass-panel border border-dark-border">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7a2 2 0 012-2h2a2 2 0 012 2v10M5 21h14M12 3v2m-6.364.636l1.414 1.414M18.364 5.636l-1.414 1.414M4 21a2 2 0 002-2V9a2 2 0 00-2-2 2 2 0 00-2 2v10a2 2 0 002 2zm16 0a2 2 0 002-2V9a2 2 0 00-2-2 2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-violet/50 to-primary-cyan/50 blur-[2px] animate-pulse-slow" />
          </div>

          <div className="space-y-3 mb-10">
            {achievements.map((achievement) => (
              <p key={achievement.id} className="text-lg md:text-xl text-slate-200">
                <span className="text-primary-cyan font-semibold">{achievement.placement}</span>
                {' — '}
                {achievement.title}
                <span className="text-slate-500">
                  {' '}
                  ({achievement.location}, {achievement.year}
                  {achievement.team ? ` · ${achievement.team}` : ''})
                </span>
              </p>
            ))}
          </div>

          <a
            href={certificatesLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary px-8 py-3 inline-flex items-center gap-2"
          >
            VIEW ALL CERTIFICATES
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H8M17 7v9" />
            </svg>
          </a>
        </motion.div>

        {/* Applied work - moved here from the removed standalone Experience
            section. Same ExperienceCard component, same real content, just
            living in Achievements now instead of its own section. */}
        <div className="grid gap-6 mt-10 text-left">
          {experience.map((item, index) => (
            <ExperienceCard key={item.id} item={item} index={index} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
}
