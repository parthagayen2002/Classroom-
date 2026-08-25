import { useEffect, useState } from 'react';

// Real touch/pointer-type detection - a device's primary pointer type
// doesn't change at runtime, so this is a one-time check on mount, not a
// resize listener. Distinct from the viewport-WIDTH `matchMedia` checks
// used elsewhere in the codebase for responsive layout (those answer "is
// the screen narrow", not "is there a mouse") - a wide-viewport touch
// device (e.g. an iPad in landscape) would incorrectly keep a width-based
// check "desktop" while having no real hover/pointer input, which is
// exactly the case a custom cursor needs to detect and disable for.
function detectTouchDevice() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0 ||
    'ontouchstart' in window
  );
}

export function usePointerCapabilities() {
  const [isTouchDevice, setIsTouchDevice] = useState(detectTouchDevice);

  useEffect(() => {
    setIsTouchDevice(detectTouchDevice());
  }, []);

  return { isTouchDevice };
}
