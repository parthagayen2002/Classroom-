'use client';

import { motion } from 'framer-motion';
import { contactLinks } from '@/data/content';
import { SectionHeader } from '@/components/Navigation';
import { DURATION, EASE } from '@/config/motion';

const contactIcons = {
  mail: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  github: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
  linkedin: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  ),
  instagram: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
};

// Adds a <wbr> after each "@" and "/" so a long email or URL wraps at a
// natural point on a narrow screen ("name@" / "gmail.com") rather than
// mid-word. <wbr> is invisible and isn't included when the text is copied.
function withBreakPoints(value) {
  return value.split(/(?<=[@/])/).flatMap((part, i) => (i === 0 ? [part] : [<wbr key={i} />, part]));
}

export function ContactCard({ link, index, isVisible }) {
  const icon = contactIcons[link.icon] || contactIcons.mail;
  
  return (
    <motion.button
      className="group relative flex items-center gap-4 p-5 glass-panel rounded-xl border border-dark-border transition-all duration-300 w-full text-left"
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
      // Gated on `isVisible` for the same reason as ProjectCard - see the
      // comment there.
      animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
      transition={{ duration: DURATION.cardEnter, delay: index * DURATION.cardStagger, ease: EASE.standard }}
      whileHover={{ x: index % 2 === 0 ? 8 : -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => window.open(link.href, '_blank')}
    >
      <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-cyan/20 to-primary-violet/20 flex items-center justify-center text-primary-cyan group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>

      {/* min-w-0 + overflow-wrap:anywhere let a long value (the email
          address) wrap inside the card on a phone instead of pushing the
          card wider than the screen. */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono uppercase tracking-widest text-primary-cyan/70 mb-1">
          {link.label}
        </div>
        <div className="text-white font-medium text-sm sm:text-base [overflow-wrap:anywhere]">{withBreakPoints(link.value)}</div>
      </div>

      <svg className="shrink-0 w-5 h-5 text-slate-500 group-hover:text-primary-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </motion.button>
  );
}

export function ContactSection({ isVisible }) {
  return (
    <section 
      id="contact" 
      className={`section relative px-6 md:px-12 lg:px-24 pt-32 pb-20 ${isVisible ? 'is-visible' : ''}`}
      aria-labelledby="contact-heading"
    >
      <div className="max-w-7xl mx-auto">
        <div className="reveal-text">
          <SectionHeader
            title="CONTACT"
            subtitle="GET IN TOUCH"
          />
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="reveal-text" style={{ transitionDelay: '0ms' }}>
            <div className="grid sm:grid-cols-2 gap-4">
              {contactLinks.map((link, index) => (
                <ContactCard
                  key={link.id}
                  link={link}
                  index={index}
                  isVisible={isVisible}
                />
              ))}
            </div>
          </div>
          
          <div className="reveal-text" style={{ transitionDelay: '200ms' }}>
            <div className="glass-panel rounded-2xl p-8 md:p-12 border border-dark-border h-full">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
                INITIATE CONNECTION
              </h3>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Ready to collaborate on cutting-edge AI projects? 
                Let's discuss how we can push the boundaries of 
                intelligent systems together.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 glass-panel rounded-xl border border-dark-border">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-cyan to-primary-violet flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-primary-cyan/70">PGP PUBLIC KEY</div>
                    <div className="text-sm font-mono text-slate-400">Available on request</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 glass-panel rounded-xl border border-dark-border">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-cyan to-primary-cyan-bright flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-primary-cyan/70">RESPONSE TIME</div>
                    <div className="text-sm font-mono text-slate-400">Usually within 24 hours</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 glass-panel rounded-xl border border-dark-border">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-violet to-primary-violet-bright flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-primary-violet/70">AVAILABILITY</div>
                    <div className="text-sm font-mono text-slate-400">Open to opportunities</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
