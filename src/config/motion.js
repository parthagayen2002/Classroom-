// Single source of truth for every JS/framer-motion/Three.js-driven motion
// value in the transition system (page-transition overlay, card stagger,
// button feedback, cursor, scroll-linked 3D parallax, the intro sequence).
// Change a number here rather than hunting through components - each field
// is imported directly wherever it applies.
//
// CSS-only effects (the .reveal-text scale/blur, .btn-primary glow, .cursor
// sizes/ripple) can't be driven from a JS file in a plain Vite+Tailwind
// project with no CSS-in-JS bridge, so those live as CSS custom properties
// in a matching, clearly-labelled block near the top of src/index.css
// instead - two well-known places, not scattered magic numbers.

export const DURATION = {
  // Nav-click page-transition overlay (src/components/PageTransitionOverlay.jsx)
  overlayCover: 0.22,
  overlayHold: 0.18,
  overlayReveal: 0.28,
  overlayReducedMotion: 0.12,

  // Section/card entrance (src/sections/*.jsx)
  cardEnter: 0.6,
  cardStagger: 0.1,

  // Button/card micro-interactions
  buttonHover: 0.25,
  buttonPress: 0.12,

  // Custom cursor (src/components/CustomCursor.jsx)
  cursorFollow: 0.15,
  cursorPulse: 0.18,

  // Loading screen (src/components/LoadingScreen.jsx), in ms.
  // introTotal: the loading/reveal/progress-fill phase, ended by whichever
  // is later of `introTotal` itself or real readiness (document.fonts.ready)
  // - introMaxWait is the hard, non-reduced-motion-scaled cap on how long
  // that wait can ever run, so a stalled readiness signal can never hang
  // the site. introDismissDuration is a separate, additive cinematic beat
  // (core brighten -> radial flash -> screen fade) that always plays in
  // full once the loading phase ends - see the component for the full
  // sequencing.
  introTotal: 1100,
  introMaxWait: 1600,
  introReducedMotion: 300,
  introDismissDuration: 700,
  introDismissReducedMotion: 150,

  // Solar System planet info panel (src/three/components/SolarSystem.jsx).
  // Exit deliberately faster than enter - mirrors the overlayCover/
  // overlayReveal asymmetry above.
  planetPanelEnter: 0.35,
  planetPanelExit: 0.25,
  planetPanelContentSwap: 0.15,
  planetPanelReducedMotion: 0.12,
};

export const EASE = {
  // Matches the existing .reveal-text / card entrance curve already in use
  // across the site - keep every new entrance animation on the same curve.
  standard: [0.16, 1, 0.3, 1],
  // Matches the existing nav active-item underline spring in Navigation.jsx.
  navSpring: { type: 'spring', stiffness: 500, damping: 30 },
  softSpring: { type: 'spring', stiffness: 300, damping: 24 },
};

// Parallax/offset magnitudes for the scroll-linked 3D work (Phase 5). Kept
// deliberately small - these are additive nudges layered on top of motion
// that already exists (planet orbits, idle rotation), never a replacement
// for it.
export const PARALLAX = {
  heroGroupDepth: 1.4,     // SolarSystem: Sun+rings+planets group, +Z units at full scroll
  heroGroupScale: 0.12,    // SolarSystem: fractional scale-down at full scroll
  starfieldDepth: 0.5,     // SolarSystem: Starfield group, independent/slower offset
  cameraScrollOffset: 0.6, // ThreeScene: additive camera nudge, world units
  particleDepthOffset: 1.2,   // ParticleField: shader depth-parallax uniform magnitude
};

// Tech Stack physics field (src/three/components/TechCloud.jsx) - a bounded
// "roaming balls" simulation confined to the section's own box. All in
// world units / units-per-second unless noted; tuned to read as premium and
// organic rather than jittery or frantic (see the file's own comments for
// how each is used).
export const TECH_FIELD = {
  wanderTurnSpeed: 0.6,     // max radians/sec the heading angle can drift by
  wanderStrength: 0.4,      // how strongly velocity steers toward the wander heading
  maxSpeed: 0.85,           // hard velocity cap - "never extremely fast"
  // Fraction of velocity retained after one full second, applied via
  // Math.pow(friction, delta) rather than a flat per-frame multiply - a
  // fixed per-frame factor would decay at very different real-world rates
  // on a 30fps vs 120fps device. Also what decays a released ball's drag
  // momentum back down to idle roaming ("continues moving naturally for a
  // short time" falls out of this for free, no separate momentum system).
  friction: 0.2,
  // Firm enough that "avoid overlapping too much" actually holds up
  // against the constant wander/boundary/cursor forces pushing balls
  // around - a weak value here let those other forces win too often.
  repulsionStrength: 5,
  // Balls start repelling a bit before their visible edges actually touch
  // (a padding multiplier on top of each ball's real ORB_RADIUS, applied
  // only to the repulsion distance check, never to rendering) - reads as
  // "give each other space" rather than "bounce apart only once already
  // overlapping."
  repulsionPadding: 1.25,
  boundarySoftMargin: 0.9,  // distance from the true edge where inward steering kicks in
  boundaryForce: 2.2,       // strength of that inward steering
  cursorRepelRadius: 1.8,   // world units - "nearby balls gently move away from the cursor"
  cursorRepelStrength: 1.1,
  dragFollowDamp: 22,       // how tightly a grabbed ball tracks the cursor (higher = tighter)
};

// Per-tier intensity multipliers - 0 disables an effect outright on that
// tier rather than just scaling it down, per "don't just scale the desktop
// version down" for mobile.
export const INTENSITY = {
  mouseParallax: { desktop: 1, tablet: 0.5, mobile: 0 },
  scrollParallax: { desktop: 1, tablet: 0.6, mobile: 0.25 },
};

export const CURSOR = {
  dotSize: 8,
  ringSize: 48,
  ringSizeHover: 56,
};
