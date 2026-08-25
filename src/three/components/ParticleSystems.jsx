'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

// The original ambient ParticleField that used to live here was replaced by
// the independent, GPU-driven implementation in `src/three/ParticleField.jsx`
// (real 3D box volume, mouse-sphere repulsion, idle drift, connections).
// DataParticles/EnergyStreams below remain - they're the AI core's own halo
// and energy-stream effects, unrelated to the background particle field.

export function DataParticles({ count = 150, center = new THREE.Vector3(0, 0, 0), radius = 4 }) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const orbits = new Float32Array(count * 3);
    const orbitSpeeds = new Float32Array(count);
    const orbitPhases = new Float32Array(count);
    const verticalSpeeds = new Float32Array(count);
    const verticalPhases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const orbitRadius = radius * (0.4 + Math.random() * 0.6);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = center.x + orbitRadius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = center.y + orbitRadius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = center.z + orbitRadius * Math.cos(phi);
      
      sizes[i] = 0.08 + Math.random() * 0.12;
      
      // Keep the core halo dim and blue so it remains secondary to the AI core itself.
      if (Math.random() < 0.85) {
        colors[i * 3] = 0.06;
        colors[i * 3 + 1] = 0.15;
        colors[i * 3 + 2] = 0.42;
      } else {
        colors[i * 3] = 0.2;
        colors[i * 3 + 1] = 0.75;
        colors[i * 3 + 2] = 0.95;
      }
      
      // Random orbit axis
      orbits[i * 3] = (Math.random() - 0.5);
      orbits[i * 3 + 1] = (Math.random() - 0.5);
      orbits[i * 3 + 2] = (Math.random() - 0.5);
      const orbitLen = Math.sqrt(orbits[i * 3] ** 2 + orbits[i * 3 + 1] ** 2 + orbits[i * 3 + 2] ** 2);
      orbits[i * 3] /= orbitLen;
      orbits[i * 3 + 1] /= orbitLen;
      orbits[i * 3 + 2] /= orbitLen;
      
      orbitSpeeds[i] = 0.3 + Math.random() * 0.7;
      orbitPhases[i] = Math.random() * Math.PI * 2;
      verticalSpeeds[i] = 0.5 + Math.random() * 1.0;
      verticalPhases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('orbitAxis', new THREE.BufferAttribute(orbits, 3));
    geo.setAttribute('orbitSpeed', new THREE.BufferAttribute(orbitSpeeds, 1));
    geo.setAttribute('orbitPhase', new THREE.BufferAttribute(orbitPhases, 1));
    geo.setAttribute('verticalSpeed', new THREE.BufferAttribute(verticalSpeeds, 1));
    geo.setAttribute('verticalPhase', new THREE.BufferAttribute(verticalPhases, 1));
    
    const mat = new THREE.PointsMaterial({
      size: 0.34,
      vertexColors: true,
      transparent: true,
      opacity: 0.38,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [count, center.x, center.y, center.z, radius]);

  const points = useMemo(() => new THREE.Points(geometry, material), [geometry, material]);

  useFrame((state, delta) => {
    const positions = geometry.attributes.position.array;
    const orbits = geometry.attributes.orbitAxis.array;
    const orbitSpeeds = geometry.attributes.orbitSpeed.array;
    const orbitPhases = geometry.attributes.orbitPhase.array;
    const verticalSpeeds = geometry.attributes.verticalSpeed.array;
    const verticalPhases = geometry.attributes.verticalPhase.array;
    const time = state.clock.getElapsedTime();
    
    for (let i = 0; i < count; i++) {
      const angle = time * orbitSpeeds[i] + orbitPhases[i];
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      const ox = orbits[i * 3];
      const oy = orbits[i * 3 + 1];
      const oz = orbits[i * 3 + 2];
      
      const radius = Math.sqrt(
        (positions[i * 3] - center.x) ** 2 +
        (positions[i * 3 + 1] - center.y) ** 2 +
        (positions[i * 3 + 2] - center.z) ** 2
      );
      
      const vAngle = time * verticalSpeeds[i] + verticalPhases[i];
      const vOffset = Math.sin(vAngle) * radius * 0.2;
      
      const px = radius * cosA;
      const py = radius * sinA + vOffset;
      const pz = radius * 0.3 * Math.sin(angle * 0.7);
      
      positions[i * 3] = center.x + px * ox - pz * oy;
      positions[i * 3 + 1] = center.y + py;
      positions[i * 3 + 2] = center.z + px * oz + pz * ox;
    }
    
    geometry.attributes.position.needsUpdate = true;
  });

  return <primitive object={points} />;
}

export function EnergyStreams({ count = 8, length = 20, center = new THREE.Vector3(0, 0, 0) }) {
  const streams = useMemo(() => {
    const streamData = [];
    for (let i = 0; i < count; i++) {
      // Emanate from core in structured directions
      const directions = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0.7, 0.7, 0).normalize(),
        new THREE.Vector3(-0.7, -0.7, 0).normalize(),
      ];
      
      const dir = directions[i % directions.length].clone();
      // Add slight variation
      dir.x += (Math.random() - 0.5) * 0.2;
      dir.y += (Math.random() - 0.5) * 0.2;
      dir.z += (Math.random() - 0.5) * 0.2;
      dir.normalize();
      
      streamData.push({
        startX: center.x + dir.x * 2,
        startY: center.y + dir.y * 2,
        startZ: center.z + dir.z * 2,
        direction: dir,
        length: length * (0.6 + Math.random() * 0.4),
        speed: 0.6 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        width: 0.04 + Math.random() * 0.06,
        color: i % 2 === 0 ? 0xFF2D95 : 0x9B5CFF,
      });
    }
    return streamData;
  }, [count, length, center.x, center.y, center.z]);

  const group = useMemo(() => new THREE.Group(), []);
  
  useMemo(() => {
    group.clear();
    streams.forEach((stream, i) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(stream.startX, stream.startY, stream.startZ),
        new THREE.Vector3(
          stream.startX + stream.direction.x * stream.length * 0.4,
          stream.startY + stream.direction.y * stream.length * 0.4,
          stream.startZ + stream.direction.z * stream.length * 0.4
        ),
        new THREE.Vector3(
          stream.startX + stream.direction.x * stream.length * 0.8,
          stream.startY + stream.direction.y * stream.length * 0.8,
          stream.startZ + stream.direction.z * stream.length * 0.8
        ),
        new THREE.Vector3(
          stream.startX + stream.direction.x * stream.length,
          stream.startY + stream.direction.y * stream.length,
          stream.startZ + stream.direction.z * stream.length
        ),
      ]);
      
      const geometry = new THREE.TubeGeometry(curve, 16, stream.width, 8, false);
      const material = new THREE.MeshBasicMaterial({
        color: stream.color,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { streamIndex: i, stream };
      group.add(mesh);
    });
  }, [group, streams]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    group.children.forEach((mesh, i) => {
      const stream = streams[i];
      if (!stream) return;
      
      const opacity = 0.08 + Math.sin(time * stream.speed + stream.phase) * 0.07;
      mesh.material.opacity = opacity;
      
      mesh.rotation.y += delta * 0.02 * stream.speed;
    });
  });

  return <primitive object={group} />;
}

// Connection data packets - travel along lines between nodes
export function ConnectionPackets({ connections, nodes, activeConnections = new Set() }) {
  const packets = useMemo(() => {
    const packetData = [];
    connections.forEach((conn, i) => {
      if (activeConnections.has(i)) {
        packetData.push({
          connectionIndex: i,
          progress: 0,
          speed: 2 + Math.random() * 2,
          direction: 1,
          size: 0.12 + Math.random() * 0.08,
          color: Math.random() < 0.5 ? 0xFF2D95 : 0x9B5CFF,
        });
      }
    });
    return packetData;
  }, [connections, activeConnections]);

  const group = useMemo(() => new THREE.Group(), []);
  
  useMemo(() => {
    group.clear();
    packets.forEach((packet, i) => {
      const geometry = new THREE.OctahedronGeometry(packet.size, 0);
      const material = new THREE.MeshBasicMaterial({
        color: packet.color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { packetIndex: i };
      group.add(mesh);
    });
  }, [group, packets]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    group.children.forEach((mesh, i) => {
      const packet = packets[i];
      if (!packet) return;
      
      const conn = connections[packet.connectionIndex];
      if (!conn) return;
      
      const fromNode = nodes[conn.from];
      const toNode = nodes[conn.to];
      if (!fromNode || !toNode) return;
      
      packet.progress += delta * packet.speed * packet.direction;
      
      if (packet.progress >= 1) {
        packet.progress = 1;
        packet.direction = -1;
      } else if (packet.progress <= 0) {
        packet.progress = 0;
        packet.direction = 1;
      }
      
      mesh.position.lerpVectors(
        new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z),
        new THREE.Vector3(toNode.x, toNode.y, toNode.z),
        packet.progress
      );
      
      mesh.scale.setScalar(0.7 + Math.sin(time * 15) * 0.3);
      mesh.rotation.y += delta * 5;
      mesh.rotation.x += delta * 3;
    });
  });

  return <primitive object={group} />;
}
