'use client';

/**
 * Full-screen "AI system initializing" loading experience shown once per
 * browser session, before the real site mounts - see App.jsx for the
 * sessionStorage gate that decides whether this mounts at all, and for how
 * `onComplete` swaps this out for the real site (already handled there,
 * unchanged by this component).
 *
 * Pure HTML/CSS - no Three.js/<Canvas> here on purpose. A WebGL context
 * for a screen that's gone in ~1-2s would compete with the real scene's
 * own contexts (background scene, Solar System, Tech Stack field) for
 * exactly zero visual benefit; every visual here (core, rings, orbiting
 * particles, starfield) is CSS-only. The real 3D AI core the background
 * scene uses lives at src/three/components/AICore.jsx - this is a
 * lightweight, unrelated stand-in built for this moment specifically.
 *
 * Driven by a plain step index + timers/rAF, matching this component's
 * original "boot sequence" -> "single ring" -> "staged reveal" history from
 * its previous home in ThreeScene.jsx: no animation library, every timer
 * cleaned up on unmount, and a hard safety-net timeout so a slow device can
 * never get stuck here.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { DURATION } from '@/config/motion';
import { heroContent } from '@/data/content';

const STATUS_MESSAGES = [
  'INITIALIZING AI SYSTEM...',
  'LOADING 3D ENVIRONMENT...',
  'CALIBRATING SOLAR SYSTEM...',
  'LOADING PORTFOLIO...',
  'READY',
];

// Which status message a given progress percentage should show - a pure
// function of the SAME percentage that drives the bar's width, so the text
// and the fill can never visibly disagree with each other.
function messageIndexForProgress(pct) {
  if (pct >= 100) return 4;
  if (pct >= 70) return 3;
  if (pct >= 45) return 2;
  if (pct >= 20) return 1;
  return 0;
}

// Smooth deceleration into the "waiting on real readiness" hold near 90%,
// rather than a flat linear ramp - reads as purposeful, not mechanical.
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

const PARTICLE_COUNT = 8;
const STAR_COUNT = 46;

export function LoadingScreen({ onComplete }) {
  // Read once, via useState's lazy initializer ("useState as useConstant") -
  // both `step` and `messageIndex` below derive their own initial values
  // from this directly, so the reduced-motion path never needs a
  // synchronous setState call inside the effect just to catch up.
  const [prefersReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [step, setStep] = useState(() => (prefersReducedMotion ? 3 : 0));
  const [messageIndex, setMessageIndex] = useState(() => (prefersReducedMotion ? 4 : 0));
  const fillRef = useRef(null);
  const completedRef = useRef(false);
  const messageIndexRef = useRef(prefersReducedMotion ? 4 : 0);

  const particles = useMemo(() => Array.from({ length: PARTICLE_COUNT }, (_, i) => i), []);
  // Position/size/timing randomized once and never touched again - only
  // `opacity` animates afterwards (compositor-only, no layout thrash).
  const stars = useMemo(() => Array.from({ length: STAR_COUNT }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: 1 + Math.random() * 1.5,
    delay: `${(Math.random() * 3).toFixed(2)}s`,
    duration: `${(2.5 + Math.random() * 1.5).toFixed(2)}s`,
  })), []);

  useEffect(() => {
    const complete = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    };

    let dismissTimeout = null;
    const startDismiss = (dismissDuration) => {
      setStep(5);
      dismissTimeout = setTimeout(complete, dismissDuration);
    };

    if (prefersReducedMotion) {
      // Skip the ramp/readiness-gate machinery entirely - `step`/
      // `messageIndex` already initialized straight to their "fully
      // loaded" values above, so there's nothing to catch up here. CSS
      // animations/transitions already collapse to ~instant globally (see
      // index.css's prefers-reduced-motion block); this just makes sure
      // the fill's actual width (a ref write, not React state) agrees with
      // that instantly too, rather than sitting at 0%.
      if (fillRef.current) fillRef.current.style.width = '100%';
      const revealDelay = setTimeout(
        () => startDismiss(DURATION.introDismissReducedMotion),
        DURATION.introReducedMotion
      );
      return () => {
        clearTimeout(revealDelay);
        clearTimeout(dismissTimeout);
      };
    }

    const total = DURATION.introTotal;
    const startTime = performance.now();
    const readyRef = { current: false };

    // A real, free readiness signal - resolves once web fonts are loaded so
    // the name/label never visibly reflow after the screen dismisses. Never
    // allowed to block past `introMaxWait` regardless (the timeout just
    // below), so a stalled/unsupported fonts API can never hang the site.
    Promise.resolve(document.fonts?.ready ?? true)
      .then(() => { readyRef.current = true; })
      .catch(() => { readyRef.current = true; });
    const maxWaitTimeout = setTimeout(() => { readyRef.current = true; }, DURATION.introMaxWait);

    let rafId = requestAnimationFrame(tick);
    function tick() {
      const elapsed = performance.now() - startTime;
      let pct;
      if (elapsed < total * 0.8) {
        // Smooth ramp to 90% over the first 80% of the budget - never
        // random, always a pure function of elapsed time.
        pct = easeOutCubic(Math.min(elapsed / (total * 0.8), 1)) * 90;
      } else if (!readyRef.current) {
        // Still waiting on real readiness past the ramp window - creep
        // toward 98% instead of stalling dead at 90%.
        pct = 90 + Math.min((elapsed - total * 0.8) / (total * 0.2), 1) * 8;
      } else {
        pct = 100;
      }

      if (fillRef.current) fillRef.current.style.width = `${pct}%`;

      const nextMessage = messageIndexForProgress(pct);
      if (nextMessage !== messageIndexRef.current) {
        messageIndexRef.current = nextMessage;
        setMessageIndex(nextMessage);
      }

      // Never completes before `total` has actually elapsed, even if
      // readiness resolved earlier - the floor that guarantees "minimum
      // ~1-1.5s for visual consistency" holds regardless of how fast the
      // real page happens to be.
      if (pct >= 100 && elapsed >= total) {
        startDismiss(DURATION.introDismissDuration);
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    const revealTimeouts = [
      setTimeout(() => setStep(1), total * 0.10), // neon line
      setTimeout(() => setStep(2), total * 0.30), // "AI DEVELOPER" label
      setTimeout(() => setStep(3), total * 0.50), // name
    ];

    return () => {
      revealTimeouts.forEach(clearTimeout);
      clearTimeout(maxWaitTimeout);
      clearTimeout(dismissTimeout);
      cancelAnimationFrame(rafId);
    };
  }, [onComplete, prefersReducedMotion]);

  return (
    <div className={`intro-screen intro-step-${step} fixed inset-0 z-50 flex items-center justify-center overflow-hidden`}>
      <div className="intro-starfield" aria-hidden="true">
        {stars.map((s) => (
          <span
            key={s.id}
            className="intro-star"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>

      <div className="intro-atmosphere" />

      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
        <div className="intro-core" aria-hidden="true">
          <div className="intro-core-glow" />
          <div className="intro-core-ring intro-core-ring-outer" />
          <div className="intro-core-ring intro-core-ring-inner" />
          <div className="intro-core-particles">
            {particles.map((i) => (
              <span key={i} className="intro-core-particle" style={{ '--i': i }} />
            ))}
          </div>
          <div className="intro-core-orb" />
          <div className="intro-core-flash" />
        </div>

        <div className="intro-neon-line" aria-hidden="true" />
        <p className="intro-label text-xs font-mono uppercase tracking-[0.4em] text-primary-cyan/80">
          {heroContent.eyebrow || 'AI DEVELOPER'}
        </p>
        <h1 className="intro-name text-3xl md:text-5xl font-bold uppercase tracking-tighter text-white">
          {heroContent.name}
        </h1>

        <div className="intro-progress">
          <div className="intro-progress-bar progress-bar">
            <div ref={fillRef} className="progress-fill" style={{ width: '0%' }} />
          </div>
          <p className="intro-status-text" aria-live="polite">
            {STATUS_MESSAGES[messageIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
