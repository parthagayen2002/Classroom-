'use client';

import React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { ScrollProgress } from '@/components/ScrollProgress';
import { PageTransitionOverlay } from '@/components/PageTransitionOverlay';
import { CustomCursor } from '@/components/CustomCursor';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { HeroSection } from '@/sections/HeroSection';
import { AboutSection } from '@/sections/AboutSection';
import { TechStackSection } from '@/sections/TechStackSection';
import { ProjectsSection } from '@/sections/ProjectsSection';
import { AchievementsSection } from '@/sections/AchievementsSection';
import { ContactSection } from '@/sections/ContactSection';
import { ThreeScene } from '@/three/ThreeScene';

// Once-per-tab gate for the cinematic loading screen - see LoadingScreen.jsx.
// Read synchronously via useState's lazy initializer below (resolves before
// first paint) so a repeat-in-session load never mounts it at all: a full
// skip, not a shortened replay, with no flash to guard against since the
// DOM node is simply never created.
const INTRO_SESSION_KEY = 'portfolio:intro-shown';

// One continuous scrolling page - order matches the on-screen section order.
const sections = [
  'home',
  'about',
  'techstack',
  'projects',
  'achievements',
  'contact',
];

// Extracts the failing component name from a React component stack.
// The stack starts with a newline, then one "    at Name (...)" line per frame.
function firstComponentFrame(componentStack) {
  if (!componentStack) return null;
  for (const line of componentStack.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(?:at\s+)?([A-Za-z0-9_$.]+)/);
    if (match) return match[1];
  }
  return null;
}

// Pulls an asset URL out of an error message so a failed fetch/parse points at
// the file that caused it rather than at a generic "3D failed".
function extractAssetPath(message) {
  if (!message) return null;
  const patterns = [
    /((?:https?:\/\/|\/)[^\s'"]+\.(?:glb|gltf|bin|ktx2|hdr|exr|png|jpe?g|webp|basis|dds))/i,
    /Couldn't load texture ([^\s'"]+)/i,
    /Could not load ([^\s:'"]+)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Error Boundary for 3D Experience
class ThreeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Capture the error here as well as in componentDidCatch, so the details
    // panel always has a message even if the second pass never runs.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const component = firstComponentFrame(errorInfo?.componentStack) || 'Unknown';
    const assetPath = extractAssetPath(error?.message);

    // Full, unabbreviated report for the browser console.
    console.error(
      [
        '[3D ERROR]',
        `Component: ${component}`,
        `Error: ${error?.name || 'Error'}: ${error?.message || 'Unknown error'}`,
        assetPath ? `Asset: ${assetPath}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    );
    if (error?.stack) console.error('[3D ERROR] Stack trace:\n' + error.stack);
    if (errorInfo?.componentStack) {
      console.error('[3D ERROR] Component stack:' + errorInfo.componentStack);
    }

    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const errorMessage = error?.message || 'Unknown error';
      const componentStack = this.state.errorInfo?.componentStack || 'No component stack available';
      const errorName = error?.name || 'Error';
      const stackTrace = error?.stack || 'No stack trace available';
      const component = firstComponentFrame(this.state.errorInfo?.componentStack) || 'Unknown';
      const assetPath = extractAssetPath(errorMessage) || 'N/A';

      return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-dark-bg p-6">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <svg className="w-full h-full text-primary-cyan/50" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="251" strokeDashoffset="0">
                  <animateTransform attributeName="stroke-dashoffset" from="0" to="251" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="50" cy="50" r="15" fill="currentColor" opacity="0.3" className="animate-pulse-slow" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              3D EXPERIENCE UNAVAILABLE
            </h2>
            <p className="text-slate-400 mb-6 leading-relaxed">
              The 3D scene stopped with a runtime error in{' '}
              <span className="font-mono text-primary-cyan">{component}</span>. The full error,
              stack trace and asset path are below and in the browser console.
            </p>
            <details className="mb-6 text-left text-xs font-mono text-slate-500 bg-dark-card p-4 rounded-lg border border-dark-border max-h-64 overflow-auto">
              <summary className="cursor-pointer mb-2 text-primary-cyan">Error Details</summary>
              <div className="space-y-2">
                <div><strong>Component:</strong> {component}</div>
                <div><strong>Error Type:</strong> {errorName}</div>
                <div><strong>Message:</strong> {errorMessage}</div>
                <div><strong>Asset Path:</strong> {assetPath}</div>
                <div className="mt-2">
                  <strong>Stack Trace:</strong>
                  <pre className="mt-1 whitespace-pre-wrap break-all">{stackTrace}</pre>
                </div>
                <div className="mt-2">
                  <strong>Component Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap break-all">{componentStack}</pre>
                </div>
              </div>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-8 py-3 w-full"
            >
              RETRY
            </button>
            <button
              onClick={() => this.props.onFallback()}
              className="btn-secondary px-8 py-3 w-full mt-4"
            >
              CONTINUE WITH 2D EXPERIENCE
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// The six sections in scroll order - rendered identically by the 3D and
// 2D-fallback paths so they can never drift out of sync with each other.
function SectionStack({ sectionVisibility, sectionProgressRef }) {
  return (
    <>
      <HeroSection isVisible={sectionVisibility.home} sectionProgressRef={sectionProgressRef} />
      <AboutSection isVisible={sectionVisibility.about} />
      <TechStackSection isVisible={sectionVisibility.techstack} />
      <ProjectsSection isVisible={sectionVisibility.projects} />
      <AchievementsSection isVisible={sectionVisibility.achievements} />
      <ContactSection isVisible={sectionVisibility.contact} />
    </>
  );
}

export default function App() {
  const [isIntroComplete, setIsIntroComplete] = useState(() => {
    try {
      return sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
    } catch {
      return false; // storage unavailable -> fail open, show the intro
    }
  });
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sectionVisibility, setSectionVisibility] = useState({});
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const canvasContainerRef = useRef(null);
  const lenisRef = useSmoothScroll(isIntroComplete);
  const { phase: transitionPhase, trigger: triggerPageTransition } = usePageTransition();
  // Feeds the 3D layer's scroll-linked parallax (Home's Solar System depth,
  // the background camera nudge, TechCloud's scroll-velocity rotation) -
  // `sections` below is the same stable module-level array already used by
  // the reveal/scroll-spy observers, reused here rather than a new literal.
  const { globalProgressRef, sectionProgressRef } = useScrollProgress(lenisRef, sections);

  const handleIntroComplete = useCallback(() => {
    setIsIntroComplete(true);
    try { sessionStorage.setItem(INTRO_SESSION_KEY, '1'); } catch { /* storage unavailable - non-fatal */ }
    document.body.style.overflow = 'auto';
    // Belt-and-braces: nothing in the loading screen holds keyboard focus
    // any more (no button to click through), but blurring here still
    // guarantees focus sits on <body> so normal keyboard scrolling works
    // immediately once the site is shown.
    document.activeElement?.blur();
  }, []);

  const handleFallback = useCallback(() => {
    setUseFallback(true);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Nav click / 3D-marker click: just scroll there. The scroll-spy observer
  // below is what actually keeps `activeSection` (and therefore the nav
  // highlight, and the 3D camera focus) in sync afterwards - single source
  // of truth, so a click and a manual scroll never fight each other.
  const handleSectionChange = useCallback((sectionId) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (!element) return;
    // Cinematic cue for the click itself - fires in parallel with the
    // scroll below, not sequenced before/after it (see usePageTransition).
    triggerPageTransition();
    if (lenisRef.current) {
      // Route through Lenis so a nav click eases with the same inertia as a
      // manual scroll instead of fighting it with the browser's own smooth
      // scroll implementation.
      lenisRef.current.scrollTo(element, { duration: 1.4 });
    } else {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lenisRef, triggerPageTransition]);

  // Reveal-on-scroll: each section's `.reveal-text` content fades/slides in
  // the first time it enters the viewport (see `.section.is-visible
  // .reveal-text` in index.css).
  useEffect(() => {
    if (!isIntroComplete) return;

    setSectionVisibility({ home: true });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setSectionVisibility(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting,
          }));
        });
      },
      {
        rootMargin: '-10% 0px -10% 0px',
        threshold: 0.1,
      }
    );

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) revealObserver.observe(element);
    });

    return () => revealObserver.disconnect();
  }, [isIntroComplete]);

  // Scroll-spy: whichever section's midline the viewport's vertical centre
  // is currently crossing becomes "active" - drives both the nav highlight
  // and (via ThreeScene's activeSection prop) the 3D camera focus. A thin
  // observation band at 50% height means exactly one section is "current"
  // at a time, purely from normal scroll position - no wheel/scroll
  // listener, nothing that could interfere with native scrolling.
  useEffect(() => {
    if (!isIntroComplete) return;

    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) spyObserver.observe(element);
    });

    return () => spyObserver.disconnect();
  }, [isIntroComplete]);

  useEffect(() => {
    if (isIntroComplete) {
      // Check WebGL support before attempting to create canvas
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (!gl) {
        console.warn('WebGL not supported, falling back to 2D');
        setUseFallback(true);
        return;
      }

      const canvas = canvasContainerRef.current?.querySelector('canvas');
      if (canvas) {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
          setIsLowPerformance(true);
        } else {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            if (renderer && (renderer.includes('Intel') || renderer.includes('llvmpipe') || renderer.includes('Software'))) {
              setIsLowPerformance(true);
            }
          }
        }
      }
    }
  }, [isIntroComplete]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isIntroComplete) {
    return (
      <>
        <LoadingScreen onComplete={handleIntroComplete} />
        <CustomCursor />
      </>
    );
  }

  // Show 2D fallback if 3D failed
  if (useFallback) {
    return (
      <>
        <div className="fixed inset-0 z-0 bg-dark-bg" />
        <div className="scanline-overlay" />
        <div className="vignette" />

        <ScrollProgress />
        <PageTransitionOverlay phase={transitionPhase} />

        <Navigation
          activeSection={activeSection}
          setActiveSection={handleSectionChange}
          isMobile={isMobileMenuOpen}
          toggleMobileMenu={toggleMobileMenu}
        />

        <div className="relative z-10 min-h-screen">
          <SectionStack sectionVisibility={sectionVisibility} sectionProgressRef={sectionProgressRef} />
        </div>

        <Footer />

        <CustomCursor />
      </>
    );
  }

  return (
    <>
      <div ref={canvasContainerRef} className="canvas-container interactive" />

      <ThreeErrorBoundary onFallback={handleFallback}>
        <ThreeScene
          activeSection={activeSection}
          setActiveSection={handleSectionChange}
          isIntroComplete={isIntroComplete}
          isLowPerformance={isLowPerformance}
          scrollProgressRef={globalProgressRef}
        />
      </ThreeErrorBoundary>

      <div className="scanline-overlay" />
      <div className="vignette" />
      { !isLowPerformance && <div className="noise-overlay" /> }

      <ScrollProgress />
      <PageTransitionOverlay phase={transitionPhase} />

      <Navigation
        activeSection={activeSection}
        setActiveSection={handleSectionChange}
        isMobile={isMobileMenuOpen}
        toggleMobileMenu={toggleMobileMenu}
      />

      <div className="relative z-10 min-h-screen">
        <SectionStack sectionVisibility={sectionVisibility} />
      </div>

      <Footer />

      <CustomCursor />
    </>
  );
}

function Footer() {
  return (
    <footer className="relative z-20 border-t border-dark-border py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-cyan to-primary-violet flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-white text-lg">PARTHA PRATIM GAYEN</span>
          <span className="text-xs font-mono text-muted uppercase tracking-wider">AI DEVELOPER</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted">
          <span className="font-mono">2024</span>
          <span className="w-px h-4 bg-dark-border" />
          <span>BUILT WITH REACT, THREE.JS, TAILWIND</span>
        </div>

        <div className="flex items-center gap-4">
          <a href="#" className="text-muted hover:text-primary-cyan transition-colors text-sm font-mono">
            PRIVACY
          </a>
          <span className="w-px h-4 bg-dark-border" />
          <a href="#" className="text-muted hover:text-primary-cyan transition-colors text-sm font-mono">
            TERMS
          </a>
        </div>
      </div>
    </footer>
  );
}
