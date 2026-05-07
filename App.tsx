import React, { Suspense, useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Loader, Stars } from '@react-three/drei';
import MarioEarth, { INITIAL_CITIES } from './components/MarioEarth';
import DestinationChoiceUI from './components/DestinationChoiceUI';
import SubCityPicker from './components/SubCityPicker';
import SmartUploadDialog, { ConfirmGroup } from './components/SmartUploadDialog';
import StarryBackground from './components/StarryBackground';
import LoginPage from './components/LoginPage';
import { usePhotos } from './hooks/usePhotos';
import { City, SubCity } from './types';
import { extractImagesFromZip, isZipFile } from './utils/zipUtils';

import * as THREE from 'three';

// ── Date header formatter (iPhone Photos style) ───────────────────────────
function formatDateHeader(isoDate: string | null): string {
  if (!isoDate) return 'Souvenirs';
  const d = new Date(isoDate);
  const now = new Date();
  const toMidnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round(
    (toMidnight(now).getTime() - toMidnight(d).getTime()) / 86_400_000
  );
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  // Capitalise first letter
  const s = d.toLocaleDateString('fr-FR', opts);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SUN_POS = new THREE.Vector3(8, 3, 6).normalize();

const CameraTorch = () => {
  const lightRef = useRef<THREE.SpotLight>(null);
  const { camera } = useThree();

  const dir = useRef(new THREE.Vector3());

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.position.copy(camera.position);
      camera.getWorldDirection(dir.current);
      lightRef.current.target.position.copy(camera.position).add(dir.current);
      lightRef.current.target.updateMatrixWorld();

      // Check if the surface facing the camera is on the night side
      const surfaceNormal = camera.position.clone().normalize();
      const sunDot = surfaceNormal.dot(SUN_POS);
      // sunDot > 0 = day side, sunDot < 0 = night side
      const targetIntensity = sunDot < 0.1 ? 0.7 : 0;
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.05);
    }
  });

  return (
    <spotLight
      ref={lightRef}
      intensity={0}
      distance={2}
      decay={0.5}
      angle={0.34}
      penumbra={0.4}
      color="#ffffff"
    />
  );
};

// Component to handle camera animation
const RESUME_ROTATION_DISTANCE = 4.5;

const MeteorZoom = ({
  targetPos,
  isResetting,
  onFinishZoom,
  onFinishReset,
  finalViewDistance,
  onUserInteract,
  onResumeRotation,
}: {
  targetPos: THREE.Vector3 | null,
  isResetting: boolean,
  onFinishZoom: () => void,
  onFinishReset: () => void,
  finalViewDistance: number,
  onUserInteract: () => void,
  onResumeRotation: () => void,
}) => {
  const { camera: rawCamera } = useThree();
  const camera = rawCamera as THREE.PerspectiveCamera;
  const controlsRef = useRef<any>(null);
  const initialFov = 45;
  const worldUp = new THREE.Vector3(0, 1, 0);
  // Track previous distance to detect threshold crossing
  const prevDistRef = useRef<number | null>(null);

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

    // --- ZOOM MANUEL : stop/resume rotation au franchissement du seuil ---
    if (!targetPos && !isResetting) {
      const dist = camera.position.length();
      const prev = prevDistRef.current;

      if (prev !== null) {
        const wasAbove = prev > RESUME_ROTATION_DISTANCE;
        const isAbove  = dist > RESUME_ROTATION_DISTANCE;

        if (wasAbove && !isAbove) {
          // a zoomé en dessous du seuil → stop rotation
          onUserInteract();
        } else if (!wasAbove && isAbove) {
          // a dezoomé au-dessus du seuil → reprendre rotation
          onResumeRotation();
        }
      }

      prevDistRef.current = dist;
    } else {
      // Réinitialise quand zoom programmé actif (ville ou reset)
      prevDistRef.current = null;
    }

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
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('valentine-auth') === 'true'
  );

  const handleLoginSuccess = () => {
    localStorage.setItem('valentine-auth', 'true');
    setIsAuthenticated(true);
  };

  const fixedRelief = 0.1;
  const [zoomTarget, setZoomTarget] = useState<THREE.Vector3 | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [windmillRotation, setWindmillRotation] = useState<[number, number, number]>([1.5, 0.5, -0.6]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [showPhotos, setShowPhotos] = useState(false);

  const [cities, setCities] = useState<City[]>(INITIAL_CITIES);

  // Load persisted dynamic sub-cities from DB on mount
  useEffect(() => {
    fetch('/api/sub-cities')
      .then(r => r.json())
      .then(({ subCities }: { subCities: { parentCityName: string; subCityName: string; description: string }[] }) => {
        if (!subCities?.length) return;
        setCities(prev => prev.map(city => {
          const additions = subCities
            .filter(s => s.parentCityName === city.name)
            .filter(s => !city.subCities?.some(e => e.name === s.subCityName))
            .map(s => ({ name: s.subCityName, description: s.description, images: [] }));
          if (!additions.length) return city;
          return { ...city, subCities: [...(city.subCities ?? []), ...additions] };
        }));
      })
      .catch(() => {});
  }, []);

  const [cityStatus, setCityStatus] = useState<Record<string, 'pending' | 'accepted' | 'rejected'>>({});
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedSubCity, setSelectedSubCity] = useState<SubCity | null>(null);
  const [smartUploadFiles, setSmartUploadFiles] = useState<File[] | null>(null);

  // Photos keyed by sub-city name when inside a country, else by city name
  const photoKey = selectedSubCity?.name ?? (selectedCity?.subCities ? null : selectedCity?.name ?? null);
  const { uploadedPhotos, uploadPhotos, deletePhoto, loading: uploadLoading, uploadProgress, setPhotoRole } = usePhotos(photoKey);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const allImages = useMemo(() => {
    const hardcoded = selectedSubCity?.images ?? (selectedCity?.subCities ? [] : selectedCity?.images ?? []);

    // Featured photos fill slots 1/2/3; if none defined, natural order
    const featuredSlots = ([1, 2, 3] as const)
      .map(ord => uploadedPhotos.find(p => p.featuredOrder === ord)?.url ?? null);
    const hasFeatured = featuredSlots.some(Boolean);

    if (hasFeatured) {
      const featuredUrls = new Set(featuredSlots.filter(Boolean) as string[]);
      const rest = [...hardcoded, ...uploadedPhotos.map(p => p.url)].filter(u => !featuredUrls.has(u));
      return [...(featuredSlots.filter(Boolean) as string[]), ...rest];
    }
    return [...hardcoded, ...uploadedPhotos.map(p => p.url)];
  }, [selectedCity, selectedSubCity, uploadedPhotos]);

  const uploadedUrls = useMemo(() => new Set(uploadedPhotos.map(p => p.url)), [uploadedPhotos]);

  // Gallery items: chronological order + date section headers
  type GalleryHeader = { type: 'header'; label: string; key: string };
  type GalleryPhoto  = { type: 'photo';  url: string; photoIdx: number };
  type GalleryItem   = GalleryHeader | GalleryPhoto;

  const galleryItems = useMemo((): GalleryItem[] => {
    const hardcoded = selectedSubCity?.images ?? (selectedCity?.subCities ? [] : selectedCity?.images ?? []);
    const items: GalleryItem[] = [];
    let photoIdx = 0;

    // Hardcoded images (no date metadata)
    if (hardcoded.length) {
      items.push({ type: 'header', label: 'Souvenirs', key: 'h-souvenirs' });
      hardcoded.forEach(url => items.push({ type: 'photo', url, photoIdx: photoIdx++ }));
    }

    // Uploaded photos — sort by photo date (EXIF if available, else upload date)
    const sorted = [...uploadedPhotos].sort((a, b) => {
      const da = new Date(a.takenAt ?? a.uploadedAt).getTime();
      const db = new Date(b.takenAt ?? b.uploadedAt).getTime();
      return da - db;
    });

    let lastDateKey = '';
    for (const p of sorted) {
      const dateStr = p.takenAt ?? p.uploadedAt;
      const dateKey = dateStr.slice(0, 10); // YYYY-MM-DD
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        items.push({ type: 'header', label: formatDateHeader(dateStr), key: `h-${dateKey}` });
      }
      items.push({ type: 'photo', url: p.url, photoIdx: photoIdx++ });
    }

    return items;
  }, [selectedCity, selectedSubCity, uploadedPhotos]);

  // La distance d'atterrissage ajustée à 0.4 pour une meilleure vue d'ensemble sans être trop près
  const FIXED_ARRIVAL_DISTANCE = 0.4;

  const handleCityClick = useCallback((city: City, pos: THREE.Vector3) => {
    setIsRotating(false);
    setIsResetting(false);
    setZoomTarget(pos);
    setSelectedCity(city);
  }, []);

  const handleReturn = () => {
    if (selectedSubCity) {
      // Niveau 1 : retour au SubCityPicker (pas de dezoom)
      setSelectedSubCity(null);
      setSidePanelOpen(false);
    } else {
      // Niveau 2 : dezoom globe
      setIsResetting(true);
      setZoomTarget(null);
      setShowPhotos(false);
      setSelectedCity(null);
      setSidePanelOpen(false);
    }
  };

  const handleSubCitySelect = (subCity: SubCity) => {
    setSelectedSubCity(subCity);
    setSidePanelOpen(true);
  };

  // Global smart upload — handle file input (images + ZIPs)
  const handleGlobalFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const raw = Array.from(e.target.files);
    e.target.value = '';

    const images: File[] = [];
    for (const file of raw) {
      if (isZipFile(file)) {
        const extracted = await extractImagesFromZip(file);
        images.push(...extracted);
      } else {
        images.push(file);
      }
    }
    if (images.length > 0) setSmartUploadFiles(images);
  };

  // Upload confirmed groups to correct city endpoints
  const handleSmartUploadConfirm = async (groups: ConfirmGroup[]) => {
    setSmartUploadFiles(null);

    for (const group of groups) {
      const cityName = group.target?.subCityName ?? group.target?.cityName ?? group.newCityName;
      if (!cityName || group.files.length === 0) continue;

      // If new sub-city with a parent, inject into state + persist to DB
      if (group.newCityName && group.newParentCityName) {
        setCities(prev => prev.map(c => {
          if (c.name !== group.newParentCityName) return c;
          const already = c.subCities?.some(s => s.name === group.newCityName);
          if (already) return c;
          return {
            ...c,
            subCities: [...(c.subCities ?? []), { name: group.newCityName!, images: [] }],
          };
        }));
        // Persist to SQLite
        fetch('/api/sub-cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentCityName: group.newParentCityName,
            subCityName: group.newCityName,
          }),
        }).catch(() => {});
      }

      const formData = new FormData();
      group.files.forEach(f => formData.append('photos', f));
      try {
        await fetch(`/api/photos/${encodeURIComponent(cityName)}`, {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        console.error(`Upload failed for ${cityName}:`, err);
      }
    }
  };

  const handleAcceptCity = () => {
    if (selectedCity) {
      setCityStatus(prev => ({ ...prev, [selectedCity.name]: 'accepted' }));
      handleReturn();
    }
  };

  const handleRejectCity = () => {
    if (selectedCity) {
      setCityStatus(prev => ({ ...prev, [selectedCity.name]: 'rejected' }));
      handleReturn();
    }
  };

  const onResetFinished = () => {
    setIsResetting(false);
    setIsRotating(true);
  };

  if (!isAuthenticated) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

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
        <CameraTorch />

        <Suspense fallback={null}>
          <MarioEarth
            reliefScale={fixedRelief}
            isRotating={isRotating}
            isResetting={isResetting}
            onCityClick={handleCityClick}
            windmillRotation={windmillRotation}
            cityStatus={cityStatus}
            cities={cities}
          />
          <StarryBackground />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={1} />
        </Suspense>

        <MeteorZoom
          targetPos={zoomTarget}
          isResetting={isResetting}
          onFinishZoom={() => setShowPhotos(true)}
          onFinishReset={onResetFinished}
          finalViewDistance={FIXED_ARRIVAL_DISTANCE}
          onUserInteract={() => setIsRotating(false)}
          onResumeRotation={() => setIsRotating(true)}
        />
      </Canvas>

      <Loader />

      <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex flex-col items-start gap-4">
        <div>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: 'Fredoka, sans-serif', color: 'var(--text-primary)' }}>
            Pour Mika
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>Explore nos souvenirs</p>
        </div>

        {/* Return Button */}
        {(selectedCity !== null && !isResetting) && (
          <button
            onClick={handleReturn}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 transition-all duration-[220ms] hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-btn)',
              color: 'var(--text-primary)',
              fontFamily: 'Fredoka, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-dim)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Retour
          </button>
        )}
      </div>

      {/* Country with sub-cities → SubCityPicker */}
      {(showPhotos && selectedCity?.subCities?.length && !selectedSubCity) && (
        <SubCityPicker
          countryName={selectedCity.name}
          subCities={selectedCity.subCities}
          onSelect={handleSubCitySelect}
        />
      )}

      {/* Regular city OR sub-city selected → DestinationChoiceUI */}
      {(showPhotos && selectedCity && (!selectedCity.subCities?.length || selectedSubCity)) && (
        <DestinationChoiceUI
          city={{
            ...selectedCity,
            name: selectedSubCity?.name ?? selectedCity.name,
            description: selectedSubCity?.description ?? selectedCity.description,
            images: allImages,
          }}
          onAccept={handleAcceptCity}
          onReject={handleRejectCity}
        />
      )}

      {/* Burger Menu Button — visible quand ville/sub-city active */}
      {(showPhotos && selectedCity && (!selectedCity.subCities?.length || selectedSubCity)) && (
        <button
          onClick={() => setSidePanelOpen(prev => !prev)}
          className="absolute top-6 right-6 z-[200] pointer-events-auto w-10 h-10 flex flex-col items-center justify-center gap-[4px] rounded-[var(--radius-btn)] border transition-all duration-[220ms] hover:scale-[1.05] active:scale-[0.96]"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-dim)' }}
        >
          <span className={`block w-5 h-[2px] rounded transition-all duration-300 ${sidePanelOpen ? 'rotate-45 translate-y-[6px]' : ''}`} style={{ background: 'var(--text-primary)' }} />
          <span className={`block w-5 h-[2px] rounded transition-all duration-300 ${sidePanelOpen ? 'opacity-0' : ''}`} style={{ background: 'var(--text-primary)' }} />
          <span className={`block w-5 h-[2px] rounded transition-all duration-300 ${sidePanelOpen ? '-rotate-45 -translate-y-[6px]' : ''}`} style={{ background: 'var(--text-primary)' }} />
        </button>
      )}

      {/* Side Panel - Photo Gallery */}
      {selectedCity && (
        <>
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-500 ${sidePanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            style={{ zIndex: 150 }}
            onClick={() => setSidePanelOpen(false)}
          />

          {/* Panel */}
          <div
            className={`absolute top-0 right-0 h-full w-[400px] max-w-[85vw] border-l shadow-[-10px_0_40px_rgba(0,0,0,0.6)] transition-transform duration-500 ease-out overflow-y-auto ${sidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ zIndex: 160, background: 'var(--bg-overlay)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(12px)' }}
          >
            {/* Panel Header */}
            <div className="sticky top-0 p-5 border-b" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-xl font-semibold" style={{ fontFamily: 'Fredoka, sans-serif', color: 'var(--text-primary)' }}>
                {selectedSubCity?.name ?? selectedCity.name}
              </h3>
              <p className="text-xs tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {selectedSubCity ? `${selectedCity.name} · Photos & Souvenirs` : 'Photos & Souvenirs'}
              </p>
            </div>

            {/* Photo Grid — grouped by date */}
            <div className="p-4 grid grid-cols-2 gap-x-3 gap-y-3">
              {galleryItems.length > 0 ? galleryItems.map(item => {

                // ── Date header ────────────────────────────────────────────
                if (item.type === 'header') return (
                  <div key={item.key} className="col-span-2 flex items-center gap-2.5 mt-3 first:mt-0">
                    <span
                      className="text-[11px] tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--text-faint)', fontFamily: 'Fredoka, sans-serif', letterSpacing: '0.06em' }}
                    >
                      {item.label}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                  </div>
                );

                // ── Photo tile ─────────────────────────────────────────────
                const { url: img, photoIdx } = item;
                const isUploaded = uploadedUrls.has(img);
                const uploadedPhoto = isUploaded ? uploadedPhotos.find(p => p.url === img) : null;
                const isPreview = uploadedPhoto?.isPreview ?? false;
                const featuredOrder = uploadedPhoto?.featuredOrder ?? null;

                const nextFeaturedOrder = (): 1 | 2 | 3 | null => {
                  if (featuredOrder === null) {
                    for (const slot of [1, 2, 3] as const) {
                      if (!uploadedPhotos.some(p => p.featuredOrder === slot)) return slot;
                    }
                    return 1;
                  }
                  if (featuredOrder === 1) return 2;
                  if (featuredOrder === 2) return 3;
                  return null;
                };

                return (
                  <div
                    key={img}
                    className="group relative rounded-xl overflow-hidden"
                    style={{
                      border: `1px solid ${isPreview || featuredOrder ? 'var(--accent-dim)' : 'var(--border-subtle)'}`,
                      opacity: sidePanelOpen ? 1 : 0,
                      transform: sidePanelOpen ? 'translateX(0)' : 'translateX(40px)',
                      transition: `all 0.5s ease-out ${0.15 + photoIdx * 0.07}s`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = isPreview || featuredOrder ? 'var(--accent-dim)' : 'var(--border-subtle)'; }}
                  >
                    <img src={img} alt={`photo ${photoIdx + 1}`} className="w-full h-auto block rounded-xl" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Role badges */}
                    {isPreview && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>
                        Aperçu
                      </div>
                    )}
                    {featuredOrder && (
                      <div
                        className="absolute top-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: 'var(--accent)', color: 'var(--accent-text)', left: isPreview ? '52px' : '8px' }}
                      >
                        {featuredOrder}
                      </div>
                    )}

                    {/* Action buttons (uploaded only, on hover) */}
                    {isUploaded && uploadedPhoto && (
                      <div className="absolute bottom-2 left-0 right-0 px-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => setPhotoRole(uploadedPhoto.filename, 'preview', !isPreview)}
                          className="flex-1 py-1 rounded text-[10px] font-semibold transition-all"
                          style={{ background: isPreview ? 'var(--accent)' : 'rgba(0,0,0,0.65)', color: isPreview ? 'var(--accent-text)' : 'rgba(255,255,255,0.8)', border: `1px solid ${isPreview ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`, backdropFilter: 'blur(4px)' }}
                        >
                          Aperçu
                        </button>
                        <button
                          onClick={() => setPhotoRole(uploadedPhoto.filename, 'featured', nextFeaturedOrder())}
                          className="flex-1 py-1 rounded text-[10px] font-semibold transition-all"
                          style={{ background: featuredOrder ? 'var(--accent)' : 'rgba(0,0,0,0.65)', color: featuredOrder ? 'var(--accent-text)' : 'rgba(255,255,255,0.8)', border: `1px solid ${featuredOrder ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`, backdropFilter: 'blur(4px)' }}
                        >
                          {featuredOrder ? `Affichée ${featuredOrder}` : '+ Afficher'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(uploadedPhoto.filename)}
                          className="w-7 py-1 rounded text-[10px] transition-all"
                          style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(180,40,40,0.7)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.65)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'; }}
                        >✕</button>
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="col-span-2 text-center py-12 italic" style={{ color: 'var(--text-muted)' }}>
                  No photos of us yet
                </div>
              )}
            </div>

            {/* Upload Section */}
            <div className="p-5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <label className="flex flex-col items-center cursor-pointer">
                <div
                  className="w-full py-5 rounded-[var(--radius-card)] border border-dashed flex flex-col items-center gap-2 transition-all duration-[220ms]"
                  style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-surface)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-dim)'; }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: 'var(--text-muted)' }}>
                    <path d="M10 13V4M6 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Ajouter des photos</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      uploadPhotos(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
              {uploadLoading && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>Envoi en cours…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-dim)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-150"
                      style={{ width: `${uploadProgress}%`, background: 'var(--accent)' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Global Smart Upload Button — visible on globe screen (no city selected) */}
      {!selectedCity && !isResetting && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto" style={{ zIndex: 100 }}>
          <label
            className="flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer transition-all duration-[220ms] hover:scale-[1.04] active:scale-[0.97]"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-dim)',
              color: 'var(--text-primary)',
              fontFamily: 'Fredoka, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--border-dim)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 11V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Importer des photos
            <input
              type="file"
              accept="image/*,.zip"
              multiple
              className="hidden"
              onChange={handleGlobalFileInput}
            />
          </label>
        </div>
      )}

      {/* Smart Upload Dialog */}
      {smartUploadFiles && (
        <SmartUploadDialog
          files={smartUploadFiles}
          cities={cities}
          onConfirm={handleSmartUploadConfirm}
          onCancel={() => setSmartUploadFiles(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 300 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div
            className="relative p-8 max-w-sm w-full mx-4"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-card)',
              boxShadow: '0 0 40px rgba(0,0,0,0.8)',
            }}
          >
            <h4 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Supprimer cette photo ?</h4>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Cette action est irréversible.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-5 py-2 rounded-full font-medium border transition-all hover:scale-[1.02]"
                style={{ background: 'transparent', borderColor: 'var(--border-dim)', color: 'var(--text-primary)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  deletePhoto(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="px-5 py-2 rounded-full text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.97]"
                style={{ background: 'var(--danger)' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;