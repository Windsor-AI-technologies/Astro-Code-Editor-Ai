import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface PerlOrbProps {
  audioLevel: number;
  isListening: boolean;
  isSpeaking: boolean;
}

export default function PerlOrb({ audioLevel, isListening, isSpeaking }: PerlOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const audioRef = useRef(0);
  const stateRef = useRef({ isListening: false, isSpeaking: false });

  useEffect(() => { audioRef.current = audioLevel; }, [audioLevel]);
  useEffect(() => { stateRef.current = { isListening, isSpeaking }; }, [isListening, isSpeaking]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // ── Scene setup ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Colors: golden/amber energy like the reference image
    const GOLD = 0xffaa22;
    const BRIGHT_GOLD = 0xffdd44;
    const HOT_WHITE = 0xffffcc;
    const DEEP_ORANGE = 0xff6600;

    // ── 1. Bright core (center explosion of light) ──
    const coreGeo = new THREE.SphereGeometry(0.25, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: HOT_WHITE,
      transparent: true,
      opacity: 0.9,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Core glow (larger, softer)
    const coreGlowGeo = new THREE.SphereGeometry(0.45, 32, 32);
    const coreGlowMat = new THREE.MeshBasicMaterial({
      color: BRIGHT_GOLD,
      transparent: true,
      opacity: 0.4,
    });
    const coreGlow = new THREE.Mesh(coreGlowGeo, coreGlowMat);
    scene.add(coreGlow);

    // ── 2. Inner swirl sphere (wireframe with noise deformation) ──
    const swirlGeo = new THREE.IcosahedronGeometry(0.7, 4);
    const swirlMat = new THREE.MeshBasicMaterial({
      color: GOLD,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });
    const swirl = new THREE.Mesh(swirlGeo, swirlMat);
    scene.add(swirl);

    // Store original positions for deformation
    const swirlBasePositions = swirlGeo.attributes.position.array.slice();

    // ── 3. Orbital particle trails (the main visual — curved golden streams) ──
    const trailCount = 12;
    const trails: THREE.Points[] = [];
    const trailData: { radius: number; speed: number; tilt: THREE.Euler; phase: number }[] = [];

    for (let t = 0; t < trailCount; t++) {
      const particleCount = 200;
      const positions = new Float32Array(particleCount * 3);
      const opacities = new Float32Array(particleCount);

      const radius = 0.9 + t * 0.12;
      const phase = (t / trailCount) * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.4;
      const tilt = new THREE.Euler(
        (Math.random() - 0.5) * Math.PI * 0.8,
        (Math.random() - 0.5) * Math.PI,
        (Math.random() - 0.5) * Math.PI * 0.4,
      );

      // Initialize positions along orbital path
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const r = radius + (Math.random() - 0.5) * 0.15;
        positions[i * 3] = Math.cos(angle) * r;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
        positions[i * 3 + 2] = Math.sin(angle) * r;
        opacities[i] = (i / particleCount); // fade tail
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        color: t % 3 === 0 ? HOT_WHITE : t % 3 === 1 ? BRIGHT_GOLD : GOLD,
        size: t % 4 === 0 ? 0.025 : 0.015,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const points = new THREE.Points(geo, mat);
      points.rotation.copy(tilt);
      trails.push(points);
      trailData.push({ radius, speed, tilt, phase });
      scene.add(points);
    }

    // ── 4. Outer ring of debris/fragments (city-like structures orbiting) ──
    const fragmentCount = 60;
    const fragmentGeo = new THREE.BufferGeometry();
    const fragmentPos = new Float32Array(fragmentCount * 3);
    const fragmentSizes = new Float32Array(fragmentCount);

    for (let i = 0; i < fragmentCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * 1.2;
      const r = 1.6 + Math.random() * 0.6;
      fragmentPos[i * 3] = Math.cos(angle) * r;
      fragmentPos[i * 3 + 1] = elevation;
      fragmentPos[i * 3 + 2] = Math.sin(angle) * r;
      fragmentSizes[i] = Math.random() * 3 + 1;
    }

    fragmentGeo.setAttribute('position', new THREE.BufferAttribute(fragmentPos, 3));
    const fragmentMat = new THREE.PointsMaterial({
      color: DEEP_ORANGE,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const fragments = new THREE.Points(fragmentGeo, fragmentMat);
    scene.add(fragments);

    // ── 5. Outer halo ring (the faint circular border) ──
    const haloGeo = new THREE.RingGeometry(1.8, 1.85, 128);
    const haloMat = new THREE.MeshBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    scene.add(halo);

    // Second halo (slightly tilted)
    const halo2 = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 1.53, 128),
      new THREE.MeshBasicMaterial({
        color: BRIGHT_GOLD,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );
    halo2.rotation.x = Math.PI * 0.3;
    halo2.rotation.z = Math.PI * 0.1;
    scene.add(halo2);

    // ── 6. Energy sparks (random bright points that flash) ──
    const sparkCount = 40;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkLife = new Float32Array(sparkCount); // lifecycle tracking

    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 3;
      sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 3;
      sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
      sparkLife[i] = Math.random();
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: HOT_WHITE,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    // ── 7. Volumetric glow layers ──
    const glowLayers = [
      { radius: 1.0, color: GOLD, opacity: 0.06 },
      { radius: 1.4, color: DEEP_ORANGE, opacity: 0.03 },
      { radius: 2.0, color: GOLD, opacity: 0.015 },
    ];
    const glows: THREE.Mesh[] = [];
    glowLayers.forEach(({ radius, color, opacity }) => {
      const geo = new THREE.SphereGeometry(radius, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      glows.push(mesh);
      scene.add(mesh);
    });

    // ── Animation ──
    let time = 0;

    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      time += 0.012;

      const level = audioRef.current;
      const listening = stateRef.current.isListening;
      const speaking = stateRef.current.isSpeaking;

      let intensity = 0.3;
      if (listening) intensity = 0.5 + level * 2.0;
      if (speaking) intensity = 1.0 + Math.sin(time * 6) * 0.4;

      // ── Core pulse ──
      const corePulse = 0.8 + Math.sin(time * 3) * 0.2 * intensity;
      core.scale.setScalar(corePulse);
      coreMat.opacity = 0.7 + level * 0.3;
      coreGlow.scale.setScalar(corePulse * 1.8 + level * 0.5);
      coreGlowMat.opacity = 0.25 + level * 0.3 + Math.sin(time * 4) * 0.1;

      // ── Swirl deformation (organic morphing) ──
      const swirlPos = swirlGeo.attributes.position;
      for (let i = 0; i < swirlPos.count; i++) {
        const bx = swirlBasePositions[i * 3];
        const by = swirlBasePositions[i * 3 + 1];
        const bz = swirlBasePositions[i * 3 + 2];
        const noise = Math.sin(bx * 4 + time * 2.5) * Math.cos(by * 4 + time * 2) * Math.sin(bz * 4 + time * 1.5);
        const scale = 1.0 + noise * 0.2 * intensity + level * 0.15;
        swirlPos.setXYZ(i, bx * scale, by * scale, bz * scale);
      }
      swirlPos.needsUpdate = true;
      swirl.rotation.y += 0.004 * intensity;
      swirl.rotation.x += 0.002 * intensity;
      swirlMat.opacity = 0.2 + level * 0.25;

      // ── Orbital trails — rotate and pulse ──
      trails.forEach((trail, t) => {
        const data = trailData[t];
        trail.rotation.y += data.speed * 0.01 * (1 + level * 3);
        trail.rotation.x += data.speed * 0.003;

        // Scale trails with audio
        const trailScale = 1.0 + level * 0.4;
        trail.scale.setScalar(trailScale);

        // Opacity pulse
        const mat = trail.material as THREE.PointsMaterial;
        mat.opacity = 0.4 + level * 0.5 + Math.sin(time * 2 + data.phase) * 0.15;
        mat.size = (t % 4 === 0 ? 0.025 : 0.015) * (1 + level * 1.5);
      });

      // ── Fragments orbit ──
      fragments.rotation.y += 0.002 * (1 + level);
      fragments.rotation.x += 0.001;
      fragmentMat.opacity = 0.4 + level * 0.4;

      // ── Halos ──
      halo.rotation.z += 0.003;
      haloMat.opacity = 0.1 + level * 0.15;
      halo2.rotation.z -= 0.002;
      (halo2.material as THREE.MeshBasicMaterial).opacity = 0.08 + level * 0.1;

      // ── Sparks lifecycle ──
      const sparkPositions = sparkGeo.attributes.position;
      for (let i = 0; i < sparkCount; i++) {
        sparkLife[i] += 0.02 + level * 0.05;
        if (sparkLife[i] > 1) {
          // Respawn near core
          const angle = Math.random() * Math.PI * 2;
          const elev = (Math.random() - 0.5) * Math.PI;
          const r = 0.3 + Math.random() * 0.3;
          sparkPositions.setXYZ(i,
            Math.cos(angle) * Math.cos(elev) * r,
            Math.sin(elev) * r,
            Math.sin(angle) * Math.cos(elev) * r,
          );
          sparkLife[i] = 0;
        } else {
          // Move outward
          const x = sparkPositions.getX(i);
          const y = sparkPositions.getY(i);
          const z = sparkPositions.getZ(i);
          const dist = Math.sqrt(x * x + y * y + z * z) || 0.01;
          const speed = 0.015 + level * 0.03;
          sparkPositions.setXYZ(i,
            x + (x / dist) * speed,
            y + (y / dist) * speed,
            z + (z / dist) * speed,
          );
        }
      }
      sparkPositions.needsUpdate = true;
      sparkMat.opacity = 0.3 + level * 0.6;

      // ── Glow layers pulse ──
      glows.forEach((g, i) => {
        const scale = 1 + Math.sin(time * (1.5 + i * 0.5)) * 0.1 * intensity + level * 0.3;
        g.scale.setScalar(scale);
        (g.material as THREE.MeshBasicMaterial).opacity = glowLayers[i].opacity * (1 + level * 3);
      });

      // ── Color shift: speaking = cooler blue-white, listening = warm gold ──
      if (speaking) {
        coreMat.color.lerp(new THREE.Color(0xccddff), 0.03);
        coreGlowMat.color.lerp(new THREE.Color(0x88bbff), 0.03);
      } else {
        coreMat.color.lerp(new THREE.Color(HOT_WHITE), 0.03);
        coreGlowMat.color.lerp(new THREE.Color(BRIGHT_GOLD), 0.03);
      }

      renderer.render(scene, camera);
    }
    animate();

    // Resize
    function handleResize() {
      if (!container) return;
      const w2 = container.clientWidth;
      const h2 = container.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    }
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      renderer.dispose();
      coreGeo.dispose(); coreMat.dispose();
      coreGlowGeo.dispose(); coreGlowMat.dispose();
      swirlGeo.dispose(); swirlMat.dispose();
      trails.forEach(t => { t.geometry.dispose(); (t.material as THREE.Material).dispose(); });
      fragmentGeo.dispose(); fragmentMat.dispose();
      haloGeo.dispose(); haloMat.dispose();
      halo2.geometry.dispose(); (halo2.material as THREE.Material).dispose();
      sparkGeo.dispose(); sparkMat.dispose();
      glows.forEach(g => { g.geometry.dispose(); (g.material as THREE.Material).dispose(); });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="perl-orb-container"
    />
  );
}
