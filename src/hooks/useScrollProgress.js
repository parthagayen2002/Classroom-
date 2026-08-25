import { useEffect, useRef } from 'react';

// Exposes live scroll data for the 3D layer to react to - global page
// progress (0-1), a per-tick velocity signal, and per-section local
// progress (0 as a section's top reaches the bottom of the viewport, 1 as
// its bottom reaches the top) - entirely via mutable refs, never React
// state, so reading it every `useFrame` never triggers a re-render (spec:
// avoid unnecessary re-renders).
//
// Driven off the real native `scroll` event rather than subscribing to
// `lenis.on('scroll', ...)` directly: Lenis animates the actual
// `window.scrollY` each frame (confirmed in its source - `scroll`/`progress`
// are plain getters over `animatedScroll`), so a native listener already
// fires on every Lenis-driven tick with zero extra wiring, and it keeps
// working unchanged if Lenis is ever absent (prefers-reduced-motion, or a
// brief window before useSmoothScroll creates it) - no dependency on
// `lenisRef.current` existing at effect-setup time, which a `lenis.on(...)`
// subscription would need to re-run to pick up. `lenisRef.current.velocity`
// is read fresh on every tick when available (real Lenis velocity); a raw
// per-tick scroll delta is used as a fallback otherwise.
//
// `sectionIds` should be a stable array reference (e.g. the module-level
// `sections` array already declared in App.jsx) - passing a new array each
// render would tear down and re-attach the scroll listener every render.
export function useScrollProgress(lenisRef, sectionIds = []) {
  const globalProgressRef = useRef(0);
  const velocityRef = useRef(0);
  const sectionProgressRef = useRef({});
  const lastScrollRef = useRef(typeof window !== 'undefined' ? window.scrollY : 0);

  useEffect(() => {
    const computeSectionProgress = () => {
      const viewportH = window.innerHeight || 1;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const total = rect.height + viewportH;
        const raw = total > 0 ? (viewportH - rect.top) / total : 0;
        sectionProgressRef.current[id] = Math.min(1, Math.max(0, raw));
      }
    };

    const handleScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      globalProgressRef.current = max > 0 ? window.scrollY / max : 0;

      const lenis = lenisRef?.current;
      velocityRef.current = lenis ? lenis.velocity : window.scrollY - lastScrollRef.current;
      lastScrollRef.current = window.scrollY;

      computeSectionProgress();
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [lenisRef, sectionIds]);

  return { globalProgressRef, velocityRef, sectionProgressRef };
}
