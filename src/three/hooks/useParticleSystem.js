import { useMemo } from 'react';
import * as THREE from 'three';

export function useParticleSystem(count = 3000) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 15 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      sizes[i] = 0.5 + Math.random() * 1.5;
      
      // Mixed blue / violet / cyan particle palette, with a small amount of
      // red kept as a rare, subtle highlight - never the dominant color.
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        // Electric blue - main accent, most common
        colors[i * 3] = 0.18 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.45 + Math.random() * 0.12;
        colors[i * 3 + 2] = 0.92 + Math.random() * 0.08;
      } else if (colorChoice < 0.65) {
        // Violet - secondary accent
        colors[i * 3] = 0.5 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.32 + Math.random() * 0.1;
        colors[i * 3 + 2] = 0.92 + Math.random() * 0.08;
      } else if (colorChoice < 0.85) {
        // Cyan - small technical highlight
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0.78 + Math.random() * 0.15;
        colors[i * 3 + 2] = 0.88 + Math.random() * 0.12;
      } else if (colorChoice < 0.95) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else {
        // Red - kept rare and subtle, never dominant
        colors[i * 3] = 0.85 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.22 + Math.random() * 0.1;
        colors[i * 3 + 2] = 0.22 + Math.random() * 0.1;
      }
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
      
      alphas[i] = 0.1 + Math.random() * 0.6;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('baseAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    
    return geo;
  }, [count]);

  const material = useMemo(() => new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  return { geometry, material };
}

export function useNeuralNetworkNodes(nodeCount = 50, connectionRadius = 8) {
  const nodes = useMemo(() => {
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const radius = 3 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      nodes.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        size: 0.15 + Math.random() * 0.35,
        color: Math.random() > 0.5 ? 0xFF2D95 : 0x9B5CFF,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 1.5,
      });
    }
    return nodes;
  }, [nodeCount]);

  const connections = useMemo(() => {
    const conns = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist < connectionRadius && Math.random() < 0.15) {
          conns.push({ from: i, to: j, distance: dist, opacity: 0.1 + Math.random() * 0.3 });
        }
      }
    }
    return conns;
  }, [nodes, connectionRadius]);

  return { nodes, connections };
}

export function useGridSystem(size = 50, divisions = 50) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    
    const step = size / divisions;
    const half = size / 2;
    
    for (let i = 0; i <= divisions; i++) {
      const pos = -half + i * step;
      
      positions.push(-half, 0, pos, half, 0, pos);
      positions.push(pos, 0, -half, pos, 0, half);
      
      const intensity = i === 0 || i === divisions ? 0.3 : 0.08;
      const centerIntensity = i === divisions / 2 ? 0.5 : intensity;
      
      colors.push(0, centerIntensity, 1, 0, centerIntensity, 1);
      colors.push(0, centerIntensity, 1, 0, centerIntensity, 1);
    }
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    return geo;
  }, [size, divisions]);

  const material = useMemo(() => new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  }), []);

  return { geometry, material };
}
