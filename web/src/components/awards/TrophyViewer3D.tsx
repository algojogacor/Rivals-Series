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
  // Soft ambient studio environment gradient instead of pitch black
  envScene.background = new THREE.Color(0x384252);

  // 1. Overhead softbox panel (pure brilliant white)
  const topPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  topPanel.position.set(0, 8, 0);
  topPanel.rotation.x = Math.PI / 2;
  envScene.add(topPanel);

  // 2. Key light softbox panel (front-right, warm radiant)
  const keyPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 14),
    new THREE.MeshBasicMaterial({ color: 0xfffaf0, side: THREE.DoubleSide })
  );
  keyPanel.position.set(6, 4, 7);
  keyPanel.lookAt(0, 0, 0);
  envScene.add(keyPanel);

  // 3. Rim / kicker softbox panel (left-rear, cool crisp white)
  const rimPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 14),
    new THREE.MeshBasicMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide })
  );
  rimPanel.position.set(-7, 3, -4);
  rimPanel.lookAt(0, 0, 0);
  envScene.add(rimPanel);

  // 4. Fill bounce panel (right-flank, champagne warmth)
  const fillPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 12),
    new THREE.MeshBasicMaterial({ color: 0xfef3c7, side: THREE.DoubleSide })
  );
  fillPanel.position.set(7, 2, -2);
  fillPanel.lookAt(0, 0, 0);
  envScene.add(fillPanel);

  // Directional lights for specular highlights
  const topLight = new THREE.DirectionalLight(0xffffff, 5.0);
  topLight.position.set(0, 10, 2);
  envScene.add(topLight);

  const keyLight = new THREE.DirectionalLight(0xfff7ed, 4.5);
  keyLight.position.set(6, 5, 6);
  envScene.add(keyLight);

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
  const celebrateSpinRef = useRef<() => void>(() => {});

  const handleCelebrate = (e?: React.MouseEvent) => {
    let clientX = 0.5;
    let clientY = 0.5;
    if (e) {
      clientX = e.clientX / window.innerWidth;
      clientY = e.clientY / window.innerHeight;
    }
    burstTrophyConfetti(clientX, clientY);
    setCelebrated(true);
    if (celebrateSpinRef.current) {
      celebrateSpinRef.current();
    }
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

    // 34 degrees vertical FOV delivers luxury gallery product perspective with minimal distortion
    const isHero = size === 'hero';
    const cameraFov = 34;

    const camera = new THREE.PerspectiveCamera(cameraFov, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 4.6);
    camera.lookAt(0, 0.4, 0);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      // Bright, luminous tone mapping exposure (never dim or lifeless in provisional mode)
      renderer.toneMappingExposure = isCompleted ? 1.75 : 1.6;
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
    // 1. Sterling Silver / White Rhodium (Radiant, gleaming mirror-finish silver)
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.94,
      roughness: 0.16,
    });

    // 2. 24K Polished Gold (Rich, luminous, vibrant royal gold)
    const goldMat = new THREE.MeshStandardMaterial({
      color: isCompleted ? 0xffc83b : 0xfbbf24,
      emissive: isCompleted ? 0x221503 : 0x180f02,
      metalness: 0.90,
      roughness: 0.18,
    });

    // 3. Satin Brushed Gold (Refined architectural accents)
    const satinGoldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.28,
    });

    // 4. Heavy Obsidian / Black Granite Base
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.35,
      roughness: 0.32,
    });

    // 5. Titanium Dark Armor (for fortress & defense structures)
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.88,
      roughness: 0.22,
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
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createShadowTexture(),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.75;
    scene.add(shadowMesh);

    // Dynamic rotation nodes for specific animated sub-parts
    const animatedNodes: { update: (clock: number) => void }[] = [];

    // General automated bounding box framing function
    // Guarantees generous margins and prevents clipping across all 360° rotation angles
    function fitCameraToTrophy(cam: THREE.PerspectiveCamera, rendererWidth: number, rendererHeight: number) {
      if (rendererWidth <= 0 || rendererHeight <= 0) return;

      const bbox = new THREE.Box3().setFromObject(trophyRoot);
      if (bbox.isEmpty()) return;

      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());

      // Maximum horizontal radius from central vertical Y rotation axis (0, y, 0)
      // Checks all 4 corners of the XZ bounding footprint to guarantee full 360° rotation clearance
      const maxRotRadius = Math.max(
        Math.sqrt(bbox.min.x * bbox.min.x + bbox.min.z * bbox.min.z),
        Math.sqrt(bbox.max.x * bbox.max.x + bbox.min.z * bbox.min.z),
        Math.sqrt(bbox.min.x * bbox.min.x + bbox.max.z * bbox.max.z),
        Math.sqrt(bbox.max.x * bbox.max.x + bbox.max.z * bbox.max.z),
        Math.sqrt((size.x / 2) ** 2 + (size.z / 2) ** 2)
      );
      const maxRotWidth = maxRotRadius * 2;
      const totalHeight = size.y;
      const centerY = center.y;

      const aspect = rendererWidth / rendererHeight;
      const fovRad = THREE.MathUtils.degToRad(cam.fov);

      // Generous margin multiplier (1.34 = ~15% safety padding above, below, and on the sides)
      const margin = 1.34;

      const distVertical = (totalHeight * margin) / (2 * Math.tan(fovRad / 2));
      const distHorizontal = (maxRotWidth * margin) / (2 * Math.tan(fovRad / 2) * aspect);
      const distance = Math.max(distVertical, distHorizontal);

      // Gentle studio downward angle (~7 degrees) for elegant three-quarter perspective
      const pitchAngle = THREE.MathUtils.degToRad(7);

      cam.position.set(
        0,
        centerY + distance * Math.sin(pitchAngle),
        distance * Math.cos(pitchAngle)
      );
      cam.lookAt(0, centerY, 0);
      cam.updateProjectionMatrix();
    }

    // Refined architectural pedestal plinth (only for GotS, Streak, and procedural fallbacks)
    function createPedestalBase(): THREE.Group {
      const baseGroup = new THREE.Group();

      // Tier 1: Sleek Architectural Heavy Obsidian Base
      const baseGeo = new THREE.CylinderGeometry(0.70, 0.82, 0.28, 8);
      const baseMesh = new THREE.Mesh(baseGeo, obsidianMat);
      baseMesh.position.y = -0.58;
      baseGroup.add(baseMesh);

      // Tier 2: Metal Inset Trim Ring
      const trimGeo = new THREE.CylinderGeometry(0.60, 0.68, 0.08, 32);
      const trimMesh = new THREE.Mesh(trimGeo, type === 'champion' ? silverMat : goldMat);
      trimMesh.position.y = -0.40;
      baseGroup.add(trimMesh);

      return baseGroup;
    }

    // PROCEDURAL MODEL GENERATOR
    function buildProceduralTrophy() {
      trophyRoot.clear();
      trophyRoot.add(createPedestalBase());

      // Specific Sculpted Trophies
      switch (type) {
        case 'champion': {
          // AFC ASIAN CUP SCULPTED STERLING SILVER TROPHY
          // 1. Tapered obsidian pedestal collar
          const stemCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 0.38, 32), obsidianMat);
          stemCollar.position.y = -0.22;
          trophyRoot.add(stemCollar);

          const stemTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.08, 32), silverMat);
          stemTrim.position.y = -0.04;
          trophyRoot.add(stemTrim);

          // 2. Tulip Chalice Body via LatheGeometry (authentic smooth curved silhouette)
          const lathePoints: THREE.Vector2[] = [];
          lathePoints.push(new THREE.Vector2(0.40, -0.35));
          lathePoints.push(new THREE.Vector2(0.36, -0.15));
          lathePoints.push(new THREE.Vector2(0.34, 0.02));
          lathePoints.push(new THREE.Vector2(0.38, 0.22));
          lathePoints.push(new THREE.Vector2(0.48, 0.48));
          lathePoints.push(new THREE.Vector2(0.60, 0.76));
          lathePoints.push(new THREE.Vector2(0.74, 1.05));
          lathePoints.push(new THREE.Vector2(0.88, 1.32));
          lathePoints.push(new THREE.Vector2(0.98, 1.52));
          // Inner wall
          lathePoints.push(new THREE.Vector2(0.92, 1.52));
          lathePoints.push(new THREE.Vector2(0.82, 1.32));
          lathePoints.push(new THREE.Vector2(0.68, 1.05));
          lathePoints.push(new THREE.Vector2(0.54, 0.76));
          lathePoints.push(new THREE.Vector2(0.42, 0.48));
          lathePoints.push(new THREE.Vector2(0.32, 0.22));
          lathePoints.push(new THREE.Vector2(0.26, 0.02));
          lathePoints.push(new THREE.Vector2(0.00, -0.05));
          const chaliceGeo = new THREE.LatheGeometry(lathePoints, 48);
          const chaliceMesh = new THREE.Mesh(chaliceGeo, silverMat);
          trophyRoot.add(chaliceMesh);

          // 3. Iconic 5 Sculpted Lotus Petals (Asian Cup Petal Fins)
          const petalCount = 5;
          for (let i = 0; i < petalCount; i++) {
            const angle = (i * Math.PI * 2) / petalCount;
            const petalGroup = new THREE.Group();
            petalGroup.rotation.y = angle;

            // Arched central ridge spine
            const spineCurve = new THREE.CatmullRomCurve3([
              new THREE.Vector3(0.38, 0.02, 0),
              new THREE.Vector3(0.52, 0.48, 0),
              new THREE.Vector3(0.70, 0.95, 0),
              new THREE.Vector3(0.90, 1.36, 0),
              new THREE.Vector3(1.04, 1.62, 0),
            ]);
            const spineGeo = new THREE.TubeGeometry(spineCurve, 20, 0.045, 8, false);
            const spineMesh = new THREE.Mesh(spineGeo, silverMat);
            petalGroup.add(spineMesh);

            // Flared crown peak tip extending above rim
            const peakGeo = new THREE.ConeGeometry(0.12, 0.35, 4);
            peakGeo.rotateY(Math.PI / 4);
            const peakMesh = new THREE.Mesh(peakGeo, silverMat);
            peakMesh.position.set(1.02, 1.66, 0);
            peakMesh.rotation.z = -0.22;
            petalGroup.add(peakMesh);

            // Horizontal relief ribs curving across petal body
            [-0.2, 0, 0.2].forEach((offsetAngle) => {
              const ribCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0.62, 0.75, 0),
                new THREE.Vector3(0.68, 0.82, offsetAngle * 0.45),
                new THREE.Vector3(0.78, 0.95, offsetAngle * 0.75),
              ]);
              const ribGeo = new THREE.TubeGeometry(ribCurve, 12, 0.022, 6, false);
              const ribMesh = new THREE.Mesh(ribGeo, silverMat);
              petalGroup.add(ribMesh);
            });

            trophyRoot.add(petalGroup);
          }

          // 4. Two Sleek Angular/Curved Asian Cup Handles
          [-1, 1].forEach((dir) => {
            const handleCurve = new THREE.CatmullRomCurve3([
              new THREE.Vector3(dir * 0.96, 1.45, 0), // Upper rim mount
              new THREE.Vector3(dir * 1.35, 1.38, 0), // Sharp elbow peak
              new THREE.Vector3(dir * 1.32, 1.05, 0), // Outer sweep
              new THREE.Vector3(dir * 0.95, 0.65, 0), // Inward taper
              new THREE.Vector3(dir * 0.48, 0.28, 0), // Lower waist mount
            ]);
            const handleGeo = new THREE.TubeGeometry(handleCurve, 28, 0.052, 10, false);
            const handleMesh = new THREE.Mesh(handleGeo, silverMat);
            trophyRoot.add(handleMesh);
          });
          break;
        }

        case 'boot': {
          // GOLDEN BOOT: Aerodynamic Polished 24K Gold Cleat
          const bootGroup = new THREE.Group();
          bootGroup.position.set(0, 0.22, 0);
          bootGroup.rotation.y = 0.25;

          // Sculpted Outsole Chassis
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

          // Aerodynamic Upper (Swept Forefoot / Toe Box)
          const forefootGeo = new THREE.ConeGeometry(0.48, 1.15, 20);
          const forefootMesh = new THREE.Mesh(forefootGeo, goldMat);
          forefootMesh.rotation.z = Math.PI / 2;
          forefootMesh.position.set(0.42, -0.12, 0);
          forefootMesh.scale.set(0.85, 1.25, 0.78);
          bootGroup.add(forefootMesh);

          // Contoured Heel & Instep Section
          const heelGeo = new THREE.CylinderGeometry(0.45, 0.42, 0.95, 20);
          const heelMesh = new THREE.Mesh(heelGeo, goldMat);
          heelMesh.rotation.z = 0.16;
          heelMesh.position.set(-0.45, 0.08, 0);
          heelMesh.scale.set(1.0, 1.0, 0.75);
          bootGroup.add(heelMesh);

          // Ankle Collar & Tongue Opening
          const collarGeo = new THREE.TorusGeometry(0.34, 0.08, 12, 24);
          collarGeo.rotateX(Math.PI / 2);
          const collarMesh = new THREE.Mesh(collarGeo, satinGoldMat);
          collarMesh.position.set(-0.35, 0.52, 0);
          bootGroup.add(collarMesh);

          // Dynamic Silver Speed Swishes
          const stripeGeo = new THREE.TorusGeometry(0.65, 0.035, 12, 24, Math.PI * 0.4);
          const stripeMesh = new THREE.Mesh(stripeGeo, silverMat);
          stripeMesh.rotation.z = 0.4;
          stripeMesh.position.set(-0.1, 0.02, 0.38);
          bootGroup.add(stripeMesh);

          trophyRoot.add(bootGroup);
          break;
        }

        case 'glove': {
          // GOLDEN GLOVE: Sculpted Open-Hand Goalkeeper Glove
          const gloveGroup = new THREE.Group();
          gloveGroup.position.set(0, 0.35, 0);

          // Ergonomic Wrist Collar
          const wristGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.45, 24);
          const wristMesh = new THREE.Mesh(wristGeo, satinGoldMat);
          wristMesh.position.y = -0.32;
          wristMesh.scale.set(1.15, 1.0, 0.75);
          gloveGroup.add(wristMesh);

          // Wrist Strap Fastener
          const strapGeo = new THREE.BoxGeometry(0.92, 0.15, 0.68);
          const strapMesh = new THREE.Mesh(strapGeo, goldMat);
          strapMesh.position.set(0, -0.32, 0.1);
          gloveGroup.add(strapMesh);

          // Curved Catching Palm Cup
          const palmGeo = new THREE.BoxGeometry(0.88, 0.75, 0.34);
          const palmMesh = new THREE.Mesh(palmGeo, goldMat);
          palmMesh.position.set(0, 0.22, 0);
          gloveGroup.add(palmMesh);

          // 4 Articulated Pre-Curved Fingers
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
            fingerMesh.rotation.x = -0.15; // Natural catching curve
            gloveGroup.add(fingerMesh);

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
          // PLAYMAKER: THE MAESTRO'S CELESTIAL ASTROLABE
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

          // Center Vision Crystal Orb
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
          // GOAL OF THE SEASON: THE ARC OF GLORY
          const gotsGroup = new THREE.Group();
          gotsGroup.position.set(0, 0.1, 0);

          // Parabolic Trajectory Ribbon Trail
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.6, -0.4, -0.4),
            new THREE.Vector3(-0.2, 0.1, -0.1),
            new THREE.Vector3(0.3, 0.6, 0.1),
            new THREE.Vector3(0.0, 1.15, 0.0),
          ]);
          const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.065, 12, false);
          const tubeMesh = new THREE.Mesh(tubeGeo, goldMat);
          gotsGroup.add(tubeMesh);

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
          // BEST DEFENCE: THE HEXAGONAL AEGIS MONOLITH (HIGH-END ARCHITECTURAL FORTRESS)
          const shieldGroup = new THREE.Group();
          shieldGroup.position.set(0, 0.42, 0);

          // Hexagonal Faceted Fortress Shield Chassis (Titanium + Bevels)
          const hexShape = new THREE.Shape();
          const sides = 6;
          const r = 0.92;
          for (let i = 0; i < sides; i++) {
            const a = (i * Math.PI) / 3 - Math.PI / 6;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r * 1.15;
            if (i === 0) hexShape.moveTo(x, y);
            else hexShape.lineTo(x, y);
          }
          hexShape.closePath();

          const extrudeOpts = { depth: 0.14, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
          const mainShieldMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(hexShape, extrudeOpts), titaniumMat);
          mainShieldMesh.geometry.center();
          shieldGroup.add(mainShieldMesh);

          // Concentric Polished 24K Gold Armor Frame Rings
          const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 12, 32), goldMat);
          ring1.position.z = 0.12;
          shieldGroup.add(ring1);

          const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 12, 32), satinGoldMat);
          ring2.position.z = 0.15;
          shieldGroup.add(ring2);

          // Central Heraldic Faceted Boss Emblem (Mounted flush)
          const bossMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldMat);
          bossMesh.position.set(0, 0, 0.22);
          shieldGroup.add(bossMesh);

          // Precision Flanking Guard Pylons (Twin angled platinum defense vanes)
          [-1, 1].forEach((dir) => {
            const pylonCurve = new THREE.CatmullRomCurve3([
              new THREE.Vector3(dir * 0.78, -0.85, 0),
              new THREE.Vector3(dir * 0.98, 0.0, 0.05),
              new THREE.Vector3(dir * 0.78, 0.85, 0),
            ]);
            const pylonGeo = new THREE.TubeGeometry(pylonCurve, 20, 0.045, 6, false);
            const pylonMesh = new THREE.Mesh(pylonGeo, silverMat);
            shieldGroup.add(pylonMesh);
          });

          animatedNodes.push({
            update: (clock) => {
              bossMesh.rotation.z = clock * 0.6;
            },
          });

          trophyRoot.add(shieldGroup);
          break;
        }

        case 'streak': {
          // LONGEST WINNING STREAK: THE ASCENDING MOMENTUM SPIRE (SOLID MONOLITH, NO PLUMBOB)
          const streakGroup = new THREE.Group();
          streakGroup.position.set(0, 0.15, 0);

          // 5 Escalating Staircase / Monolith Pillars in a golden helix
          const stepCount = 5;
          for (let i = 0; i < stepCount; i++) {
            const h = 0.55 + i * 0.36;
            const angle = (i * Math.PI) / 3 - Math.PI / 3;
            const radius = 0.48;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const pillarGeo = new THREE.BoxGeometry(0.26, h, 0.26);
            const pillarMesh = new THREE.Mesh(pillarGeo, i === stepCount - 1 ? goldMat : satinGoldMat);
            pillarMesh.position.set(x, -0.35 + h / 2, z);
            pillarMesh.rotation.y = angle;
            streakGroup.add(pillarMesh);

            // Platinum beveled crown cap on top of each pillar
            const capGeo = new THREE.ConeGeometry(0.18, 0.22, 4);
            const capMesh = new THREE.Mesh(capGeo, i === stepCount - 1 ? goldMat : silverMat);
            capMesh.position.set(x, -0.35 + h + 0.1, z);
            streakGroup.add(capMesh);
          }

          trophyRoot.add(streakGroup);
          break;
        }

        case 'clean_sheet': {
          // MOST CLEAN SHEETS: THE PRISM OF ZERO / CITADEL SPIRE (HIGH-END GEOMETRIC MONOLITH)
          const citadelGroup = new THREE.Group();
          citadelGroup.position.set(0, 0.25, 0);

          // 3 Soaring Triangular Faceted Monolith Obelisks arranged symmetrically
          for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2) / 3;
            const x = Math.cos(angle) * 0.42;
            const z = Math.sin(angle) * 0.42;

            const pylonGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.65, 3);
            const pylonMesh = new THREE.Mesh(pylonGeo, i === 0 ? obsidianMat : titaniumMat);
            pylonMesh.position.set(x, 0.45, z);
            pylonMesh.rotation.y = angle;
            citadelGroup.add(pylonMesh);

            // Polished Silver Obelisk Beveled Tops
            const capGeo = new THREE.ConeGeometry(0.24, 0.35, 3);
            const capMesh = new THREE.Mesh(capGeo, silverMat);
            capMesh.position.set(x, 1.42, z);
            capMesh.rotation.y = angle;
            citadelGroup.add(capMesh);
          }

          // Tiered Interlocking 24K Gold Fortress Bands
          [0.15, 0.65, 1.15].forEach((h, idx) => {
            const bandGeo = new THREE.TorusGeometry(0.55 - idx * 0.06, 0.04, 12, 32);
            bandGeo.rotateX(Math.PI / 2);
            const bandMesh = new THREE.Mesh(bandGeo, idx === 1 ? goldMat : satinGoldMat);
            bandMesh.position.y = h;
            citadelGroup.add(bandMesh);
          });

          // Encased Pristine Sapphire Crystal Core (Zero Conceded Vault)
          const coreGeo = new THREE.DodecahedronGeometry(0.26, 0);
          const coreMesh = new THREE.Mesh(coreGeo, crystalMat);
          coreMesh.position.set(0, 0.65, 0);
          citadelGroup.add(coreMesh);

          animatedNodes.push({
            update: (clock) => {
              coreMesh.rotation.y = clock * 1.0;
              coreMesh.rotation.x = clock * 0.5;
            },
          });

          trophyRoot.add(citadelGroup);
          break;
        }
      }

      // Universal floor alignment and auto-framing for procedural model
      const Y_floor = -0.75;
      const rawBbox = new THREE.Box3().setFromObject(trophyRoot);
      const rawSize = rawBbox.getSize(new THREE.Vector3());

      const targetHeight = isHero ? 2.5 : 2.1;
      const halfX = rawSize.x / 2;
      const halfZ = rawSize.z / 2;
      const rawRotRadius = Math.sqrt(halfX * halfX + halfZ * halfZ);
      const rawRotWidth = rawRotRadius * 2;
      const effectiveDim = Math.max(rawSize.y, rawRotWidth * 0.78);
      const targetScale = targetHeight / (effectiveDim || 1);
      trophyRoot.scale.setScalar(targetScale);

      // Recompute scaled bbox and center
      const scaledBbox = new THREE.Box3().setFromObject(trophyRoot);
      const scaledCenter = scaledBbox.getCenter(new THREE.Vector3());
      trophyRoot.position.x = -scaledCenter.x;
      trophyRoot.position.z = -scaledCenter.z;
      trophyRoot.position.y = Y_floor - scaledBbox.min.y;

      // Position ground shadow under floor
      shadowMesh.position.set(0, Y_floor + 0.003, 0);
      shadowMesh.scale.set(2.4, 2.4, 1);

      fitCameraToTrophy(camera, container?.clientWidth || width, container?.clientHeight || height);
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

        // Auto-center and fit to bounding box with uniform collection visual weight
        const rawBbox = new THREE.Box3().setFromObject(loadedModel);
        const rawSize = rawBbox.getSize(new THREE.Vector3());
        const rawCenter = rawBbox.getCenter(new THREE.Vector3());

        const targetHeight = isHero ? 2.5 : 2.1;
        const halfX = rawSize.x / 2;
        const halfZ = rawSize.z / 2;
        const rawRotRadius = Math.sqrt(halfX * halfX + halfZ * halfZ);
        const rawRotWidth = rawRotRadius * 2;
        const effectiveDim = Math.max(rawSize.y, rawRotWidth * 0.78);
        const targetScale = targetHeight / (effectiveDim || 1);

        loadedModel.scale.setScalar(targetScale);

        // Position model bottom on floor Y_floor = -0.75
        const Y_floor = -0.75;
        loadedModel.position.x = -rawCenter.x * targetScale;
        loadedModel.position.z = -rawCenter.z * targetScale;
        loadedModel.position.y = Y_floor - rawBbox.min.y * targetScale;

        // Ground contact shadow tailored to model base footprint
        const baseRadius = Math.max(rawSize.x, rawSize.z) * targetScale * 0.5;
        shadowMesh.position.set(0, Y_floor + 0.003, 0);
        shadowMesh.scale.set(Math.max(baseRadius * 3.0, 1.8), Math.max(baseRadius * 3.0, 1.8), 1);

        // Apply PBR environment to all loaded meshes with enhanced reflection
        loadedModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.envMap = envTexture;
              child.material.envMapIntensity = 2.0;
              child.material.needsUpdate = true;
            }
          }
        });

        // Mount directly to trophyRoot WITHOUT redundant code pedestal!
        trophyRoot.clear();
        trophyRoot.add(loadedModel);

        fitCameraToTrophy(camera, container?.clientWidth || width, container?.clientHeight || height);
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

    // Studio Lights Rig (Luminous, radiant illumination)
    const keyLight = new THREE.DirectionalLight(0xfff7ed, isCompleted ? 4.5 : 3.8);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf1f5f9, 2.6);
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
      const rimLight = new THREE.DirectionalLight(0x3ec9e6, isCompleted ? 2.6 : 2.0);
      rimLight.position.set(-5, 4, -4);
      scene.add(rimLight);

      const goldBackLight = new THREE.PointLight(0xf59e0b, isCompleted ? 3.5 : 2.5, 8);
      goldBackLight.position.set(3, -1, 3);
      scene.add(goldBackLight);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, isCompleted ? 1.5 : 1.35);
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

    celebrateSpinRef.current = () => {
      rotationVelocity += 0.08;
    };

    const dom = renderer.domElement;
    dom.style.cursor = 'grab';
    dom.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // Dynamic Resize & Orientation Handler with Bounding Box Auto-Framing
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      fitCameraToTrophy(camera, w, h);
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          fitCameraToTrophy(camera, w, h);
          renderer.setSize(w, h, false);
        }
      }
    });
    resizeObserver.observe(container);

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
      resizeObserver.disconnect();
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

  // Generously expanded height classes so trophies stand tall and majestic with ample headroom
  const heightClasses = {
    sm: 'h-[200px]',
    md: 'h-[290px] sm:h-[340px]',
    lg: 'h-[340px] sm:h-[400px]',
    hero: 'h-[380px] sm:h-[460px]',
  }[size];

  return (
    <div className={`relative w-full flex flex-col items-center select-none group ${className}`}>
      {/* 3D Canvas Viewport */}
      <div className={`relative w-full ${heightClasses} overflow-hidden rounded-[14px]`}>
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
        <div className="absolute bottom-2.5 right-2.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => resetRotationRef.current()}
            className="p-1.5 rounded-[6px] bg-[var(--ink-0)]/80 hover:bg-[var(--ink-2)] text-[var(--text-dim)] hover:text-white border border-[var(--line)] text-[10px] transition-colors"
            title="Reset Sudut Pandang"
            aria-label="Reset rotasi"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grand Celebration Button (For Champion Trophy) - Positioned below viewport so it never obscures the trophy or pedestal */}
      {showCelebrateButton && (
        <div className="w-full pt-3.5 flex justify-center z-20">
          <button
            onClick={handleCelebrate}
            disabled={celebrated}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] font-[family-name:var(--font-display)] font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_4px_24px_rgba(251,191,36,0.3)] ${
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
