'use client';

import { motion } from 'framer-motion';
import { DURATION } from '@/config/motion';
import { useResponsiveTier } from '@/hooks/useResponsiveTier';

// Visual half of usePageTransition - see that hook for the phase timing.
// Always mounted (cheap: one motion.div + two conditionally-rendered glow
// blobs) rather than mount/unmount via AnimatePresence, since there's
// nothing to coordinate an exit animation around here - the phase machine
// itself already drives the fade back to 0 before returning to 'idle'.
//
// Sits at z-30: above section content (z-10) but below the nav bar and
// custom cursor (z-40+), so the nav never jumps or gets covered mid-transition.
export function PageTransitionOverlay({ phase }) {
  const { prefersReducedMotion } = useResponsiveTier();
  const isCovered = phase === 'covering' || phase === 'holding';
  const isActive = phase !== 'idle';

  return (
    <motion.div
      className="fixed inset-0 z-30 pointer-events-none overflow-hidden"
      animate={{ opacity: isCovered ? 1 : 0 }}
      transition={{
        duration: isCovered ? DURATION.overlayCover : DURATION.overlayReveal,
        ease: [0.16, 1, 0.3, 1],
      }}
      aria-hidden="true"
    >
      <div className="page-transition-scrim" />
      {/* The drifting neon light cue - skipped entirely under
          prefers-reduced-motion, leaving only the plain opacity fade above. */}
      {isActive && !prefersReducedMotion && (
        <>
          <div className="page-transition-glow page-transition-glow-a" />
          <div className="page-transition-glow page-transition-glow-b" />
        </>
      )}
    </motion.div>
  );
}
