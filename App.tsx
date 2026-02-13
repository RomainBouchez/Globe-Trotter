import React, { Suspense, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Loader, Stars } from '@react-three/drei';
import MarioEarth from './components/MarioEarth';
import StarryBackground from './components/StarryBackground';

import * as THREE from 'three';

// Component to handle camera animation
const MeteorZoom = ({
  targetPos,
  isResetting,
  onFinishZoom,
  onFinishReset,
  finalViewDistance
}: {
  targetPos: THREE.Vector3 | null,
  isResetting: boolean,
  onFinishZoom: () => void,
  onFinishReset: () => void,
  finalViewDistance: number
}) => {
  const { camera: rawCamera } = useThree();
  const camera = rawCamera as THREE.PerspectiveCamera;
  const controlsRef = useRef<any>(null);
  const initialFov = 45;
  const worldUp = new THREE.Vector3(0, 1, 0);

  // État sauvegardé pour le retour exact
  const savedState = useRef({
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    fov: 45
  });
  const hasCaptured = useRef(false);

  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    // --- LOGIQUE DE RETOUR (DÉCOLLAGE) ---
    if (isResetting) {
      camera.position.lerp(savedState.current.position, delta * 3.5);
      controlsRef.current.target.lerp(savedState.current.target, delta * 3.5);
      camera.up.lerp(savedState.current.up, delta * 3.5);
      camera.fov = THREE.MathUtils.lerp(camera.fov, savedState.current.fov, delta * 3.5);

      camera.updateProjectionMatrix();
      controlsRef.current.update();

      if (camera.position.distanceTo(savedState.current.position) < 0.02) {
        camera.position.copy(savedState.current.position);
        controlsRef.current.target.copy(savedState.current.target);
        camera.up.copy(savedState.current.up);
        hasCaptured.current = false;
        onFinishReset();
      }
      return;
    }

    // --- LOGIQUE DE ZOOM (ATTERRISSAGE FLUIDE) ---
    if (targetPos) {
      if (!hasCaptured.current) {
        savedState.current.position.copy(camera.position);
        savedState.current.target.copy(controlsRef.current.target);
        savedState.current.up.copy(camera.up);
        savedState.current.fov = camera.fov;
        hasCaptured.current = true;
      }

      // 1. Calcul des vecteurs d'orientation locale
      const N = targetPos.clone().normalize();
      const dot = N.dot(worldUp);
      const North = worldUp.clone().sub(N.clone().multiplyScalar(dot)).normalize();

      // 2. Définition de la position finale à 55° d'inclinaison
      const angleFromNormal = (90 - 55) * (Math.PI / 180);

      const finalCamPos = targetPos.clone()
        .add(N.clone().multiplyScalar(Math.cos(angleFromNormal) * finalViewDistance))
        .add(North.clone().multiplyScalar(-Math.sin(angleFromNormal) * finalViewDistance));

      const finalLookAt = targetPos.clone();
      const distToFinal = camera.position.distanceTo(finalCamPos);

      // 3. Interpolation
      const speed = delta * (distToFinal < 0.05 ? 12.0 : 6.0);

      camera.position.lerp(finalCamPos, speed);
      controlsRef.current.target.lerp(finalLookAt, speed);
      camera.up.lerp(N, speed);

      const targetFov = distToFinal > 0.5 ? 60 : initialFov;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, delta * 3);
      camera.updateProjectionMatrix();

      controlsRef.current.update();

      if (distToFinal < 0.001) {
        onFinishZoom();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={!targetPos && !isResetting}
      enableRotate={!targetPos && !isResetting}
      minDistance={0.01}
      maxDistance={15}
      rotateSpeed={0.5}
      enableDamping={true}
      dampingFactor={0.1}
    />
  );
};

const App: React.FC = () => {
  const fixedRelief = 0.1;
  const [zoomTarget, setZoomTarget] = useState<THREE.Vector3 | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [windmillRotation, setWindmillRotation] = useState<[number, number, number]>([1.5, 0.5, -0.6]);

  // La distance d'atterrissage ajustée à 0.4 pour une meilleure vue d'ensemble sans être trop près
  const FIXED_ARRIVAL_DISTANCE = 0.4;

  const handleCityClick = useCallback((pos: THREE.Vector3) => {
    setIsRotating(false);
    setIsResetting(false);
    setZoomTarget(pos);
  }, []);

  const handleReturn = () => {
    setIsResetting(true);
    setZoomTarget(null);
  };

  const onResetFinished = () => {
    setIsResetting(false);
    setIsRotating(true);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <Canvas
        camera={{ position: [2, 2, 8], fov: 45 }}
        gl={{ antialias: true, toneMappingExposure: 1.2 }}
        dpr={[1, 2]}
        shadows
      >
        <color attach="background" args={['#020205']} />

        {/* Augmentation de l'ambientLight pour réduire l'opacité des ombres (les rendre moins noires) */}
        <ambientLight intensity={0.7} color="#888888" />

        <group position={[8, 3, 6]}>
          <pointLight intensity={4} distance={100} decay={0} color="#fffebb" castShadow shadow-mapSize={[1024, 1024]} />
          <mesh>
            <sphereGeometry args={[0.8, 32, 32]} />
            <meshBasicMaterial color="#ffcc00" toneMapped={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[1.2, 32, 32]} />
            <meshBasicMaterial color="#ff8800" transparent opacity={0.3} toneMapped={false} />
          </mesh>
        </group>

        <pointLight position={[-5, -2, -10]} intensity={1.2} color="#4400ff" />

        <Suspense fallback={null}>
          <MarioEarth
            reliefScale={fixedRelief}
            isRotating={isRotating}
            isResetting={isResetting}
            onCityClick={handleCityClick}
            windmillRotation={windmillRotation}
          />
          <StarryBackground />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={1} />
        </Suspense>

        <MeteorZoom
          targetPos={zoomTarget}
          isResetting={isResetting}
          onFinishZoom={() => { }}
          onFinishReset={onResetFinished}
          finalViewDistance={FIXED_ARRIVAL_DISTANCE}
        />
      </Canvas>

      <Loader />

      <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex flex-col items-start gap-4">
        {/* Header Panel Épuré */}
        <div className="bg-black/60 backdrop-blur-lg p-6 rounded-2xl border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            GLOBE TROTTER
          </h1>
          <p className="text-cyan-400 font-bold mt-1 text-xs tracking-[0.2em] uppercase">Exploration du globe</p>

          <div className="mt-6 flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${!isRotating && !isResetting ? 'bg-red-500 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]'}`}></div>
            <div className="text-[10px] text-white/80 font-black uppercase tracking-tighter">
              {isRotating ? "Statut : En Orbite" : (isResetting ? "Statut : Extraction" : "Statut : Surface Atteinte")}
            </div>
          </div>
        </div>

        {/* Return Button */}
        {(!isRotating && !isResetting) && (
          <button
            onClick={handleReturn}
            className="pointer-events-auto bg-gradient-to-b from-yellow-300 to-orange-600 text-black font-black py-4 px-12 rounded-full shadow-[0_10px_40px_rgba(255,165,0,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border-b-4 border-orange-800 uppercase italic tracking-wider"
            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.3)' }}
          >
            <span className="text-2xl">🚀</span> Décollage Immédiat
          </button>
        )}
      </div>

      {/* DEBUG SLIDERS FOR EIFFEL TOWER */}


      {/* DEBUG SLIDERS FOR WINDMILL */}



    </div>
  );
};

export default App;