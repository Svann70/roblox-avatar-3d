import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import RealAvatar from './RealAvatar.jsx'
import Hearts from './Hearts.jsx'

export const BG_PRESETS = [
  {
    id: 'studio',
    label: 'Studio Neon',
    icon: '🔮',
    desc: 'Panggung default CAC dengan ambient neon ungu & pink',
    bg: '#0e0d1d',
    fog: '#0e0d1d',
    stageColor: '#1a1426',
    ring1: '#f472b6',
    ring2: '#c084fc',
    ambient: '#ffffff',
    dirColor: '#fff6ed',
    accentColor: '#ffd5e5',
    sparkleColors: ['#f472b6', '#c084fc', '#fde047'],
  },
  {
    id: 'coquette',
    label: 'Pastel Dream',
    icon: '🌸',
    desc: 'Langit pink manis, awan lembut & kilauan mutiara',
    bg: '#25172b',
    fog: '#25172b',
    stageColor: '#3b1d3d',
    ring1: '#fbcfe8',
    ring2: '#f472b6',
    ambient: '#fff1f2',
    dirColor: '#ffe4e6',
    accentColor: '#f472b6',
    sparkleColors: ['#fda4af', '#fbcfe8', '#fef08a'],
  },
  {
    id: 'cyber',
    label: 'Cyber City',
    icon: '⚡',
    desc: 'Grid neon futuristik, cyan & magenta techno',
    bg: '#050814',
    fog: '#050814',
    stageColor: '#0f172a',
    ring1: '#38bdf8',
    ring2: '#ec4899',
    ambient: '#e0f2fe',
    dirColor: '#38bdf8',
    accentColor: '#ec4899',
    sparkleColors: ['#38bdf8', '#818cf8', '#ec4899'],
  },
  {
    id: 'sunset',
    label: 'Golden Sunset',
    icon: '🌅',
    desc: 'Golden hour hangat dengan matahari terbenam estetik',
    bg: '#1c1017',
    fog: '#1c1017',
    stageColor: '#291512',
    ring1: '#f59e0b',
    ring2: '#ea580c',
    ambient: '#fef3c7',
    dirColor: '#fbbf24',
    accentColor: '#f97316',
    sparkleColors: ['#f59e0b', '#fb923c', '#fef08a'],
  },
  {
    id: 'minimal',
    label: 'Clean Dark',
    icon: '🖤',
    desc: 'Studio monokrom minimalis fokus penuh ke karakter',
    bg: '#09090b',
    fog: '#09090b',
    stageColor: '#18181b',
    ring1: '#f4f4f5',
    ring2: '#71717a',
    ambient: '#ffffff',
    dirColor: '#fafafa',
    accentColor: '#a1a1aa',
    sparkleColors: ['#e4e4e7', '#a1a1aa', '#ffffff'],
  },
]

/**
 * Kontrol kamera bergaya Catalog Avatar Creator:
 * Transisi mulus antara tampilan 'body' (seluruh badan) dan 'face' (close-up wajah).
 */
function CACCameraController({ viewMode = 'body', resetCount = 0, autoRotate = false }) {
  const { camera, size } = useThree()
  const controlsRef = useRef(null)
  const isFace = viewMode === 'face'
  const isInit = useRef(true)

  const targetLerp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (!controlsRef.current) return
    const aspect = size.width / size.height

    if (isFace) {
      controlsRef.current.target.set(0, 4.47, 0)
      camera.position.set(0, 4.47, aspect < 0.9 ? 3.4 : 2.9)
    } else {
      const dist = aspect < 0.9 ? 12.8 : aspect < 1.3 ? 10.8 : 9.5
      controlsRef.current.target.set(0, 2.7, 0)
      camera.position.set(0, 3.3, dist)
    }
    controlsRef.current.update()
  }, [viewMode, resetCount, isFace, size.width, size.height, camera])

  useFrame((_, dt) => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    const d = Math.min(dt, 0.05)

    if (isFace) {
      targetLerp.set(0, 4.47, 0)
    } else {
      targetLerp.set(0, 2.7, 0)
    }

    if (isInit.current) {
      isInit.current = false
      return
    }

    ctrl.target.lerp(targetLerp, d * 5)
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={isFace ? [0, 4.47, 0] : [0, 2.7, 0]}
      enablePan={false}
      minDistance={isFace ? 1.5 : 3.8}
      maxDistance={14}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 + 0.02}
      autoRotate={autoRotate}
      autoRotateSpeed={1.0}
    />
  )
}

function Stage({ preset }) {
  const isCoquette = preset.id === 'coquette'
  const isCyber = preset.id === 'cyber'
  const isSunset = preset.id === 'sunset'

  return (
    <group>
      {/* Platform podium utama */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[2.7, 2.9, 0.28, 48]} />
        <meshStandardMaterial color={preset.stageColor} roughness={0.55} metalness={0.2} />
      </mesh>
      {/* Ring neon atas */}
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.45, 0.03, 12, 80]} />
        <meshStandardMaterial color={preset.stageColor} emissive={preset.ring1} emissiveIntensity={2.0} />
      </mesh>
      {/* Ring neon bawah */}
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.86, 0.022, 12, 80]} />
        <meshStandardMaterial color={preset.stageColor} emissive={preset.ring2} emissiveIntensity={1.5} />
      </mesh>

      {/* Cyber Grid Dekoratif */}
      {isCyber && (
        <group position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.0, 5.2, 32]} />
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.25} />
        </group>
      )}

      {/* Coquette Clouds Awan Halus Melayang */}
      {isCoquette && (
        <group position={[0, 0, 0]}>
          {[-3.0, 3.0].map((x, idx) => (
            <group key={idx} position={[x, 0.35, -0.6]}>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.55, 16, 16]} />
                <meshStandardMaterial color="#fdf2f8" roughness={0.9} emissive="#fbcfe8" emissiveIntensity={0.25} />
              </mesh>
              <mesh position={[0.35, -0.08, 0.1]}>
                <sphereGeometry args={[0.42, 16, 16]} />
                <meshStandardMaterial color="#fdf2f8" roughness={0.9} emissive="#fbcfe8" emissiveIntensity={0.25} />
              </mesh>
              <mesh position={[-0.35, -0.08, -0.1]}>
                <sphereGeometry args={[0.38, 16, 16]} />
                <meshStandardMaterial color="#fdf2f8" roughness={0.9} emissive="#fbcfe8" emissiveIntensity={0.25} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Sunset Horizon Sun Disk */}
      {isSunset && (
        <mesh position={[0, 4.2, -10]}>
          <circleGeometry args={[2.8, 32]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.65} />
        </mesh>
      )}
    </group>
  )
}

export default function AvatarCanvas({
  emote,
  rigType = 'R15',
  outfitUrl,
  hairColor,
  accessories,
  accColors = {},
  accScale = 1.0,
  bgPresetId = 'studio',
  viewMode = 'body',
  autoRotate = false,
  resetCount = 0,
  onAvatarClick,
  equippedItems = [],
}) {
  const heartsRef = useRef(null)
  const cameraProps = useMemo(() => ({ position: [0, 3.3, 9.6], fov: 32 }), [])

  const currentBg = useMemo(
    () => BG_PRESETS.find((b) => b.id === bgPresetId) || BG_PRESETS[0],
    [bgPresetId],
  )

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const interact = () => {
    heartsRef.current?.burst([0, 4.0, 0.5])
    onAvatarClick?.()
  }

  return (
    <Canvas
      dpr={[1, 2]}
      camera={cameraProps}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      aria-label="Panggung 3D karakter Roblox Catalog Avatar Creator"
    >
      <color attach="background" args={[currentBg.bg]} />
      <fog attach="fog" args={[currentBg.fog, 12, 28]} />

      <ambientLight intensity={0.9} color={currentBg.ambient} />
      <directionalLight position={[4, 7, 5]} intensity={1.7} color={currentBg.dirColor} castShadow />
      <directionalLight position={[-4, 4, -3]} intensity={0.7} color={currentBg.accentColor} />
      <pointLight position={[0, 4.4, 3.2]} intensity={12} color="#fff1f2" />

      <Suspense fallback={null}>
        <Stage preset={currentBg} />
        <RealAvatar
          emote={emote}
          rigType={rigType}
          outfitUrl={outfitUrl}
          hairColor={hairColor}
          accessories={accessories}
          accColors={accColors}
          accScale={accScale}
          onInteract={interact}
          equippedItems={equippedItems}
        />
        <ContactShadows position={[0, 0.305, 0]} opacity={0.55} scale={7} blur={2.6} far={4} />

        {!reducedMotion && (
          <>
            <Sparkles count={50} scale={[7, 6, 7]} position={[0, 3, 0]} size={2.5} speed={0.35} color={currentBg.sparkleColors[0]} />
            <Sparkles count={30} scale={[8, 7, 8]} position={[0, 3, 0]} size={3.0} speed={0.22} color={currentBg.sparkleColors[1]} />
            <Sparkles count={20} scale={[6, 5, 6]} position={[0, 2.5, 0]} size={2.0} speed={0.28} color={currentBg.sparkleColors[2]} />
          </>
        )}

        <Hearts ref={heartsRef} />

        <Environment resolution={128} frames={1}>
          <Lightformer intensity={1.8} position={[0, 5, -6]} scale={[10, 3, 1]} color="#ffffff" />
          <Lightformer intensity={0.9} position={[-6, 2, -1]} rotation-y={Math.PI / 2} scale={[7, 3, 1]} color={currentBg.ring1} />
          <Lightformer intensity={1.0} position={[6, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[7, 3, 1]} color={currentBg.ring2} />
        </Environment>
      </Suspense>

      <CACCameraController
        viewMode={viewMode}
        resetCount={resetCount}
        autoRotate={autoRotate}
      />
    </Canvas>
  )
}
