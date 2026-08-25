'use client';

/**
 * A self-contained, bounded interactive 3D Solar System widget - its own
 * <Canvas> with OrbitControls, independent from the site-wide background
 * scene in `ThreeScene.jsx`. Drop it anywhere with a sized parent:
 *
 *   <div className="h-[480px]"><SolarSystem /></div>
 *
 * Compressed (non-linear) visual orbital scale so all eight planets fit in a
 * small box together, but every info panel shows the REAL astronomical
 * distance/period/diameter - those numbers never come from the 3D scene.
 */

import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import { useResponsiveTier } from '@/hooks/useResponsiveTier';
import { PARALLAX, INTENSITY, DURATION, EASE } from '@/config/motion';

// Blends a hex color toward white - used to derive each planet's rim-glow
// tint from its own base color instead of a single one-size-fits-all glow.
// Returns a '#rrggbb' string (not a THREE.Color instance) so it drops
// straight into a JSX `color=` prop the same way a plain hex literal would.
function brighten(hex, amount = 0.55) {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#ffffff'), amount);
  return `#${c.getHexString()}`;
}

let cachedGlowSprite = null;
// A small radial-gradient sprite so points render as soft glowing dots
// instead of THREE.PointsMaterial's default flat squares (the single
// biggest reason a starfield reads as "cheap/cartoon" instead of premium).
function getGlowSpriteTexture() {
  if (cachedGlowSprite) return cachedGlowSprite;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  cachedGlowSprite = new THREE.CanvasTexture(canvas);
  return cachedGlowSprite;
}

// --- Procedural planet surface textures -------------------------------
// There are no real NASA texture image assets in this project, and faking
// asset paths that 404 isn't acceptable here - so these are generated at
// runtime with the 2D canvas API instead. Each is drawn on a 2:1 canvas
// (equirectangular, matching THREE.SphereGeometry's default UVs) and cached
// per planet id so it's built once, not every render.
const textureCache = new Map();
const TEX_W = 256;
const TEX_H = 128;

function newTextureCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  return canvas;
}

function finalizeTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// Oceans + a handful of continent-like landmasses + polar caps - not real
// geography, just the universal blue/green/white silhouette that reads as
// "Earth" at a glance, which is the actual goal (recognisability).
function createEarthTexture() {
  const canvas = newTextureCanvas();
  const ctx = canvas.getContext('2d');

  const ocean = ctx.createLinearGradient(0, 0, 0, TEX_H);
  ocean.addColorStop(0, '#153f66');
  ocean.addColorStop(0.5, '#2874ad');
  ocean.addColorStop(1, '#153f66');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const land = [
    { x: 48, y: 40, rx: 16, ry: 26, rot: -0.3 },   // Americas (north)
    { x: 58, y: 82, rx: 10, ry: 20, rot: 0.1 },    // Americas (south)
    { x: 128, y: 34, rx: 12, ry: 14, rot: 0 },     // Europe
    { x: 133, y: 62, rx: 13, ry: 24, rot: 0.05 },  // Africa
    { x: 172, y: 30, rx: 28, ry: 18, rot: -0.1 },  // Asia
    { x: 168, y: 52, rx: 14, ry: 10, rot: 0.2 },   // South Asia
    { x: 202, y: 92, rx: 12, ry: 8, rot: 0 },      // Australia
  ];
  ctx.fillStyle = '#3d7d46';
  land.forEach((l) => {
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, l.rx, l.ry, l.rot, 0, Math.PI * 2);
    ctx.fill();
  });

  // Desert/terrain tint patches for a bit of surface variation.
  ctx.fillStyle = 'rgba(163,133,74,0.55)';
  [[136, 55, 9, 6], [178, 28, 10, 5]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Polar caps.
  ctx.fillStyle = '#eef3f7';
  ctx.fillRect(0, 0, TEX_W, 8);
  ctx.fillRect(0, TEX_H - 8, TEX_W, 8);

  // Faint cloud wisps.
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * TEX_W;
    const y = Math.random() * TEX_H;
    const r = 3 + Math.random() * 7;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.4, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  return finalizeTexture(canvas);
}

// Horizontal banded texture for gas/ice giants, optionally with Jupiter's
// Great Red Spot - the single most recognisable gas-giant detail.
function createBandedTexture(baseHex, bandCount, hasRedSpot) {
  const canvas = newTextureCanvas();
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(baseHex);

  for (let y = 0; y < TEX_H; y++) {
    const t = y / TEX_H;
    const band = Math.sin(t * Math.PI * bandCount) * 0.1 + Math.sin(t * Math.PI * bandCount * 2.3) * 0.04;
    const jitter = (Math.random() - 0.5) * 0.015;
    const shade = base.clone().offsetHSL(0, 0, band + jitter);
    ctx.fillStyle = `#${shade.getHexString()}`;
    ctx.fillRect(0, y, TEX_W, 1);
  }

  if (hasRedSpot) {
    ctx.fillStyle = '#c1573a';
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.ellipse(TEX_W * 0.6, TEX_H * 0.6, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  return finalizeTexture(canvas);
}

// Mottled, cratered surface for the rocky inner planets - random speckling
// plus a few larger tinted patches, optionally a small polar cap (Mars).
function createRockyTexture(baseHex, spotHex, hasPoleCap) {
  const canvas = newTextureCanvas();
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(baseHex);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * TEX_W;
    const y = Math.random() * TEX_H;
    const r = 1 + Math.random() * 3.5;
    const shade = base.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.16);
    ctx.fillStyle = `#${shade.getHexString()}`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (spotHex) {
    ctx.fillStyle = spotHex;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * TEX_W;
      const y = Math.random() * TEX_H;
      const r = 6 + Math.random() * 12;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (hasPoleCap) {
    ctx.fillStyle = '#f2f2f2';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 0, TEX_W, 5);
    ctx.globalAlpha = 1;
  }

  return finalizeTexture(canvas);
}

function getPlanetTexture(config) {
  const cached = textureCache.get(config.id);
  if (cached) return cached;

  let texture;
  if (config.texture === 'earth') {
    texture = createEarthTexture();
  } else if (config.texture === 'banded') {
    texture = createBandedTexture(config.color, config.bandCount ?? 8, !!config.redSpot);
  } else {
    texture = createRockyTexture(config.color, config.spotColor, !!config.poleCap);
  }
  textureCache.set(config.id, texture);
  return texture;
}

// Real astronomical data (public, well-known constants) - independent of the
// compressed visual scale below. This is what the info panel displays.
// `moons` is a point-in-time snapshot (confirmed-moon counts, especially for
// the gas/ice giants, keep changing as new ones are discovered/confirmed -
// current as of the most recent well-publicised counts, not a permanent
// figure). `gravity`/`avgTemp` for the four giants are cloud-top/1-bar-level
// values, called out inline, since they have no solid surface to measure at.
const PLANETS = [
  {
    id: 'mercury', name: 'MERCURY', color: '#B8B4AC',
    texture: 'rocky', spotColor: '#8f8b83',
    visualRadius: 0.3, orbitRadius: 2.3, orbitSpeed: 0.62, tilt: 0.02,
    distance: '57.9 million km', au: '0.387 AU', period: '88 days', diameter: '4,879 km',
    type: 'Terrestrial Planet', distanceFromEarth: '77.3 million km (closest approach)',
    mass: '3.30 × 10²³ kg', gravity: '3.7 m/s²', rotationPeriod: '58.6 Earth days',
    moons: '0', avgTemp: '167°C avg (extreme swings)',
    description: 'The smallest and innermost planet, a cratered, airless world with the most extreme temperature swings in the solar system.',
  },
  {
    id: 'venus', name: 'VENUS', color: '#E8C88A',
    texture: 'rocky', spotColor: '#f2e2b8',
    visualRadius: 0.44, orbitRadius: 3.0, orbitSpeed: 0.49, tilt: 0.01,
    distance: '108.2 million km', au: '0.723 AU', period: '224.7 days', diameter: '12,104 km',
    type: 'Terrestrial Planet', distanceFromEarth: '38.2 million km (closest approach)',
    mass: '4.87 × 10²⁴ kg', gravity: '8.87 m/s²', rotationPeriod: '243 Earth days (retrograde)',
    moons: '0', avgTemp: '464°C',
    description: 'The hottest planet in the solar system, shrouded in a thick, toxic CO₂ atmosphere trapping heat in a runaway greenhouse effect.',
  },
  {
    id: 'earth', name: 'EARTH', color: '#3E7CB1', hasGlow: true,
    texture: 'earth',
    visualRadius: 0.47, orbitRadius: 3.8, orbitSpeed: 0.41, tilt: 0.41,
    distance: '149.6 million km', au: '1.000 AU', period: '365.25 days', diameter: '12,742 km',
    type: 'Terrestrial Planet', distanceFromEarth: '—',
    mass: '5.97 × 10²⁴ kg', gravity: '9.81 m/s²', rotationPeriod: '23h 56m',
    moons: '1', avgTemp: '15°C avg',
    description: 'The only known planet to harbor life, with liquid water covering most of its surface and a stable, life-supporting atmosphere.',
  },
  {
    id: 'mars', name: 'MARS', color: '#B5563E',
    texture: 'rocky', spotColor: '#5c2c1c', poleCap: true,
    visualRadius: 0.36, orbitRadius: 4.6, orbitSpeed: 0.34, tilt: 0.03,
    distance: '227.9 million km', au: '1.524 AU', period: '687 days', diameter: '6,779 km',
    type: 'Terrestrial Planet', distanceFromEarth: '54.6 million km (closest approach)',
    mass: '6.42 × 10²³ kg', gravity: '3.71 m/s²', rotationPeriod: '24h 37m',
    moons: '2', avgTemp: '-65°C avg',
    description: 'The "Red Planet" - a cold desert world with the solar system’s largest volcano and canyon, and evidence of ancient liquid water.',
  },
  {
    id: 'jupiter', name: 'JUPITER', color: '#C9A77C',
    texture: 'banded', bandCount: 14, redSpot: true,
    visualRadius: 1.05, orbitRadius: 6.0, orbitSpeed: 0.22, tilt: 0.02,
    distance: '778.5 million km', au: '5.203 AU', period: '~11.86 years', diameter: '139,820 km',
    type: 'Gas Giant', distanceFromEarth: '588.5 million km (closest approach)',
    mass: '1.898 × 10²⁷ kg', gravity: '24.79 m/s² (cloud tops)', rotationPeriod: '9h 56m',
    moons: '95', avgTemp: '-110°C (cloud tops)',
    description: 'The largest planet in the solar system, famous for its Great Red Spot - a storm larger than Earth that has raged for centuries.',
  },
  {
    id: 'saturn', name: 'SATURN', color: '#E3D0A3', hasRing: true,
    texture: 'banded', bandCount: 9,
    visualRadius: 0.92, orbitRadius: 7.4, orbitSpeed: 0.17, tilt: 0.27,
    distance: '1.43 billion km', au: '9.537 AU', period: '~29.4 years', diameter: '116,460 km',
    type: 'Gas Giant', distanceFromEarth: '~1.2 billion km (closest approach)',
    mass: '5.68 × 10²⁶ kg', gravity: '10.44 m/s² (cloud tops)', rotationPeriod: '10h 42m',
    moons: '274', avgTemp: '-140°C (cloud tops)',
    description: 'Renowned for its spectacular ring system of ice and rock, and the second-largest planet in the solar system.',
  },
  {
    id: 'uranus', name: 'URANUS', color: '#7FB8BE', hasRing: true,
    texture: 'banded', bandCount: 4,
    visualRadius: 0.65, orbitRadius: 8.7, orbitSpeed: 0.13, tilt: 0.7,
    distance: '2.87 billion km', au: '19.19 AU', period: '~84 years', diameter: '50,724 km',
    type: 'Ice Giant', distanceFromEarth: '~2.6 billion km (closest approach)',
    mass: '8.68 × 10²⁵ kg', gravity: '8.69 m/s² (cloud tops)', rotationPeriod: '17h 14m (retrograde)',
    moons: '28', avgTemp: '-195°C (cloud tops)',
    description: 'An ice giant that rotates on its side, tipped roughly 98°, giving it the most extreme seasons of any planet.',
  },
  {
    id: 'neptune', name: 'NEPTUNE', color: '#3A5AA8',
    texture: 'banded', bandCount: 6,
    visualRadius: 0.63, orbitRadius: 10.0, orbitSpeed: 0.1, tilt: 0.05,
    distance: '4.50 billion km', au: '30.07 AU', period: '~164.8 years', diameter: '49,244 km',
    type: 'Ice Giant', distanceFromEarth: '~4.3 billion km (closest approach)',
    mass: '1.02 × 10²⁶ kg', gravity: '11.15 m/s² (cloud tops)', rotationPeriod: '16h 6m',
    moons: '16', avgTemp: '-201°C (cloud tops)',
    description: 'The windiest planet in the solar system - an ice giant with supersonic storms and a deep blue color from atmospheric methane.',
  },
];

function reportSolarSystemError(stage, error) {
  console.error(`[3D ERROR]\nComponent: SolarSystem\nStage: ${stage}\nError: ${error?.message ?? String(error)}`);
  if (error?.stack) console.error('[3D ERROR] Stack trace:\n' + error.stack);
}

// A throw inside the render loop happens outside React's render phase, so a
// React error boundary can never catch it - it would tear down the Canvas.
function useSafeFrame(callback) {
  const failedRef = useRef(false);
  useFrame((state, delta) => {
    if (failedRef.current) return;
    // Skip advancing the animation while the tab is hidden - cheap, and
    // avoids piling up work that fires all at once when the tab returns.
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      callback(state, delta);
    } catch (error) {
      failedRef.current = true;
      reportSolarSystemError('render-loop', error);
    }
  });
}

// Reads Home-section-local scroll progress (0 near the top of the page, up
// toward 1 as Home finishes scrolling past - see useScrollProgress.js) and
// eases a small additive Z-push/scale-down onto its children with
// THREE.MathUtils.damp, the same damping pattern already used elsewhere in
// this file (Planet's hover-scale). Used to give the Sun+planets and the
// Starfield each their own independent depth-parallax layer as the page
// scrolls - "camera moves deeper"/"stars move at a different depth" from a
// single reusable wrapper, without ever touching `camera.position` or
// OrbitControls directly (OrbitControls has `enableDamping={false}`
// specifically so drag tracks the pointer 1:1 - see the comment on it
// below; fighting that by also driving the camera from scroll would make
// dragging feel disconnected while a scroll-driven move is in flight).
function ScrollParallaxGroup({ sectionProgressRef, prefersReducedMotion, depthAmount, scaleAmount = 0, children }) {
  const groupRef = useRef(null);
  const currentZ = useRef(0);
  const currentScale = useRef(1);

  useSafeFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (prefersReducedMotion || !sectionProgressRef) {
      if (group.position.z !== 0) group.position.z = 0;
      if (scaleAmount && group.scale.x !== 1) group.scale.setScalar(1);
      return;
    }

    const progress = sectionProgressRef.current?.home ?? 0;

    const targetZ = -progress * depthAmount;
    currentZ.current = THREE.MathUtils.damp(currentZ.current, targetZ, 4, delta);
    group.position.z = currentZ.current;

    if (scaleAmount) {
      const targetScale = 1 - progress * scaleAmount;
      currentScale.current = THREE.MathUtils.damp(currentScale.current, targetScale, 4, delta);
      group.scale.setScalar(currentScale.current);
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

// A genuine Fresnel edge-glow: bright only at grazing angles (the visible
// silhouette), near-zero where the surface faces the camera head-on. Unlike
// a flat translucent sphere (which additively tints the ENTIRE front face,
// washing out whatever texture is underneath), this only glows at the rim -
// so it adds atmospheric depth without flattening the planet's own surface.
function RimGlow({ radius, segments, color, scale = 1.06, power = 2.5, strength = 0.65 }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uStrength: { value: strength } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uStrength;
      void main() {
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), uPower);
        gl_FragColor = vec4(uColor, fresnel * uStrength);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [color, power, strength]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh scale={scale}>
      <sphereGeometry args={[radius, segments, segments]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function OrbitRing({ radius }) {
  const lineLoop = useMemo(() => {
    const segments = 96;
    const points = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff2d95, transparent: true, opacity: 0.16 });
    return new THREE.LineLoop(geometry, material);
  }, [radius]);

  useEffect(() => () => {
    lineLoop.geometry.dispose();
    lineLoop.material.dispose();
  }, [lineLoop]);

  return <primitive object={lineLoop} />;
}

function Planet({ config, segments, onSelect, selectedId }) {
  const orbitGroupRef = useRef(null);
  const meshRef = useRef(null);
  const glowRef = useRef(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const [hovered, setHovered] = useState(false);
  const scaleRef = useRef(1);
  const rimColor = useMemo(() => brighten(config.color, 0.5), [config.color]);
  const surfaceMap = useMemo(() => getPlanetTexture(config), [config]);

  useSafeFrame((state, delta) => {
    angleRef.current += delta * config.orbitSpeed * 0.25;
    if (orbitGroupRef.current) orbitGroupRef.current.rotation.y = angleRef.current;

    const targetScale = hovered || selectedId === config.id ? 1.35 : 1;
    scaleRef.current = THREE.MathUtils.damp(scaleRef.current, targetScale, 8, delta);
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.scale.setScalar(scaleRef.current);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(scaleRef.current * 1.5);
      glowRef.current.material.opacity = THREE.MathUtils.damp(
        glowRef.current.material.opacity,
        hovered || selectedId === config.id ? 0.55 : 0,
        8,
        delta
      );
    }
  });

  return (
    <group ref={orbitGroupRef}>
      <group position={[config.orbitRadius, 0, 0]} rotation={[0, 0, config.tilt]}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[config.visualRadius, segments, segments]} />
          {/* Deliberately unlit (meshBasicMaterial), not meshStandardMaterial.
              A lit material here was overexposed by the sun/rim point lights
              close-up, crushing every texture's contrast down to a near-flat
              colour (confirmed by an unlit A/B screenshot) - which was the
              actual cause of "can't recognise the planets", not the textures
              themselves. Trading PBR shading for guaranteed-visible surface
              detail is the right call for a small, close-up, recognisability-
              first scene like this one. color stays white so the texture's
              own colours render unmodified instead of being tinted. */}
          <meshBasicMaterial
            map={surfaceMap}
            color="#ffffff"
          />
        </mesh>

        {/* Hover/selected glow halo - hidden (opacity 0) at rest. */}
        <mesh ref={glowRef}>
          <sphereGeometry args={[config.visualRadius, segments, segments]} />
          <meshBasicMaterial color="#ff4fb3" transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* Interaction now lives on its own, much larger invisible sphere -
            not on the tiny visible mesh above. Two real bugs were fixed by
            moving it here:
            1. The visible mesh and the glow halo mesh above are the exact
               same radius at the exact same position, so the raycaster's
               two intersections landed at (near-)identical distances; on
               ties, whichever one the sort happened to put first "won" the
               event - and the glow mesh has no click/hover handlers, so a
               tie going its way silently swallowed the click. That's what
               made clicking "many planets" seem to randomly do nothing.
            2. Small planets (Mercury, Mars, ...) are only a handful of
               screen pixels across at this camera distance - a target
               exactly their visual size is genuinely hard to hit with a
               mouse. This sphere is sized well past the visible surface so
               every planet has a comfortable, consistent click/hover area
               regardless of how small it renders. */}
        <mesh
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
          onClick={(e) => { e.stopPropagation(); onSelect(config); }}
        >
          <sphereGeometry args={[Math.max(config.visualRadius * 2.6, 0.55), 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* Fresnel rim glow, not a flat overlay - see RimGlow's comment.
            A flat additive sphere here was washing every planet's surface
            texture out to a near-solid colour; this only glows at the edge. */}
        <RimGlow radius={config.visualRadius} segments={segments} color={rimColor} />

        {config.hasGlow && (
          <RimGlow radius={config.visualRadius} segments={segments} color="#7fd4ff" scale={1.14} power={1.8} strength={0.5} />
        )}

        {config.hasRing && (
          <group rotation={[Math.PI / 2.3, 0, 0]}>
            {/* Three concentric bands with falling opacity fake a soft,
                gradient-edged ring instead of one flat, hard-edged disc. */}
            <mesh>
              <ringGeometry args={[config.visualRadius * 1.5, config.visualRadius * 1.9, 64]} />
              <meshBasicMaterial color={config.color} transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh>
              <ringGeometry args={[config.visualRadius * 1.9, config.visualRadius * 2.15, 64]} />
              <meshBasicMaterial color={rimColor} transparent opacity={0.24} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh>
              <ringGeometry args={[config.visualRadius * 2.15, config.visualRadius * 2.4, 64]} />
              <meshBasicMaterial color={config.color} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
        )}

        {hovered && (
          <Html position={[0, config.visualRadius + 0.35, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <div className="section-label active whitespace-nowrap">{config.name}</div>
          </Html>
        )}
      </group>
    </group>
  );
}

function Starfield({ count }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 11 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xd5d5dd,
      size: 0.09,
      map: getGlowSpriteTexture(),
      alphaMap: getGlowSpriteTexture(),
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geometry, material);
  }, [count]);

  useEffect(() => () => {
    points.geometry.dispose();
    points.material.dispose();
  }, [points]);

  return <primitive object={points} />;
}

function Sun() {
  const sunRef = useRef(null);
  useSafeFrame((state, delta) => {
    if (sunRef.current) sunRef.current.rotation.y += delta * 0.06;
  });

  return (
    <>
      <pointLight color="#fff1e0" intensity={3.2} distance={30} decay={2} />
      <mesh ref={sunRef}>
        <sphereGeometry args={[1.05, 48, 48]} />
        {/* toneMapped=false lets this stay bright enough to actually trigger
            the Bloom pass instead of being clamped by the renderer's default
            tone mapping. */}
        <meshBasicMaterial color="#fff0c2" toneMapped={false} />
      </mesh>
      {/* Halo layers kept tight and low-opacity - with bigger planets now in
          frame, a wide/strong halo washed out the whole scene and killed
          contrast on every planet's surface texture. */}
      <mesh scale={1.1}>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh scale={1.22}>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshBasicMaterial color="#ff2d95" transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh scale={1.4}>
        <sphereGeometry args={[1.05, 24, 24]} />
        <meshBasicMaterial color="#b84dff" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

function SolarSystemScene({ tier, prefersReducedMotion, sectionProgressRef, onSelect, selectedId }) {
  const segments = tier === 'mobile' ? 20 : tier === 'tablet' ? 32 : 48;
  const starCount = tier === 'mobile' ? 120 : tier === 'tablet' ? 200 : 280;
  // 0 on mobile - "don't just scale the desktop version down", skip the
  // effect outright rather than running a smaller version of it.
  const parallaxIntensity = INTENSITY.scrollParallax[tier] ?? 1;

  return (
    <>
      <ambientLight intensity={0.35} color="#1a1020" />
      {/* Cool pink/purple rim light from the opposite side of the sun - the
          classic two-tone lighting trick that gives spheres visible depth
          instead of a single flat wash of light. */}
      <pointLight position={[-9, -3, -7]} color="#b84dff" intensity={1.4} distance={26} decay={2} />

      {/* Its own, smaller/independent parallax layer from the Sun+planets
          below - the two moving at different rates as the page scrolls is
          what actually reads as "depth" rather than the whole scene
          shifting as one flat image. */}
      <ScrollParallaxGroup
        sectionProgressRef={sectionProgressRef}
        prefersReducedMotion={prefersReducedMotion}
        depthAmount={PARALLAX.starfieldDepth * parallaxIntensity}
      >
        <Starfield count={starCount} />
      </ScrollParallaxGroup>

      <ScrollParallaxGroup
        sectionProgressRef={sectionProgressRef}
        prefersReducedMotion={prefersReducedMotion}
        depthAmount={PARALLAX.heroGroupDepth * parallaxIntensity}
        scaleAmount={PARALLAX.heroGroupScale * parallaxIntensity}
      >
        <Sun />
        {PLANETS.map((p) => (
          <OrbitRing key={`ring-${p.id}`} radius={p.orbitRadius} />
        ))}
        {PLANETS.map((p) => (
          <Planet key={p.id} config={p} segments={segments} onSelect={onSelect} selectedId={selectedId} />
        ))}
      </ScrollParallaxGroup>
    </>
  );
}

class SolarSystemBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    reportSolarSystemError('mount', error);
    if (errorInfo?.componentStack) console.error('[3D ERROR] Component stack:' + errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

// A calm static visual - not an error message - for when WebGL genuinely
// isn't available. The rest of the page keeps working either way.
function StaticFallback() {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,45,149,0.12), transparent 65%)' }}>
      <div className="relative w-40 h-40 md:w-56 md:h-56">
        <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, #ffb347 0%, #ff2d95 55%, transparent 75%)', filter: 'blur(2px)' }} />
        {[1, 1.6, 2.2].map((s) => (
          <div
            key={s}
            className="absolute rounded-full border"
            style={{
              inset: `${-40 * s}px`,
              borderColor: 'rgba(255,45,149,0.18)',
            }}
          />
        ))}
      </div>
      <p className="absolute bottom-4 text-xs font-mono uppercase tracking-widest text-slate-500">
        3D preview unavailable in this browser
      </p>
    </div>
  );
}

// One stat row - a small helper so the field list below stays scannable
// instead of repeating the same flex/dt/dd markup nine times.
function StatRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500 font-mono text-xs uppercase tracking-wider">{label}</dt>
      <dd className="text-white font-medium text-right">{value}</dd>
    </div>
  );
}

// Plain React/JSX/Tailwind - a normal DOM overlay, not a 3D object. The only
// place this file still touches Three.js for the interaction itself is the
// pointer events already on each Planet's mesh (that's the only way to know
// which 3D planet a click landed on); everything from "a planet was
// selected" onward, including this whole panel, is ordinary React state.
//
// Renders the *last selected* planet's data while animating out (planet
// prop already went null) so the exit animation never flashes blank.
// "Storing information from previous renders" via a conditional setState
// call during render, not a useEffect - React re-runs the component
// immediately with the new state before committing, so there's no extra
// paint and no stale-frame lag when swapping straight from A to B. See
// https://react.dev/reference/react/useState#storing-information-from-previous-renders.
function PlanetPanel({ planet, onClose, prefersReducedMotion }) {
  const [displayPlanet, setDisplayPlanet] = useState(planet);
  if (planet && planet !== displayPlanet) setDisplayPlanet(planet);
  const isOpen = Boolean(planet);

  const outerVariants = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 24, scale: 0.96 }, visible: { opacity: 1, y: 0, scale: 1 } };
  const outerTransition = prefersReducedMotion
    ? { duration: DURATION.planetPanelReducedMotion, ease: 'linear' }
    : { duration: isOpen ? DURATION.planetPanelEnter : DURATION.planetPanelExit, ease: EASE.standard };

  return (
    <AnimatePresence>
      {isOpen && displayPlanet && (
        <motion.div
          key="planet-panel"
          variants={outerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={outerTransition}
          style={{
            borderColor: `${displayPlanet.color}55`,
            boxShadow: `0 0 28px ${displayPlanet.color}33, 0 0 0 1px ${displayPlanet.color}22 inset`,
          }}
          className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-4 sm:right-4 z-20 glass-panel border sm:rounded-2xl rounded-t-2xl sm:w-80 sm:max-w-[80%] max-h-[75vh] sm:max-h-[80vh] overflow-y-auto overscroll-contain"
          role="dialog"
          aria-label={`${displayPlanet.name} details`}
        >
          {/* Sticky so the identity + close button stay reachable even once
              the longer stat list scrolls underneath it on short viewports. */}
          <div className="sticky top-0 z-10 glass-panel flex items-start justify-between gap-3 p-5 pb-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span
                className="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: displayPlanet.color, boxShadow: `0 0 8px ${displayPlanet.color}` }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h4 className="text-lg font-bold text-white tracking-wide truncate">{displayPlanet.name}</h4>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-primary-cyan/80 border border-primary-cyan/30 rounded-full">
                  {displayPlanet.type}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-slate-400 hover:text-primary-cyan transition-colors p-1 -m-1 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={displayPlanet.id}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{
                duration: prefersReducedMotion ? DURATION.planetPanelReducedMotion : DURATION.planetPanelContentSwap,
                ease: EASE.standard,
              }}
              className="px-5 pb-5"
              aria-live="polite"
            >
              <dl className="space-y-2 text-sm">
                <StatRow label="Distance from Sun" value={`${displayPlanet.distance} (${displayPlanet.au})`} />
                <StatRow label="Distance from Earth" value={displayPlanet.distanceFromEarth} />
                <StatRow label="Diameter" value={displayPlanet.diameter} />
                <StatRow label="Mass" value={displayPlanet.mass} />
                <StatRow label="Gravity" value={displayPlanet.gravity} />
                <StatRow label="Orbital Period" value={displayPlanet.period} />
                <StatRow label="Rotation Period" value={displayPlanet.rotationPeriod} />
                <StatRow label="Moons" value={displayPlanet.moons} />
                <StatRow label="Avg. Temperature" value={displayPlanet.avgTemp} />
              </dl>
              <p className="mt-3 pt-3 border-t border-dark-border text-xs text-slate-400 leading-relaxed">
                {displayPlanet.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SolarSystemInner({ edgeMask, sectionProgressRef }) {
  const { tier, prefersReducedMotion } = useResponsiveTier();
  const [selected, setSelected] = useState(null);
  // Tighter than a "true" wide shot on purpose: zoom is disabled (see the
  // OrbitControls comment below), so this default framing has to be close
  // enough on its own for planet surfaces - continents, bands, the Great Red
  // Spot - to actually be visible without any way to zoom in further.
  const cameraDistance = tier === 'mobile' ? 14.5 : tier === 'tablet' ? 13 : 11.5;

  // Re-clicking the already-selected planet toggles the panel closed
  // instead of just re-selecting the same planet (a visual no-op today).
  const handleSelectPlanet = (config) => {
    setSelected((current) => (current?.id === config.id ? null : config));
  };

  // ESC closes the panel - only listening while something is actually
  // selected, so this doesn't add a permanent global listener at idle.
  useEffect(() => {
    if (!selected) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected]);

  // Clicking empty canvas space (or an orbit ring - it has no pointer
  // handlers, so a click there is also "missed") closes the panel via R3F's
  // onPointerMissed. This is already drag-safe with no extra guard needed:
  // R3F only calls onPointerMissed for its own internally-detected "click"
  // (tracked from its own onPointerDown, independent of OrbitControls' raw
  // listeners on the same canvas) and only when that click moved 2px or
  // less - confirmed by reading @react-three/fiber's event source
  // (events-*.esm.js, `calculateDistance`/`delta <= 2` gating
  // `pointerMissed(...)`). A rotate-drag that starts on empty space never
  // qualifies as that click, so it can never spuriously close the panel.
  const handlePointerMissed = () => {
    if (selected) setSelected(null);
  };

  return (
    <div className="relative w-full h-full" style={{ touchAction: 'none' }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 5.5, cameraDistance], fov: 38, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        // The scene is full of overlapping, additively-blended transparent
        // meshes (starfield points, sun halo shells, planet rim glows, orbit
        // rings). Verified by sampling rendered pixel RGBA: an "empty" patch
        // of the canvas came back as an opaque, warm rgb(25,21,21) instead of
        // the surrounding page's cool rgb(2,4,9) - each additive draw pushes
        // the canvas's own alpha channel up too, so after enough of them
        // overlap it saturates to fully opaque even where nothing looks
        // bright, and clearColor alpha=0 stops mattering. Rather than fight
        // that accumulation draw-by-draw, clear to the exact page background
        // colour (--color-dark-bg, #020205) so the "empty" canvas is opaque
        // but visually identical to the page around it - no seam either way.
        // The actual borderless/blended look then comes from `edgeMask`
        // below, a real CSS mask on this DOM element, which fades the canvas
        // itself to transparent well before its rectangular edges - that's
        // independent of anything happening inside WebGL and is guaranteed
        // to blend cleanly.
        onCreated={({ gl }) => gl.setClearColor(0x020205, 1)}
        style={edgeMask ? { maskImage: edgeMask, WebkitMaskImage: edgeMask } : undefined}
        onPointerMissed={handlePointerMissed}
      >
        <Suspense fallback={null}>
          <SolarSystemScene
            tier={tier}
            prefersReducedMotion={prefersReducedMotion}
            sectionProgressRef={sectionProgressRef}
            onSelect={handleSelectPlanet}
            selectedId={selected?.id}
          />
          {/* Bloom is what actually sells "premium sci-fi render" - without
              it every emissive/glow mesh is just a flat-shaded blob no
              matter how good the geometry is. mipmapBlur keeps it cheap. */}
          {/* Raised threshold / lowered intensity from the first pass - at
              the closer camera framing needed to make planet surfaces
              legible, the previous settings bloomed nearly the whole frame
              and washed out contrast on every texture. This now only blooms
              genuinely bright highlights (the sun, hover glows). */}
          {/* multisampling={0}: the composer's own MSAA render target drops
              part of the alpha channel by default; disabling it keeps as
              much real per-pixel alpha as possible (antialias:true on the
              base Canvas still smooths edges). This alone wasn't the full
              story, though - see the clearColor/mask note below for the
              actual root cause of the visible rectangle. */}
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.45} luminanceSmoothing={0.2} />
          </EffectComposer>
        </Suspense>
        {/* enableZoom is deliberately off: OrbitControls' wheel handler calls
            preventDefault() whenever zoom is enabled, which traps the mouse
            wheel inside the canvas and blocks normal page scrolling whenever
            the cursor happens to be over the Solar System. Drag-to-rotate and
            pan still work; zoom is dropped in favour of page scroll working
            everywhere. */}
        {/* enableDamping off on purpose: with it on, OrbitControls only
            applies a `dampingFactor` fraction of the pending rotation each
            frame and spreads the rest across future frames - so the model
            visibly lags behind the cursor while you're still dragging, even
            though it's technically still working. Without damping the
            rotation is applied in full every frame, so the view tracks the
            mouse directly while the button is held. The only real cost is
            losing a bit of coast-on-release inertia, which matters much
            less than the drag itself feeling connected to the pointer. */}
        <OrbitControls
          enableDamping={false}
          enableZoom={false}
          enablePan
          panSpeed={0.5}
          rotateSpeed={0.85}
        />
      </Canvas>

      {/* Bottom-right rather than top-left: this widget now fills the full
          height of its section, and top-left would sit directly under the
          fixed site nav. */}
      <p className="absolute bottom-6 right-6 text-right text-[10px] font-mono uppercase tracking-widest text-slate-500 pointer-events-none">
        Compressed orbital scale — drag to explore
      </p>

      <PlanetPanel planet={selected} onClose={() => setSelected(null)} prefersReducedMotion={prefersReducedMotion} />
    </div>
  );
}

/**
 * Bounded interactive 3D Solar System with real astronomical data panels.
 * Needs an explicitly-sized parent (it fills 100%/100%). Gracefully falls
 * back to a static visual if WebGL is unavailable or the scene errors -
 * never blocks the rest of the page.
 */
export function SolarSystem({ edgeMask, sectionProgressRef }) {
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) setWebglOk(false);
  }, []);

  if (!webglOk) return <StaticFallback />;

  return (
    <SolarSystemBoundary fallback={<StaticFallback />}>
      <SolarSystemInner edgeMask={edgeMask} sectionProgressRef={sectionProgressRef} />
    </SolarSystemBoundary>
  );
}

export default SolarSystem;
