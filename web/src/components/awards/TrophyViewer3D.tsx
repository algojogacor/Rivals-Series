'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { burstTrophyConfetti } from '@/components/fx/ConfettiBurst';
import { Sparkles, RotateCcw } from 'lucide-react';

export type TrophyType =
  | 'champion'
  | 'boot'
  | 'glove'
  | 'playmaker'
  | 'gots'
  | 'best_defence'
  | 'streak'
  | 'clean_sheet';

interface TrophyViewer3DProps {
  type: TrophyType;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  isCompleted?: boolean;
  isTied?: boolean;
  onCelebrate?: () => void;
  showCelebrateButton?: boolean;
  className?: string;
}

// Cached shared studio environment cubemap/texture
let cachedEnvMap: THREE.Texture | null = null;

function getOrCreateStudioEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  if (cachedEnvMap) return cachedEnvMap;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x06080c);

  // Overhead warm softbox
  const topLight = new THREE.DirectionalLight(0xfff7ed, 4.0);
  topLight.position.set(0, 10, 2);
  envScene.add(topLight);

  // Key light panel
  const keyPanel = new THREE.DirectionalLight(0xffecc7, 3.5);
  keyPanel.position.set(5, 5, 5);
  envScene.add(keyPanel);

  // Cool rim panel
  const rimPanel = new THREE.DirectionalLight(0x93c5fd, 2.5);
  rimPanel.position.set(-6, 3, -5);
  envScene.add(rimPanel);

  // Subtle floor fill
  const floorLight = new THREE.DirectionalLight(0x1e293b, 1.2);
  floorLight.position.set(0, -6, 0);
  envScene.add(floorLight);

  const envTarget = pmremGenerator.fromScene(envScene, 0.04);
  cachedEnvMap = envTarget.texture;
  pmremGenerator.dispose();

  return cachedEnvMap;
}

// Procedural Contact Shadow Texture Generator
function createShadowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.45)');
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function TrophyViewer3D({
  type,
  size = 'md',
  isCompleted = false,
  isTied = false,
  onCelebrate,
  showCelebrateButton = false,
  className = '',
}: TrophyViewer3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [celebrated, setCelebrated] = useState<boolean>(false);
  const resetRotationRef = useRef<() => void>(() => {});

  const handleCelebrate = (e?: React.MouseEvent) => {
    let clientX = 0.5;
    let clientY = 0.5;
    if (e) {
      clientX = e.clientX / window.innerWidth;
      clientY = e.clientY / window.innerHeight;
    }
    burstTrophyConfetti(clientX, clientY);
    setCelebrated(true);
    setTimeout(() => setCelebrated(false), 2400);
    if (onCelebrate) onCelebrate();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // WebGL check
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        setLoading(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      setLoading(false);
      return;
    }

    let isVisible = true;
    let animationFrameId: number;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 280;

    // Scene & Camera
    const scene = new THREE.Scene();

    // Adjust camera FOV and position by trophy size
    const isHero = size === 'hero';
    const cameraFov = isHero ? 42 : 38;
    const cameraDistance = isHero ? 5.6 : 5.8;
    const cameraY = isHero ? 1.15 : 0.95;

    const camera = new THREE.PerspectiveCamera(cameraFov, width / height, 0.1, 100);
    camera.position.set(0, cameraY, cameraDistance);
    camera.lookAt(0, isHero ? 0.65 : 0.5, 0);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = isCompleted ? 1.4 : 1.1;
      container.appendChild(renderer.domElement);
    } catch {
      setHasWebGL(false);
      setLoading(false);
      return;
    }

    // Studio Environment
    const envTexture = getOrCreateStudioEnv(renderer);
    scene.environment = envTexture;

    // Unified Luxury Materials Library
    // 1. Sterling Silver / Rhodium (for Champion cup inspired by AFC Asian Cup)
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      metalness: 0.98,
      roughness: 0.12,
    });

    // 2. 24K Polished Gold (for Boot, Glove, Playmaker, and Champion Accents)
    const goldMat = new THREE.MeshStandardMaterial({
      color: isCompleted ? 0xf5b027 : 0xd4a024,
      emissive: isCompleted ? 0x221503 : 0x0f0b02,
      metalness: 0.95,
      roughness: 0.16,
    });

    // 3. Satin Brushed Gold (for secondary details and badges)
    const satinGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.88,
      roughness: 0.32,
    });

    // 4. Heavy Obsidian / Black Granite (for pedestal base)
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f12,
      metalness: 0.25,
      roughness: 0.38,
    });

    // 5. Titanium Dark Armor (for Best Defence shield body)
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.26,
    });

    // 6. Refractive Core Material (for Astrolabe, Citadel and GotS)
    const crystalMat = new THREE.MeshStandardMaterial({
      color: type === 'clean_sheet' ? 0x0284c7 : type === 'playmaker' ? 0x10b981 : 0xfbbf24,
      emissive: type === 'clean_sheet' ? 0x0369a1 : type === 'playmaker' ? 0x047857 : 0xb45309,
      metalness: 0.1,
      roughness: 0.15,
      transparent: true,
      opacity: 0.85,
    });

    // Master Trophy Model Group
    const trophyRoot = new THREE.Group();
    scene.add(trophyRoot);

    // Contact Ground Shadow
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createShadowTexture(),
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.92;
    scene.add(shadowMesh);

    // Dynamic rotation nodes for specific animated sub-parts
    const animatedNodes: { update: (clock: number) => void }[] = [];

    // PROCEDURAL MODEL GENERATOR
    function buildProceduralTrophy() {
      // Pedestal Base (Common luxury foundation for all trophies)
      const baseGroup = new THREE.Group();

      // Tier 1: Heavy Obsidian Base
      const baseGeo = new THREE.CylinderGeometry(0.95, 1.15, 0.45, 8);
      const baseMesh = new THREE.Mesh(baseGeo, obsidianMat);
      baseMesh.position.y = -0.68;
      baseGroup.add(baseMesh);

      // Tier 2: Metal Inset Trim Ring
      const trimGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.12, 32);
      const trimMesh = new THREE.Mesh(trimGeo, type === 'champion' ? silverMat : goldMat);
      trimMesh.position.y = -0.42;
      baseGroup.add(trimMesh);

      trophyRoot.add(baseGroup);

      // Specific Sculpted Trophies
      switch (type) {
        case 'champion': {
          // AFC ASIAN CUP INSPIRED SCULPTED STERLING SILVER TROPHY
          // 1. Tiered Silver Collar Stem
          const stemCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 0.35, 32), silverMat);
          stemCollar.position.y = -0.2;
          trophyRoot.add(stemCollar);

          const stemRing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 16, 32), satinGoldMat);
          stemRing.rotation.x = Math.PI / 2;
          stemRing.position.y = -0.05;
          trophyRoot.add(stemRing);

          // 2. Central Fluted Chalice Core (curving upward)
          const chaliceGeo = new THREE.CylinderGeometry(1.0, 0.35, 1.45, 32, 1, true);
          const chaliceMesh = new THREE.Mesh(chaliceGeo, silverMat);
          chaliceMesh.position.y = 0.75;
          trophyRoot.add(chaliceMesh);

          // Top Chalice Rim Ring
          const rimGeo = new THREE.TorusGeometry(1.0, 0.06, 16, 48);
          rimGeo.rotateX(Math.PI / 2);
          const rimMesh = new THREE.Mesh(rimGeo, silverMat);
          rimMesh.position.y = 1.48;
          trophyRoot.add(rimMesh);

          // 3. Iconic Sculpted Lotus Petals (6 fluted petal blades radiating around the chalice)
          const petalCount = 6;
          for (let i = 0; i < petalCount; i++) {
            const angle = (i * Math.PI * 2) / petalCount;
            const petalGroup = new THREE.Group();
            petalGroup.rotation.y = angle;

            // Curved outer petal blade
            const petalBladeGeo = new THREE.CylinderGeometry(0.12, 0.04, 1.4, 8);
            const petalBlade = new THREE.Mesh(petalBladeGeo, silverMat);
            petalBlade.position.set(0.68, 0.8, 0);
            petalBlade.rotation.z = -0.22;
            petalGroup.add(petalBlade);

            // Flared regal petal tip peaking above the rim
            const tipGeo = new THREE.ConeGeometry(0.15, 0.45, 6);
            const tipMesh = new THREE.Mesh(tipGeo, silverMat);
            tipMesh.position.set(0.92, 1.55, 0);
            tipMesh.rotation.z = -0.28;
            petalGroup.add(tipMesh);

            trophyRoot.add(petalGroup);
          }

          // 4. Two Sleek Aerodynamic Geometric Handles
          const handleCurve = new THREE.TorusGeometry(0.72, 0.065, 16, 32, Math.PI * 0.95);
          // Left handle
          const leftHandle = new THREE.Mesh(handleCurve, silverMat);
          leftHandle.rotation.z = Math.PI * 0.45;
          leftHandle.position.set(-1.18, 0.95, 0);
          trophyRoot.add(leftHandle);

          // Right handle
          const rightHandle = new THREE.Mesh(handleCurve, silverMat);
          rightHandle.rotation.z = -Math.PI * 0.45;
          rightHandle.position.set(1.18, 0.95, 0);
          trophyRoot.add(rightHandle);

          // 5. Crown Star hovering above the chalice
          const starGeo = new THREE.OctahedronGeometry(0.24, 0);
          const starMesh = new THREE.Mesh(starGeo, satinGoldMat);
          starMesh.position.y = 1.95;
          trophyRoot.add(starMesh);

          animatedNodes.push({
            update: (clock) => {
              starMesh.rotation.y = clock * 1.5;
              starMesh.position.y = 1.95 + Math.sin(clock * 2) * 0.06;
            },
          });
          break;
        }

        case 'boot': {
          // GOLDEN BOOT (Solid 24k Gold Cleat on Plinth)
          const bootGroup = new THREE.Group();
          bootGroup.position.set(0, 0.25, 0);
          bootGroup.rotation.y = 0.25;

          // Main Boot Sole Plate
          const soleGeo = new THREE.BoxGeometry(2.1, 0.12, 0.82);
          const soleMesh = new THREE.Mesh(soleGeo, goldMat);
          soleMesh.position.set(0, -0.3, 0);
          bootGroup.add(soleMesh);

          // 6 Conical Cleat Studs
          const studPositions = [
            [-0.7, -0.42, 0.25],
            [-0.7, -0.42, -0.25],
            [-0.1, -0.42, 0.25],
            [-0.1, -0.42, -0.25],
            [0.6, -0.42, 0.22],
            [0.6, -0.42, -0.22],
          ];
          studPositions.forEach(([x, y, z]) => {
            const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.16, 12), satinGoldMat);
            stud.position.set(x, y, z);
            bootGroup.add(stud);
          });

          // Aerodynamic Upper (Forefoot / Toe Box)
          const forefootGeo = new THREE.ConeGeometry(0.48, 1.0, 16);
          const forefootMesh = new THREE.Mesh(forefootGeo, goldMat);
          forefootMesh.rotation.z = Math.PI / 2;
          forefootMesh.position.set(0.45, -0.15, 0);
          forefootMesh.scale.set(0.9, 1.2, 0.75);
          bootGroup.add(forefootMesh);

          // Midfoot & Heel Section
          const heelGeo = new THREE.CylinderGeometry(0.45, 0.42, 0.9, 16);
          const heelMesh = new THREE.Mesh(heelGeo, goldMat);
          heelMesh.rotation.z = 0.18;
          heelMesh.position.set(-0.45, 0.05, 0);
          heelMesh.scale.set(1.0, 1.0, 0.72);
          bootGroup.add(heelMesh);

          // Padded Ankle Collar & Tongue
          const collarGeo = new THREE.TorusGeometry(0.34, 0.08, 12, 24);
          collarGeo.rotateX(Math.PI / 2);
          const collarMesh = new THREE.Mesh(collarGeo, satinGoldMat);
          collarMesh.position.set(-0.35, 0.48, 0);
          bootGroup.add(collarMesh);

          // Dynamic Speed Stripe Accent
          const stripeGeo = new THREE.TorusGeometry(0.65, 0.035, 12, 24, Math.PI * 0.4);
          const stripeMesh = new THREE.Mesh(stripeGeo, silverMat);
          stripeMesh.rotation.z = 0.4;
          stripeMesh.position.set(-0.1, 0.02, 0.38);
          bootGroup.add(stripeMesh);

          trophyRoot.add(bootGroup);
          break;
        }

        case 'glove': {
          // GOLDEN GLOVE (Sculpted Open-Hand Goalkeeper Glove)
          const gloveGroup = new THREE.Group();
          gloveGroup.position.set(0, 0.35, 0);

          // Wide Wrist Collar Band
          const wristGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.45, 24);
          const wristMesh = new THREE.Mesh(wristGeo, satinGoldMat);
          wristMesh.position.y = -0.32;
          wristMesh.scale.set(1.15, 1.0, 0.75);
          gloveGroup.add(wristMesh);

          // Wrist Strap Fastener
          const strapGeo = new THREE.BoxGeometry(0.9, 0.15, 0.65);
          const strapMesh = new THREE.Mesh(strapGeo, goldMat);
          strapMesh.position.set(0, -0.32, 0.1);
          gloveGroup.add(strapMesh);

          // Palm Main Body (Curved Catching Cup)
          const palmGeo = new THREE.BoxGeometry(0.85, 0.75, 0.32);
          const palmMesh = new THREE.Mesh(palmGeo, goldMat);
          palmMesh.position.set(0, 0.22, 0);
          gloveGroup.add(palmMesh);

          // 4 Articulated Fingers (Index, Middle, Ring, Pinky)
          const fingerConfigs = [
            { x: -0.28, len: 0.65, rotZ: 0.08 },
            { x: -0.09, len: 0.76, rotZ: 0.02 },
            { x: 0.1, len: 0.72, rotZ: -0.03 },
            { x: 0.28, len: 0.58, rotZ: -0.08 },
          ];
          fingerConfigs.forEach((cfg) => {
            const fingerGeo = new THREE.CylinderGeometry(0.08, 0.095, cfg.len, 12);
            const fingerMesh = new THREE.Mesh(fingerGeo, goldMat);
            fingerMesh.position.set(cfg.x, 0.6 + cfg.len / 2, 0.02);
            fingerMesh.rotation.z = cfg.rotZ;
            gloveGroup.add(fingerMesh);

            // Knuckle segment caps
            const tipGeo = new THREE.SphereGeometry(0.082, 12, 12);
            const tipMesh = new THREE.Mesh(tipGeo, satinGoldMat);
            tipMesh.position.set(cfg.x, 0.6 + cfg.len, 0.02);
            gloveGroup.add(tipMesh);
          });

          // Angled Thumb
          const thumbGeo = new THREE.CylinderGeometry(0.085, 0.1, 0.55, 12);
          const thumbMesh = new THREE.Mesh(thumbGeo, goldMat);
          thumbMesh.position.set(-0.46, 0.32, 0.08);
          thumbMesh.rotation.z = 0.55;
          thumbMesh.rotation.x = -0.25;
          gloveGroup.add(thumbMesh);

          trophyRoot.add(gloveGroup);
          break;
        }

        case 'playmaker': {
          // PLAYMAKER: THE MAESTRO'S CELESTIAL ASTROLABE / VISION SPHERE
          const astrolabeGroup = new THREE.Group();
          astrolabeGroup.position.set(0, 0.45, 0);

          // Vertical Gyroscope Frame Ring
          const outerRingGeo = new THREE.TorusGeometry(0.92, 0.065, 16, 48);
          const outerRingMesh = new THREE.Mesh(outerRingGeo, goldMat);
          astrolabeGroup.add(outerRingMesh);

          // Equatorial Rotating Ring
          const eqRingGeo = new THREE.TorusGeometry(0.78, 0.05, 16, 48);
          eqRingGeo.rotateX(Math.PI / 2);
          const eqRingMesh = new THREE.Mesh(eqRingGeo, satinGoldMat);
          astrolabeGroup.add(eqRingMesh);

          // Tilted Meridian Ring
          const meridianRingGeo = new THREE.TorusGeometry(0.65, 0.045, 16, 48);
          const meridianRingMesh = new THREE.Mesh(meridianRingGeo, silverMat);
          meridianRingMesh.rotation.x = Math.PI / 4;
          astrolabeGroup.add(meridianRingMesh);

          // Center Vision Crystal Orb (Emerald/Gold facet)
          const coreGeo = new THREE.DodecahedronGeometry(0.35, 0);
          const coreMesh = new THREE.Mesh(coreGeo, crystalMat);
          astrolabeGroup.add(coreMesh);

          // Polar Axis Spindle Needle
          const needleGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.0, 12);
          const needleMesh = new THREE.Mesh(needleGeo, goldMat);
          astrolabeGroup.add(needleMesh);

          animatedNodes.push({
            update: (clock) => {
              eqRingMesh.rotation.z = clock * 0.8;
              meridianRingMesh.rotation.y = -clock * 0.9;
              coreMesh.rotation.y = clock * 1.2;
              coreMesh.rotation.x = clock * 0.6;
            },
          });

          trophyRoot.add(astrolabeGroup);
          break;
        }

        case 'gots': {
          // GOAL OF THE SEASON: THE ARC OF GLORY (BALL FROZEN ON SUPERSONIC TRAJECTORY VORTEX)
          const gotsGroup = new THREE.Group();
          gotsGroup.position.set(0, 0.1, 0);

          // Parabolic Trajectory Ribbon Trail (rising from base into sky)
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.6, -0.4, -0.4),
            new THREE.Vector3(-0.2, 0.1, -0.1),
            new THREE.Vector3(0.3, 0.6, 0.1),
            new THREE.Vector3(0.0, 1.15, 0.0),
          ]);
          const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.065, 12, false);
          const tubeMesh = new THREE.Mesh(tubeGeo, goldMat);
          gotsGroup.add(tubeMesh);

          // Secondary energy vortex ribbon
          const curve2 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.5, -0.4, 0.3),
            new THREE.Vector3(0.4, 0.2, 0.0),
            new THREE.Vector3(-0.2, 0.7, -0.1),
            new THREE.Vector3(0.0, 1.15, 0.0),
          ]);
          const tubeGeo2 = new THREE.TubeGeometry(curve2, 32, 0.045, 12, false);
          const tubeMesh2 = new THREE.Mesh(tubeGeo2, satinGoldMat);
          gotsGroup.add(tubeMesh2);

          // Faceted Wonder-Strike Football suspended at apex
          const ballGeo = new THREE.IcosahedronGeometry(0.42, 1);
          const ballMesh = new THREE.Mesh(ballGeo, goldMat);
          ballMesh.position.set(0.0, 1.25, 0.0);
          gotsGroup.add(ballMesh);

          // Surrounding kinetic sparkle ring
          const ringGeo = new THREE.TorusGeometry(0.58, 0.025, 12, 32);
          ringGeo.rotateX(Math.PI / 3);
          const ringMesh = new THREE.Mesh(ringGeo, silverMat);
          ringMesh.position.set(0.0, 1.25, 0.0);
          gotsGroup.add(ringMesh);

          animatedNodes.push({
            update: (clock) => {
              ballMesh.rotation.y = clock * 1.5;
              ringMesh.rotation.z = clock * 2.0;
            },
          });

          trophyRoot.add(gotsGroup);
          break;
        }

        case 'best_defence': {
          // BEST DEFENCE: THE AEGIS OF IRON & GOLD (FACETED FORTRESS SHIELD)
          const shieldGroup = new THREE.Group();
          shieldGroup.position.set(0, 0.45, 0);

          // Heavy Titanium Faceted Shield Plate
          const shieldShape = new THREE.Shape();
          shieldShape.moveTo(-0.7, 0.8);
          shieldShape.lineTo(0.7, 0.8);
          shieldShape.lineTo(0.7, 0.0);
          shieldShape.lineTo(0.0, -0.9);
          shieldShape.lineTo(-0.7, 0.0);
          shieldShape.closePath();

          const extrudeSettings = { depth: 0.15, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.06, bevelThickness: 0.06 };
          const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
          shieldGeo.center();
          const shieldMesh = new THREE.Mesh(shieldGeo, titaniumMat);
          shieldGroup.add(shieldMesh);

          // 24K Gold Beveled Border Frame
          const frameGeo = new THREE.TorusGeometry(0.75, 0.06, 12, 32);
          const frameMesh = new THREE.Mesh(frameGeo, goldMat);
          frameMesh.position.z = 0.08;
          shieldGroup.add(frameMesh);

          // Raised Central Lion / Fortress Boss Emblem
          const bossGeo = new THREE.OctahedronGeometry(0.26, 0);
          const bossMesh = new THREE.Mesh(bossGeo, goldMat);
          bossMesh.position.set(0, 0.05, 0.18);
          shieldGroup.add(bossMesh);

          // Twin Defensive Guard Blades flanking the shield
          const bladeGeo = new THREE.CylinderGeometry(0.03, 0.05, 1.8, 8);
          const bladeLeft = new THREE.Mesh(bladeGeo, silverMat);
          bladeLeft.position.set(-0.78, 0, -0.05);
          bladeLeft.rotation.z = -0.08;
          shieldGroup.add(bladeLeft);

          const bladeRight = new THREE.Mesh(bladeGeo, silverMat);
          bladeRight.position.set(0.78, 0, -0.05);
          bladeRight.rotation.z = 0.08;
          shieldGroup.add(bladeRight);

          trophyRoot.add(shieldGroup);
          break;
        }

        case 'streak': {
          // LONGEST WINNING STREAK: THE ASCENDING MOMENTUM SPIRE
          const streakGroup = new THREE.Group();
          streakGroup.position.set(0, 0.1, 0);

          // 5 Escalating Staircase / Monolith Pillars in a golden helix
          const stepCount = 5;
          for (let i = 0; i < stepCount; i++) {
            const h = 0.45 + i * 0.32;
            const angle = (i * Math.PI) / 3 - Math.PI / 3;
            const radius = 0.45;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const pillarGeo = new THREE.BoxGeometry(0.24, h, 0.24);
            const pillarMesh = new THREE.Mesh(pillarGeo, i === stepCount - 1 ? goldMat : satinGoldMat);
            pillarMesh.position.set(x, -0.35 + h / 2, z);
            pillarMesh.rotation.y = angle;
            streakGroup.add(pillarMesh);

            // Platinum crown edge
            const capGeo = new THREE.ConeGeometry(0.16, 0.22, 4);
            const capMesh = new THREE.Mesh(capGeo, silverMat);
            capMesh.position.set(x, -0.35 + h + 0.1, z);
            streakGroup.add(capMesh);
          }

          // Apex Victor Star hovering above the highest pillar
          const apexStarGeo = new THREE.OctahedronGeometry(0.28, 0);
          const apexStarMesh = new THREE.Mesh(apexStarGeo, goldMat);
          apexStarMesh.position.set(0.2, 1.85, 0.2);
          streakGroup.add(apexStarMesh);

          animatedNodes.push({
            update: (clock) => {
              apexStarMesh.rotation.y = clock * 1.8;
              apexStarMesh.position.y = 1.85 + Math.sin(clock * 2.5) * 0.05;
            },
          });

          trophyRoot.add(streakGroup);
          break;
        }

        case 'clean_sheet': {
          // MOST CLEAN SHEETS: THE IMPENETRABLE CITADEL GATE
          const citadelGroup = new THREE.Group();
          citadelGroup.position.set(0, 0.3, 0);

          // Twin Bastion Watchtowers
          const towerGeo = new THREE.CylinderGeometry(0.28, 0.34, 1.3, 16);
          const leftTower = new THREE.Mesh(towerGeo, obsidianMat);
          leftTower.position.set(-0.65, 0.15, 0);
          citadelGroup.add(leftTower);

          const rightTower = new THREE.Mesh(towerGeo, obsidianMat);
          rightTower.position.set(0.65, 0.15, 0);
          citadelGroup.add(rightTower);

          // Tower Battlements (Gold Crown Rims)
          const battleGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 8);
          const leftBattle = new THREE.Mesh(battleGeo, goldMat);
          leftBattle.position.set(-0.65, 0.85, 0);
          citadelGroup.add(leftBattle);

          const rightBattle = new THREE.Mesh(battleGeo, goldMat);
          rightBattle.position.set(0.65, 0.85, 0);
          citadelGroup.add(rightBattle);

          // Arched Gate Portal
          const gateArchGeo = new THREE.TorusGeometry(0.48, 0.08, 12, 24, Math.PI);
          const gateArch = new THREE.Mesh(gateArchGeo, goldMat);
          gateArch.position.set(0, 0.45, 0);
          citadelGroup.add(gateArch);

          // Portcullis Lattice Grid
          const latticeGeo = new THREE.BoxGeometry(0.68, 0.8, 0.06);
          const latticeMesh = new THREE.Mesh(latticeGeo, satinGoldMat);
          latticeMesh.position.set(0, 0.05, 0);
          citadelGroup.add(latticeMesh);

          // Impregnable Sapphire Vault Core locked at the center
          const coreGeo = new THREE.OctahedronGeometry(0.24, 0);
          const coreMesh = new THREE.Mesh(coreGeo, crystalMat);
          coreMesh.position.set(0, 0.15, 0.08);
          citadelGroup.add(coreMesh);

          animatedNodes.push({
            update: (clock) => {
              coreMesh.rotation.y = clock * 1.2;
            },
          });

          trophyRoot.add(citadelGroup);
          break;
        }
      }
    }

    // Attempt to load external GLB model if present in /models/trophies/${type}.glb
    const modelPath = `/models/trophies/${type}.glb`;
    const loader = new GLTFLoader();

    let isUsingExternalGLB = false;

    loader.load(
      modelPath,
      (gltf) => {
        isUsingExternalGLB = true;
        const loadedModel = gltf.scene;

        // Auto-center and fit to bounding box
        const bbox = new THREE.Box3().setFromObject(loadedModel);
        const center = bbox.getCenter(new THREE.Vector3());
        const sizeBox = bbox.getSize(new THREE.Vector3());

        const maxDim = Math.max(sizeBox.x, sizeBox.y, sizeBox.z);
        const targetScale = isHero ? 2.5 / maxDim : 2.2 / maxDim;

        loadedModel.scale.multiplyScalar(targetScale);
        loadedModel.position.sub(center.multiplyScalar(targetScale));
        loadedModel.position.y += isHero ? 0.35 : 0.2;

        // Apply PBR environment to all loaded meshes
        loadedModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.envMap = envTexture;
              child.material.needsUpdate = true;
            }
          }
        });

        trophyRoot.clear();
        trophyRoot.add(loadedModel);
        setLoading(false);
      },
      undefined,
      () => {
        // Fallback gracefully to meticulous procedural model
        if (!isUsingExternalGLB) {
          buildProceduralTrophy();
          setLoading(false);
        }
      }
    );

    // Studio Lights Rig
    const keyLight = new THREE.DirectionalLight(isCompleted ? 0xfff4d6 : 0xd1d5db, isCompleted ? 3.8 : 2.2);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.8);
    fillLight.position.set(-4, 3, 3);
    scene.add(fillLight);

    // Dual Team Rim Lighting for Co-Winners (Tie condition)
    if (isTied) {
      // Coral Team A accent light on left
      const teamALight = new THREE.PointLight(0xf43f5e, 4.5, 8);
      teamALight.position.set(-4, 1.2, 1);
      scene.add(teamALight);

      // Cyan Team B accent light on right
      const teamBLight = new THREE.PointLight(0x06b6d4, 4.5, 8);
      teamBLight.position.set(4, 1.2, 1);
      scene.add(teamBLight);
    } else {
      // Standard majestic gold / cyan rim
      const rimLight = new THREE.DirectionalLight(0x3ec9e6, isCompleted ? 2.2 : 1.2);
      rimLight.position.set(-5, 4, -4);
      scene.add(rimLight);

      const goldBackLight = new THREE.PointLight(0xf59e0b, isCompleted ? 3.0 : 1.0, 8);
      goldBackLight.position.set(3, -1, 3);
      scene.add(goldBackLight);
    }

    const ambientLight = new THREE.AmbientLight(0xfff7ed, isCompleted ? 0.9 : 0.6);
    scene.add(ambientLight);

    // INTERACTION: Smooth Drag to Spin with Inertia & Touch
    let isDragging = false;
    let prevMouseX = 0;
    let rotationVelocity = 0.006;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      prevMouseX = clientX;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - prevMouseX;
      trophyRoot.rotation.y += deltaX * 0.015;
      rotationVelocity = deltaX * 0.005;
      prevMouseX = clientX;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const resetRotation = () => {
      trophyRoot.rotation.y = 0;
      rotationVelocity = 0.006;
    };
    resetRotationRef.current = resetRotation;

    const dom = renderer.domElement;
    dom.style.cursor = 'grab';
    dom.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

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

    // Intersection Observer for GPU Efficiency
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // Render Animation Loop
    let clock = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible || document.hidden) return;

      clock += 0.02;

      // Auto rotation with inertia
      if (!isDragging) {
        trophyRoot.rotation.y += rotationVelocity;
        rotationVelocity *= 0.96;
        if (Math.abs(rotationVelocity) < 0.005) {
          rotationVelocity = 0.005;
        }
      }

      // Update specific animated nodes (stars, rings, crystals)
      animatedNodes.forEach((node) => node.update(clock));

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      dom.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [type, size, isCompleted, isTied]);

  if (!hasWebGL) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center select-none ${className}`}>
        <span className="text-4xl mb-2">🏆</span>
        <span className="text-xs text-[var(--text-faint)] font-mono">WebGL tidak aktif</span>
      </div>
    );
  }

  const heightClasses = {
    sm: 'h-[160px]',
    md: 'h-[220px]',
    lg: 'h-[280px]',
    hero: 'h-[300px] sm:h-[360px]',
  }[size];

  return (
    <div className={`relative w-full ${heightClasses} select-none group ${className}`}>
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full relative z-10" />

      {/* Elegant Loading State */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[var(--ink-0)]/60 backdrop-blur-xs transition-opacity">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--gold)]/20 border-t-[var(--gold)] animate-spin" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--gold)] animate-pulse">
            Memuat Objek 3D...
          </span>
        </div>
      )}

      {/* Floating Interaction Controls (Rotate reset hint) */}
      <div className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
        <button
          onClick={() => resetRotationRef.current()}
          className="p-1.5 rounded-[6px] bg-[var(--ink-0)]/80 hover:bg-[var(--ink-2)] text-[var(--text-dim)] hover:text-white border border-[var(--line)] text-[10px] transition-colors"
          title="Reset Sudut Pandang"
          aria-label="Reset rotasi"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grand Celebration Button (For Champion Trophy) */}
      {showCelebrateButton && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleCelebrate}
            disabled={celebrated}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-[10px] font-[family-name:var(--font-display)] font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(251,191,36,0.25)] ${
              celebrated
                ? 'bg-[var(--ok)] text-black scale-95'
                : 'bg-gradient-to-r from-[var(--gold)] via-[#fef08a] to-[var(--gold)] text-black hover:brightness-110 hover:scale-105 active:scale-95'
            }`}
          >
            <Sparkles className="w-4 h-4 fill-black" />
            <span>{celebrated ? 'Juara Terpilih!' : 'Selebrasi Juara!'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
