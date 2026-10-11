'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface StadiumAtmosphereCanvasProps {
  playerAColor?: string;
  playerBColor?: string;
  className?: string;
}

export default function StadiumAtmosphereCanvas({
  playerAColor = '#3ec9e6',
  playerBColor = '#a78bfa',
  className = '',
}: StadiumAtmosphereCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    let isVisible = true;
    let animationFrameId: number;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 500;

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08110f, 0.035);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 4.5, 7);
    camera.lookAt(0, 0, 0);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      container.appendChild(renderer.domElement);
    } catch {
      setHasWebGL(false);
      return;
    }

    // Colors
    const colA = new THREE.Color(playerAColor);
    const colB = new THREE.Color(playerBColor);

    // 1. Tactical Pitch Lines
    const linesGroup = new THREE.Group();

    // Outer Pitch Rect: 12 x 7.5
    const pitchHalfW = 6;
    const pitchHalfH = 3.6;
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x477868,
      transparent: true,
      opacity: 0.35,
    });

    const borderPts = [
      new THREE.Vector3(-pitchHalfW, 0, -pitchHalfH),
      new THREE.Vector3(pitchHalfW, 0, -pitchHalfH),
      new THREE.Vector3(pitchHalfW, 0, pitchHalfH),
      new THREE.Vector3(-pitchHalfW, 0, pitchHalfH),
      new THREE.Vector3(-pitchHalfW, 0, -pitchHalfH),
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
    linesGroup.add(new THREE.Line(borderGeo, lineMat));

    // Center Line
    const centerPts = [
      new THREE.Vector3(0, 0, -pitchHalfH),
      new THREE.Vector3(0, 0, pitchHalfH),
    ];
    const centerGeo = new THREE.BufferGeometry().setFromPoints(centerPts);
    linesGroup.add(new THREE.Line(centerGeo, lineMat));

    // Center Circle (Radius 1.3)
    const circlePts: THREE.Vector3[] = [];
    const segments = 48;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      circlePts.push(new THREE.Vector3(Math.cos(theta) * 1.3, 0, Math.sin(theta) * 1.3));
    }
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePts);
    linesGroup.add(new THREE.Line(circleGeo, lineMat));

    // Penalty Boxes (Left & Right)
    const boxW = 1.8;
    const boxH = 2.2;
    // Left Box
    const leftBoxPts = [
      new THREE.Vector3(-pitchHalfW, 0, -boxH),
      new THREE.Vector3(-pitchHalfW + boxW, 0, -boxH),
      new THREE.Vector3(-pitchHalfW + boxW, 0, boxH),
      new THREE.Vector3(-pitchHalfW, 0, boxH),
    ];
    linesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftBoxPts), lineMat));

    // Right Box
    const rightBoxPts = [
      new THREE.Vector3(pitchHalfW, 0, -boxH),
      new THREE.Vector3(pitchHalfW - boxW, 0, -boxH),
      new THREE.Vector3(pitchHalfW - boxW, 0, boxH),
      new THREE.Vector3(pitchHalfW, 0, boxH),
    ];
    linesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightBoxPts), lineMat));

    scene.add(linesGroup);

    // 2. Ambient Particles (Floating Stadium Atmosphere motes)
    const particleCount = 75;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    const pSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 16;
      pPos[i * 3 + 1] = Math.random() * 5 + 0.2;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 10;

      // Color split: left cyan, right purple, with white highlights
      const isLeft = pPos[i * 3] < 0;
      const c = isLeft ? colA : colB;
      pColors[i * 3] = THREE.MathUtils.lerp(c.r, 1, 0.35);
      pColors[i * 3 + 1] = THREE.MathUtils.lerp(c.g, 1, 0.35);
      pColors[i * 3 + 2] = THREE.MathUtils.lerp(c.b, 1, 0.35);

      pSpeeds[i] = 0.003 + Math.random() * 0.006;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(pGeo, pMat);
    scene.add(particleSystem);

    // 3. Dynamic Spotlights (Cyan on Left, Purple on Right)
    const spotA = new THREE.PointLight(colA, 4, 14, 1.2);
    spotA.position.set(-4, 3, 2);
    scene.add(spotA);

    const spotB = new THREE.PointLight(colB, 4, 14, 1.2);
    spotB.position.set(4, 3, 2);
    scene.add(spotB);

    const ambientLight = new THREE.AmbientLight(0x0c1b17, 1.5);
    scene.add(ambientLight);

    // Mouse Tracking / Gyro
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * 0.6;
      targetY = y * 0.4;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Intersection Observer to pause rendering when offscreen
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // Render Loop
    let clock = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible || document.hidden) return;

      clock += 0.015;

      // Smooth camera sway with mouse lerp
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;

      camera.position.x = currentX * 1.8;
      camera.position.y = 4.5 + currentY * 0.8;
      camera.lookAt(currentX * 0.5, 0, 0);

      // Spotlights subtle orbital pulse
      spotA.position.x = -4 + Math.sin(clock * 0.8) * 0.4;
      spotA.position.z = 2 + Math.cos(clock * 0.6) * 0.3;
      spotB.position.x = 4 + Math.cos(clock * 0.8) * 0.4;
      spotB.position.z = 2 + Math.sin(clock * 0.6) * 0.3;

      // Particle float
      const positions = pGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += pSpeeds[i];
        positions[i * 3] += Math.sin(clock + i) * 0.002;
        if (positions[i * 3 + 1] > 5) {
          positions[i * 3 + 1] = 0.2;
        }
      }
      pGeo.attributes.position.needsUpdate = true;

      // Slight pitch tilt
      linesGroup.rotation.y = Math.sin(clock * 0.2) * 0.015;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      borderGeo.dispose();
      centerGeo.dispose();
      circleGeo.dispose();
      pGeo.dispose();
      lineMat.dispose();
      pMat.dispose();
    };
  }, [playerAColor, playerBColor]);

  if (!hasWebGL) {
    // Beautiful CSS Mesh Fallback
    return (
      <div
        className={`absolute inset-0 pointer-events-none opacity-30 ${className}`}
        style={{
          background: `
            radial-gradient(ellipse 65% 50% at 20% 30%, ${playerAColor}25, transparent 70%),
            radial-gradient(ellipse 65% 50% at 80% 30%, ${playerBColor}25, transparent 70%),
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03), transparent 60%)
          `,
        }}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
