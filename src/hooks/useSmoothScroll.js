import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

// Buttery, inertia-based scrolling between sections (the "professional
// website" scroll feel - Awwwards/agency-site style) instead of the
// browser's default 1:1 wheel scroll. Lenis intercepts wheel/trackpad input
// and eases the real `window.scrollY` towards the target each frame, so
// everything already keyed off native scroll position - the IntersectionObserver
// reveal/scroll-spy in App.jsx, the 3D camera's activeSection focus - keeps
// working unchanged.
//
// Lenis's own `respectReducedMotion` option only makes its *programmatic*
// scrollTo() calls instant - wheel-driven inertia would still animate for a
// prefers-reduced-motion user. The rest of this site treats that preference
// as "no animated motion at all" (see the reduced-motion block in
// index.css), so this hook skips creating Lenis entirely in that case and
// leaves scrolling native, matching that convention.
export function useSmoothScroll(enabled) {
  const lenisRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out-cubic - matches the .reveal-text feel
      smoothWheel: true,
      touchMultiplier: 1.5,
      autoRaf: true,
    });
    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  return lenisRef;
}
