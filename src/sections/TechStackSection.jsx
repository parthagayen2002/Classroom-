'use client';

import { TechCloud } from '@/three/components/TechCloud';

/**
 * The Tech Stack section: a heading/subtitle plus, filling the whole
 * section behind it, the interactive physics-based floating field of
 * technology orbs (<TechCloud> - its own bounded <Canvas>, sized to this
 * section, see that file for why). Unlike Home's Solar System or the old
 * version of this section, the 3D content lives directly inside this
 * section's own DOM now rather than in the shared background scene -
 * that's what makes it a real, in-flow element the physics can be strictly
 * confined to (never behind the navbar, never affecting page scroll).
 */

export function TechStackSection({ isVisible }) {
  return (
    <section
      id="techstack"
      // Taller than one screen on phones/tablets: a portrait viewport is too
      // narrow to fit all the orbs in one screen without them burying each
      // other.
      className={`section relative px-6 md:px-12 lg:px-24 pt-32 pb-20 max-lg:min-h-[125svh] ${isVisible ? 'is-visible' : ''}`}
      aria-labelledby="techstack-heading"
    >
      {/* The physics field's own bounds are derived from exactly this box's
          live pixel size (see TechCloud.jsx). Fills the whole section on
          desktop, where the field is wide enough to roam around the
          heading; on phones and tablets it starts below the heading
          instead, since a narrower field otherwise always has orbs sitting
          on the title. Below the heading in DOM order (and therefore in
          paint order, since neither has an explicit z-index) so the
          heading stays on top. */}
      <div className="absolute inset-x-0 bottom-0 top-56 md:top-72 lg:top-0">
        <TechCloud isVisible={isVisible} />
      </div>

      {/* Pinned near the top rather than sitting in the section's normal
          vertically-centred flow (`.section` centres its content by
          default) - the orb field behind it is centred on the section, so
          leaving the heading centred too would put both in the same place.
          pointer-events-none so a mouse move/drag over the heading's own
          text still reaches the canvas underneath it - the field's hover
          and drag interactions read the raw pointer position off the
          canvas, not off any DOM element. */}
      <div className="absolute top-28 md:top-36 inset-x-0 px-6 text-center pointer-events-none">
        <h2
          id="techstack-heading"
          className="reveal-text text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tighter text-white"
        >
          <span className="text-gradient">TECH STACK</span>
        </h2>
        <p
          className="reveal-text mt-4 text-lg md:text-xl text-slate-400"
          style={{ transitionDelay: '100ms' }}
        >
          Technologies I work with.
        </p>
      </div>
    </section>
  );
}

export default TechStackSection;
