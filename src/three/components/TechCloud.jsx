'use client';

/**
 * The Tech Stack section's 3D content - technology names as glowing orbs
 * roaming freely inside a physics-bounded field, click-and-hold draggable.
 *
 * A self-contained bounded widget with its OWN <Canvas> (same shape as
 * SolarSystem.jsx - own camera/renderer, sized by a normal in-flow DOM
 * container dropped into one section), not a group meant to mount inside
 * the shared background scene the way this file used to work. That's a
 * deliberate architecture change: the physics simulation needs to be
 * mathematically confined to this section's own box (never behind the
 * navbar, never affecting page scroll, real per-ball drag), which isn't
 * possible while sharing a page-wide canvas whose bounds have nothing to do
 * with any one section's DOM box. Its clear color is transparent (unlike
 * SolarSystem's deliberately opaque one) so the site's existing dark
 * background and star field, rendered behind it in the shared ThreeScene
 * canvas, stay visible through this section, per spec.
 */

import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { techStack } from '@/data/content';
import { TECH_FIELD } from '@/config/motion';
import { useResponsiveTier } from '@/hooks/useResponsiveTier';
import { usePointerCapabilities } from '@/hooks/usePointerCapabilities';

const CATEGORY_COLOR = {
  LANGUAGES: '#FF4FB3',
  'AI / ML': '#9B5CFF',
  FRONTEND: '#FF2D95',
  TOOLS: '#B98CFF',
};

// Visual radius (core + glow shell) used for both rendering and the
// physics bounds/repulsion math, so "avoid overlapping too much" and "never
// escape the section" are measured against the same size the ball actually
// looks on screen.
const ORB_RADIUS = 0.55;

// Shared with the actual <Canvas camera> config below (not duplicated as a
// second magic number) - also used to seed initial ball positions at
// roughly the right real-world scale (see createBalls).
const FIELD_FOV = 46;

function reportTechCloudError(stage, error) {
  console.error(`[3D ERROR]\nComponent: TechCloud\nStage: ${stage}\nError: ${error?.message ?? String(error)}`);
  if (error?.stack) console.error('[3D ERROR] Stack trace:\n' + error.stack);
}

// A throw inside the render loop happens outside React's render phase, so a
// React error boundary can never catch it - it would tear down this widget's
// whole Canvas. One bad frame here just freezes this component; the rest of
// the site (including the shared background scene) keeps animating.
function useSafeFrame(callback) {
  const failedRef = useRef(false);
  useFrame((state, delta) => {
    if (failedRef.current) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      callback(state, delta);
    } catch (error) {
      failedRef.current = true;
      reportTechCloudError('render-loop', error);
    }
  });
}

// Initial scatter - random-with-rejection so balls don't start piled on top
// of each other (the physics' own soft repulsion would sort it out in a
// second or two regardless, but starting reasonably spread avoids an
// unsightly first frame). Seeded within `seedHalfWidth`/`seedHalfHeight` -
// a nominal box computed by the caller from the same fov/distance formula
// the runtime bounds use, with a *reasonable assumed* aspect ratio per tier
// rather than the Canvas's live `camera.aspect` (which isn't settled yet
// the first time this runs, during the same render that mounts the
// Canvas). Without this, a fixed seed box sized for a wide desktop
// viewport would seed balls far outside a narrow mobile section's actual
// (much smaller) bounds, and the runtime hard clamp would visibly snap
// them inward on the very first frame instead of a smooth settle.
function createBalls(items, seedHalfWidth, seedHalfHeight) {
  const placed = [];
  return items.map((item) => {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 24; attempt++) {
      x = (Math.random() * 2 - 1) * seedHalfWidth * 0.82;
      y = (Math.random() * 2 - 1) * seedHalfHeight * 0.82;
      const tooClose = placed.some((p) => Math.hypot(p.x - x, p.y - y) < ORB_RADIUS * 2.1);
      if (!tooClose) break;
    }
    placed.push({ x, y });
    return {
      id: item.id,
      item,
      position: new THREE.Vector3(x, y, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      wanderAngle: Math.random() * Math.PI * 2,
      radius: ORB_RADIUS,
    };
  });
}

// Touch-only long-press-then-drag tuning (see TechOrb's pointer handlers).
// 150ms is short enough to feel immediate but long enough that a normal
// scroll swipe - which shows continuous movement from the very first
// touchmove - virtually always crosses TOUCH_MOVE_CANCEL_PX well before this
// fires, cancelling the pending grab. 8px matches typical "is this a tap or
// a drag" thresholds (roughly what browsers themselves use internally to
// decide pan vs. tap).
const TOUCH_LONG_PRESS_MS = 150;
const TOUCH_MOVE_CANCEL_PX = 8;

function TechOrb({ ball, mouseWorldRef, interactionRadius, segments, labelSize = 10, allowDrag, isDraggedRef, onGrab, onRelease, isTouchDevice, tappedRef, onTap }) {
  const orbGroupRef = useRef(null);
  const coreRef = useRef(null);
  const glowRef = useRef(null);
  const labelRef = useRef(null);
  const hoverRef = useRef(0);
  const color = CATEGORY_COLOR[ball.item.category] ?? '#FF2D95';
  // Touch press/drag state - a plain ref (never React state) since it's
  // only ever read/written from inside DOM event handlers and a single
  // setTimeout callback; nothing here should ever trigger a re-render.
  const pressRef = useRef(null); // { pointerId, startX, startY, timer, committed, target }

  useSafeFrame((state, delta) => {
    if (!orbGroupRef.current) return;

    // Position is owned and updated by the parent's physics loop
    // (TechFieldScene) - this just reflects it onto the actual Object3D.
    orbGroupRef.current.position.copy(ball.position);

    // Proximity reaction: distance from this orb to the shared cursor
    // world-point (same ray-plane unprojection technique already used
    // elsewhere in this project - ParticleField.jsx, Avatar.jsx). Skipped
    // while THIS ball is the one being dragged - it's already following the
    // cursor directly, a hover glow on top of that would just be redundant.
    const isThisDragged = isDraggedRef.current === ball;
    // Touch devices have no hover/drag (see allowDrag below) - a tap
    // instead lights the ball up the same way a hover would, for a fixed
    // window, so touch users get real visual feedback that the tap landed.
    const isThisTapped = tappedRef?.current?.ball === ball && tappedRef.current.expires > performance.now();
    const dist = isThisDragged ? Infinity : ball.position.distanceTo(mouseWorldRef.current);
    const targetHover = isThisDragged || isThisTapped ? 1 : Math.max(0, 1 - dist / interactionRadius);
    hoverRef.current = THREE.MathUtils.damp(hoverRef.current, targetHover, 6, delta);
    const hover = hoverRef.current;

    const scale = 1 + hover * 0.32;
    orbGroupRef.current.scale.setScalar(scale);

    if (coreRef.current) {
      coreRef.current.rotation.y += delta * (0.15 + hover * 0.8);
      coreRef.current.rotation.x += delta * (0.06 + hover * 0.3);
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.16 + hover * 0.4;
      glowRef.current.scale.setScalar(1.35 + hover * 0.25);
    }
    if (labelRef.current) {
      // Mutating the DOM node directly (not React state) - driving 22
      // labels' opacity through React re-renders every frame would be real
      // overhead for zero visual benefit.
      labelRef.current.style.opacity = String(0.32 + hover * 0.68);
    }
  });

  const handlePointerOver = (e) => {
    e.stopPropagation();
    if (allowDrag) window.__setCursorOverride?.('grab');
  };
  const handlePointerOut = (e) => {
    e.stopPropagation();
    if (allowDrag && isDraggedRef.current !== ball) window.__setCursorOverride?.(null);
  };

  const clearPress = () => {
    const p = pressRef.current;
    if (p?.timer) clearTimeout(p.timer);
    pressRef.current = null;
  };

  // Fires TOUCH_LONG_PRESS_MS after a touch pointerdown, only if the finger
  // hasn't moved past the cancel threshold in the meantime (see
  // handlePointerMove below) - this is what turns "press and hold" into an
  // actual drag, and is exactly what lets a normal scroll swipe (which
  // moves immediately) pass through untouched instead of grabbing the ball.
  const commitTouchDrag = () => {
    const p = pressRef.current;
    if (!p) return;
    p.committed = true;
    p.target.setPointerCapture?.(p.pointerId);
    onGrab(ball);
    window.__setCursorOverride?.('grabbing');
  };

  const handlePointerDown = (e) => {
    if (isTouchDevice) {
      e.stopPropagation();
      clearPress();
      pressRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        committed: false,
        target: e.target,
        timer: setTimeout(commitTouchDrag, TOUCH_LONG_PRESS_MS),
      };
      return;
    }
    if (!allowDrag) return;
    e.stopPropagation();
    e.target.setPointerCapture?.(e.pointerId);
    onGrab(ball);
    window.__setCursorOverride?.('grabbing');
  };

  // Touch-only: while a press is still pending (the long-press timer hasn't
  // fired yet), any real movement means the user is scrolling, not holding
  // this ball still - cancel the pending grab so the browser's own native
  // scroll (touchAction stays untouched the whole time this is pending, see
  // TechFieldScene) is never fought. Captured via setPointerCapture at
  // pointerdown (same as the desktop path below) so these events keep
  // reaching this exact ball even if the finger has already drifted off its
  // small hit-sphere - without that, a fast swipe could leave movement
  // undetected here entirely.
  const handlePointerMove = (e) => {
    const p = pressRef.current;
    if (!isTouchDevice || !p || p.pointerId !== e.pointerId || p.committed) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    if (Math.hypot(dx, dy) > TOUCH_MOVE_CANCEL_PX) clearPress();
  };

  const handlePointerUp = (e) => {
    if (isTouchDevice) {
      const p = pressRef.current;
      if (!p || p.pointerId !== e.pointerId) return;
      if (p.committed) {
        e.target.releasePointerCapture?.(e.pointerId);
        onRelease(ball);
        window.__setCursorOverride?.(null);
      } else {
        // Released before the hold committed, and never crossed the move
        // threshold (handlePointerMove would have cleared it otherwise) -
        // a real tap. Same glow feedback as before.
        onTap(ball);
      }
      clearPress();
      return;
    }
    if (!allowDrag) return;
    e.stopPropagation();
    e.target.releasePointerCapture?.(e.pointerId);
    onRelease(ball);
    window.__setCursorOverride?.('grab');
  };

  // Touch-only safety net: a real device can cancel an in-flight touch for
  // reasons outside this component's control (the OS/browser reclaiming the
  // gesture, an interruption, etc.) - if that happens mid-drag, release the
  // ball cleanly instead of leaving it permanently "stuck" following a
  // pointer that will never send pointerup.
  const handlePointerCancel = (e) => {
    if (!isTouchDevice) return;
    const p = pressRef.current;
    if (!p || p.pointerId !== e.pointerId) return;
    if (p.committed) onRelease(ball);
    clearPress();
  };

  return (
    <group ref={orbGroupRef}>
      <group ref={coreRef}>
        {/* Glass-like core - unlit on purpose (see SolarSystem.jsx /
            Avatar.jsx for the same reasoning elsewhere in this project): a
            lit material would pick up whatever scene lighting happens to be
            around it rather than staying a predictable, always-visible
            neon colour. */}
        <mesh>
          <sphereGeometry args={[0.42, segments, segments]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
        <mesh scale={0.55}>
          <sphereGeometry args={[0.42, segments, segments]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} toneMapped={false} />
        </mesh>
      </group>

      {/* Additive glow shell - brightens with proximity/drag instead of
          being a fixed halo. */}
      <mesh ref={glowRef} scale={1.35}>
        <sphereGeometry args={[0.42, segments, segments]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Invisible, slightly larger hit-target - a generous click/drag
          area without needing the visible ball itself to be bigger.
          transparent+opacity 0 (not visible=false) so it still raycasts. */}
      <mesh
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <sphereGeometry args={[0.58, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* No distanceFactor: keeps a fixed, always-legible screen-space size
          regardless of camera distance (see the equivalent note this file
          used to have for the old sphere-cloud camera, ~30 units out - this
          widget's camera sits much closer, but plain <Html> avoids needing
          to retune a distanceFactor at all). Quiet by default (opacity
          driven by hover above) - the field reads as glowing balls first,
          with each name legible once you're near it, rather than 22 equally
          loud labels competing with each other and the heading above. */}
      <Html center style={{ pointerEvents: 'none' }}>
        <div
          ref={labelRef}
          className="whitespace-nowrap font-mono uppercase tracking-wider text-white"
          style={{
            fontSize: `${labelSize}px`,
            opacity: 0.32,
            textShadow: '0 0 5px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.95)',
          }}
        >
          {ball.item.name}
        </div>
      </Html>
    </group>
  );
}

function TechFieldScene({ tier, prefersReducedMotion, isTouchDevice, cameraDistance, wrapperRef }) {
  const { camera } = useThree();
  const balls = useMemo(() => {
    // A reasonable assumed aspect ratio per tier, since the Canvas's real
    // `camera.aspect` isn't settled yet the first time this runs (see the
    // comment on createBalls) - just needs to be roughly right so the seed
    // box is the right order of magnitude, not pixel-perfect; the runtime
    // physics bounds (computed fresh every frame from the *real* aspect)
    // are what actually enforce "never escape the section" going forward.
    const nominalAspect = tier === 'mobile' ? 0.5 : tier === 'tablet' ? 0.85 : 1.6;
    const seedHalfHeight = Math.tan(THREE.MathUtils.degToRad(FIELD_FOV / 2)) * cameraDistance;
    const seedHalfWidth = seedHalfHeight * nominalAspect;
    return createBalls(techStack, seedHalfWidth, seedHalfHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const draggedBallRef = useRef(null);
  const mouseWorldRef = useRef(new THREE.Vector3(1e4, 1e4, 0));
  // { ball, expires } for the touch-tap glow (see TechOrb's onTap) - a
  // plain ref, not React state, since it's read every frame inside
  // useFrame and never needs to trigger a re-render itself.
  const tappedBallRef = useRef(null);
  // Scratch vectors reused every frame instead of allocated fresh - avoids
  // churning the GC with a new Vector3 60 times a second in the hot render
  // loop below.
  const scratchVecRef = useRef(new THREE.Vector3());
  const scratchDirRef = useRef(new THREE.Vector3());

  const segments = tier === 'mobile' ? 14 : tier === 'tablet' ? 18 : 22;
  const interactionRadius = tier === 'mobile' ? 1.4 : 2;
  const allowDrag = !isTouchDevice;

  // The DOM node wrapping this Canvas (see TechCloud) only ever gets
  // touchAction:'none' for the exact duration of a committed touch-drag
  // (see handleGrab/handleRelease below) - at every other moment it's left
  // at 'auto' so a normal scroll swipe anywhere over this section, ball or
  // no ball, always reaches the browser's native scroll untouched. This is
  // the one place that DOM node's style is ever written.
  const setCanvasTouchAction = (value) => {
    if (wrapperRef?.current) wrapperRef.current.style.touchAction = value;
  };

  // Real pointer activity tracking (same fix used elsewhere in this
  // project - ParticleField.jsx, the old version of this file): R3F's
  // `state.pointer` defaults to (0,0) NDC, screen centre, even before the
  // user has ever moved the mouse - unprojecting that by default would land
  // right in the middle of the field and read as "hovered at rest". Also
  // doubles as a global release safety net for BOTH mouse and touch: each
  // ball's own onPointerUp/onPointerCancel (TechOrb) is the primary path,
  // but if a pointerup/pointercancel is ever missed (released outside the
  // window, an interrupted touch, etc.) this is what stops a ball getting
  // permanently stuck "being dragged" and the canvas stuck at
  // touchAction:'none'.
  const pointerActiveRef = useRef(false);
  useEffect(() => {
    const activate = () => { pointerActiveRef.current = true; };
    const deactivate = () => { pointerActiveRef.current = false; draggedBallRef.current = null; };
    const releaseAny = () => {
      if (draggedBallRef.current && isTouchDevice) setCanvasTouchAction('auto');
      draggedBallRef.current = null;
    };
    window.addEventListener('pointermove', activate, { passive: true });
    window.addEventListener('pointerdown', activate, { passive: true });
    window.addEventListener('pointerup', releaseAny, { passive: true });
    window.addEventListener('pointercancel', releaseAny, { passive: true });
    document.addEventListener('mouseleave', deactivate);
    window.addEventListener('blur', deactivate);
    return () => {
      window.removeEventListener('pointermove', activate);
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('pointerup', releaseAny);
      window.removeEventListener('pointercancel', releaseAny);
      document.removeEventListener('mouseleave', deactivate);
      window.removeEventListener('blur', deactivate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTouchDevice]);

  useSafeFrame((state, delta) => {
    // Arena bounds derived fresh every frame from the camera's real
    // fov/aspect (R3F keeps `camera.aspect` in sync with the canvas's
    // actual pixel size on resize automatically) - this is what makes
    // "never escape the section" exact rather than a tuned guess: whatever
    // the container's live pixel box is, this is the world-space rectangle
    // that maps to it.
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * cameraDistance;
    const halfWidth = halfHeight * camera.aspect;
    const boundX = Math.max(0.1, halfWidth - ORB_RADIUS);
    const boundY = Math.max(0.1, halfHeight - ORB_RADIUS);

    // Ray-plane unprojection of the pointer onto the field's own Z=0 plane -
    // gives a real world-space point in the same space the balls live in.
    // Touch devices only need this while an actual drag is in progress (a
    // committed long-press-drag, see TechOrb) - there's no "hover" concept
    // for a finger that isn't touching the screen, so computing this at
    // every idle frame on touch would be wasted work for no visual benefit.
    const trackPointer = !isTouchDevice || draggedBallRef.current !== null;
    if (trackPointer) {
      const ndc = state.pointer;
      const vector = scratchVecRef.current.set(ndc.x, ndc.y, 0.5).unproject(camera);
      const dir = scratchDirRef.current.copy(vector).sub(camera.position).normalize();
      if (Math.abs(dir.z) > 1e-6) {
        const t = (0 - camera.position.z) / dir.z;
        if (Number.isFinite(t)) {
          mouseWorldRef.current.copy(camera.position).addScaledVector(dir, t);
        }
      }
      if (!isTouchDevice && !pointerActiveRef.current) {
        mouseWorldRef.current.set(1e4, 1e4, 0);
      }
    }

    const dragged = draggedBallRef.current;

    for (const ball of balls) {
      if (ball === dragged) {
        // Follow the cursor with a tight damp (responsive, not laggy),
        // clamped so it can never be dragged outside the arena. Recording
        // the actual per-frame movement as velocity is what gives a
        // released ball real "throw" momentum for free - no separate
        // momentum system needed, it just re-enters the friction/roaming
        // loop below already carrying real speed.
        const prevX = ball.position.x;
        const prevY = ball.position.y;
        ball.position.x = THREE.MathUtils.damp(ball.position.x, mouseWorldRef.current.x, TECH_FIELD.dragFollowDamp, delta);
        ball.position.y = THREE.MathUtils.damp(ball.position.y, mouseWorldRef.current.y, TECH_FIELD.dragFollowDamp, delta);
        ball.position.x = THREE.MathUtils.clamp(ball.position.x, -boundX, boundX);
        ball.position.y = THREE.MathUtils.clamp(ball.position.y, -boundY, boundY);
        if (delta > 0) {
          ball.velocity.x = (ball.position.x - prevX) / delta;
          ball.velocity.y = (ball.position.y - prevY) / delta;
        }
        continue;
      }

      if (!prefersReducedMotion) {
        // Wander steering: the heading drifts slowly and continuously
        // rather than snapping to a new random direction every frame -
        // this is what reads as organic instead of jittery, and gives each
        // ball its own speed/direction for free since every wander angle
        // is independent.
        ball.wanderAngle += (Math.random() - 0.5) * TECH_FIELD.wanderTurnSpeed * delta;
        ball.velocity.x += Math.cos(ball.wanderAngle) * TECH_FIELD.wanderStrength * delta;
        ball.velocity.y += Math.sin(ball.wanderAngle) * TECH_FIELD.wanderStrength * delta;

        // Soft boundary containment: steer back in well before the hard
        // clamp below would ever need to bite, so it never visibly snaps
        // off an invisible wall.
        const softX = boundX - TECH_FIELD.boundarySoftMargin;
        const softY = boundY - TECH_FIELD.boundarySoftMargin;
        if (ball.position.x > softX) ball.velocity.x -= TECH_FIELD.boundaryForce * delta;
        else if (ball.position.x < -softX) ball.velocity.x += TECH_FIELD.boundaryForce * delta;
        if (ball.position.y > softY) ball.velocity.y -= TECH_FIELD.boundaryForce * delta;
        else if (ball.position.y < -softY) ball.velocity.y += TECH_FIELD.boundaryForce * delta;

        // Cursor repulsion - nearby balls (not just a dragged one) gently
        // move away from the cursor.
        // Same trackPointer gate as the unprojection above: on touch this
        // only runs while a drag is actually happening, so other balls
        // gently give way to the one being dragged - matching the desktop
        // cursor-repel feel - without any ambient effect while idle.
        if (trackPointer) {
          const dx = ball.position.x - mouseWorldRef.current.x;
          const dy = ball.position.y - mouseWorldRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < TECH_FIELD.cursorRepelRadius && dist > 1e-4) {
            const force = (1 - dist / TECH_FIELD.cursorRepelRadius) * TECH_FIELD.cursorRepelStrength;
            ball.velocity.x += (dx / dist) * force * delta;
            ball.velocity.y += (dy / dist) * force * delta;
          }
        }
      }

      // Frame-rate-independent friction (see TECH_FIELD.friction's own
      // comment) - also what decays a released ball's carried-over drag
      // velocity back down to idle roaming speed.
      const decay = Math.pow(TECH_FIELD.friction, delta);
      ball.velocity.x *= decay;
      ball.velocity.y *= decay;

      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      if (speed > TECH_FIELD.maxSpeed) {
        const s = TECH_FIELD.maxSpeed / speed;
        ball.velocity.x *= s;
        ball.velocity.y *= s;
      }

      ball.position.x += ball.velocity.x * delta;
      ball.position.y += ball.velocity.y * delta;

      // Hard backstop - never actually exceed the true bounds, regardless
      // of how the soft steering/friction above played out.
      ball.position.x = THREE.MathUtils.clamp(ball.position.x, -boundX, boundX);
      ball.position.y = THREE.MathUtils.clamp(ball.position.y, -boundY, boundY);
    }

    // Soft mutual repulsion - a separate pass over this frame's freshly
    // updated positions so "avoid overlapping too much" reacts to where
    // balls actually are right now. O(n^2) but n is ~22, trivially cheap.
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dist = Math.hypot(dx, dy) || 1e-4;
        const minDist = (a.radius + b.radius) * TECH_FIELD.repulsionPadding;
        if (dist >= minDist) continue;
        const overlap = (minDist - dist) / minDist;
        const pushX = (dx / dist) * overlap * TECH_FIELD.repulsionStrength * delta;
        const pushY = (dy / dist) * overlap * TECH_FIELD.repulsionStrength * delta;
        if (a !== dragged) { a.position.x -= pushX; a.position.y -= pushY; }
        if (b !== dragged) { b.position.x += pushX; b.position.y += pushY; }
      }
    }
  });

  const handleGrab = (ball) => {
    draggedBallRef.current = ball;
    // Claims the gesture for this drag - safe to do here specifically
    // because a touch drag only ever commits after TOUCH_LONG_PRESS_MS of
    // the finger staying still (see TechOrb), so by this moment no native
    // scroll has started for this touch to fight with.
    if (isTouchDevice) setCanvasTouchAction('none');
  };
  const handleRelease = (ball) => {
    if (draggedBallRef.current === ball) draggedBallRef.current = null;
    if (isTouchDevice) setCanvasTouchAction('auto');
  };
  // 1400ms glow window per tap - long enough to register as a deliberate
  // reaction, short enough that tapping several balls in a row reads as
  // each one lighting up in turn rather than everything staying lit.
  const handleTap = (ball) => { tappedBallRef.current = { ball, expires: performance.now() + 1400 }; };

  return (
    <>
      {balls.map((ball) => (
        <TechOrb
          key={ball.id}
          ball={ball}
          mouseWorldRef={mouseWorldRef}
          interactionRadius={interactionRadius}
          segments={segments}
          labelSize={tier === 'mobile' ? 8 : 10}
          allowDrag={allowDrag}
          isDraggedRef={draggedBallRef}
          onGrab={handleGrab}
          onRelease={handleRelease}
          isTouchDevice={isTouchDevice}
          tappedRef={tappedBallRef}
          onTap={handleTap}
        />
      ))}
    </>
  );
}

// A throw during React's render phase (as opposed to inside useFrame, which
// useSafeFrame above already guards) happens outside the render loop and
// needs a real error boundary - same pattern as SolarSystemBoundary /
// AvatarPortraitBoundary elsewhere in this project. Failing closed to
// nothing rather than tearing down this widget's Canvas.
class TechCloudBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    reportTechCloudError('mount', error);
    if (errorInfo?.componentStack) console.error('[3D ERROR] Component stack:' + errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// Lightweight, readable fallback if WebGL genuinely isn't available - still
// lists every technology (as static glowing pills, on-theme) rather than
// showing nothing, since this section's whole point is communicating what
// the technologies are.
function StaticFallback() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl mx-auto px-6">
      {techStack.map((item) => (
        <span
          key={item.id}
          className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-white rounded-full glass-panel border border-dark-border"
          style={{ boxShadow: `0 0 16px ${CATEGORY_COLOR[item.category] ?? '#FF2D95'}33` }}
        >
          {item.name}
        </span>
      ))}
    </div>
  );
}

/**
 * Bounded interactive Tech Stack physics field. Needs an explicitly-sized
 * parent (it fills 100%/100%) - see TechStackSection.jsx. Gracefully falls
 * back to a static list if WebGL is unavailable or the scene errors - never
 * blocks the rest of the page. `isVisible` (already computed by App.jsx's
 * scroll observer and already flowing into TechStackSection) pauses the
 * whole render/physics loop via `frameloop='never'` while the section is
 * off-screen - no extra observer needed.
 */
export function TechCloud({ isVisible = true }) {
  const [webglOk, setWebglOk] = useState(true);
  const { tier, prefersReducedMotion } = useResponsiveTier();
  const { isTouchDevice } = usePointerCapabilities();
  // Real DOM node wrapping the Canvas - TechFieldScene toggles its
  // touchAction imperatively for the exact duration of a committed touch
  // drag (see setCanvasTouchAction there) and nowhere else, so a normal
  // scroll swipe over this section always reaches the browser untouched.
  const wrapperRef = useRef(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) setWebglOk(false);
  }, []);

  if (!webglOk) return <StaticFallback />;

  // Mobile was pulled in CLOSER than tablet/desktop despite having the
  // narrowest viewport - the opposite of what a narrow aspect ratio needs.
  // With a portrait aspect (~0.5-0.6), boundX (width-derived) was already
  // the tighter constraint, and pulling the camera in shrank it further:
  // at 8.5, the 22-ball field's arena measured ~19 sq. world-units against
  // a ~33 sq. unit requirement to keep balls from constantly overlapping -
  // confirmed by a live mobile screenshot showing the balls piled on top of
  // each other, burying the heading. Pulling back to 11.5 grows the arena
  // to ~40 sq. units without hurting label legibility - each ball's <Html>
  // label is deliberately distanceFactor-less (see TechOrb's own comment),
  // so it stays the same fixed screen size regardless of camera distance;
  // only the sphere's own on-screen size shrinks, which is exactly what
  // gives the balls room to spread out.
  //
  // On phones and tablets the field now sits below the heading in a taller
  // section (see TechStackSection.jsx), so it's tall and fairly narrow;
  // these distances keep each orb roughly 70px (phone) / 90px (tablet)
  // across, small enough for all of them to spread out without piling up.
  const cameraDistance = tier === 'mobile' ? 15 : tier === 'tablet' ? 17 : 10.8;

  return (
    <TechCloudBoundary>
      {/* touchAction stays at the browser default ('auto') here at rest -
          unlike SolarSystem's wrapper, which needs a permanent override
          because OrbitControls claims the whole canvas for camera rotation.
          This widget only ever restricts it for the exact span of a
          deliberate, committed ball-drag (imperatively, via wrapperRef - see
          TechFieldScene's setCanvasTouchAction), so a normal scroll swipe
          anywhere over this section - on a ball or not - always reaches the
          browser's native scroll untouched. */}
      <div className="w-full h-full" ref={wrapperRef}>
        <Canvas
          dpr={[1, 2]}
          frameloop={isVisible ? 'always' : 'never'}
          camera={{ position: [0, 0, cameraDistance], fov: 46, near: 0.1, far: 50 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <TechFieldScene
            tier={tier}
            prefersReducedMotion={prefersReducedMotion}
            isTouchDevice={isTouchDevice}
            cameraDistance={cameraDistance}
            wrapperRef={wrapperRef}
          />
        </Canvas>
      </div>
    </TechCloudBoundary>
  );
}

export default TechCloud;
