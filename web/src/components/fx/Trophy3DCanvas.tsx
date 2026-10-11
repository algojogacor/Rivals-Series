'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { burstTrophyConfetti } from './ConfettiBurst';
import { Sparkles } from 'lucide-react';

interface Trophy3DCanvasProps {
  className?: string;
  onCelebrate?: () => void;
}

export default function Trophy3DCanvas({ className = '', onCelebrate }: Trophy3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [celebrated, setCelebrated] = useState<boolean>(false);

  const handleBurst = (e?: React.MouseEvent) => {
    let clientX = 0.5;
    let clientY = 0.4;
    if (e) {
      clientX = e.clientX / window.innerWidth;
      clientY = e.clientY / window.innerHeight;
    }
    burstTrophyConfetti(clientX, clientY);
    setCelebrated(true);
    setTimeout(() => setCelebrated(false), 2000);
    if (onCelebrate) onCelebrate();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

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
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 340;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.5);
    camera.lookAt(0, 0.6, 0);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      container.appendChild(renderer.domElement);
    } catch {
      setHasWebGL(false);
      return;
    }

    // Trophy Materials
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf5b027,
      emissive: 0x3d2706,
      metalness: 0.94,
      roughness: 0.18,
    });

    const platinumMat = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      metalness: 0.9,
      roughness: 0.22,
    });

    const obsidianBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0f1c18,
      metalness: 0.5,
      roughness: 0.35,
    });

    const trophyGroup = new THREE.Group();

    // 1. Pedestal Base (Hexagonal Obsidian)
    const baseGeo = new THREE.CylinderGeometry(1.0, 1.15, 0.5, 6);
    const baseMesh = new THREE.Mesh(baseGeo, obsidianBaseMat);
    baseMesh.position.y = -0.8;
    trophyGroup.add(baseMesh);

    // 2. Base Gold Tier
    const baseTierGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.18, 24);
    const baseTierMesh = new THREE.Mesh(baseTierGeo, goldMat);
    baseTierMesh.position.y = -0.46;
    trophyGroup.add(baseTierMesh);

    // 3. Stem (Slender hour-glass shape)
    const stemGeo = new THREE.CylinderGeometry(0.24, 0.38, 0.9, 24);
    const stemMesh = new THREE.Mesh(stemGeo, goldMat);
    stemMesh.position.y = 0.05;
    trophyGroup.add(stemMesh);

    // Stem ring
    const stemRingGeo = new THREE.TorusGeometry(0.35, 0.06, 16, 32);
    stemRingGeo.rotateX(Math.PI / 2);
    const stemRingMesh = new THREE.Mesh(stemRingGeo, platinumMat);
    stemRingMesh.position.y = 0.05;
    trophyGroup.add(stemRingMesh);

    // 4. Main Cup Bowl (Lathe or tapered cylinders)
    const cupLowerGeo = new THREE.CylinderGeometry(0.85, 0.3, 0.8, 24);
    const cupLowerMesh = new THREE.Mesh(cupLowerGeo, goldMat);
    cupLowerMesh.position.y = 0.85;
    trophyGroup.add(cupLowerMesh);

    const cupUpperGeo = new THREE.CylinderGeometry(1.05, 0.85, 0.7, 24, 1, true);
    const cupUpperMesh = new THREE.Mesh(cupUpperGeo, goldMat);
    cupUpperMesh.position.y = 1.55;
    trophyGroup.add(cupUpperMesh);

    const rimGeo = new THREE.TorusGeometry(1.05, 0.07, 16, 48);
    rimGeo.rotateX(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, platinumMat);
    rimMesh.position.y = 1.9;
    trophyGroup.add(rimMesh);

    // 5. Handles (Dual elegant curves)
    const handleGeo = new THREE.TorusGeometry(0.65, 0.07, 16, 32, Math.PI);
    // Left handle
    const leftHandle = new THREE.Mesh(handleGeo, goldMat);
    leftHandle.rotation.z = Math.PI / 2;
    leftHandle.position.set(-1.08, 1.35, 0);
    trophyGroup.add(leftHandle);

    // Right handle
    const rightHandle = new THREE.Mesh(handleGeo, goldMat);
    rightHandle.rotation.z = -Math.PI / 2;
    rightHandle.position.set(1.08, 1.35, 0);
    trophyGroup.add(rightHandle);

    // 6. Floating Champion Crown Star
    const starGeo = new THREE.OctahedronGeometry(0.28, 0);
    const starMesh = new THREE.Mesh(starGeo, platinumMat);
    starMesh.position.y = 2.45;
    trophyGroup.add(starMesh);

    scene.add(trophyGroup);

    // Lights
    const keyLight = new THREE.DirectionalLight(0xfff4d6, 4);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3ec9e6, 2.5); // Cyan touch
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    const purpleLight = new THREE.PointLight(0xa78bfa, 3, 10); // Purple touch
    purpleLight.position.set(4, -1, 3);
    scene.add(purpleLight);

    const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.9);
    scene.add(ambientLight);

    // Interactivity: Drag to spin
    let isDragging = false;
    let prevMouseX = 0;
    let rotationVelocity = 0.008;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      prevMouseX = clientX;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - prevMouseX;
      trophyGroup.rotation.y += deltaX * 0.015;
      rotationVelocity = deltaX * 0.005;
      prevMouseX = clientX;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.style.cursor = 'grab';
    dom.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // Resize
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

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // Loop
    let clock = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible || document.hidden) return;

      clock += 0.02;

      if (!isDragging) {
        trophyGroup.rotation.y += rotationVelocity;
        rotationVelocity *= 0.96;
        if (Math.abs(rotationVelocity) < 0.006) {
          rotationVelocity = 0.006;
        }
      }

      // Star gentle float & spin
      starMesh.rotation.y = clock * 1.5;
      starMesh.position.y = 2.45 + Math.sin(clock * 2) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      dom.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      dom.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      baseGeo.dispose();
      baseTierGeo.dispose();
      stemGeo.dispose();
      stemRingGeo.dispose();
      cupLowerGeo.dispose();
      cupUpperGeo.dispose();
      rimGeo.dispose();
      handleGeo.dispose();
      starGeo.dispose();
      goldMat.dispose();
      platinumMat.dispose();
      obsidianBaseMat.dispose();
    };
  }, []);

  if (!hasWebGL) {
    return (
      <div className={`relative flex flex-col items-center justify-center p-8 ${className}`}>
        <div
          onClick={handleBurst}
          className="cursor-pointer group relative p-6 rounded-2xl bg-gradient-to-b from-[#ffd700]/20 to-transparent border border-[#fbbf24]/40 shadow-[0_0_30px_rgba(251,191,36,0.2)] hover:scale-105 transition-transform"
        >
          <div className="text-6xl text-center select-none filter drop-shadow-[0_4px_12px_rgba(251,191,36,0.6)]">
            🏆
          </div>
          <div className="mt-3 text-xs font-bold text-center text-[#fbbf24] uppercase tracking-wider">
            Sentuh untuk Rayakan
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* 3D Canvas Mount */}
      <div
        ref={mountRef}
        onClick={handleBurst}
        className="w-full h-[320px] sm:h-[360px] flex items-center justify-center cursor-grab active:cursor-grabbing"
        title="Klik atau putar Trofi Juara RS S1"
      />

      {/* Interactive Trigger Button */}
      <button
        type="button"
        onClick={handleBurst}
        className="mt-1 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-[var(--gold)] bg-[var(--gold)]/10 border border-[var(--gold)]/30 hover:bg-[var(--gold)]/20 hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(251,191,36,0.2)]"
      >
        <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
        <span>{celebrated ? 'Selebrasi Juara!' : 'Putar & Rayakan Piala'}</span>
      </button>
    </div>
  );
}
