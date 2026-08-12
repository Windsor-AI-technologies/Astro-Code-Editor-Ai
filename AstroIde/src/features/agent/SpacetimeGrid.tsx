import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SpacetimeGridProps {
  opacity?: number;
}

export default function SpacetimeGrid({ opacity = 0.6 }: SpacetimeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 3, 5);
    camera.lookAt(0, -1, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Grid mesh (plane that will be deformed)
    const gridSize = 60;
    const geometry = new THREE.PlaneGeometry(14, 14, gridSize, gridSize);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
      color: 0x6ecfff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Second grid layer (glow effect)
    const material2 = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      wireframe: true,
      transparent: true,
      opacity: 1,
    });
    const mesh2 = new THREE.Mesh(geometry.clone(), material2);
    mesh2.position.y = -0.05;
    scene.add(mesh2);

    // Third layer — bright core glow
    const glowGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4ac3ff,
      transparent: true,
      opacity: 0.15,
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    glowSphere.position.y = -2.5;
    scene.add(glowSphere);

    // Inner glow (brighter, smaller)
    const innerGlowGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const innerGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
    });
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    innerGlow.position.y = -3;
    scene.add(innerGlow);

    // Particles (stars)
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // Deform function — gravitational well (deeper curve)
    function deformGrid(geo: THREE.BufferGeometry, time: number) {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const dist = Math.sqrt(x * x + z * z);

        // Much deeper gravity well
        const depth = 7.0 / (dist + 0.5);
        const pulse = Math.sin(time * 0.4) * 0.4;
        const ripple = Math.sin(dist * 2 - time * 2) * 0.20;
        pos.setY(i, -depth - pulse * (1 / (dist + 0.8)) + ripple);
      }
      pos.needsUpdate = true;
    }

    // Animation loop
    let time = 0;
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      time += 0.01;

      deformGrid(geometry, time);
      deformGrid(mesh2.geometry, time);

      // Glow pulse
      const pulse = (Math.sin(time * 0.8) + 1) * 0.5;
      glowMat.opacity = 0.1 + pulse * 0.15;
      glowSphere.scale.setScalar(1 + pulse * 0.3);
      innerGlowMat.opacity = 0.05 + pulse * 0.12;

      // Slow rotation
      mesh.rotation.y = time * 0.08;
      mesh2.rotation.y = time * 0.08;
      particles.rotation.y = time * 0.015;

      renderer.render(scene, camera);
    }
    animate();

    // Handle resize
    function handleResize() {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      material2.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      innerGlowGeo.dispose();
      innerGlowMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
