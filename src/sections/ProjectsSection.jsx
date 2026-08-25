'use client';

import { motion } from 'framer-motion';
import { projects } from '@/data/content';
import { SectionHeader } from '@/components/Navigation';
import { DURATION, EASE } from '@/config/motion';

const techColors = {
  'Python': 'bg-primary-violet/10 text-primary-cyan border-primary-violet/30',
  'PyTorch': 'bg-orange-600/20 text-orange-400 border-orange-500/30',
  'FastAPI': 'bg-primary-violet/10 text-primary-cyan border-primary-violet/30',
  'React': 'bg-primary-violet/10 text-primary-cyan border-primary-violet/30',
  'Tailwind CSS': 'bg-primary-violet/10 text-primary-cyan border-primary-violet/30',
  'Recharts': 'bg-primary-violet/10 text-primary-cyan border-primary-violet/30',
  'SQLite': 'bg-slate-600/20 text-slate-300 border-slate-500/30',
  'CodeCarbon': 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  'Hugging Face Transformers': 'bg-amber-600/20 text-amber-400 border-amber-500/30',
  'Google Gemini API': 'bg-primary-violet/10 text-primary-cyan border-primary-violet/30',
  'YOLO': 'bg-red-600/20 text-red-400 border-red-500/30',
  'OpenCV': 'bg-primary-violet/10 text-primary-cyan border-primary-violet/30',
  'Computer Vision': 'bg-primary-violet/10 text-primary-cyan border-primary-violet/30',
  'Deep Learning': 'bg-primary-violet/10 text-primary-cyan border-primary-violet/30',
};

export function ProjectCard({ project, index, isVisible }) {
  return (
    <motion.article
      className="group relative glass-panel rounded-2xl border border-dark-border overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      // Gated on `isVisible` (from the scroll IntersectionObserver in
      // App.jsx) instead of firing unconditionally on mount - every section
      // mounts together at page load on this single-page site, so an
      // unconditional `animate` here completed off-screen before the user
      // ever scrolled down to see it. This also lets the card fade back out
      // if scrolled past, matching how .reveal-text already behaves.
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: DURATION.cardEnter, delay: index * DURATION.cardStagger, ease: EASE.standard }}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-cyan/5 via-transparent to-primary-violet/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-primary-cyan to-primary-violet transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left z-10" />

      {/* Project photo */}
      <div className="relative aspect-video w-full overflow-hidden bg-dark-bg">
        <img
          src={project.image}
          alt={`${project.title} screenshot`}
          loading="lazy"
          className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent opacity-60" />
        <span className="absolute top-4 left-4 px-3 py-1 text-xs font-mono uppercase tracking-widest text-primary-cyan border border-primary-cyan/30 rounded-full glass-panel">
          {project.category}
        </span>
        <span className="absolute top-4 right-4 text-xs font-mono text-slate-300 px-3 py-1 rounded-full glass-panel border border-dark-border">
          {project.year}
        </span>
      </div>

      <div className="relative z-10 p-6 md:p-8 space-y-6">
        <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">
          {project.title}
        </h3>

        <p className="text-slate-300 leading-relaxed text-base md:text-lg">
          {project.description}
        </p>

        {project.features?.length > 0 && (
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {project.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-slate-400">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          {project.technologies.map((tech) => (
            <span
              key={tech}
              className={`px-3 py-1 text-xs font-mono rounded-full border transition-all duration-300 ${techColors[tech] || 'bg-slate-800/50 text-slate-400 border-slate-600/50'} group-hover:scale-105`}
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="pt-4 border-t border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono">PROJECT</span>
            <span className="w-px h-4 bg-slate-700" />
            <span className="font-mono text-primary-cyan/70">#{String(index + 1).padStart(2, '0')}</span>
          </div>
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="view"
            className="btn-secondary text-xs py-2 px-4 group-hover:border-primary-cyan/50 group-hover:text-primary-cyan"
          >
            VIEW ON GITHUB
            <svg className="ml-2 w-4 h-4 inline-block transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </motion.article>
  );
}

export function ProjectsSection({ isVisible }) {
  return (
    <section
      id="projects"
      className={`section relative px-6 md:px-12 lg:px-24 pt-32 pb-20 ${isVisible ? 'is-visible' : ''}`}
      aria-labelledby="projects-heading"
    >
      <div className="max-w-5xl mx-auto">
        <div
          className="reveal-text"
          style={{ transitionDelay: '0ms' }}
        >
          <SectionHeader
            title="PROJECTS"
            subtitle="SELECTED WORK"
          />
        </div>

        <div className="grid gap-8">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>

        <div className="mt-16 text-center reveal-text" style={{ transitionDelay: '400ms' }}>
          <a href="https://github.com/parthagayen2002" target="_blank" rel="noopener noreferrer" className="btn-primary px-10 py-4 inline-block">
            VIEW ALL PROJECTS
            <svg className="ml-3 w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
