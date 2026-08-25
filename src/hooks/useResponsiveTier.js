import { useEffect, useState } from 'react';

// Shared device-tier + motion-preference signal. Previously duplicated
// verbatim (same 640px/1024px breakpoints) as a local hook inside both
// src/three/ThreeScene.jsx and src/three/components/SolarSystem.jsx - both
// now import this instead. Also adds a `prefersReducedMotion` flag, which
// nothing inside src/three/ checked before this (only useSmoothScroll.js,
// for Lenis, and index.css's global reduced-motion block did).
//
// `tier` drives "reduce 3D complexity on mobile" (segment counts, particle
// budgets, parallax magnitude); `prefersReducedMotion` gates anything that
// moves the camera/parallaxes content on its own, independent of viewport
// size, per the OS/browser accessibility preference.
export function useResponsiveTier() {
  const [tier, setTier] = useState('desktop');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 640px)');
    const tablet = window.matchMedia('(max-width: 1024px)');
    const updateTier = () => setTier(mobile.matches ? 'mobile' : tablet.matches ? 'tablet' : 'desktop');
    updateTier();
    mobile.addEventListener('change', updateTier);
    tablet.addEventListener('change', updateTier);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReduced = () => setPrefersReducedMotion(reduced.matches);
    updateReduced();
    reduced.addEventListener('change', updateReduced);

    return () => {
      mobile.removeEventListener('change', updateTier);
      tablet.removeEventListener('change', updateTier);
      reduced.removeEventListener('change', updateReduced);
    };
  }, []);

  return { tier, prefersReducedMotion };
}
