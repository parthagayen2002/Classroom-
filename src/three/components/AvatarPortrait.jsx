'use client';

/**
 * A small, self-contained 3D portrait of the procedural humanoid Avatar -
 * its own bounded <Canvas>, independent from the site-wide background scene
 * in ThreeScene.jsx. Drop it into a sized container:
 *
 *   <div className="w-40 h-40"><AvatarPortrait /></div>
 *
 * The humanoid used to render ambient in the page background; moved here on
 * request, into the About section's CHITTHI card, replacing the old flat
 * SVG icon. Head/eye tracking still works exactly as before - it reads
 * `state.pointer` from this Canvas's own R3F context, which R3F scopes to
 * pointer position over this specific canvas element, so the figure looks
 * toward the cursor while it's over the card.
 */

import { Component, Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AvatarWrapper } from './Avatar';

function reportPortraitError(stage, error) {
  console.error(`[3D ERROR]\nComponent: AvatarPortrait\nStage: ${stage}\nError: ${error?.message ?? String(error)}`);
  if (error?.stack) console.error('[3D ERROR] Stack trace:\n' + error.stack);
}

class AvatarPortraitBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    reportPortraitError('mount', error);
    if (errorInfo?.componentStack) console.error('[3D ERROR] Component stack:' + errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

// A calm static visual for when WebGL genuinely isn't available - not an
// error message, the rest of the About card keeps working either way.
function StaticFallback() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, #ff2d95 0%, #9b5cff 60%, transparent 75%)', filter: 'blur(2px)', opacity: 0.6 }} />
      </div>
    </div>
  );
}

export function AvatarPortrait() {
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) setWebglOk(false);
  }, []);

  if (!webglOk) return <StaticFallback />;

  return (
    <AvatarPortraitBoundary fallback={<StaticFallback />}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.1, 6.6], fov: 32, near: 0.1, far: 20 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        // pan-y: a vertical swipe over the card scrolls the page like
        // anywhere else. Dragging an arm or leg still works, because the
        // avatar cancels the page scroll itself while a limb is held (see
        // useDraggableLimbs in Avatar.jsx).
        style={{ touchAction: 'pan-y' }}
      >
        {/* The CHITTHI card already has its own opaque panel background
            behind this canvas, so - unlike the fullscreen Solar System
            widget - true canvas transparency was never a requirement here;
            there's no page background to show through or seam to hide. */}
        <ambientLight intensity={0.55} color="#2a1030" />
        <pointLight position={[1.4, 1.8, 2]} color="#FF4FB3" intensity={1.3} distance={8} decay={2} />
        <pointLight position={[-1.4, 0.4, 1.6]} color="#9B5CFF" intensity={1} distance={8} decay={2} />
        <Suspense fallback={null}>
          <AvatarWrapper position={[0, -0.95, 0]} rotation={[0, 0, 0]} scale={1} />
        </Suspense>
      </Canvas>
    </AvatarPortraitBoundary>
  );
}

export default AvatarPortrait;
