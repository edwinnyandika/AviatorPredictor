import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Trail, Sphere, Stars, Text, Grid, Line } from '@react-three/drei';
import * as THREE from 'three';

const PlaneEntity = ({ currentMultiplier, isCrashed }) => {
  const meshRef = useRef();
  
  // Smoothly interpolate altitude based on multiplier
  useFrame(({ clock }, delta) => {
    if (meshRef.current) {
      if (isCrashed) {
        // Drop fast on crash
        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 0, 0.1);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, -Math.PI / 4, 0.1);
      } else {
        const targetY = Math.log(currentMultiplier || 1) * 5; // Logarithmic scaling for visual sanity
        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.05);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, Math.sin(clock.getElapsedTime()) * 0.1, 0.05); // Subtle turbulent wobble
      }
    }
  });

  return (
    <group ref={meshRef} position={[-5, 0, 0]}>
      <Trail width={5} color={isCrashed ? '#ff3366' : '#00ff88'} length={30} attenuation={(t) => t * t}>
        <Sphere args={[0.2, 16, 16]}>
          <meshStandardMaterial 
            color={isCrashed ? "#ff3366" : "#ffffff"} 
            emissive={isCrashed ? "#ff0000" : "#00ff88"} 
            emissiveIntensity={2} 
          />
        </Sphere>
      </Trail>
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.5}
        color={isCrashed ? "#ff3366" : "#ffffff"}
        anchorX="center"
        anchorY="middle"
      >
        {isCrashed ? 'IMPACT' : `${(currentMultiplier || 1.0).toFixed(2)}x`}
      </Text>
    </group>
  );
};

// Extrapolate recent history as static glowing arches
const HistoricalTrails = ({ history }) => {
  const lines = useMemo(() => {
    return history.map((crashPoint, index) => {
      const points = [];
      const zOffset = (index + 1) * -1.5; // Stacking them deeper into the screen
      
      const segments = 20;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = THREE.MathUtils.lerp(-5, 5, t); // Span across X
        // Logarithmic arc, mapped to the crash value
        const maxAlt = Math.log(parseFloat(crashPoint) || 1) * 3;
        const y = Math.sin(t * Math.PI) * maxAlt; 
        points.push(new THREE.Vector3(x, y, zOffset));
      }
      return { id: index, points, crashPoint };
    });
  }, [history]);

  return (
    <group>
      {lines.map((lineData) => (
        <group key={lineData.id}>
          <Line
            points={lineData.points}
            color="rgba(255, 107, 53, 0.3)"
            lineWidth={2}
            transparent
            dashed={false}
          />
          <Text
            position={[5.5, 0, lineData.points[0].z]}
            fontSize={0.3}
            color="rgba(255,255,255,0.4)"
          >
            {lineData.crashPoint}x
          </Text>
        </group>
      ))}
    </group>
  );
};

export default function FlightTracker3D({ history = [], currentMultiplier = 1.0, isCrashed = false }) {
  // Take last 10 rounds for historical paths
  const displayHistory = history.slice(0, 10);
  
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#050508', borderRadius: '18px', overflow: 'hidden', position: 'relative' }}>
        <Canvas camera={{ position: [0, 4, 12], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#ff6b35" />
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <Grid 
            position={[0, -0.5, 0]} 
            args={[30, 30]} 
            cellSize={1} 
            cellThickness={1} 
            cellColor="#222" 
            sectionSize={5} 
            sectionThickness={1.5} 
            sectionColor="#ff6b35" 
            fadeDistance={25} 
            fadeStrength={1} 
          />
          
          <HistoricalTrails history={displayHistory} />
          <PlaneEntity currentMultiplier={currentMultiplier} isCrashed={isCrashed} />
          
          <OrbitControls 
            enablePan={false} 
            minPolarAngle={Math.PI / 4} 
            maxPolarAngle={Math.PI / 2 - 0.1}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
        
        <div style={{ position: 'absolute', top: '16px', left: '20px', pointerEvents: 'none' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--clr-accent)', letterSpacing: '2px' }}>
                WebGL Hardware Accel.
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', background: 'rgba(255,107,53,0.2)', color: '#ff6b35', padding: '2px 8px', borderRadius: '10px' }}>GPU ON</span>
                <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '2px 8px', borderRadius: '10px' }}>60 FPS</span>
            </div>
        </div>
    </div>
  );
}
