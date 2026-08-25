'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrthographicCamera } from '@react-three/drei';
import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { AICore, SectionOrbit, HolographicPanel, GridFloor } from '@/three/components/AICore';
import { ParticleField } from '@/three/ParticleField';
import { contactLinks, aboutContent } from '@/data/content';
import { useResponsiveTier } from '@/hooks/useResponsiveTier';
import { PARALLAX, INTENSITY } from '@/config/motion';

const sections = [
  { id: 'about', name: 'ABOUT', position: new THREE.Vector3(0, 15, 0), color: 0xFF2D95 },
  { id: 'techstack', name: 'TECH STACK', position: new THREE.Vector3(18, 8, 0), color: 0x9B5CFF },
  { id: 'projects', name: 'PROJECTS', position: new THREE.Vector3(-18, 0, 0), color: 0x9B5CFF },
  { id: 'achievements', name: 'ACHIEVEMENTS', position: new THREE.Vector3(0, -15, 0), color: 0xB98CFF },
  { id: 'contact', name: 'CONTACT', position: new THREE.Vector3(-12, -12, 0), color: 0xFF2D95 },
];

export function ThreeScene(props) {
  const [webglError, setWebglError] = useState(null);
  const [isWebGLSupported, setIsWebGLSupported] = useState(true);

  // Handle WebGL context creation errors
  const handleContextLost = useCallback((event) => {
    event.preventDefault();
    console.error('WebGL context lost:', event);
    setWebglError('WebGL context lost. This may be due to GPU memory pressure or driver issues.');
  }, []);

  const handleContextRestored = useCallback(() => {
    console.log('WebGL context restored');
    setWebglError(null);
  }, []);

  const handleWebGLError = useCallback((event) => {
    console.error('WebGL error:', event);
    setWebglError(event.message || 'WebGL initialization failed');
  }, []);

  // Check WebGL support on mount
  useEffect(() => {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2', { 
      failIfMajorPerformanceCaveat: false,
      alpha: true,
      antialias: true 
    }) || testCanvas.getContext('webgl', { 
      failIfMajorPerformanceCaveat: false,
      alpha: true,
      antialias: true 
    });
    
    if (!gl) {
      // Only reached when getContext() actually returned null for both webgl2
      // and webgl - i.e. WebGL really is unavailable, not merely suspected.
      console.error('[3D ERROR]\nComponent: ThreeScene\nError: canvas.getContext("webgl2") and ("webgl") both returned null.');
      setIsWebGLSupported(false);
      setWebglError('WebGL context creation returned null for both webgl2 and webgl. Enable hardware acceleration or update your browser.');
      return;
    }
    
    // Check if we got WebGL2
    const isWebGL2 = !!testCanvas.getContext('webgl2');
    
    // Log WebGL info
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    console.log('WebGL version:', isWebGL2 ? 'WebGL 2' : 'WebGL 1');
    console.log('Renderer:', debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    console.log('Vendor:', debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR));
    console.log('Version:', gl.getParameter(gl.VERSION));
    console.log('Shading Language Version:', gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
    console.log('Max Texture Size:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
    console.log('Max Vertex Attribs:', gl.getParameter(gl.MAX_VERTEX_ATTRIBS));
  }, []);

  if (webglError) {
    throw new Error(webglError);
  }

  // Early return if WebGL not supported - will trigger error boundary
  if (!isWebGLSupported) {
    throw new Error('WebGL not supported');
  }

  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        // Add WebGL context attributes for better compatibility
        preserveDrawingBuffer: true,
        failIfMajorPerformanceCaveat: false,
      }}
      camera={{ position: [0, 0, 35], fov: 60, near: 0.1, far: 200 }}
      onCreated={({ gl }) => {
        // Set up WebGL context event listeners.
        // R3F's onCreated callback does not expose a top-level `canvas`
        // property - the DOM element lives at `gl.domElement`.
        const canvas = gl.domElement;
        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);
        
        try {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          gl.setClearColor(0x030508, 1);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
          
          // `gl` here is the THREE.WebGLRenderer - the raw context lives on it.
          // Reading GL enums off the renderer would pass `undefined` to
          // getParameter and silently return null.
          const ctx = gl.getContext();
          console.log('Canvas WebGL version:', ctx instanceof WebGL2RenderingContext ? 'WebGL 2' : 'WebGL 1');
          console.log('Canvas Renderer:', ctx.getParameter(ctx.RENDERER));
          console.log('Canvas Vendor:', ctx.getParameter(ctx.VENDOR));
        } catch (err) {
          console.error('[3D ERROR]\nComponent: ThreeScene (onCreated)\nError:', err?.message);
          handleWebGLError({ message: `WebGL renderer setup failed: ${err.message}` });
        }
      }}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0,
        touchAction: 'none',
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}

function SceneContent({
  activeSection,
  setActiveSection,
  isIntroComplete,
  cameraPosition,
  setCameraPosition,
  scrollProgressRef,
}) {
  const { camera, scene, gl } = useThree();
  const { tier: responsiveTier, prefersReducedMotion } = useResponsiveTier();
  const targetPosition = useRef(new THREE.Vector3(0, 0, 30));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const transitionProgress = useRef(1);
  const isTransitioning = useRef(false);
  // Scratch vector for the per-frame lerp target below - reused every
  // frame rather than allocated fresh, and always recomputed from
  // targetPosition.current (focusSection's own tween) plus bounded
  // parallax offsets, never accumulated onto the live camera position.
  const effectiveTarget = useRef(new THREE.Vector3());

  const hoveredSection = useRef(null);
  const mousePosition = useRef(new THREE.Vector2(0, 0));

  useFrame((state, delta) => {
    if (!isIntroComplete) return;

    // Start from focusSection's own animated target every frame, then add
    // small bounded offsets on top - mouse parallax and a scroll-linked
    // push - so camera.position.lerp always chases a single, self-
    // correcting point. (The previous mouse-parallax implementation added
    // to camera.position.x/y directly inside the mousemove handler on every
    // event with nothing to subtract it back out, so the camera drifted
    // further with every mouse movement instead of settling near a target -
    // this replaces that with the same lerp-toward-a-bounded-target pattern
    // focusSection already uses.)
    effectiveTarget.current.copy(targetPosition.current);

    if (!prefersReducedMotion) {
      if (!isTransitioning.current) {
        const mouseIntensity = INTENSITY.mouseParallax[responsiveTier] ?? 1;
        effectiveTarget.current.x += mousePosition.current.x * PARALLAX.cameraScrollOffset * mouseIntensity;
        effectiveTarget.current.y += mousePosition.current.y * PARALLAX.cameraScrollOffset * mouseIntensity;
      }

      if (scrollProgressRef) {
        const scrollIntensity = INTENSITY.scrollParallax[responsiveTier] ?? 1;
        effectiveTarget.current.z -= (scrollProgressRef.current ?? 0) * PARALLAX.cameraScrollOffset * scrollIntensity;
      }
    }

    camera.position.lerp(effectiveTarget.current, delta * 3);
    camera.lookAt(targetLookAt.current.x, targetLookAt.current.y, targetLookAt.current.z);

    if (!prefersReducedMotion) {
      const time = state.clock.getElapsedTime();
      camera.position.x += Math.sin(time * 0.1) * 0.1;
      camera.position.y += Math.cos(time * 0.15) * 0.1;
    }
  });

  const focusSection = (sectionId) => {
    // 'home' (and any id without a 3D orbit marker) has no dedicated marker
    // position - fly back to the neutral default view instead of bailing out,
    // so navigating Home always resets the camera.
    const section = sections.find(s => s.id === sectionId);

    isTransitioning.current = true;
    transitionProgress.current = 0;

    const startPos = targetPosition.current.clone();
    const startLookAt = targetLookAt.current.clone();

    const endPos = section
      ? new THREE.Vector3(section.position.x * 0.8, section.position.y * 0.8, 25)
      : new THREE.Vector3(0, 0, 30);
    const endLookAt = section
      ? new THREE.Vector3(section.position.x * 0.3, section.position.y * 0.3, 0)
      : new THREE.Vector3(0, 0, 0);

    const animate = (progress) => {
      const eased = 1 - Math.pow(1 - progress, 3);
      targetPosition.current.lerpVectors(startPos, endPos, eased);
      targetLookAt.current.lerpVectors(startLookAt, endLookAt, eased);
    };

    const duration = 1500;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      animate(progress);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        isTransitioning.current = false;
        transitionProgress.current = 1;
      }
    };

    requestAnimationFrame(step);
  };

  // The active section is now driven by the router (nav click or browser
  // back/forward) rather than by clicking a 3D marker directly, so fly the
  // camera to match whenever it changes from the outside.
  const prevActiveSection = useRef(null);
  useEffect(() => {
    if (activeSection === prevActiveSection.current) return;
    prevActiveSection.current = activeSection;
    focusSection(activeSection);
  }, [activeSection]);

  const handleMouseMove = (event) => {
    // Just record the raw pointer position - the useFrame loop above turns
    // this into a damped, self-correcting camera offset every frame rather
    // than mutating camera.position directly here on every event.
    mousePosition.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePosition.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isIntroComplete]);

  const handleSectionClick = (sectionId) => {
    // Navigate the route - the effect above flies the camera once the
    // resulting `activeSection` prop change comes back down.
    setActiveSection(sectionId);
  };

  const handleSectionHover = (sectionId, isHovered) => {
    if (isHovered) {
      hoveredSection.current = sectionId;
      // Tell avatar to look at this section
      const section = sections.find(s => s.id === sectionId);
      if (section && window.__avatarSetSectionTarget) {
        window.__avatarSetSectionTarget([
          section.position.x * 0.5,
          section.position.y * 0.5,
          0
        ]);
      }
    } else if (hoveredSection.current === sectionId) {
      hoveredSection.current = null;
      if (window.__avatarSetSectionTarget) {
        window.__avatarSetSectionTarget(null);
      }
    }
  };

  return (
    <>
      <color attach="background" args={[0x030508]} />

      <fog attach="fog" args={[0x030508, 60, 180]} />

      <ambientLight color={0x0A0B18} intensity={0.4} />

      {/* Main directional light for avatar */}
      <directionalLight
        position={[20, 30, 20]}
        color={0xFF2D95}
        intensity={0.4}
        castShadow
      />
      <directionalLight
        position={[-20, 20, -20]}
        color={0x9B5CFF}
        intensity={0.3}
      />

      {/* Blue rim light for avatar - from behind */}
      <directionalLight
        position={[0, 10, -15]}
        color={0xFF2D95}
        intensity={0.6}
      />

      {/* Subtle fill light from front */}
      <directionalLight
        position={[0, 5, 15]}
        color={0x101828}
        intensity={0.2}
      />

      <pointLight
        position={[0, 0, 10]}
        color={0xFF4FB3}
        intensity={0.6}
        distance={60}
        decay={2}
      />

      {/* Idle drift and mouse-reaction were already animating every frame
          (verified - the shader was working) but the defaults were tuned so
          subtle they read as static. Nudged up slightly for a more felt
          effect while staying well short of clutter. */}
      <ParticleField count={2400} intensity={0.85} driftAmount={0.32} interactionRadius={8.5} interactionStrength={3.0} />

      <GridFloor size={140} divisions={70} color={0x9B5CFF} opacity={0.04} />

      {/* Pushed well back in Z and off to the right (was [0,0,0], full
          brightness) - at foreground distance, dead centre, this read as a
          "huge bright cluster" sitting directly on top of the About
          section's text. Sections put their text on the left and a visual
          panel on the right, so shifting it right keeps it out from behind
          the readable column; the extra distance and lower intensity make it
          a calm ambient presence rather than the dominant thing on screen. */}
      <group position={[6, 0, -14]}>
        {/* Home has its own dedicated 3D centerpiece (the Solar System widget
            in HeroSection.jsx), and Tech Stack has its own (the orb cloud
            just below) - the neural AI Core is skipped on both so none of
            them visually collide; it still renders on every other page. */}
        {activeSection !== 'home' && activeSection !== 'techstack' && (
          <AICore
            isActive={isIntroComplete}
            intensity={0.35}
            onNodeHover={(node) => {
              if (node) {
                document.body.style.cursor = 'pointer';
              } else {
                document.body.style.cursor = 'default';
              }
            }}
            onNodeClick={(node) => {
              console.log('Node clicked:', node);
            }}
          />
        )}

        {/* The humanoid Avatar used to render here, ambient in the
            background. Moved out on request - it now lives in its own
            bounded widget inside the About section's CHITTHI card
            (see AvatarPortrait.jsx / AboutSection.jsx) instead of floating
            behind the content. */}

        {/* DataParticles/EnergyStreams (the AI Core's old ambient halo) used
            to render here on About/Experience/Projects/Achievements/Contact.
            Their PointsMaterial has no sprite texture, so it rendered as a
            cluster of flat white/silver squares - reported as a "broken 3D
            object" first on Home (where it was removed) and then on every
            other section too. Removed for good everywhere: <ParticleField>
            above already fills the whole scene with small, soft-glow
            (non-square) particles that properly react to the mouse, so nothing
            is lost by dropping this redundant, visually broken layer. */}
      </group>

      {/* Tech Stack's 3D content used to mount here (a group positioned to
          roughly land where the camera flies for the 'techstack' marker
          below). It's now a self-contained bounded widget with its own
          Canvas, embedded directly in TechStackSection.jsx instead - see
          that file and src/three/components/TechCloud.jsx for why (the
          physics-based floating field needs to be strictly confined to the
          section's own DOM box, which a shared page-wide scene can't do).
          The 'techstack' SectionOrbit marker below still exists and the
          camera still flies to it like every other section - only the
          content that used to render near it moved out. */}

      {sections.map((section) => (
        <SectionOrbit
          key={section.id}
          position={section.position}
          label={section.name}
          color={section.color}
          distance={18}
          isActive={activeSection === section.id}
          onClick={() => handleSectionClick(section.id)}
          onHover={(hovered) => handleSectionHover(section.id, hovered)}
        >
          <Html
            position={[0, 0, 3.5]}
            rotation={[-Math.PI / 2, 0, 0]}
            transform
            style={{
              transform: 'translate(-50%, -50%) scale(0.5)',
              pointerEvents: 'none',
            }}
          >
            <div className={`section-label ${activeSection === section.id ? 'active' : ''}`}>
              {section.name}
            </div>
          </Html>
        </SectionOrbit>
      ))}
      
      <HolographicPanel
        position={[0, -25, -10]}
        rotation={[-Math.PI / 6, 0, 0]}
        scale={1.5}
        width={20}
        height={12}
        color={0xFF2D95}
        opacity={0.06}
      />
      
      <Html
        position={[0, -25, -10.1]}
        rotation={[-Math.PI / 6, 0, 0]}
        transform
        style={{
          transform: 'translate(-50%, -50%) scale(0.3)',
          pointerEvents: 'none',
          width: '600px',
          textAlign: 'center',
        }}
      >
        <div className="hologram-text">
          <div className="hologram-line">SYSTEM STATUS: ONLINE</div>
          <div className="hologram-line">NEURAL NETWORK: ACTIVE</div>
          <div className="hologram-line">QUANTUM CORE: STABLE</div>
          <div className="hologram-line">DATA STREAMS: {Math.floor(Math.random() * 1000 + 500)} KB/s</div>
        </div>
      </Html>
    </>
  );
}
