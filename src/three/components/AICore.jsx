'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

let cachedGlowSprite = null;
// THREE.PointsMaterial renders each point as a flat square unless it has a
// sprite texture - which this particle system never had. At 200 points
// clustered tightly around the layer-1 nodes, that read as a broken-looking
// cluster of solid squares. A soft radial-gradient sprite turns the exact
// same points into small glowing dots instead, with no other changes needed.
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

export function AICore({
  isActive = true, 
  intensity = 1,
  onNodeHover,
  onNodeClick,
}) {
  const { scene, camera } = useThree();
  const coreRef = useRef();
  const nodesRef = useRef([]);
  const connectionsRef = useRef([]);
  const timeRef = useRef(0);
  const hoverNodeRef = useRef(null);
  const activeNodeRef = useRef(null);
  const dataPacketsRef = useRef([]);

  const { nodes, connections } = useMemo(() => {
    const nodeData = [];
    const connectionData = [];
    
    // Central core node
    nodeData.push({
      index: 0,
      x: 0, y: 0, z: 0,
      baseX: 0, baseY: 0, baseZ: 0,
      size: 1.5,
      baseSize: 1.5,
      color: 0xFF2D95,
      layer: 0,
      pulsePhase: 0,
      pulseSpeed: 1.2,
      rotationSpeed: 0.05,
      isCore: true,
    });

    // Layer 1: 6 nodes in octahedron arrangement
    const layer1Positions = [
      [3, 0, 0], [-3, 0, 0],
      [0, 3, 0], [0, -3, 0],
      [0, 0, 3], [0, 0, -3],
    ];
    layer1Positions.forEach((pos, i) => {
      nodeData.push({
        index: 1 + i,
        x: pos[0], y: pos[1], z: pos[2],
        baseX: pos[0], baseY: pos[1], baseZ: pos[2],
        size: 0.6,
        baseSize: 0.6,
        color: 0xFF2D95,
        layer: 1,
        pulsePhase: (i / layer1Positions.length) * Math.PI * 2,
        pulseSpeed: 0.8 + Math.random() * 0.4,
        rotationSpeed: 0.02,
        isCore: false,
      });
    });

    // Layer 2: 12 nodes in cuboctahedron arrangement
    const layer2Positions = [
      [6, 6, 0], [6, -6, 0], [-6, 6, 0], [-6, -6, 0],
      [6, 0, 6], [6, 0, -6], [-6, 0, 6], [-6, 0, -6],
      [0, 6, 6], [0, 6, -6], [0, -6, 6], [0, -6, -6],
    ];
    layer2Positions.forEach((pos, i) => {
      const len = Math.sqrt(pos[0]**2 + pos[1]**2 + pos[2]**2);
      nodeData.push({
        index: 7 + i,
        x: pos[0], y: pos[1], z: pos[2],
        baseX: pos[0], baseY: pos[1], baseZ: pos[2],
        size: 0.35,
        baseSize: 0.35,
        color: 0x9B5CFF,
        layer: 2,
        pulsePhase: (i / layer2Positions.length) * Math.PI * 2,
        pulseSpeed: 0.6 + Math.random() * 0.5,
        rotationSpeed: 0.015,
        isCore: false,
      });
    });

    // Layer 3: 8 nodes at cube corners
    const layer3Positions = [
      [9, 9, 9], [9, 9, -9], [9, -9, 9], [9, -9, -9],
      [-9, 9, 9], [-9, 9, -9], [-9, -9, 9], [-9, -9, -9],
    ];
    layer3Positions.forEach((pos, i) => {
      const len = Math.sqrt(pos[0]**2 + pos[1]**2 + pos[2]**2);
      nodeData.push({
        index: 19 + i,
        x: pos[0], y: pos[1], z: pos[2],
        baseX: pos[0], baseY: pos[1], baseZ: pos[2],
        size: 0.2,
        baseSize: 0.2,
        color: 0xFF4FB3,
        layer: 3,
        pulsePhase: (i / layer3Positions.length) * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 0.4,
        rotationSpeed: 0.01,
        isCore: false,
      });
    });

    // Connections: Core -> Layer 1
    for (let i = 1; i <= 6; i++) {
      connectionData.push({
        from: 0,
        to: i,
        distance: 3,
        baseOpacity: 0.15,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 1.5,
        active: false,
        activeProgress: 0,
        packetProgress: 0,
        packetDirection: 1, // 1 = outward, -1 = inward
      });
    }

    // Connections: Layer 1 -> Layer 2
    const layer1ToLayer2 = {
      0: [7, 8, 10, 11],  // +X connects to +X+Y, +X-Y, +X+Z, +X-Z
      1: [9, 10, 12, 13], // +Y connects to +X+Y, -X+Y, +Y+Z, +Y-Z
      2: [9, 8, 14, 15],  // -Y connects to +X-Y, -X-Y, -Y+Z, -Y-Z
      3: [11, 10, 14, 12], // +Z connects to +X+Z, -X+Z, +Y+Z, -Y+Z
      4: [13, 15, 11, 12], // -Z connects to +X-Z, -X-Z, +Y-Z, -Y-Z
      5: [7, 9, 13, 15],   // -X connects to -X+Y, -X-Y, -X+Z, -X-Z
    };
    
    Object.entries(layer1ToLayer2).forEach(([layer1Idx, layer2Indices]) => {
      const from = 1 + parseInt(layer1Idx);
      layer2Indices.forEach(to => {
        const dx = nodeData[from].x - nodeData[to].x;
        const dy = nodeData[from].y - nodeData[to].y;
        const dz = nodeData[from].z - nodeData[to].z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        connectionData.push({
          from,
          to,
          distance: dist,
          baseOpacity: 0.1,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 1.2,
          active: false,
          activeProgress: 0,
          packetProgress: 0,
          packetDirection: 1,
        });
      });
    });

    // Connections: Layer 2 -> Layer 3
    const layer2ToLayer3 = {
      7: [19, 20], 8: [21, 22], 9: [20, 23], 10: [19, 21],
      11: [24, 25], 12: [26, 19], 13: [25, 20], 14: [23, 26],
      15: [22, 23], 16: [20, 21], 17: [26, 24], 18: [19, 25],
    };
    
    Object.entries(layer2ToLayer3).forEach(([layer2Idx, layer3Indices]) => {
      const from = parseInt(layer2Idx, 10);
      layer3Indices.forEach(to => {
        const dx = nodeData[from].x - nodeData[to].x;
        const dy = nodeData[from].y - nodeData[to].y;
        const dz = nodeData[from].z - nodeData[to].z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        connectionData.push({
          from,
          to,
          distance: dist,
          baseOpacity: 0.08,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 1.0,
          active: false,
          activeProgress: 0,
          packetProgress: 0,
          packetDirection: 1,
        });
      });
    });

    return { nodes: nodeData, connections: connectionData };
  }, []);

  const coreGroup = useMemo(() => {
    const group = new THREE.Group();
    
    // Core geometry - Octahedron
    const coreGeometry = new THREE.OctahedronGeometry(1.5, 0);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x030508,
      metalness: 0.95,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.3,
      transparent: true,
      opacity: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0,
      side: THREE.DoubleSide,
      ior: 1.5,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    coreMesh.userData = { type: 'core' };
    group.add(coreMesh);

    // Inner core - smaller octahedron, emissive
    const innerCoreGeometry = new THREE.OctahedronGeometry(0.7, 0);
    const innerCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF2D95,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeometry, innerCoreMaterial);
    innerCoreMesh.userData = { type: 'innerCore' };
    group.add(innerCoreMesh);

    // Outer wireframe shell - octahedron
    const outerShellGeometry = new THREE.OctahedronGeometry(1.8, 0);
    const outerShellMaterial = new THREE.MeshBasicMaterial({
      color: 0x9B5CFF,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const outerShellMesh = new THREE.Mesh(outerShellGeometry, outerShellMaterial);
    outerShellMesh.userData = { type: 'outerShell' };
    group.add(outerShellMesh);

    // Node geometry - simple octahedrons
    const nodeGeometry = new THREE.OctahedronGeometry(1, 0);
    
    nodes.forEach((node, i) => {
      const nodeMaterial = new THREE.MeshPhysicalMaterial({
        color: node.color,
        metalness: 0.8,
        roughness: 0.15,
        transparent: true,
        opacity: node.layer === 0 ? 0.9 : 0.8,
        clearcoat: 1,
        clearcoatRoughness: 0,
        emissive: node.color,
        emissiveIntensity: node.layer === 0 ? 0.8 : 0.4,
        transmission: node.layer === 0 ? 0.3 : 0,
        thickness: 0.5,
      });
      
      const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
      nodeMesh.scale.setScalar(node.size);
      nodeMesh.position.set(node.x, node.y, node.z);
      nodeMesh.userData = { 
        type: 'node', 
        nodeIndex: i,
        baseScale: node.size,
        layer: node.layer,
      };
      
      // Subtle glow for core and layer 1
      if (node.layer <= 1) {
        const glowGeometry = new THREE.OctahedronGeometry(1.3, 0);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: node.color,
          transparent: true,
          opacity: node.layer === 0 ? 0.15 : 0.08,
          side: THREE.BackSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.scale.setScalar(node.size);
        glowMesh.userData = { type: 'nodeGlow', nodeIndex: i };
        nodeMesh.add(glowMesh);
      }
      
      group.add(nodeMesh);
      nodesRef.current[i] = { mesh: nodeMesh, data: node };
    });

    // Connections - thin lines using Line2 for better rendering
    connections.forEach((conn, i) => {
      const fromNode = nodes[conn.from];
      const toNode = nodes[conn.to];
      
      const points = [
        new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z),
        new THREE.Vector3(toNode.x, toNode.y, toNode.z),
      ];
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Color gradient from source to target
      const colors = [];
      const color1 = new THREE.Color(fromNode.color);
      const color2 = new THREE.Color(toNode.color);
      colors.push(color1.r, color1.g, color1.b);
      colors.push(color2.r, color2.g, color2.b);
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      
      const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: conn.baseOpacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      
      const line = new THREE.Line(geometry, lineMaterial);
      line.userData = { 
        type: 'connection', 
        connectionIndex: i,
        baseOpacity: conn.baseOpacity,
      };
      
      group.add(line);
      connectionsRef.current[i] = { line, data: conn };
    });

    // Data packets - small octahedrons that travel along connections
    const packetGeometry = new THREE.OctahedronGeometry(0.15, 0);
    const packetMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Create packet meshes for each connection
    connections.forEach((conn, i) => {
      const packet = new THREE.Mesh(packetGeometry, packetMaterial.clone());
      packet.visible = false;
      packet.userData = { connectionIndex: i, progress: 0 };
      group.add(packet);
      dataPacketsRef.current[i] = packet;
    });

    // Ambient particles around core
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 200;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleColors = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);
    const particleLifetimes = new Float32Array(particleCount);
    const particleMaxLifetimes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Spawn near layer 1 nodes
      const node = nodes[1 + Math.floor(Math.random() * 6)];
      const radius = 2 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      particlePositions[i * 3] = node.x + radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = node.y + radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = node.z + radius * Math.cos(phi);
      
      particleSizes[i] = 0.05 + Math.random() * 0.08;
      
      // Drift toward center slowly
      const dx = -particlePositions[i * 3] * 0.001;
      const dy = -particlePositions[i * 3 + 1] * 0.001;
      const dz = -particlePositions[i * 3 + 2] * 0.001;
      particleVelocities[i * 3] = dx + (Math.random() - 0.5) * 0.0005;
      particleVelocities[i * 3 + 1] = dy + (Math.random() - 0.5) * 0.0005;
      particleVelocities[i * 3 + 2] = dz + (Math.random() - 0.5) * 0.0005;
      
      particleLifetimes[i] = Math.random() * 100;
      particleMaxLifetimes[i] = 100 + Math.random() * 200;
      
      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        particleColors[i * 3] = 0.1; particleColors[i * 3 + 1] = 0.7; particleColors[i * 3 + 2] = 1.0;
      } else {
        particleColors[i * 3] = 0.7; particleColors[i * 3 + 1] = 0.4; particleColors[i * 3 + 2] = 1.0;
      }
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(particleVelocities, 3));
    particleGeometry.setAttribute('lifetime', new THREE.BufferAttribute(particleLifetimes, 1));
    particleGeometry.setAttribute('maxLifetime', new THREE.BufferAttribute(particleMaxLifetimes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 1,
      map: getGlowSpriteTexture(),
      alphaMap: getGlowSpriteTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystem.userData = { type: 'particles' };
    group.add(particleSystem);
    group.userData.particles = particleSystem;

    return group;
  }, [nodes, connections]);

  useFrame((state, delta) => {
    if (!isActive) return;
    
    timeRef.current += delta;
    const time = timeRef.current;
    
    if (coreGroup) {
      const core = coreGroup;
      
      // Core rotation
      const coreMesh = core.children.find(c => c.userData.type === 'core');
      if (coreMesh) {
        coreMesh.rotation.y += delta * 0.02 * intensity;
        coreMesh.rotation.x += delta * 0.01 * intensity;
        coreMesh.rotation.z += delta * 0.005 * intensity;
      }
      
      // Inner core - counter rotation, pulsing
      const innerCore = core.children.find(c => c.userData.type === 'innerCore');
      if (innerCore) {
        innerCore.rotation.y -= delta * 0.04 * intensity;
        innerCore.rotation.x += delta * 0.02 * intensity;
        const pulse = 1 + Math.sin(time * 2) * 0.08 * intensity;
        innerCore.scale.setScalar(pulse);
        innerCore.material.opacity = 0.4 + Math.sin(time * 1.5) * 0.2 * intensity;
      }
      
      // Outer shell - slow rotation
      const outerShell = core.children.find(c => c.userData.type === 'outerShell');
      if (outerShell) {
        outerShell.rotation.y += delta * 0.008 * intensity;
        outerShell.rotation.z += delta * 0.005 * intensity;
        outerShell.material.opacity = 0.04 + Math.sin(time * 0.7) * 0.04 * intensity;
      }

      // Animate nodes
      nodesRef.current.forEach((nodeObj, i) => {
        if (!nodeObj) return;
        const { mesh, data } = nodeObj;
        const pulse = 1 + Math.sin(time * data.pulseSpeed + data.pulsePhase) * 0.15 * intensity;
        const scale = data.baseSize * pulse;
        mesh.scale.setScalar(scale);
        
        // Orbit rotation for non-core nodes
        if (!data.isCore) {
          mesh.rotation.y += delta * data.rotationSpeed * intensity;
          mesh.rotation.x += delta * data.rotationSpeed * 0.5 * intensity;
          
          // Subtle orbital motion
          const orbitRadius = Math.sqrt(data.baseX**2 + data.baseY**2 + data.baseZ**2) * 0.02;
          mesh.position.x = data.baseX + Math.sin(time * 0.3 + data.pulsePhase) * orbitRadius;
          mesh.position.y = data.baseY + Math.cos(time * 0.3 + data.pulsePhase) * orbitRadius;
          mesh.position.z = data.baseZ + Math.sin(time * 0.2 + data.pulsePhase) * orbitRadius;
        }
        
        mesh.material.emissiveIntensity = data.isCore ? 
          (0.6 + pulse * 0.3 * intensity) : 
          (0.2 + pulse * 0.3 * intensity);
        
        // Glow
        const glow = mesh.children.find(c => c.userData.type === 'nodeGlow');
        if (glow) {
          glow.scale.setScalar(scale * 1.3);
          glow.material.opacity = data.isCore ? 0.1 + pulse * 0.1 * intensity : 0.05 + pulse * 0.05 * intensity;
        }
        
        // Hover state
        if (i === hoverNodeRef.current) {
          mesh.scale.setScalar(scale * 1.4);
          mesh.material.emissiveIntensity = 1.2 * intensity;
          if (glow) {
            glow.material.opacity = 0.25 * intensity;
            glow.scale.setScalar(scale * 2);
          }
        }
        
        // Active/clicked state
        if (i === activeNodeRef.current) {
          mesh.material.emissiveIntensity = 1.5 * intensity;
          mesh.material.color.setHex(0xFF4FB3);
          if (glow) {
            glow.material.color.setHex(0xFF4FB3);
            glow.material.opacity = 0.3 * intensity;
          }
        }
      });

      // Animate connections
      connectionsRef.current.forEach((connObj, i) => {
        if (!connObj) return;
        const { line, data } = connObj;
        const pulse = Math.sin(time * data.pulseSpeed + data.pulsePhase) * 0.5 + 0.5;
        const baseOpacity = data.baseOpacity;
        
        if (data.active) {
          data.activeProgress = Math.min(1, data.activeProgress + delta * 2);
          line.material.opacity = baseOpacity * 8 * data.activeProgress * intensity;
          
          // Traveling color wave
          const colors = line.geometry.attributes.color.array;
          for (let v = 0; v < 2; v++) {
            const wave = Math.sin(time * 8 - v * Math.PI) * 0.5 + 0.5;
            colors[v * 3] = wave * 0.3;
            colors[v * 3 + 1] = 1;
            colors[v * 3 + 2] = 1 - wave * 0.3;
          }
          line.geometry.attributes.color.needsUpdate = true;
          
          if (data.activeProgress >= 1) {
            data.active = false;
            data.activeProgress = 0;
          }
        } else {
          line.material.opacity = baseOpacity * (0.5 + pulse * 0.5) * intensity;
          
          // Highlight on hover
          const fromNode = nodesRef.current[data.from];
          const toNode = nodesRef.current[data.to];
          if (fromNode && toNode && 
              (fromNode.data.index === hoverNodeRef.current || toNode.data.index === hoverNodeRef.current)) {
            line.material.opacity = baseOpacity * 3 * intensity;
          }
        }
        
        // Data packet animation
        const packet = dataPacketsRef.current[i];
        if (packet && data.active) {
          packet.visible = true;
          data.packetProgress += delta * 2 * data.packetDirection;
          
          if (data.packetProgress >= 1) {
            data.packetProgress = 1;
            data.packetDirection = -1;
          } else if (data.packetProgress <= 0) {
            data.packetProgress = 0;
            data.packetDirection = 1;
          }
          
          const fromNode = nodes[data.from];
          const toNode = nodes[data.to];
          packet.position.lerpVectors(
            new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z),
            new THREE.Vector3(toNode.x, toNode.y, toNode.z),
            data.packetProgress
          );
          packet.scale.setScalar(0.8 + Math.sin(time * 10) * 0.2);
          packet.rotation.y += delta * 3;
        } else if (packet) {
          packet.visible = false;
        }
      });

      // Ambient particles
      const particles = core.userData.particles;
      if (particles) {
        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.geometry.attributes.velocity.array;
        const lifetimes = particles.geometry.attributes.lifetime.array;
        const maxLifetimes = particles.geometry.attributes.maxLifetime.array;
        const sizes = particles.geometry.attributes.size.array;
        
        for (let i = 0; i < 200; i++) {
          lifetimes[i] += delta;
          
          if (lifetimes[i] >= maxLifetimes[i]) {
            // Respawn near a layer 1 node
            const node = nodes[1 + Math.floor(Math.random() * 6)];
            const radius = 2 + Math.random() * 2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i * 3] = node.x + radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = node.y + radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = node.z + radius * Math.cos(phi);
            
            const dx = -positions[i * 3] * 0.001;
            const dy = -positions[i * 3 + 1] * 0.001;
            const dz = -positions[i * 3 + 2] * 0.001;
            velocities[i * 3] = dx + (Math.random() - 0.5) * 0.0005;
            velocities[i * 3 + 1] = dy + (Math.random() - 0.5) * 0.0005;
            velocities[i * 3 + 2] = dz + (Math.random() - 0.5) * 0.0005;
            
            lifetimes[i] = 0;
            maxLifetimes[i] = 100 + Math.random() * 200;
            sizes[i] = 0.05 + Math.random() * 0.08;
          } else {
            positions[i * 3] += velocities[i * 3] * delta * 60;
            positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60;
            positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60;
            
            const progress = lifetimes[i] / maxLifetimes[i];
            sizes[i] = (0.05 + Math.random() * 0.08) * (1 - progress * 0.5);
          }
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
        particles.geometry.attributes.size.needsUpdate = true;
        particles.geometry.attributes.lifetime.needsUpdate = true;
      }
    }
  });

  const handlePointerOver = (e) => {
    if (e.object.userData.type === 'node') {
      hoverNodeRef.current = e.object.userData.nodeIndex;
      if (onNodeHover) onNodeHover(nodes[e.object.userData.nodeIndex]);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = (e) => {
    if (e.object.userData.type === 'node') {
      hoverNodeRef.current = null;
      if (onNodeHover) onNodeHover(null);
      document.body.style.cursor = 'default';
    }
  };

  const handleClick = (e) => {
    if (e.object.userData.type === 'node') {
      const nodeIndex = e.object.userData.nodeIndex;
      activeNodeRef.current = nodeIndex;
      if (onNodeClick) onNodeClick(nodes[nodeIndex]);
      
      // Activate connected connections
      connectionsRef.current.forEach(connObj => {
        if (connObj.data.from === nodeIndex || connObj.data.to === nodeIndex) {
          connObj.data.active = true;
          connObj.data.activeProgress = 0;
          connObj.data.packetProgress = 0;
          connObj.data.packetDirection = 1;
        }
      });
    }
  };

  return (
    <group
      ref={coreRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <primitive object={coreGroup} />
    </group>
  );
}

export function SectionOrbit({ 
  position, 
  label,
  color = 0xFF2D95,
  distance = 18,
  isActive = false,
  onClick,
  onHover,
  children,
}) {
  const groupRef = useRef();
  const meshRef = useRef();
  const labelRef = useRef();
  const timeRef = useRef(0);
  const hoverRef = useRef(false);
  const activeRef = useRef(isActive);

  activeRef.current = isActive;

  useFrame((state, delta) => {
    timeRef.current += delta;
    
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
      
      const floatY = Math.sin(timeRef.current * 0.6) * 0.2;
      groupRef.current.position.y = position.y + floatY;
      
      if (meshRef.current) {
        const pulse = 1 + Math.sin(timeRef.current * 1.5) * 0.05;
        const targetScale = (hoverRef.current || activeRef.current) ? 1.25 : 1;
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale).multiplyScalar(pulse), delta * 4);
        
        if (activeRef.current) {
          meshRef.current.material.emissiveIntensity = 0.8 + Math.sin(timeRef.current * 2) * 0.3;
        } else {
          meshRef.current.material.emissiveIntensity = hoverRef.current ? 0.5 : 0.2;
        }
      }
    }
  });

  const handlePointerOver = () => {
    hoverRef.current = true;
    if (onHover) onHover(true);
  };

  const handlePointerOut = () => {
    hoverRef.current = false;
    if (onHover) onHover(false);
  };

  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <mesh ref={meshRef} castShadow receiveShadow>
        <octahedronGeometry args={[0.9, 0]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.85}
          clearcoat={1}
          clearcoatRoughness={0}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Subtle edge highlight on hover/active */}
      <mesh>
        <octahedronGeometry args={[1.1, 0]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.0}
          wireframe
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {children}
    </group>
  );
}

export function HolographicPanel({ 
  position, 
  rotation = [0, 0, 0],
  scale = 1,
  width = 8,
  height = 5,
  color = 0xFF2D95,
  opacity = 0.1,
  children,
}) {
  const meshRef = useRef();
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    timeRef.current += delta;
    
    if (meshRef.current) {
      meshRef.current.material.opacity = opacity + Math.sin(timeRef.current * 1.2) * 0.02;
      meshRef.current.material.emissiveIntensity = 0.05 + Math.sin(timeRef.current * 1.5) * 0.03;
    }
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh ref={meshRef}>
        <planeGeometry args={[width, height, 20, 20]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          metalness={0.3}
          roughness={0.4}
          clearcoat={1}
          clearcoatRoughness={0}
          emissive={color}
          emissiveIntensity={0.05}
        />
      </mesh>
      
      {/* Grid overlay */}
      <mesh>
        <planeGeometry args={[width * 1.001, height * 1.001, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.03}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          wireframe
        />
      </mesh>
      
      {/* Scanline */}
      <mesh>
        <planeGeometry args={[width, 0.02]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {children}
    </group>
  );
}

export function GridFloor({ size = 100, divisions = 100, color = 0x9B5CFF, opacity = 0.05 }) {
  const gridRef = useRef();
  const timeRef = useRef(0);

  const grid = useMemo(() => {
    const helper = new THREE.GridHelper(size, divisions, color, color);
    const materials = Array.isArray(helper.material) ? helper.material : [helper.material];

    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = opacity;
      material.depthWrite = false;
      material.blending = THREE.AdditiveBlending;
    });

    return helper;
  }, [size, divisions, color, opacity]);

  useFrame((state, delta) => {
    timeRef.current += delta;
    
    if (gridRef.current) {
      const materials = Array.isArray(gridRef.current.material)
        ? gridRef.current.material
        : [gridRef.current.material];

      materials.forEach((material) => {
        material.opacity = opacity + Math.sin(timeRef.current * 0.4) * 0.01;
      });
    }
  });

  return <primitive ref={gridRef} object={grid} />;
}
