import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';

const GLB_PATH = '/laptop.glb';

function roundedRectShape(width: number, height: number, radius: number) {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w - 0.001, h - 0.001);
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
}

// Процедурная модель (fallback) — матовый чёрный корпус, cherry на экране
function ProceduralLaptop({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const matteBlack = new THREE.Color('#0a0a0a');
  const matteBlackLight = new THREE.Color('#141414');
  const screenBezel = new THREE.Color('#0d0d0d');
  const cherry = new THREE.Color('#e6002b');
  const screenContent = new THREE.Color('#08080a');

  const baseGeom = useMemo(() => {
    const shape = roundedRectShape(1.48, 0.88, 0.035);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.048,
      bevelEnabled: true,
      bevelSize: 0.01,
      bevelThickness: 0.008,
      bevelSegments: 12,
      curveSegments: 32,
    });
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }, []);

  const lidGeom = useMemo(() => {
    const shape = roundedRectShape(1.42, 0.86, 0.028);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelSize: 0.006,
      bevelThickness: 0.005,
      bevelSegments: 10,
      curveSegments: 28,
    });
    g.computeVertexNormals();
    return g;
  }, []);

  const keyGeom = useMemo(() => new THREE.CylinderGeometry(0.018, 0.018, 0.005, 14), []);
  const trackpadGeom = useMemo(() => new THREE.PlaneGeometry(0.38, 0.24, 24, 16), []);
  const bezelGeom = useMemo(
    () => new THREE.BoxGeometry(1.38, 0.84, 0.008, 32, 32, 2),
    []
  );

  return (
    <group ref={groupRef} scale={1.2} position={[0, 0, 0]}>
      <mesh position={[0, -0.272, 0]} geometry={baseGeom} castShadow receiveShadow>
        <meshStandardMaterial color={matteBlack} metalness={0.12} roughness={0.72} />
      </mesh>
      <mesh position={[0, -0.248, 0]} castShadow>
        <boxGeometry args={[1.4, 0.014, 0.8]} />
        <meshStandardMaterial color={matteBlackLight} metalness={0.1} roughness={0.7} />
      </mesh>
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((col) => (
          <mesh
            key={`${row}-${col}`}
            position={[-0.51 + col * 0.085, -0.238 + row * 0.018, 0.07]}
            geometry={keyGeom}
            castShadow
          >
            <meshStandardMaterial color="#1a1a1a" metalness={0.15} roughness={0.68} />
          </mesh>
        ))
      )}
      <mesh position={[0.3, -0.234, 0.2]} rotation={[-Math.PI / 2, 0, 0]} geometry={trackpadGeom} castShadow>
        <meshStandardMaterial color="#141414" metalness={0.1} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.198, -0.43]} castShadow>
        <boxGeometry args={[1.34, 0.028, 0.048]} />
        <meshStandardMaterial color={matteBlack} metalness={0.2} roughness={0.6} />
      </mesh>
      <group position={[0, 0.078, -0.465]} rotation={[-0.34, 0, 0]}>
        <mesh castShadow geometry={lidGeom}>
          <meshStandardMaterial color={matteBlack} metalness={0.12} roughness={0.72} />
        </mesh>
        <mesh position={[0, 0, 0.013]} geometry={bezelGeom}>
          <meshStandardMaterial color={screenBezel} metalness={0.18} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.38, 0.018]}>
          <boxGeometry args={[0.12, 0.028, 0.01]} />
          <meshStandardMaterial color={screenBezel} metalness={0.18} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, 0.017]}>
          <planeGeometry args={[1.26, 0.72]} />
          <meshStandardMaterial
            color={screenContent}
            emissive={cherry}
            emissiveIntensity={0.22}
            metalness={0.05}
            roughness={0.92}
          />
        </mesh>
      </group>
    </group>
  );
}

// Показ загруженной GLB-сцены с масштабом и вращением
function GLBView({
  scene,
  groupRef,
}: {
  scene: THREE.Group;
  groupRef: React.RefObject<THREE.Group | null>;
}) {
  const { scale, position } = useMemo(() => {
    const b = new THREE.Box3().setFromObject(scene);
    const size = b.getSize(new THREE.Vector3());
    const center = b.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = maxDim > 0 ? 1.2 / maxDim : 1;
    return {
      scale: s,
      position: [-center.x * s, -center.y * s, -center.z * s] as [number, number, number],
    };
  }, [scene]);

  return (
    <group ref={groupRef} scale={scale} position={position}>
      <primitive object={scene} />
    </group>
  );
}

// Загружает laptop.glb из public; при успехе показывает его, иначе — процедурную модель
function LaptopWithFallback() {
  const groupRef = useRef<THREE.Group>(null);
  const [glbScene, setGlbScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      GLB_PATH,
      (gltf) => setGlbScene(gltf.scene.clone()),
      () => setGlbScene(null),
      () => setGlbScene(null)
    );
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.45;
    }
  });

  if (glbScene) {
    return <GLBView scene={glbScene} groupRef={groupRef} />;
  }
  return <ProceduralLaptop groupRef={groupRef} />;
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 7, 4]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-2, 3, 2]} intensity={0.25} color="#fff" />
      <pointLight position={[2, 0, 2]} intensity={0.15} color="#fff" />
      <pointLight position={[0, -2, 2.5]} intensity={0.25} color="#e6002b" />
      <LaptopWithFallback />
    </>
  );
}

interface RotatingLaptopProps {
  className?: string;
  height?: string;
}

export function RotatingLaptop({ className = '', height = '280px' }: RotatingLaptopProps) {
  return (
    <div className={className} style={{ height, minHeight: height, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
