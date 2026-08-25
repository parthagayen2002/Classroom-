import { useCallback, useEffect, useRef, useState } from 'react';
import { DURATION } from '@/config/motion';
import { useResponsiveTier } from '@/hooks/useResponsiveTier';

// Nav-click "page transition" state machine for what is really a single
// continuous-scroll page (see App.jsx - there's no router). `trigger()`
// brackets a same-page Lenis scroll with a brief cinematic
// idle -> covering -> holding -> revealing -> idle cue, so an anchor jump
// reads as a deliberate transition rather than an instant cut. The visual
// half lives in PageTransitionOverlay.jsx; this hook only owns timing.
export function usePageTransition() {
  const [phase, setPhase] = useState('idle');
  const { prefersReducedMotion } = useResponsiveTier();
  const timeoutsRef = useRef([]);
  const reducedMotionRef = useRef(prefersReducedMotion);

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const trigger = useCallback(() => {
    clearTimeouts();

    if (reducedMotionRef.current) {
      // Short opacity-only cross-fade, no light movement - the overlay
      // component itself also skips rendering the glow blobs whenever
      // reduced-motion is on, this just keeps the timing brief too.
      const ms = DURATION.overlayReducedMotion * 1000;
      setPhase('covering');
      timeoutsRef.current.push(setTimeout(() => setPhase('revealing'), ms));
      timeoutsRef.current.push(setTimeout(() => setPhase('idle'), ms * 2));
      return;
    }

    const coverMs = DURATION.overlayCover * 1000;
    const holdMs = DURATION.overlayHold * 1000;
    const revealMs = DURATION.overlayReveal * 1000;

    setPhase('covering');
    timeoutsRef.current.push(setTimeout(() => setPhase('holding'), coverMs));
    timeoutsRef.current.push(setTimeout(() => setPhase('revealing'), coverMs + holdMs));
    timeoutsRef.current.push(setTimeout(() => setPhase('idle'), coverMs + holdMs + revealMs));
  }, [clearTimeouts]);

  // Clean up any pending timeouts if the component unmounts mid-transition.
  useEffect(() => clearTimeouts, [clearTimeouts]);

  return { phase, trigger };
}
