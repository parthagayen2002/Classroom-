'use client';

import { useRef, useMemo, useEffect, useState, Suspense, Component } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';

const MODEL_PATH = '/models/avatar.glb';

const isDev = import.meta.env?.DEV ?? false;

// Individual tracking layers. Each one is additionally gated on the bone actually
// existing in the GLB, so flipping one off here is a clean way to bisect a crash
// without editing the animation code.
export const AVATAR_FEATURES = {
  idleAnimation: true,
  headTracking: true,
  neckTracking: true,
  spineTracking: true,
  shoulderTracking: true,
  eyeTracking: true,
};

function reportAvatarError(stage, error, detail) {
  console.error(
    [
      '[3D ERROR]',
      'Component: Avatar',
      `Stage: ${stage}`,
      `Asset: ${MODEL_PATH}`,
      `Error: ${error?.message ?? String(error)}`,
    ].join('\n')
  );
  if (error?.stack) console.error('[3D ERROR] Stack:', error.stack);
  if (detail) console.error('[3D ERROR] Detail:', detail);
}

/**
 * Runs the per-frame callback behind a try/catch.
 *
 * Errors thrown inside useFrame happen in the render loop, NOT during React
 * render, so a React error boundary cannot catch them - they tear down the whole
 * Canvas. This keeps an avatar animation bug from ever killing the scene: the
 * avatar simply freezes and reports itself.
 */
function useSafeFrame(callback) {
  const failedRef = useRef(false);
  useFrame((state, delta) => {
    if (failedRef.current) return;
    try {
      callback(state, delta);
    } catch (error) {
      failedRef.current = true;
      reportAvatarError('render-loop', error, 'Avatar animation disabled; scene continues.');
    }
  });
}

// --- Head/neck/eye look-tracking ------------------------------------------
//
// What was wrong before: the head bone's target rotation was built as a
// WORLD-space look-at matrix (`new THREE.Matrix4().lookAt(...)`) and then
// assigned directly as the head's LOCAL quaternion - only correct if the
// head has no rotating parent. But the neck/spine/shoulders were each
// ALSO slerping their own local quaternion toward a fraction of that SAME
// head quaternion, every frame - so the parent chain the head's rotation
// was implicitly "local to" was itself constantly changing based on the
// head's own rotation. That's a feedback loop with no single stable
// target, not a bug that "points slightly wrong" - it's what produced the
// reported uncontrolled/spinning behaviour (confirmed by holding the
// cursor at a fixed position and watching the figure settle into a pose
// only weakly and inconsistently related to the actual cursor direction,
// instead of a stable ~60 degree turn toward it).
//
// Fixed by computing ONE authoritative yaw/pitch pair in the avatar's own
// stable local space (never derived from a bone that is itself being
// animated), clamping and smoothing THAT pair, and giving every bone a
// fixed, independent, non-recursive fraction of it each frame - no bone
// ever reads another animated bone's current rotation to decide its own,
// so there is nothing left that can compound or run away.
const LOOK_MAX_YAW_HEAD = THREE.MathUtils.degToRad(58); // combined head+neck yaw ceiling
const LOOK_MAX_PITCH_HEAD = THREE.MathUtils.degToRad(30); // combined head+neck pitch ceiling
const LOOK_MAX_YAW_EYE = THREE.MathUtils.degToRad(72); // eyes reach a little further than the head bothers to turn
const LOOK_MAX_PITCH_EYE = THREE.MathUtils.degToRad(40);
const LOOK_NECK_FRACTION = 0.35; // of the combined head+neck yaw/pitch
const LOOK_SPINE_FRACTION = 0.1; // subtle whole-body lean, same direction as the head (not inverse)
const LOOK_SHOULDER_FRACTION = 0.035; // barely-there, same direction (the old inverse counter-rotation was the "arm flung out to the side" bug)
const LOOK_HEAD_DAMP = 6; // higher = snappier
const LOOK_EYE_DAMP = 11; // eyes track faster/more precisely than the head, independently
const LOOK_NEUTRAL_DAMP = 3; // easing back toward centre once the cursor leaves the canvas

// Raw (unclamped) yaw/pitch from the avatar's head toward a world-space
// point, measured in the avatar's own local space (rotated by the group's
// own quaternion) so "left"/"right" always means the avatar's own left and
// right, regardless of how the avatar itself is placed/rotated in the
// scene - this is the actual anatomical constraint "the head must remain
// attached to the body" requires: turning is always relative to the body,
// never to world axes.
function computeLookAngles(group, headWorldOffset, targetWorldPos) {
  const headWorldPos = group.position.clone().add(headWorldOffset.clone().applyQuaternion(group.quaternion));
  const toTarget = targetWorldPos.clone().sub(headWorldPos);
  toTarget.applyQuaternion(group.quaternion.clone().invert());

  const horizontalDist = Math.hypot(toTarget.x, toTarget.z);
  const yaw = Math.atan2(toTarget.x, toTarget.z);
  const pitch = Math.atan2(toTarget.y, horizontalDist || 1e-4);
  return { yaw, pitch };
}

/**
 * Computes and applies this frame's head/neck/spine/shoulder/eye rotations.
 * Shared by AvatarModel (real GLB bones) and AvatarPlaceholder (procedural
 * bones) so the tracking math exists in exactly one place. `smoothState` is
 * a plain mutable object persisted in a ref by the caller
 * (`{ yaw, pitch, eyeYaw, eyePitch }`), `bones` holds whichever of
 * `{ head, neck, spine, spine2, leftShoulder, rightShoulder, leftEye,
 * rightEye }` actually exist - each is applied only if present.
 */
function applyLookTracking({ delta, group, headWorldOffset, targetWorldPos, isActive, bones, smoothState }) {
  let rawYaw = 0;
  let rawPitch = 0;
  if (isActive) {
    const angles = computeLookAngles(group, headWorldOffset, targetWorldPos);
    rawYaw = angles.yaw;
    rawPitch = angles.pitch;
  }

  // Eyes get a WIDER clamp than the head/neck, then have the head+neck's
  // own coverage subtracted back out - so eyes stay near-centred (relative
  // to the head) whenever the head has already turned far enough to face
  // the target directly, and only pick up the residual once the target
  // goes past what the head/neck bother to turn for. Real head/eye
  // coordination works the same way: eyes catch the last bit, head catches
  // up more slowly/partially.
  const headTargetYaw = THREE.MathUtils.clamp(rawYaw, -LOOK_MAX_YAW_HEAD, LOOK_MAX_YAW_HEAD);
  const headTargetPitch = THREE.MathUtils.clamp(rawPitch, -LOOK_MAX_PITCH_HEAD, LOOK_MAX_PITCH_HEAD);
  const eyeTargetYaw = THREE.MathUtils.clamp(rawYaw, -LOOK_MAX_YAW_EYE, LOOK_MAX_YAW_EYE) - headTargetYaw;
  const eyeTargetPitch = THREE.MathUtils.clamp(rawPitch, -LOOK_MAX_PITCH_EYE, LOOK_MAX_PITCH_EYE) - headTargetPitch;

  const s = smoothState;
  const headDamp = isActive ? LOOK_HEAD_DAMP : LOOK_NEUTRAL_DAMP;
  s.yaw = THREE.MathUtils.damp(s.yaw, headTargetYaw, headDamp, delta);
  s.pitch = THREE.MathUtils.damp(s.pitch, headTargetPitch, headDamp, delta);
  s.eyeYaw = THREE.MathUtils.damp(s.eyeYaw, eyeTargetYaw, isActive ? LOOK_EYE_DAMP : LOOK_NEUTRAL_DAMP, delta);
  s.eyePitch = THREE.MathUtils.damp(s.eyePitch, eyeTargetPitch, isActive ? LOOK_EYE_DAMP : LOOK_NEUTRAL_DAMP, delta);

  // Split between neck and head rather than each independently chasing the
  // full angle - the two together cover exactly `s.yaw`/`s.pitch`, never
  // more, so there's no double-counting between them.
  const neckYaw = s.yaw * LOOK_NECK_FRACTION;
  const neckPitch = s.pitch * LOOK_NECK_FRACTION;
  const headYaw = s.yaw - neckYaw;
  const headPitch = s.pitch - neckPitch;

  if (bones.neck) bones.neck.rotation.set(neckPitch, neckYaw, 0);
  if (bones.head) bones.head.rotation.set(headPitch, headYaw, 0);

  if (bones.spine) bones.spine.rotation.set(s.pitch * LOOK_SPINE_FRACTION, s.yaw * LOOK_SPINE_FRACTION, 0);
  if (bones.spine2) bones.spine2.rotation.set(s.pitch * LOOK_SPINE_FRACTION * 0.5, s.yaw * LOOK_SPINE_FRACTION * 0.5, 0);

  const shoulderYaw = s.yaw * LOOK_SHOULDER_FRACTION;
  const shoulderPitch = s.pitch * LOOK_SHOULDER_FRACTION;
  if (bones.leftShoulder) bones.leftShoulder.rotation.set(shoulderPitch, shoulderYaw, 0);
  if (bones.rightShoulder) bones.rightShoulder.rotation.set(shoulderPitch, shoulderYaw, 0);

  if (bones.leftEye) bones.leftEye.rotation.set(s.eyePitch, s.eyeYaw, 0);
  if (bones.rightEye) bones.rightEye.rotation.set(s.eyePitch, s.eyeYaw, 0);
}

// Whether the pointer is actually over THIS component's own canvas -
// scoped to the canvas's own DOM element (`gl.domElement`), not a
// window-wide heuristic. Unlike the site's full-bleed 3D widgets, the
// avatar always lives in a small, bounded, card-sized canvas (see
// AvatarPortrait.jsx), so "the cursor leaves the relevant area" means
// leaving the card specifically, not leaving the browser window.
function useCanvasPointerActive() {
  const { gl } = useThree();
  const activeRef = useRef(false);

  useEffect(() => {
    const el = gl.domElement;
    const activate = () => { activeRef.current = true; };
    const deactivate = () => { activeRef.current = false; };
    el.addEventListener('pointerenter', activate);
    el.addEventListener('pointermove', activate);
    el.addEventListener('pointerleave', deactivate);
    return () => {
      el.removeEventListener('pointerenter', activate);
      el.removeEventListener('pointermove', activate);
      el.removeEventListener('pointerleave', deactivate);
    };
  }, [gl]);

  return activeRef;
}

/**
 * Probes whether the model is really there before any loader hook is mounted.
 *
 * A dev server or SPA host answers unknown paths with index.html at status 200
 * and content-type text/html. Handing that to GLTFLoader throws a JSON parse
 * error, so a plain `res.ok` check is not enough - the content type is what
 * distinguishes a real asset from an HTML fallback.
 */
function useModelAvailability(path) {
  const [status, setStatus] = useState('probing');

  useEffect(() => {
    let cancelled = false;

    fetch(path, { method: 'HEAD', cache: 'no-cache' })
      .then((res) => {
        if (cancelled) return;
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        const isHtmlFallback = contentType.startsWith('text/html');

        if (!res.ok || isHtmlFallback) {
          console.info(
            `[Avatar] ${path} is not available (status ${res.status}, content-type "${contentType || 'none'}"). ` +
              'Skipping the avatar - the rest of the 3D scene is unaffected.'
          );
          setStatus('missing');
          return;
        }
        setStatus('available');
      })
      .catch((error) => {
        if (cancelled) return;
        console.info(
          `[Avatar] Could not reach ${path} (${error?.message}). ` +
            'Skipping the avatar - the rest of the 3D scene is unaffected.'
        );
        setStatus('missing');
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return status;
}

/**
 * Catches errors thrown while the GLTF renders. The fallback is passed in as a
 * ready-made element so it can never be built from props this component does not
 * have.
 */
class AvatarErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    reportAvatarError('model-load', error, errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * Only ever mounted once the probe has confirmed a real GLB, so useLoader is
 * called unconditionally here. Any failure that still gets through is thrown
 * during render and caught by AvatarErrorBoundary.
 */
function AvatarGLTF({ basePosition, rotation, scale, onLoad }) {
  const gltf = useLoader(GLTFLoader, MODEL_PATH);

  return (
    <AvatarModel
      gltf={gltf}
      onLoad={onLoad}
      basePosition={basePosition}
      rotation={rotation}
      scale={scale}
    />
  );
}

/**
 * Walks the loaded GLB and resolves only the bones that are actually present.
 * Nothing here assumes a naming convention - a missing bone just means that
 * tracking layer is skipped.
 */
function resolveBones(root) {
  const bones = {};
  const allBoneNames = [];

  root.traverse((child) => {
    if (!child.isBone) return;
    allBoneNames.push(child.name);

    const name = child.name.toLowerCase();
    const isLeft = /left|_l\b|\.l\b|\bl_/.test(name);
    const isRight = /right|_r\b|\.r\b|\br_/.test(name);

    if (name.includes('eye')) {
      if (isLeft) bones.leftEye = child;
      else if (isRight) bones.rightEye = child;
    } else if (name.includes('neck')) {
      bones.neck = child;
    } else if (name.includes('head')) {
      bones.head = child;
    } else if (name.includes('shoulder') || name.includes('clavicle')) {
      if (isLeft) bones.leftShoulder = child;
      else if (isRight) bones.rightShoulder = child;
    } else if (name.includes('chest') || /spine_?0?3/.test(name)) {
      bones.spine = child;
    } else if (/spine_?0?2/.test(name)) {
      bones.spine2 = child;
    } else if (name.includes('spine') && !bones.spine) {
      bones.spine = child;
    }
  });

  return { bones, allBoneNames };
}

function AvatarModel({ gltf, onLoad, basePosition, rotation, scale }) {
  const groupRef = useRef();
  const mixerRef = useRef();
  const actionsRef = useRef({});
  const bonesRef = useRef({});
  const sectionTargetRef = useRef(null);

  const { camera } = useThree();
  const timeRef = useRef(0);
  const mouseTargetRef = useRef(new THREE.Vector3());
  const currentLookRef = useRef(new THREE.Vector3());
  const scratchVec = useRef(new THREE.Vector3());
  const lookSmoothRef = useRef({ yaw: 0, pitch: 0, eyeYaw: 0, eyePitch: 0 });
  const pointerActiveRef = useCanvasPointerActive();

  // SkeletonUtils.clone keeps skinned meshes bound to their own skeleton, so the
  // cached gltf.scene is never mutated or re-parented across mounts.
  const model = useMemo(() => {
    try {
      return cloneSkeleton(gltf.scene);
    } catch (error) {
      reportAvatarError('scene-clone', error);
      return gltf.scene;
    }
  }, [gltf]);

  const clips = useMemo(() => gltf.animations ?? [], [gltf]);

  useEffect(() => {
    if (!groupRef.current || !model) return;

    const group = groupRef.current;
    group.position.copy(basePosition);
    group.rotation.set(rotation[0], rotation[1], rotation[2]);
    group.scale.setScalar(scale);

    const { bones, allBoneNames } = resolveBones(model);
    bonesRef.current = bones;

    if (isDev) {
      const meshes = [];
      let skinnedMeshCount = 0;
      model.traverse((child) => {
        if (child.isSkinnedMesh) skinnedMeshCount += 1;
        if (child.isMesh) meshes.push(child.name || '(unnamed)');
      });

      console.info('[Avatar] GLB structure:', {
        scene: model.name || '(unnamed scene)',
        meshes,
        skinnedMeshCount,
        boneCount: allBoneNames.length,
        bones: allBoneNames,
        animationClips: clips.map((clip) => clip.name),
      });
      console.info('[Avatar] Tracking bones resolved:', Object.keys(bones));

      const optional = ['head', 'neck', 'spine', 'spine2', 'leftShoulder', 'rightShoulder', 'leftEye', 'rightEye'];
      const missing = optional.filter((key) => !bones[key]);
      if (missing.length) {
        console.info('[Avatar] Bones absent from this model, tracking skipped for:', missing);
      }
    }

    if (AVATAR_FEATURES.idleAnimation && clips.length > 0) {
      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;

      clips.forEach((clip) => {
        const name = clip.name.toLowerCase();
        if (name.includes('idle') || name.includes('breath') || name.includes('stand')) {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat);
          action.clampWhenFinished = false;
          action.play();
          actionsRef.current.idle = action;
        }
      });

      // No clip is named like an idle - fall back to the first one at low weight.
      if (!actionsRef.current.idle) {
        const action = mixer.clipAction(clips[0]);
        action.setLoop(THREE.LoopRepeat);
        action.weight = 0.3;
        action.play();
        actionsRef.current.idle = action;
      }
    }

    onLoad?.(group);

    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = undefined;
      actionsRef.current = {};
      bonesRef.current = {};
    };
  }, [model, clips, onLoad, basePosition, rotation, scale]);

  useSafeFrame((state, delta) => {
    timeRef.current += delta;
    mixerRef.current?.update(delta);

    const breath = Math.sin(timeRef.current * 0.8) * 0.015;
    const idleX = Math.sin(timeRef.current * 0.3) * 0.01;
    const idleY = Math.cos(timeRef.current * 0.25) * 0.01;

    // Convert mouse to world space at avatar depth
    const mouse = state.pointer;
    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const worldMouse = camera.position.clone().addScaledVector(dir, distance);

    mouseTargetRef.current.lerp(worldMouse, 0.1);

    if (sectionTargetRef.current) {
      const sectionInfluence = 0.3;
      mouseTargetRef.current.lerp(sectionTargetRef.current, sectionInfluence * delta * 3);
    }

    currentLookRef.current.lerp(mouseTargetRef.current, delta * 4);

    if (!groupRef.current) return;

    const group = groupRef.current;
    const bones = bonesRef.current;

    group.position.lerp(
      scratchVec.current.set(
        basePosition.x + idleX,
        basePosition.y + idleY + breath,
        basePosition.z
      ),
      delta * 2
    );

    if (AVATAR_FEATURES.spineTracking && bones.spine) {
      const breathScale = 1 + breath * 0.5;
      bones.spine.scale.setScalar(breathScale);
    }

    applyLookTracking({
      delta,
      group,
      headWorldOffset: new THREE.Vector3(0, 1.8 * scale, 0), // approximate head height
      targetWorldPos: currentLookRef.current,
      isActive: pointerActiveRef.current,
      bones: {
        head: AVATAR_FEATURES.headTracking ? bones.head : undefined,
        neck: AVATAR_FEATURES.neckTracking ? bones.neck : undefined,
        spine: AVATAR_FEATURES.spineTracking ? bones.spine : undefined,
        spine2: AVATAR_FEATURES.spineTracking ? bones.spine2 : undefined,
        leftShoulder: AVATAR_FEATURES.shoulderTracking ? bones.leftShoulder : undefined,
        rightShoulder: AVATAR_FEATURES.shoulderTracking ? bones.rightShoulder : undefined,
        leftEye: AVATAR_FEATURES.eyeTracking ? bones.leftEye : undefined,
        rightEye: AVATAR_FEATURES.eyeTracking ? bones.rightEye : undefined,
      },
      smoothState: lookSmoothRef.current,
    });
  });

  // Expose method for section hover
  useEffect(() => {
    window.__avatarSetSectionTarget = (target) => {
      sectionTargetRef.current = target ? new THREE.Vector3(...target) : null;
    };
    return () => {
      window.__avatarSetSectionTarget = null;
    };
  }, []);

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Draggable limbs (procedural humanoid only)
//
// Each arm and leg hangs from a pivot group at its joint (shoulder / hip).
// Grabbing a limb and dragging swings it around that joint so it follows the
// pointer in the screen plane; on release it springs back to hanging
// straight down with a small wobble.
//
// Angles are rotations about the joint's local Z axis, 0 = hanging straight
// down. A rotation of θ turns the "down" vector (0,-1) into (sinθ, -cosθ), so
// the angle that points the limb at a local offset (dx, dy) is atan2(dx, -dy).
// ---------------------------------------------------------------------------
const LIMB_LIMITS = {
  // Each limb can swing outward and well overhead, but only slightly in
  // across the body, so it never clips through the torso.
  leftArm: [-2.9, 0.45],
  rightArm: [-0.45, 2.9],
  leftLeg: [-1.25, 0.3],
  rightLeg: [-0.3, 1.25],
};
const LIMB_FOLLOW_DAMP = 18; // how tightly a held limb tracks the pointer
const LIMB_SPRING = 55;      // pull back to rest once released
const LIMB_FRICTION = 6.5;   // low enough to leave a visible wobble

function useDraggableLimbs() {
  const { gl, camera, raycaster } = useThree();
  const pivots = useRef({});           // name -> THREE.Group
  const limbState = useRef({});        // name -> { angle, vel }
  const dragRef = useRef(null);        // { name, grabAngle, startAngle }
  const scratch = useRef({ plane: new THREE.Plane(), hit: new THREE.Vector3(), joint: new THREE.Vector3() });

  const register = (name) => (node) => {
    pivots.current[name] = node;
    if (!limbState.current[name]) limbState.current[name] = { angle: 0, vel: 0 };
  };

  // Angle from a limb's joint to the pointer, in the joint's parent space.
  // Returns null if the pointer ray misses the joint's plane.
  const pointerAngle = (name, pointer) => {
    const pivot = pivots.current[name];
    if (!pivot?.parent) return null;
    const { plane, hit, joint } = scratch.current;
    pivot.getWorldPosition(joint);
    plane.set(new THREE.Vector3(0, 0, 1), -joint.z);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    pivot.parent.worldToLocal(hit);
    const dx = hit.x - pivot.position.x;
    const dy = hit.y - pivot.position.y;
    if (Math.hypot(dx, dy) < 1e-4) return null;
    return Math.atan2(dx, -dy);
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    window.__setCursorOverride?.(null);
  };

  // Releasing anywhere (even outside the canvas) ends the drag. On touch
  // screens, a non-passive touchmove listener cancels page scrolling only
  // while a limb is actually held, so swiping elsewhere on the card still
  // scrolls the page normally.
  useEffect(() => {
    const el = gl.domElement;
    const blockScrollWhileDragging = (e) => {
      if (dragRef.current && e.cancelable) e.preventDefault();
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    el.addEventListener('touchmove', blockScrollWhileDragging, { passive: false });
    return () => {
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('touchmove', blockScrollWhileDragging);
    };
  }, [gl]);

  // Props for a limb's grab target mesh.
  const handlers = (name) => ({
    onPointerDown: (e) => {
      e.stopPropagation();
      const grabAngle = pointerAngle(name, e.pointer);
      if (grabAngle === null) return;
      e.target?.setPointerCapture?.(e.pointerId);
      // Store where on the limb it was grabbed, so the limb doesn't snap to
      // point straight at the pointer the moment it's picked up.
      dragRef.current = { name, grabAngle, startAngle: limbState.current[name].angle };
      window.__setCursorOverride?.('grabbing');
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      if (!dragRef.current) window.__setCursorOverride?.('grab');
    },
    onPointerOut: () => {
      if (!dragRef.current) window.__setCursorOverride?.(null);
    },
  });

  const update = (state, delta) => {
    const dt = Math.min(delta, 1 / 30); // keep the spring stable after a frame hitch
    const drag = dragRef.current;
    for (const name of Object.keys(pivots.current)) {
      const pivot = pivots.current[name];
      const s = limbState.current[name];
      if (!pivot || !s) continue;
      const [min, max] = LIMB_LIMITS[name];

      if (drag?.name === name) {
        const now = pointerAngle(name, state.pointer);
        if (now !== null) {
          // Shortest signed difference, so crossing ±π doesn't flip the limb.
          let diff = now - drag.grabAngle;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          const target = THREE.MathUtils.clamp(drag.startAngle + diff, min, max);
          const prev = s.angle;
          s.angle = THREE.MathUtils.damp(s.angle, target, LIMB_FOLLOW_DAMP, dt);
          s.vel = (s.angle - prev) / Math.max(dt, 1e-4); // carried into the release
        }
      } else if (s.angle !== 0 || s.vel !== 0) {
        s.vel += (-LIMB_SPRING * s.angle - LIMB_FRICTION * s.vel) * dt;
        s.angle = THREE.MathUtils.clamp(s.angle + s.vel * dt, min, max);
        if (Math.abs(s.angle) < 1e-4 && Math.abs(s.vel) < 1e-3) { s.angle = 0; s.vel = 0; }
      }
      pivot.rotation.z = s.angle;
    }
  };

  return { register, handlers, update };
}

// Invisible, deliberately fat hit area for a limb - the visible arms and legs
// are only ~20px wide on a phone, too thin to grab reliably with a finger.
function LimbGrabTarget({ position, length, radius = 0.26, handlers }) {
  return (
    <mesh position={position} {...handlers}>
      <capsuleGeometry args={[radius, length, 2, 8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}

function AvatarPlaceholder({ basePosition, rotation, scale }) {
  const groupRef = useRef();
  const timeRef = useRef(0);
  const mouseTargetRef = useRef(new THREE.Vector3());
  const currentLookRef = useRef(new THREE.Vector3());
  const idleOffsetRef = useRef({ x: 0, y: 0, z: 0, breath: 0 });
  const sectionTargetRef = useRef(null);
  const scratchVec = useRef(new THREE.Vector3());
  const lookSmoothRef = useRef({ yaw: 0, pitch: 0, eyeYaw: 0, eyePitch: 0 });

  // Bones for procedural animation
  const headRef = useRef();
  const neckRef = useRef();
  const spineRef = useRef();
  const spine2Ref = useRef();
  const leftShoulderRef = useRef();
  const rightShoulderRef = useRef();
  const leftEyeRef = useRef();
  const rightEyeRef = useRef();

  const { camera } = useThree();
  const pointerActiveRef = useCanvasPointerActive();
  const limbs = useDraggableLimbs();

  // Mouse tracking in world space
  useSafeFrame((state, delta) => {
    timeRef.current += delta;
    limbs.update(state, delta);

    // Convert mouse to world space at avatar depth
    const mouse = state.pointer;
    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const worldMouse = camera.position.clone().addScaledVector(dir, distance);

    mouseTargetRef.current.lerp(worldMouse, 0.1);

    if (sectionTargetRef.current) {
      const sectionInfluence = 0.3;
      mouseTargetRef.current.lerp(sectionTargetRef.current, sectionInfluence * delta * 3);
    }

    currentLookRef.current.lerp(mouseTargetRef.current, delta * 4);

    // Idle animation
    const idle = idleOffsetRef.current;
    idle.breath = Math.sin(timeRef.current * 0.8) * 0.02;
    idle.x = Math.sin(timeRef.current * 0.3) * 0.03;
    idle.y = Math.cos(timeRef.current * 0.25) * 0.02;
    idle.z = Math.sin(timeRef.current * 0.15) * 0.01;

    if (!groupRef.current) return;

    const group = groupRef.current;
    group.position.lerp(
      scratchVec.current.set(
        basePosition.x + idle.x,
        basePosition.y + idle.y + idle.breath,
        basePosition.z + idle.z
      ),
      delta * 2
    );

    // Subtle breathing scale on torso
    if (spineRef.current) {
      spineRef.current.scale.setScalar(1 + idle.breath * 0.5);
    }

    applyLookTracking({
      delta,
      group,
      headWorldOffset: new THREE.Vector3(0, 1.8 * scale, 0), // approximate head height
      targetWorldPos: currentLookRef.current,
      isActive: pointerActiveRef.current,
      bones: {
        head: AVATAR_FEATURES.headTracking ? headRef.current : undefined,
        neck: AVATAR_FEATURES.neckTracking ? neckRef.current : undefined,
        spine: AVATAR_FEATURES.spineTracking ? spineRef.current : undefined,
        spine2: AVATAR_FEATURES.spineTracking ? spine2Ref.current : undefined,
        leftShoulder: AVATAR_FEATURES.shoulderTracking ? leftShoulderRef.current : undefined,
        rightShoulder: AVATAR_FEATURES.shoulderTracking ? rightShoulderRef.current : undefined,
        leftEye: AVATAR_FEATURES.eyeTracking ? leftEyeRef.current : undefined,
        rightEye: AVATAR_FEATURES.eyeTracking ? rightEyeRef.current : undefined,
      },
      smoothState: lookSmoothRef.current,
    });
  });

  // Expose method for section hover
  useEffect(() => {
    window.__avatarSetSectionTarget = (target) => {
      sectionTargetRef.current = target ? new THREE.Vector3(...target) : null;
    };
    return () => {
      window.__avatarSetSectionTarget = null;
    };
  }, []);

  return (
    <group ref={groupRef} position={basePosition} rotation={rotation} scale={scale}>
      {/* Torso/Spine */}
      <group ref={spine2Ref} position={[0, 1.0, 0]}>
        {/* Chest - this was the single biggest reason the earlier version
            read as "a few unconnected balls" rather than a person: there was
            no mesh at all bridging the shoulder joints down to the hip
            capsule, an ~1 unit gap of empty space right through the middle
            of the torso. A tapered cylinder (wider at the shoulders,
            narrower at the waist) fills that gap with an actual chest
            shape instead of a floating hip capsule. */}
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.4, 0.3, 0.95, 16]} />
          <meshPhysicalMaterial
            color="#1a0e26"
            emissive="#9B5CFF"
            emissiveIntensity={0.22}
            metalness={0.3}
            roughness={0.45}
            transparent
            opacity={0.82}
            clearcoat={0.4}
            clearcoatRoughness={0.2}
          />
        </mesh>

        <group ref={spineRef} position={[0, 0.3, 0]}>
          <group ref={neckRef} position={[0, 0.4, 0]}>
            {/* Neck - a thin cylinder so the head doesn't float disconnected
                above the chest. */}
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.12, 0.15, 0.3, 10]} />
              <meshPhysicalMaterial
                color="#1a0e26"
                emissive="#FF2D95"
                emissiveIntensity={0.25}
                metalness={0.3}
                roughness={0.4}
                transparent
                opacity={0.85}
              />
            </mesh>

            {/* Head */}
            <group ref={headRef} position={[0, 0.45, 0]}>
              <mesh castShadow receiveShadow scale={[1, 1.12, 0.94]}>
                <sphereGeometry args={[0.45, 24, 24]} />
                {/* The original near-black (0x120A16) body colour at 0.85
                    opacity was effectively invisible against this scene's
                    equally near-black background - confirmed by screenshot:
                    no console error, correct bones resolved, tracking logic
                    running every frame, but nothing visible on screen.
                    Emissive colour makes the figure glow under its own
                    light regardless of what's behind it, in the site's
                    existing pink/violet palette. */}
                <meshPhysicalMaterial
                  color="#1a0e26"
                  emissive="#FF2D95"
                  emissiveIntensity={0.4}
                  metalness={0.3}
                  roughness={0.35}
                  transparent
                  opacity={0.88}
                  clearcoat={0.6}
                  clearcoatRoughness={0.15}
                />
              </mesh>

              {/* Soft additive glow shells around the head - same layered-
                  halo technique as the Sun in SolarSystem.jsx - so the head
                  (the focal point of the tracking) reads clearly as a glowing
                  presence even at a distance or against a busy background. */}
              <mesh scale={1.1}>
                <sphereGeometry args={[0.45, 16, 16]} />
                <meshBasicMaterial color="#FF2D95" transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
              </mesh>
              <mesh scale={1.22}>
                <sphereGeometry args={[0.45, 16, 16]} />
                <meshBasicMaterial color="#9B5CFF" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
              </mesh>

              {/* Eyes - brighter and each with its own small light, so they
                  read as glowing points that visibly track the cursor
                  rather than flat dots. */}
              <group position={[0, 0.05, 0.42]}>
                <mesh ref={leftEyeRef} position={[-0.16, 0, 0]}>
                  <sphereGeometry args={[0.08, 10, 10]} />
                  <meshBasicMaterial color="#FF4FB3" transparent opacity={1} toneMapped={false} />
                  <pointLight color="#FF4FB3" intensity={0.5} distance={2} decay={2} />
                </mesh>
                <mesh ref={rightEyeRef} position={[0.16, 0, 0]}>
                  <sphereGeometry args={[0.08, 10, 10]} />
                  <meshBasicMaterial color="#FF4FB3" transparent opacity={1} toneMapped={false} />
                  <pointLight color="#FF4FB3" intensity={0.5} distance={2} decay={2} />
                </mesh>
              </group>
            </group>
          </group>

          {/* Shoulders - now joints an arm actually hangs from, not the
              main visual mass. Arms are what turn "head + two balls" into a
              recognisable body: without them there was a bare ~1 unit gap
              of empty space down each side, which is exactly the "just
              floating orbs" look reported. */}
          <group ref={leftShoulderRef} position={[-0.55, 0.3, 0]}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshPhysicalMaterial
                color="#1a0e26"
                emissive="#9B5CFF"
                emissiveIntensity={0.25}
                metalness={0.35}
                roughness={0.45}
                transparent
                opacity={0.85}
              />
            </mesh>
            {/* Arm pivot - rotates at the shoulder joint when dragged (see
                useDraggableLimbs). The joint sphere above stays put. */}
            <group ref={limbs.register('leftArm')}>
              <mesh position={[-0.06, -0.5, 0]} rotation={[0, 0, 0.08]} castShadow receiveShadow>
                <capsuleGeometry args={[0.12, 0.72, 4, 10]} />
                <meshPhysicalMaterial
                  color="#1a0e26"
                  emissive="#9B5CFF"
                  emissiveIntensity={0.2}
                  metalness={0.3}
                  roughness={0.45}
                  transparent
                  opacity={0.82}
                />
              </mesh>
              {/* Hand - the arm was ending in a flat capsule cap, which read
                  as an amputated limb rather than an arm. A small sphere at
                  the wrist gives it an actual hand. */}
              <mesh position={[-0.1, -0.92, 0]} castShadow receiveShadow>
                <sphereGeometry args={[0.13, 12, 12]} />
                <meshPhysicalMaterial
                  color="#1a0e26"
                  emissive="#FF2D95"
                  emissiveIntensity={0.22}
                  metalness={0.3}
                  roughness={0.45}
                  transparent
                  opacity={0.85}
                />
              </mesh>
              <LimbGrabTarget position={[-0.07, -0.58, 0]} length={0.7} handlers={limbs.handlers('leftArm')} />
            </group>
          </group>

          <group ref={rightShoulderRef} position={[0.55, 0.3, 0]}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshPhysicalMaterial
                color="#1a0e26"
                emissive="#9B5CFF"
                emissiveIntensity={0.25}
                metalness={0.35}
                roughness={0.45}
                transparent
                opacity={0.85}
              />
            </mesh>
            <group ref={limbs.register('rightArm')}>
              <mesh position={[0.06, -0.5, 0]} rotation={[0, 0, -0.08]} castShadow receiveShadow>
                <capsuleGeometry args={[0.12, 0.72, 4, 10]} />
                <meshPhysicalMaterial
                  color="#1a0e26"
                  emissive="#9B5CFF"
                  emissiveIntensity={0.2}
                  metalness={0.3}
                  roughness={0.45}
                  transparent
                  opacity={0.82}
                />
              </mesh>
              <mesh position={[0.1, -0.92, 0]} castShadow receiveShadow>
                <sphereGeometry args={[0.13, 12, 12]} />
                <meshPhysicalMaterial
                  color="#1a0e26"
                  emissive="#FF2D95"
                  emissiveIntensity={0.22}
                  metalness={0.3}
                  roughness={0.45}
                  transparent
                  opacity={0.85}
                />
              </mesh>
              <LimbGrabTarget position={[0.07, -0.58, 0]} length={0.7} handlers={limbs.handlers('rightArm')} />
            </group>
          </group>
        </group>
      </group>

      {/* Hips (static) */}
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <capsuleGeometry args={[0.32, 0.25, 4, 8]} />
        <meshPhysicalMaterial
          color="#1a0e26"
          emissive="#9B5CFF"
          emissiveIntensity={0.22}
          metalness={0.35}
          roughness={0.45}
          transparent
          opacity={0.82}
          clearcoat={0.5}
          clearcoatRoughness={0.2}
        />
      </mesh>

      {/* Legs + feet (static) - the old single hip capsule had no legs at
          all below it, which read as a torso ending abruptly in mid-air.
          Two separate capsules plus a small flattened foot each give the
          figure an actual stance instead of a floating lower half. */}
      {/* Each leg's group sits at its hip joint (y 0.3, just inside the hip
          capsule) so a drag swings it from the hip; the meshes are offset
          down by the same 0.3 to keep them exactly where they were. */}
      {[['leftLeg', -0.16], ['rightLeg', 0.16]].map(([name, x]) => (
        <group key={name} ref={limbs.register(name)} position={[x, 0.3, 0]}>
          <LimbGrabTarget position={[0, -0.5, 0.03]} length={0.8} handlers={limbs.handlers(name)} />
          <mesh castShadow receiveShadow position={[0, -0.45, 0]}>
            <capsuleGeometry args={[0.14, 0.85, 4, 8]} />
            <meshPhysicalMaterial
              color="#1a0e26"
              emissive="#9B5CFF"
              emissiveIntensity={0.2}
              metalness={0.35}
              roughness={0.45}
              transparent
              opacity={0.82}
            />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.98, 0.08]} scale={[1, 0.7, 1.6]}>
            <sphereGeometry args={[0.15, 10, 10]} />
            <meshPhysicalMaterial
              color="#1a0e26"
              emissive="#FF2D95"
              emissiveIntensity={0.2}
              metalness={0.3}
              roughness={0.45}
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * The avatar is strictly optional. The GLB is only loaded once a HEAD probe has
 * confirmed it exists; a render-time failure falls back to the procedural
 * humanoid, and a render-loop failure freezes the avatar. In every case the
 * particles, AI core, grid and navigation keep running.
 */
export function AvatarWrapper({
  position = [0, -2, -3],
  rotation = [0, 0, 0],
  scale = 2.5,
  onLoad,
}) {
  const status = useModelAvailability(MODEL_PATH);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  }, []);

  const effectiveScale = isMobile ? scale * 0.8 : scale;

  // Normalised once so nothing downstream has to guess whether it holds an array
  // or a Vector3, and so the effect deps below stay referentially stable even
  // though callers pass a fresh array literal on every render.
  const [posX, posY, posZ] = position;
  const [rotX, rotY, rotZ] = rotation;

  const basePosition = useMemo(() => new THREE.Vector3(posX, posY, posZ), [posX, posY, posZ]);
  const stableRotation = useMemo(() => [rotX, rotY, rotZ], [rotX, rotY, rotZ]);

  const placeholder = (
    <AvatarPlaceholder
      basePosition={basePosition}
      rotation={stableRotation}
      scale={effectiveScale}
    />
  );

  // 'probing' and 'missing' both render the procedural humanoid - no loader is
  // ever mounted for a file that is not there.
  if (status !== 'available') return placeholder;

  return (
    <AvatarErrorBoundary fallback={placeholder}>
      <Suspense fallback={placeholder}>
        <AvatarGLTF
          basePosition={basePosition}
          rotation={stableRotation}
          scale={effectiveScale}
          onLoad={onLoad}
        />
      </Suspense>
    </AvatarErrorBoundary>
  );
}

export const Avatar = AvatarWrapper;
