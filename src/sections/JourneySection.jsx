'use client';

import { motion } from 'framer-motion';
import { journey } from '@/data/content';
import { SectionHeader } from '@/components/Navigation';

const journeyIcons = {
  rocket: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  hammer: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  compass: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19l-2-7m14 0l-2-7m0 0l2-7m-2 7M12 3l2 7m0 0l-2 7" />
    </svg>
  ),
  sparkles: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m10-12v4m2-2h4m-4 16v4m2-2h4M13 3l4 4-4 4m8-8l-4 4 4 4" />
    </svg>
  ),
  infinity: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

const journeyGradients = {
  rocket: 'from-primary-cyan to-primary-cyan-bright',
  hammer: 'from-primary-violet to-primary-violet-bright',
  compass: 'from-primary-cyan to-primary-violet',
  sparkles: 'from-primary-violet to-primary-violet-bright',
  infinity: 'from-primary-cyan to-primary-cyan-bright',
};

export function JourneyEvent({ event, index, isVisible, isLast }) {
  const icon = journeyIcons[event.icon] || journeyIcons.rocket;
  const gradient = journeyGradients[event.icon] || journeyGradients.rocket;
  const isEven = index % 2 === 0;
  
  return (
    <motion.div
      className={`relative flex gap-8 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`flex-1 ${isEven ? 'md:pr-8 text-right' : 'md:pl-8'} relative`}>
        <div className="absolute top-8 right-0 w-full h-full md:w-1/2 md:h-auto -translate-x-1/2 md:translate-x-0 border-r border-dark-border">
          <div className={`absolute top-8 right-0 w-3 h-3 rounded-full bg-gradient-to-br ${gradient} border-4 border-dark-bg z-10`} />
          {!isLast && (
            <div className={`absolute top-14 right-1.5 w-px h-[calc(100%-28px)] bg-gradient-to-b ${gradient} from-30% to-transparent`} />
          )}
        </div>
        
        <div className="relative z-10 glass-panel rounded-2xl p-6 md:p-8 border border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-primary-cyan/70">
              {event.year}
            </span>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient}/20 flex items-center justify-center text-primary-cyan`}>
              {icon}
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">{event.title}</h3>
          <p className="text-slate-300 mb-6">{event.description}</p>
          <div className="flex flex-wrap gap-2">
            {event.highlights.map((highlight, i) => (
              <span
                key={highlight}
                className="px-3 py-1 text-xs font-mono text-slate-400 bg-dark-bg border border-dark-border rounded-full"
              >
                {highlight}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className={`flex-1 ${isEven ? 'md:pl-8' : 'md:pr-8'}`}>
        <div className="aspect-square max-w-md mx-auto relative">
          <div className="absolute inset-0 border-2 border-primary-cyan/10 rounded-2xl animate-rotate-slow" />
          <div className="absolute inset-4 border-1 border-primary-violet/10 rounded-xl animate-rotate-slow" style={{ animationDirection: 'reverse' }} />
          
          <div className="relative z-10 aspect-square bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-8 glass-panel flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 relative">
                <svg className="w-full h-full text-primary-cyan" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="251" className="animate-rotate-slow" />
                  <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="8,8" className="animate-rotate-slow" style={{ animationDirection: 'reverse' }} />
                  <circle cx="50" cy="50" r="10" fill="currentColor" opacity="0.8" className="animate-pulse-slow" />
                </svg>
              </div>
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">{event.title}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function JourneySection({ isVisible }) {
  return (
    <section 
      id="journey" 
      className={`section relative px-6 md:px-12 lg:px-24 pt-32 pb-20 ${isVisible ? 'is-visible' : ''}`}
      aria-labelledby="journey-heading"
    >
      <div className="max-w-7xl mx-auto">
        <div className="reveal-text">
          <SectionHeader 
            title="JOURNEY" 
            subtitle="TEMPORAL TRAJECTORY" 
          />
        </div>
        
        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-primary-cyan/30 via-transparent to-primary-violet/30 hidden md:block" />
          
          <div className="space-y-16 md:space-y-24">
            {journey.map((event, index) => (
              <JourneyEvent 
                key={event.id} 
                event={event} 
                index={index} 
                isVisible={isVisible}
                isLast={index === journey.length - 1}
              />
            ))}
          </div>
        </div>
        
        <div className="mt-24 text-center reveal-text">
          <div className="glass-panel rounded-2xl p-8 md:p-12 border border-dark-border max-w-2xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              THE NEXT CHAPTER
            </h3>
            <p className="text-slate-400 mb-8">
              Continuously evolving. Always learning. Building the future 
              of intelligent systems, one breakthrough at a time.
            </p>
            <button className="btn-primary px-8 py-3">
              JOIN THE JOURNEY
              <svg className="ml-2 w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
