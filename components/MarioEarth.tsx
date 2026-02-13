import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

interface MarioEarthProps {
  reliefScale: number;
  isRotating: boolean;
  isResetting: boolean;
  onCityClick: (pos: THREE.Vector3) => void;
  windmillRotation?: [number, number, number];
}
// ... (rest of the file until sphereArgs)

interface City {
  name: string;
  lat: number;
  lng: number;
  type: 'eiffel' | 'windmill' | 'parthenon';
}

const CITIES: City[] = [
  { name: 'Paris', lat: 48.8566, lng: 2.3522, type: 'eiffel' },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, type: 'windmill' },
  { name: 'Athènes', lat: 37.9838, lng: 23.7275, type: 'parthenon' },
];

const latLngToVector3 = (lat: number, lng: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

import { useGLTF } from '@react-three/drei';
import { OBJLoader } from 'three-stdlib';

const EiffelTower = () => {
  const obj = useLoader(OBJLoader, '/tour_eiffel.obj');
  const clonedObj = useMemo(() => obj.clone(), [obj]);

  return (
    <group rotation={[0, 0, 0]}>
      <primitive
        object={clonedObj}
        scale={0.0035}
        position={[0.03, -0.02, 0.03]}
        castShadow
      />
    </group>
  );
};

const Windmill = ({ rotation }: { rotation?: [number, number, number] }) => {
  const { scene } = useGLTF('/Windmill.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    <group rotation={[0, 1, 0]}>
      <primitive
        object={clonedScene}
        scale={0.008}
        position={[0.03, 0.026, 0.026]}
        castShadow
      />
    </group>
  );
};

const Parthenon = () => {
  const { scene } = useGLTF('/My_Parthenon1000.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    <group rotation={[0, 0, 0]}>
      <primitive
        object={clonedScene}
        scale={0.1}
        position={[0, 0, 0]}
        castShadow
      />
    </group>
  );
};

const LightBeacon = ({ visible }: { visible: boolean }) => {
  const meshRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    if (meshRef.current && coreRef.current && glowRef.current && lightRef.current) {
      // Animate scale.y: Grow when visible, shrink when hidden
      const targetScale = visible ? 1 : 0;
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScale, delta * 3);

      // Animate opacity
      const targetOpacity = visible ? 0.5 : 0;
      const coreMat = coreRef.current.material as THREE.MeshBasicMaterial;
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;

      coreMat.opacity = THREE.MathUtils.lerp(coreMat.opacity, targetOpacity, delta * 3);
      glowMat.opacity = THREE.MathUtils.lerp(glowMat.opacity, targetOpacity * 0.2, delta * 3);

      // Animate Light Intensity
      const targetIntensity = visible ? 0.1 : 0;
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, delta * 3);

      // Hide completely if tiny to save GPU
      meshRef.current.visible = meshRef.current.scale.y > 0.01;
    }
  });

  return (
    <group ref={meshRef} position={[0, 0, 0]}>
      {/* Light Source at base */}
      <pointLight ref={lightRef} distance={0.5} decay={2} color="#00ffff" intensity={0} position={[0, 0.05, 0]} />

      {/* Core Beam (Bright) */}
      <mesh ref={coreRef} position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 1.5, 8]} />
        <meshBasicMaterial color="#ccffff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Outer Glow (Wide & Faint) */}
      <mesh ref={glowRef} position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1.5, 16]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group >
  );
};

const CityMonument: React.FC<{
  city: City;
  position: THREE.Vector3;
  windmillRotation?: [number, number, number];
  isRotating: boolean;
  onClick: (pos: THREE.Vector3) => void
}> = ({ city, position, windmillRotation, isRotating, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  React.useEffect(() => {
    if (!isRotating) {
      setHovered(false);
    }
  }, [isRotating]);

  const quaternion = useMemo(() => {
    // Align the local Y-axis (0, 1, 0) to "up" (surface normal).
    const normal = position.clone().normalize();
    const quaternion = new THREE.Quaternion();

    // We want the object's UP (Y) to point along the normal.
    // If we use lookAt, THREE aligns Z to the target. That's why we had to rotate -90 on X.
    // This method is generally better for "standing" objects.
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

    return quaternion;
  }, [position]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick(position);
  };

  return (
    <group
      ref={groupRef}
      position={position}
      quaternion={quaternion}
      onClick={handleClick}
      onPointerOver={() => isRotating && setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <group scale={hovered ? 1.5 : 1}>
        {city.type === 'eiffel' && <EiffelTower />}
        {city.type === 'windmill' && <Windmill key={windmillRotation?.join('-')} rotation={windmillRotation} />}
        {city.type === 'parthenon' && <Parthenon />}
      </group>

      <mesh visible={hovered}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={0.2} />
      </mesh>

      <LightBeacon visible={isRotating} />
    </group >
  );
};

const MarioEarth: React.FC<MarioEarthProps> = ({ reliefScale, isRotating, isResetting, onCityClick, windmillRotation }) => {
  const globeGroupRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [segments, setSegments] = useState(128);

  // Manage resolution transition
  React.useEffect(() => {
    if (!isRotating) {
      // Landing: High res immediately
      setSegments(512);
    } else if (isResetting) {
      // Takeoff: Step down
      // Start at 512 (already set), wait then drop
      const t1 = setTimeout(() => setSegments(256), 500);
      const t2 = setTimeout(() => setSegments(128), 1000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      // Orbit: Standard res
      setSegments(128);
    }
  }, [isRotating, isResetting]);

  const [specularMap, heightMap, cloudsMap, lightsMap] = useLoader(TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
    'https://unpkg.com/three-globe/example/img/earth-topology.png',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png'
  ]);

  const uniforms = useMemo(() => ({
    uReliefScale: { value: reliefScale },
    uMinHeight: { value: 0.12 },
    uMask: { value: specularMap },
    uLights: { value: lightsMap }
  }), [specularMap, reliefScale, lightsMap]);

  const pins = useMemo(() => {
    const pinRadius = 2.05;
    return CITIES.map(city => ({
      city,
      pos: latLngToVector3(city.lat, city.lng, pinRadius)
    }));
  }, []);

  useFrame((state, delta) => {
    if (globeGroupRef.current && isRotating) {
      globeGroupRef.current.rotation.y += delta * 0.05;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.04;
      cloudsRef.current.rotation.x += delta * 0.002;
    }
    uniforms.uReliefScale.value = reliefScale;
  });

  const handleCityClick = (localPos: THREE.Vector3) => {
    if (globeGroupRef.current) {
      globeGroupRef.current.updateMatrixWorld();
      const worldPos = localPos.clone().applyMatrix4(globeGroupRef.current.matrixWorld);
      onCityClick(worldPos);
    }
  };

  const sphereArgs = useMemo<[number, number, number]>(() => [1.9, segments, segments], [segments]);

  return (
    <group>
      <group ref={globeGroupRef}>
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <sphereGeometry args={sphereArgs} />
          <meshStandardMaterial
            color="#44cc00"
            displacementMap={heightMap}
            displacementScale={reliefScale}
            flatShading={true}
            roughness={0.8}
            metalness={0.1}
            onBeforeCompile={(shader) => {
              shader.uniforms.uReliefScale = uniforms.uReliefScale;
              shader.uniforms.uMinHeight = uniforms.uMinHeight;
              shader.uniforms.uMask = uniforms.uMask;
              shader.uniforms.uLights = uniforms.uLights;

              // --- VERTEX SHADER ---

              // 1. Declare uniforms and custom Varying for UV passing
              shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                uniform float uReliefScale;
                uniform float uMinHeight;
                uniform sampler2D uMask;
                varying vec2 vCustomUv;`
              );

              // 2. Pass standard UV to varying
              shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                 vCustomUv = uv;`
              );

              // 3. Exaggerated Relief Logic using raw UVs
              shader.vertexShader = shader.vertexShader.replace(
                '#include <displacementmap_vertex>',
                `#ifdef USE_DISPLACEMENTMAP
                  float maskVal = texture2D(uMask, uv).r;
                  float isLand = 1.0 - maskVal;
                  float landFactor = smoothstep(0.4, 0.5, isLand);
                  float mountainHeight = texture2D(displacementMap, uv).x;
                  float totalExtrusion = (uMinHeight + (mountainHeight * uReliefScale)) * landFactor;
                  transformed += normalize(objectNormal) * totalExtrusion;
                #endif`
              );

              // --- FRAGMENT SHADER ---

              // 1. Declare uniforms and receiving varying
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                 uniform sampler2D uLights;
                 varying vec2 vCustomUv;`
              );

              // 2. Night Lights Logic (using totalEmissiveRadiance)
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <lights_fragment_end>',
                `#include <lights_fragment_end>
                 // Check intensity of diffuse light (Sun)
                 // We use the diffuse term to detect shadow/light side
                 float lightIntensity = dot(reflectedLight.directDiffuse, vec3(0.333));
                 
                 // Create a mask: 1.0 when dark (night), 0.0 when bright (day)
                 // STRICT Cutoff at 10% luminosity (0.1)
                 // smoothstep(0.0, 0.1, lightIntensity) returns 1.0 if intensity >= 0.1
                 // So nightMask becomes 0.0 (lights OFF) when intensity >= 0.1
                 float nightMask = 1.0 - smoothstep(0.0, 0.1, lightIntensity);
                 
                 // Sample lights texture
                 vec4 lightsTex = texture2D(uLights, vCustomUv);
                 vec3 nightLightsColor = lightsTex.rgb;

                 // Apply a stronger threshold to make cities look like small concentrated points (Mario Galaxy style)
                 // Increased from 0.3 to 0.4 to remove dim light pollution areas
                 nightLightsColor = smoothstep(0.4, 0.9, nightLightsColor);
                 
                 // Add lights to total emissive radiance
                 // Multiplied by 8.0 for a brighter "Neon" look in the dark
                 totalEmissiveRadiance += nightLightsColor * nightMask * 8.0;
                `
              );
            }}
          />
        </mesh>

        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[2.0, 128, 128]} />
          <meshStandardMaterial
            color="#1188ff"
            alphaMap={specularMap}
            transparent={true}
            opacity={0.8}
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>

        {pins.map((p, idx) => (
          <CityMonument
            key={idx}
            city={p.city}
            position={p.pos}
            windmillRotation={windmillRotation}
            isRotating={isRotating}
            onClick={handleCityClick}
          />
        ))}
      </group>

      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.25, 64, 32]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent={true}
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          color="#ffffff"
        />
      </mesh>
    </group>
  );
};

export default MarioEarth;