'use client';

import { motion } from 'framer-motion';
import { heroContent } from '@/data/content';
import { SolarSystem } from '@/three/components/SolarSystem';

const socialIcons = {
  github: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
  linkedin: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  ),
  email: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
};

// Fades the Solar System canvas's own left edge to transparent (not the DOM
// around it - see `edgeMask` on <SolarSystem>), so its container's edge
// never reads as a hard seam. Where the Sun/planets actually sit on screen
// is controlled separately, by how the container below is sized and
// positioned (flush right, narrower than the section) - a 3D camera always
// renders looking at the world origin dead-centre of its canvas, so a mask
// alone can hide pixels but can't relocate where the Sun itself appears.
const SOLAR_SYSTEM_EDGE_MASK = 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 14%, #000 42%)';

export function HeroSection({ isVisible, sectionProgressRef }) {
  const { eyebrow, name, tagline, paragraph, meta, skills, socials } = heroContent;

  return (
    <section
      id="home"
      className={`section relative overflow-hidden px-6 md:px-12 lg:px-24 pt-32 pb-20 ${isVisible ? 'is-visible' : ''}`}
      aria-labelledby="home-heading"
    >
      {/* Fullscreen-height, right-biased Solar System - the visual
          centrepiece of the Home background, not a bounded widget in a grid
          cell. Flush against the section's own right/top/bottom edges (so
          those never show a seam - the canvas clears to the same colour as
          the page) and only fading out on its left edge, well clear of the
          name/description column. Confined to the Home section only (sized
          by #home, not the viewport), so About/Experience/etc are
          untouched. Faded on small screens where there's no room to push it
          aside without sitting on top of the text. */}
      <div className="absolute inset-y-0 right-0 z-0 w-full lg:w-[68%] opacity-40 sm:opacity-60 lg:opacity-100">
        <SolarSystem edgeMask={SOLAR_SYSTEM_EDGE_MASK} sectionProgressRef={sectionProgressRef} />
      </div>

      {/* Dark readability gradient - keeps the left-column text legible
          regardless of what the solar system is doing behind it, without
          needing a solid card background. */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-r from-dark-bg via-dark-bg/55 to-transparent" />

      {/* pointer-events-none: this wrapper is w-full (spans the section's
          full centred width for layout purposes) but its only visible
          content is the max-w-xl column on the left - the empty two-thirds
          to the right otherwise sits directly over the Solar System (z-0
          below) and silently swallows every click/hover meant for a planet,
          even though nothing is visibly there. Interactive children
          (the social links below) opt back in with pointer-events-auto;
          nothing else in this column is actually interactive (the skill
          chips are already cursor-default/non-interactive). */}
      <div className="relative z-10 max-w-7xl mx-auto w-full pointer-events-none">
        <div className="max-w-xl">
          <div className="space-y-6">
            <span
              className="reveal-text inline-block px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-primary-cyan/70 border border-primary-cyan/30 rounded-full glass-panel"
            >
              {eyebrow}
            </span>

            <h1
              id="home-heading"
              className="reveal-text text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tighter text-white leading-[1.05]"
              style={{ transitionDelay: '100ms' }}
            >
              {name}
            </h1>

            <div
              className="reveal-text w-24 h-px bg-gradient-to-r from-primary-cyan via-primary-violet to-primary-cyan-bright"
              style={{ transitionDelay: '150ms' }}
            />

            <p
              className="reveal-text text-xl md:text-2xl text-gradient font-medium"
              style={{ transitionDelay: '200ms' }}
            >
              {tagline}
            </p>

            <p
              className="reveal-text max-w-xl text-slate-400 leading-relaxed text-base md:text-lg"
              style={{ transitionDelay: '300ms' }}
            >
              {paragraph}
            </p>

            <p
              className="reveal-text text-xs font-mono uppercase tracking-widest text-slate-500"
              style={{ transitionDelay: '350ms' }}
            >
              {meta}
            </p>

            <div
              className="reveal-text flex flex-wrap gap-3"
              style={{ transitionDelay: '400ms' }}
            >
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-4 py-2 text-sm font-mono text-slate-300 bg-dark-card border border-dark-border rounded-lg hover:border-primary-cyan/30 hover:text-primary-cyan transition-all duration-300 cursor-default"
                >
                  {skill}
                </span>
              ))}
            </div>

            <div
              className="reveal-text flex items-center gap-4"
              style={{ transitionDelay: '450ms' }}
            >
              {socials.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  target={social.id === 'email' ? undefined : '_blank'}
                  rel={social.id === 'email' ? undefined : 'noopener noreferrer'}
                  aria-label={social.label}
                  className="pointer-events-auto w-12 h-12 rounded-xl glass-panel border border-dark-border flex items-center justify-center text-slate-300 hover:text-primary-cyan hover:border-primary-cyan/30 transition-all duration-300"
                >
                  {socialIcons[social.id]}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.button
        type="button"
        onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-slate-500 hover:text-primary-cyan transition-colors cursor-pointer"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        aria-label="Scroll to About section"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest">Scroll</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </motion.button>
    </section>
  );
}
