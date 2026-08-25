'use client';

import { useEffect, useRef } from 'react';

// Thin fixed progress bar tracking scroll position through the whole page -
// the small "you are here" touch most polished single-page/agency sites
// have. Reads real `window.scrollY` on every native scroll event, so it
// stays in sync whether the scroll was driven by Lenis (see
// useSmoothScroll), a mouse wheel, touch, or keyboard - and writes straight
// to the DOM via a ref instead of React state so it doesn't re-render the
// tree on every scroll tick.
export function ScrollProgress() {
  const fillRef = useRef(null);

  useEffect(() => {
    const updateProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
      }
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] z-40 bg-transparent pointer-events-none"
      aria-hidden="true"
    >
      <div
        ref={fillRef}
        className="h-full origin-left bg-gradient-to-r from-primary-cyan via-primary-violet to-primary-cyan-bright"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
