'use client';

/**
 * A ground-up, independent 3D particle field: a black/blue-violet "AI data
 * universe" of tiny glowing points that fill a real volume (not a flat
 * plane), drift almost imperceptibly on their own, and gently curve away
 * from the mouse like a passing electromagnetic field.
 *
 * Deliberately kept separate from Avatar / AICore / Navigation / sections -
 * this file only knows about its own points and lines. Drop it in anywhere:
 *
 *   <ParticleField />
 *
 * All motion (idle drift, mouse repulsion, the fast-motion trail) happens on
 * the GPU inside a single ShaderMaterial driven by a handful of uniforms, so
 * the particle count scales into the thousands without creating any React
 * or Three.js objects per particle.
 */

import { Component, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Palette matches the rest of the scene (ThreeScene.jsx / AICore.jsx):
// 0x030508 background, deep blue -> violet -> cyan across most particles,
// with red kept only as a rare, small-amount highlight (see EMBER below).
const DEEP_BLUE = new THREE.Color(0x6b1052).multiplyScalar(0.5);
const MID_VIOLET = new THREE.Color(0x9B5CFF);
const BRIGHT_CYAN = new THREE.Color(0xFF4FB3);
const EMBER = new THREE.Color(0xef4444); // rare, small-amount red highlight

const TRAIL_LENGTH = 6;

const DEFAULT_BOUNDS = { x: [-20, 20], y: [-12, 12], z: [-20, 10] };

function reportParticleError(stage, error) {
  console.error(`[3D ERROR]\nComponent: ParticleField\nStage: ${stage}\nError: ${error?.message ?? String(error)}`);
  if (error?.stack) console.error('[3D ERROR] Stack trace:\n' + error.stack);
}

// Runs a useFrame callback behind a try/catch. A throw inside the render loop
// happens outside React's render phase, so a React error boundary can never
// catch it - it would otherwise tear down the whole Canvas. One bad frame
// here just freezes the particle field; the AI core and everything else
// keep animating.
function useSafeFrame(callback) {
  const failedRef = useRef(false);
  useFrame((state, delta) => {
    if (failedRef.current) return;
    try {
      callback(state, delta);
    } catch (error) {
      failedRef.current = true;
      reportParticleError('render-loop', error);
    }
  });
}

/**
 * Picks a particle budget for the current device. `base` is the desktop
 * target (~1500-3000); everything else scales down from it.
 */
function pickParticleBudget(base) {
  if (typeof window === 'undefined') return Math.min(base, 2000);

  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const isTablet = !isMobile && window.matchMedia('(max-width: 1024px)').matches;
  const cores = navigator.hardwareConcurrency || 4;

  if (isMobile) return THREE.MathUtils.clamp(Math.round(base * 0.28), 300, 700);
  if (isTablet) return THREE.MathUtils.clamp(Math.round(base * 0.5), 800, 1500);
  if (cores <= 4) return THREE.MathUtils.clamp(Math.round(base * 0.6), 800, 1500);
  return THREE.MathUtils.clamp(base, 1500, 3000);
}

/**
 * Finds a small set of nearby-neighbour connections using a spatial hash
 * grid, so cost stays roughly linear in particle count instead of O(n^2).
 * Each particle links to at most `maxDegree` close neighbours, and the
 * result is capped at `maxTotal` pairs.
 */
function buildConnections(positions, count, { maxDistance, maxDegree, maxTotal }) {
  const cellSize = maxDistance;
  const cellKey = (cx, cy, cz) => `${cx}_${cy}_${cz}`;
  const grid = new Map();

  for (let i = 0; i < count; i++) {
    const cx = Math.floor(positions[i * 3] / cellSize);
    const cy = Math.floor(positions[i * 3 + 1] / cellSize);
    const cz = Math.floor(positions[i * 3 + 2] / cellSize);
    const key = cellKey(cx, cy, cz);
    let bucket = grid.get(key);
    if (!bucket) grid.set(key, (bucket = []));
    bucket.push(i);
  }

  const degree = new Uint8Array(count);
  const seenPairs = new Set();
  const maxDistSq = maxDistance * maxDistance;
  const pairs = [];

  for (let i = 0; i < count; i++) {
    if (pairs.length / 2 >= maxTotal) break;

    while (degree[i] < maxDegree) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const cx = Math.floor(x / cellSize);
      const cy = Math.floor(y / cellSize);
      const cz = Math.floor(z / cellSize);

      let bestJ = -1;
      let bestDistSq = maxDistSq;

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (let oz = -1; oz <= 1; oz++) {
            const bucket = grid.get(cellKey(cx + ox, cy + oy, cz + oz));
            if (!bucket) continue;

            for (const j of bucket) {
              if (j === i || degree[j] >= maxDegree) continue;
              const pairKey = i < j ? i * count + j : j * count + i;
              if (seenPairs.has(pairKey)) continue;

              const dx = positions[j * 3] - x;
              const dy = positions[j * 3 + 1] - y;
              const dz = positions[j * 3 + 2] - z;
              const distSq = dx * dx + dy * dy + dz * dz;
              if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestJ = j;
              }
            }
          }
        }
      }

      if (bestJ === -1) break;

      const pairKey = i < bestJ ? i * count + bestJ : bestJ * count + i;
      seenPairs.add(pairKey);
      pairs.push(i, bestJ);
      degree[i]++;
      degree[bestJ]++;

      if (pairs.length / 2 >= maxTotal) break;
    }
  }

  return pairs;
}

function buildParticleGeometry(count, bounds) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const seeds = new Float32Array(count);
  const tones = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = THREE.MathUtils.lerp(bounds.x[0], bounds.x[1], Math.random());
    positions[i * 3 + 1] = THREE.MathUtils.lerp(bounds.y[0], bounds.y[1], Math.random());
    positions[i * 3 + 2] = THREE.MathUtils.lerp(bounds.z[0], bounds.z[1], Math.random());

    // Skewed toward 0 so the field reads as mostly dim, with only a rare
    // brighter "data point" standing out - the depth/AI feel comes from
    // quantity, not from every particle glaring equally.
    const tone = Math.pow(Math.random(), 3);
    tones[i] = tone;
    sizes[i] = 0.55 + Math.pow(Math.random(), 2) * 1.1 + tone * 0.35;
    alphas[i] = 0.14 + Math.random() * 0.34;
    seeds[i] = Math.random();
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aTone', new THREE.BufferAttribute(tones, 1));

  return { geometry: geo, positions };
}

function buildParticleMaterial({ focalZ, intensity, interactionRadius, interactionStrength, trailRadius, driftAmount }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMouseSphere: { value: new THREE.Vector3(0, 0, focalZ) },
      uMouseRadius: { value: interactionRadius },
      uMouseStrength: { value: interactionStrength },
      uMouseActive: { value: 0 },
      uTrail: { value: Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector3(0, 0, focalZ)) },
      uTrailRadius: { value: trailRadius },
      uTrailStrength: { value: 0 },
      uDriftAmount: { value: driftAmount },
      uPixelScale: { value: 130 },
      uDpr: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1 },
      uIntensity: { value: intensity },
    },
    vertexShader: `
      const int TRAIL_COUNT = ${TRAIL_LENGTH};

      attribute float aSize;
      attribute float aAlpha;
      attribute float aSeed;
      attribute float aTone;

      uniform float uTime;
      uniform vec3 uMouseSphere;
      uniform float uMouseRadius;
      uniform float uMouseStrength;
      uniform float uMouseActive;
      uniform vec3 uTrail[TRAIL_COUNT];
      uniform float uTrailRadius;
      uniform float uTrailStrength;
      uniform float uDriftAmount;
      uniform float uPixelScale;
      uniform float uDpr;
      uniform float uIntensity;

      varying float vAlpha;
      varying float vTone;
      varying float vGlow;

      void main() {
        // Slow, almost-invisible sine drift, each particle at its own phase
        // and frequency (from aSeed) so the field doesn't move in unison.
        vec3 drift = vec3(
          sin(uTime * (0.05 + aSeed * 0.05) + aSeed * 6.2831853),
          cos(uTime * (0.045 + aSeed * 0.04) + aSeed * 4.712389),
          sin(uTime * (0.035 + aSeed * 0.03) + aSeed * 2.094395)
        ) * uDriftAmount;

        vec3 resting = position + drift;

        // Invisible interaction sphere around the mouse's world position:
        // full 3D distance, so particles at a very different depth than the
        // cursor are naturally left alone - real depth-aware falloff, not a
        // flat 2D circle.
        vec3 toMouse = resting - uMouseSphere;
        float mouseDist = length(toMouse);
        float mouseFalloff = pow(1.0 - smoothstep(0.0, uMouseRadius, mouseDist), 1.6);
        vec3 mouseDir = mouseDist > 0.0001 ? toMouse / mouseDist : vec3(0.0);
        vec3 mouseOffset = mouseDir * mouseFalloff * uMouseStrength * uMouseActive;

        // A handful of recent mouse positions, newest weighted most, giving
        // a brief disturbance trail that fades as the samples age out.
        vec3 trailOffset = vec3(0.0);
        for (int i = 0; i < TRAIL_COUNT; i++) {
          vec3 toTrail = resting - uTrail[i];
          float tDist = length(toTrail);
          float tFalloff = 1.0 - smoothstep(0.0, uTrailRadius, tDist);
          float weight = 1.0 - (float(i) / float(TRAIL_COUNT));
          vec3 tDir = tDist > 0.0001 ? toTrail / tDist : vec3(0.0);
          trailOffset += tDir * tFalloff * weight;
        }
        trailOffset *= uTrailStrength;

        vec3 displaced = resting + mouseOffset + trailOffset;

        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        float viewDist = max(1.0, -mvPosition.z);

        // Atmospheric depth: nearer to the camera reads slightly larger and
        // brighter, farther away fades and shrinks.
        float depthFactor = mix(1.5, 0.4, smoothstep(8.0, 55.0, viewDist));

        gl_PointSize = clamp(aSize * depthFactor * uDpr * (uPixelScale / viewDist), 1.0, 26.0);
        gl_Position = projectionMatrix * mvPosition;

        vAlpha = aAlpha * depthFactor * uIntensity;
        vTone = aTone;
        vGlow = mouseFalloff * uMouseActive;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying float vTone;
      varying float vGlow;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        float soft = pow(1.0 - smoothstep(0.0, 0.5, dist), 1.6);

        vec3 deepBlue = vec3(${DEEP_BLUE.r.toFixed(4)}, ${DEEP_BLUE.g.toFixed(4)}, ${DEEP_BLUE.b.toFixed(4)});
        vec3 midViolet = vec3(${MID_VIOLET.r.toFixed(4)}, ${MID_VIOLET.g.toFixed(4)}, ${MID_VIOLET.b.toFixed(4)});
        vec3 brightCyan = vec3(${BRIGHT_CYAN.r.toFixed(4)}, ${BRIGHT_CYAN.g.toFixed(4)}, ${BRIGHT_CYAN.b.toFixed(4)});
        vec3 ember = vec3(${EMBER.r.toFixed(4)}, ${EMBER.g.toFixed(4)}, ${EMBER.b.toFixed(4)});

        vec3 color = mix(deepBlue, midViolet, smoothstep(0.0, 0.65, vTone));
        color = mix(color, brightCyan, smoothstep(0.65, 0.9, vTone));
        color = mix(color, ember, smoothstep(0.94, 1.0, vTone));
        color += ember * vGlow * 0.3;

        float alpha = soft * vAlpha * (1.0 + vGlow * 0.3);
        gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
      }
    `,
  });
}

/**
 * Thin, barely-visible dark-blue lines between nearby particles. Positions
 * are static (computed once from the initial layout) - only their colour
 * brightens, briefly, when the mouse passes near them - so there is no
 * per-frame position cost at all, just a small, bounded colour update.
 */
function buildConnectionGeometry(positions, count, deviceCount) {
  const maxTotal = THREE.MathUtils.clamp(Math.round(deviceCount * 0.6), 150, 1400);
  const pairs = buildConnections(positions, count, { maxDistance: 3.4, maxDegree: 2, maxTotal });

  const vertexCount = pairs.length; // one vertex per pair-endpoint, 2 endpoints per segment
  const linePositions = new Float32Array(vertexCount * 3);
  const lineColors = new Float32Array(vertexCount * 3);

  for (let v = 0; v < vertexCount; v++) {
    const i = pairs[v];
    linePositions[v * 3] = positions[i * 3];
    linePositions[v * 3 + 1] = positions[i * 3 + 1];
    linePositions[v * 3 + 2] = positions[i * 3 + 2];
    lineColors[v * 3] = DEEP_BLUE.r;
    lineColors[v * 3 + 1] = DEEP_BLUE.g;
    lineColors[v * 3 + 2] = DEEP_BLUE.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  return { geometry: geo, linePositions, vertexCount };
}

function ParticleFieldInner({
  count = 2400,
  bounds = DEFAULT_BOUNDS,
  intensity = 0.85,
  interactionRadius = 7.5,
  interactionStrength = 2.4,
  trailRadius = 4.2,
  trailStrengthBase = 0.6,
  driftAmount = 0.18,
  connections,
  trail = true,
}) {
  const { camera } = useThree();

  const deviceCount = useMemo(() => pickParticleBudget(count), [count]);
  const focalZ = useMemo(() => (bounds.z[0] + bounds.z[1]) / 2, [bounds.z]);

  const tierAllowsConnections = useMemo(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(max-width: 640px)').matches;
  }, []);
  const enableConnections = connections ?? tierAllowsConnections;
  const enableTrail = trail;

  const { geometry, positions } = useMemo(() => buildParticleGeometry(deviceCount, bounds), [deviceCount, bounds]);
  const material = useMemo(
    () => buildParticleMaterial({ focalZ, intensity, interactionRadius, interactionStrength, trailRadius, driftAmount }),
    [focalZ, intensity, interactionRadius, interactionStrength, trailRadius, driftAmount]
  );
  const points = useMemo(() => new THREE.Points(geometry, material), [geometry, material]);

  const connectionData = useMemo(() => {
    if (!enableConnections) return null;
    return buildConnectionGeometry(positions, deviceCount, deviceCount);
  }, [enableConnections, positions, deviceCount]);

  const connectionMaterial = useMemo(() => {
    if (!connectionData) return null;
    return new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [connectionData]);

  const lines = useMemo(() => {
    if (!connectionData || !connectionMaterial) return null;
    return new THREE.LineSegments(connectionData.geometry, connectionMaterial);
  }, [connectionData, connectionMaterial]);

  // Dispose GPU resources on unmount / when regenerated.
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useEffect(() => {
    if (!connectionData || !connectionMaterial) return undefined;
    return () => {
      connectionData.geometry.dispose();
      connectionMaterial.dispose();
    };
  }, [connectionData, connectionMaterial]);

  // Track whether a real pointer (mouse or touch) is currently in play, so
  // the field falls back to pure idle drift until - and after - the user
  // actually interacts, instead of reacting to a phantom cursor at (0, 0).
  const pointerActiveRef = useRef(false);
  useEffect(() => {
    const activate = () => {
      pointerActiveRef.current = true;
    };
    const deactivate = () => {
      pointerActiveRef.current = false;
    };
    window.addEventListener('pointermove', activate, { passive: true });
    window.addEventListener('pointerdown', activate, { passive: true });
    window.addEventListener('touchmove', activate, { passive: true });
    document.addEventListener('mouseleave', deactivate);
    window.addEventListener('touchend', deactivate, { passive: true });
    window.addEventListener('blur', deactivate);
    return () => {
      window.removeEventListener('pointermove', activate);
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('touchmove', activate);
      document.removeEventListener('mouseleave', deactivate);
      window.removeEventListener('touchend', deactivate);
      window.removeEventListener('blur', deactivate);
    };
  }, []);

  const mouseActiveRef = useRef(0);
  const mouseWorldRef = useRef(new THREE.Vector3(0, 0, focalZ));
  const prevMouseWorldRef = useRef(new THREE.Vector3(0, 0, focalZ));
  const trailSpeedRef = useRef(0);
  const scratchDir = useRef(new THREE.Vector3());
  const scratchVector = useRef(new THREE.Vector3());

  useSafeFrame((state, delta) => {
    material.uniforms.uTime.value = state.clock.getElapsedTime();

    // Ray-plane intersection: unproject the pointer onto a fixed depth
    // roughly in the middle of the particle volume. That world point is the
    // centre of the "invisible sphere" the mouse pushes particles away from
    // - particles far from that depth naturally get less push because their
    // 3D distance to the sphere centre is larger.
    scratchVector.current.set(state.pointer.x, state.pointer.y, 0.5).unproject(camera);
    scratchDir.current.copy(scratchVector.current).sub(camera.position).normalize();
    const denom = scratchDir.current.z;
    if (Math.abs(denom) > 1e-6) {
      const t = (focalZ - camera.position.z) / denom;
      if (Number.isFinite(t)) {
        mouseWorldRef.current.copy(camera.position).addScaledVector(scratchDir.current, t);
      }
    }

    const target = pointerActiveRef.current ? 1 : 0;
    mouseActiveRef.current = THREE.MathUtils.damp(mouseActiveRef.current, target, 6, delta);
    material.uniforms.uMouseSphere.value.copy(mouseWorldRef.current);
    material.uniforms.uMouseActive.value = mouseActiveRef.current;

    if (enableTrail) {
      const movedDist = mouseWorldRef.current.distanceTo(prevMouseWorldRef.current);
      const speed = movedDist / Math.max(delta, 1 / 240);
      const speedFactor = THREE.MathUtils.clamp(speed / 40, 0, 1);
      trailSpeedRef.current = THREE.MathUtils.damp(trailSpeedRef.current, speedFactor, 8, delta);
      prevMouseWorldRef.current.copy(mouseWorldRef.current);

      // Shift the ring buffer and drop the current position in at the front.
      const trailUniform = material.uniforms.uTrail.value;
      for (let i = trailUniform.length - 1; i > 0; i--) {
        trailUniform[i].copy(trailUniform[i - 1]);
      }
      trailUniform[0].copy(mouseWorldRef.current);
      material.uniforms.uTrailStrength.value = trailStrengthBase * trailSpeedRef.current;
    }

    if (connectionData) {
      const { linePositions, vertexCount, geometry: connGeo } = connectionData;
      const colorArray = connGeo.attributes.color.array;
      const glowRadius = interactionRadius * 0.85;
      const active = mouseActiveRef.current;

      for (let v = 0; v < vertexCount; v++) {
        const dx = linePositions[v * 3] - mouseWorldRef.current.x;
        const dy = linePositions[v * 3 + 1] - mouseWorldRef.current.y;
        const dz = linePositions[v * 3 + 2] - mouseWorldRef.current.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const glow = active * Math.max(0, 1 - dist / glowRadius);
        const eased = glow * glow;

        colorArray[v * 3] = DEEP_BLUE.r + (MID_VIOLET.r - DEEP_BLUE.r) * eased;
        colorArray[v * 3 + 1] = DEEP_BLUE.g + (MID_VIOLET.g - DEEP_BLUE.g) * eased;
        colorArray[v * 3 + 2] = DEEP_BLUE.b + (MID_VIOLET.b - DEEP_BLUE.b) * eased;
      }
      connGeo.attributes.color.needsUpdate = true;
    }
  });

  return (
    <>
      <primitive object={points} />
      {lines && <primitive object={lines} />}
    </>
  );
}

class ParticleFieldBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    reportParticleError('mount', error);
    if (errorInfo?.componentStack) console.error('[3D ERROR] Component stack:' + errorInfo.componentStack);
  }

  render() {
    // No fallback visual - the particle field is atmospheric background, so
    // if it fails the rest of the scene (AI core, avatar, navigation) simply
    // continues without it rather than showing a placeholder in its place.
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Independent, reusable, black/blue-violet 3D particle field with mouse repulsion,
 * idle drift, a fast-motion trail, and subtle nearby-neighbour connections.
 * Never able to crash the surrounding 3D scene - failures are caught and the
 * field just doesn't render.
 */
export function ParticleField(props) {
  return (
    <ParticleFieldBoundary>
      <ParticleFieldInner {...props} />
    </ParticleFieldBoundary>
  );
}

export default ParticleField;
