'use client';

import { useEffect, useRef } from 'react';
import { usePointerCapabilities } from '@/hooks/usePointerCapabilities';

// Self-contained custom cursor - small dot by default, expands to a ring on
// hovering an interactive element (a labelled "view" ring on elements
// explicitly opted in), with a brief pulse on click. Position and
// hover/pulse state are all written directly to the DOM (refs + classList),
// never React state - the previous implementation tracked cursor position
// in App.jsx's React state and re-rendered the whole app tree on every
// `mousemove` pixel.
//
// Hover state comes from event delegation on `window` (`pointerover`/
// `pointerout`), not per-component onMouseEnter handlers, so every existing
// button/link across the site gets the ring for free with zero changes to
// those files - only the one element that wants the labelled "VIEW" state
// needs an explicit `data-cursor="view"` attribute (see the "VIEW ON
// GITHUB" link in ProjectsSection.jsx).
//
// Renders nothing at all on touch devices - usePointerCapabilities does a
// real `(pointer: coarse)`/`maxTouchPoints` check, not a viewport-width
// guess, so a wide-viewport touch device (e.g. an iPad in landscape) is
// still correctly detected as touch. Also toggles a class on <html> so the
// real OS cursor can be hidden site-wide while this one is active (see
// `.custom-cursor-active` in index.css) - the previous cursor-hiding
// attempt in App.jsx was a `pointer-events-none` wrapper, which can't
// actually affect cursor rendering since it never receives pointer events.
//
// Also exposes `window.__setCursorOverride(state)` (state: null | 'grab' |
// 'grabbing') while mounted - a small imperative escape hatch for content
// that isn't real DOM (a Three.js canvas has exactly one DOM element for
// the whole scene, so the window-level pointerover/pointerout delegation
// below can never see "this individual 3D mesh is hovered" the way it sees
// a real `<button>`). Same cross-component-communication pattern this
// codebase already uses for 3D content elsewhere
// (`window.__avatarSetSectionTarget` in ThreeScene.jsx/Avatar.jsx). Used by
// the Tech Stack physics field (TechCloud.jsx) to show a grab/grabbing
// cursor while hovering/dragging a technology ball. An active override
// takes priority over the normal delegated ring/view/pulse states until
// cleared (passing `null`).
export function CustomCursor() {
  const { isTouchDevice } = usePointerCapabilities();
  const elRef = useRef(null);

  useEffect(() => {
    if (isTouchDevice) return undefined;

    const el = elRef.current;
    if (!el) return undefined;

    document.documentElement.classList.add('custom-cursor-active');

    const overrideRef = { current: null };
    window.__setCursorOverride = (state) => {
      overrideRef.current = state;
      el.classList.remove('ring', 'view', 'grab', 'grabbing');
      if (state) el.classList.add(state);
    };

    const handleMove = (e) => {
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
    };

    const resolveState = (target) => {
      if (!(target instanceof Element)) return null;
      if (target.closest('[data-cursor="view"]')) return 'view';
      if (target.closest('a, button, [role="button"]')) return 'ring';
      return null;
    };

    const handleOver = (e) => {
      if (overrideRef.current) return; // an active override (e.g. a hovered tech ball) wins
      const state = resolveState(e.target);
      el.classList.toggle('ring', state === 'ring' || state === 'view');
      el.classList.toggle('view', state === 'view');
    };

    const handleOut = (e) => {
      if (overrideRef.current) return;
      // Only clear when the pointer leaves to somewhere that isn't itself
      // hover-eligible, so moving between children of the same link/button
      // doesn't flicker the ring off and back on.
      const next = e.relatedTarget;
      if (next && resolveState(next)) return;
      el.classList.remove('ring', 'view');
    };

    let pulseTimeout;
    const handleDown = () => {
      if (overrideRef.current) return; // don't pulse over a grab/grabbing state
      el.classList.add('pulse');
      clearTimeout(pulseTimeout);
      pulseTimeout = setTimeout(() => el.classList.remove('pulse'), 220);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerover', handleOver);
    window.addEventListener('pointerout', handleOut);
    window.addEventListener('pointerdown', handleDown);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerover', handleOver);
      window.removeEventListener('pointerout', handleOut);
      window.removeEventListener('pointerdown', handleDown);
      clearTimeout(pulseTimeout);
      delete window.__setCursorOverride;
    };
  }, [isTouchDevice]);

  if (isTouchDevice) return null;

  return (
    <div
      ref={elRef}
      className="fixed cursor pointer-events-none z-50"
      style={{ left: 0, top: 0 }}
      aria-hidden="true"
    />
  );
}
