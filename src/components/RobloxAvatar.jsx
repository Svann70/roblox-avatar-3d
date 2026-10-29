import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { makeFaceTexture, makeTeeTexture, makeStripesTexture, makeCheckerTexture, makeFishnetTexture } from '../textures.js'

const TAU = Math.PI * 2
const damp = THREE.MathUtils.damp

// Palet diambil dari avatar asli: kulit pucat (BrickColor 1025),
// rambut hitam messy bun, aksen hijau neon dari outfit scene/emo.
const SKIN = '#e9cfbc'
const CLOTH_BLACK = '#111114'
const HAIR = '#17151c'
const HAIR_LIGHT = '#403a4e'
const BOOT = '#0c0c0f'

export default function RobloxAvatar({ emote = 'idle', onInteract }) {
  const rootRef = useRef(null) // rotasi spin
  const bodyRef = useRef(null) // bounce/bob
  const headRef = useRef(null)
  const armLRef = useRef(null)
  const armRRef = useRef(null)
  const legLRef = useRef(null)
  const legRRef = useRef(null)

  const faceTex = useMemo(() => makeFaceTexture(), [])
  const teeTex = useMemo(() => makeTeeTexture(), [])
  const stripesTex = useMemo(() => makeStripesTexture(), [])
  const checkerTex = useMemo(() => makeCheckerTexture(), [])
  const fishnetTex = useMemo(() => makeFishnetTexture(), [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    const root = rootRef.current
    const body = bodyRef.current
    if (!root || !body) return

    // default: kembali santai
    let bodyY = 0
    let bodyRotX = 0
    let bodyRotY = 0
    let headRotX = 0
    let headRotY = 0
    let headRotZ = 0
    let armL = { z: -(0.06 + Math.sin(t * 1.8) * 0.04), x: 0 }
    let armR = { z: 0.06 + Math.sin(t * 1.8) * 0.04, x: 0 }
    let legL = { x: 0, z: 0 }
    let legR = { x: 0, z: 0 }

    if (emote === 'wave') {
      // emote "Hello" dari profil
      armR.z = 2.45 + Math.sin(t * 9) * 0.3
      armR.x = -0.25
      headRotZ = 0.12
      headRotY = 0.15
      bodyY = Math.sin(t * 9) * 0.015
    } else if (emote === 'dance') {
      // "Jamal Brazil Groove Dance" versi kita
      bodyRotY = Math.sin(t * 5.5) * 0.38
      bodyY = Math.abs(Math.sin(t * 5.5)) * 0.16
      armL.z = -(1.7 + Math.sin(t * 5.5) * 0.9)
      armL.x = 0.25
      armR.z = 1.7 + Math.sin(t * 5.5 + Math.PI) * 0.9
      armR.x = 0.25
      legL.x = Math.sin(t * 5.5) * 0.22
      legR.x = -Math.sin(t * 5.5) * 0.22
      headRotZ = Math.sin(t * 5.5) * 0.14
      headRotY = Math.sin(t * 2.75) * 0.2
    } else if (emote === 'shrug') {
      armL.z = -0.95
      armL.x = -0.55
      armR.z = 0.95
      armR.x = -0.55
      headRotZ = 0.18
      bodyRotX = -0.07
      bodyY = 0.03
    } else if (emote === 'pose') {
      // "Effortless Aura Pose"
      armL.z = 0.85
      armL.x = 0.3
      armR.z = 2.15
      armR.x = -0.5
      headRotZ = -0.16
      headRotY = 0.28
      bodyRotY = -0.3
      bodyRotX = -0.04
      legR.z = -0.16
    }

    // spin: akumulasi rotasi, saat ganti emote pulih ke putaran utuh terdekat
    if (emote === 'spin') {
      root.rotation.y += d * 6.5
    } else {
      const settled = Math.round(root.rotation.y / TAU) * TAU
      root.rotation.y = damp(root.rotation.y, settled, 8, d)
    }

    body.position.y = damp(body.position.y, bodyY, 10, d)
    body.rotation.x = damp(body.rotation.x, bodyRotX, 6, d)
    body.rotation.y = damp(body.rotation.y, bodyRotY, 6, d)

    const head = headRef.current
    head.rotation.x = damp(head.rotation.x, headRotX, 6, d)
    head.rotation.y = damp(head.rotation.y, headRotY, 6, d)
    head.rotation.z = damp(head.rotation.z, headRotZ, 6, d)

    // napas idle selalu aktif di atas emote
    const breathe = Math.sin(t * 1.8) * 0.02
    armLRef.current.rotation.z = damp(armLRef.current.rotation.z, armL.z, 8, d)
    armLRef.current.rotation.x = damp(armLRef.current.rotation.x, armL.x + breathe, 8, d)
    armRRef.current.rotation.z = damp(armRRef.current.rotation.z, armR.z, 8, d)
    armRRef.current.rotation.x = damp(armRRef.current.rotation.x, armR.x - breathe, 8, d)
    legLRef.current.rotation.x = damp(legLRef.current.rotation.x, legL.x, 8, d)
    legLRef.current.rotation.z = damp(legLRef.current.rotation.z, legL.z, 8, d)
    legRRef.current.rotation.x = damp(legRRef.current.rotation.x, legR.x, 8, d)
    legRRef.current.rotation.z = damp(legRRef.current.rotation.z, legR.z, 8, d)
  })

  return (
    // skala dari API: height 1.01 · width 0.98 · depth 0.99
    <group ref={rootRef} position={[0, 0.32, 0]} scale={[0.98, 1.01, 0.99]}>
      <group ref={bodyRef} onClick={onInteract}>
        {/* TORSO — kaos hitam "SOMEBODY NEEDS..." */}
        <RoundedBox args={[2, 2, 1]} radius={0.1} smoothness={4} position={[0, 3, 0]}>
          <meshStandardMaterial color={CLOTH_BLACK} roughness={0.82} />
        </RoundedBox>
        <mesh position={[0, 3, 0.506]}>
          <planeGeometry args={[1.72, 1.86]} />
          <meshStandardMaterial map={teeTex} roughness={0.8} transparent />
        </mesh>
        {/* bagian belakang kaos */}
        <mesh position={[0, 3, -0.506]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.72, 1.86]} />
          <meshStandardMaterial color="#0b0b0d" roughness={0.85} />
        </mesh>

        {/* Lengan — pivot bahu; band hijau di lengan kiri, wristband kotak di kanan */}
        <group ref={armLRef} position={[-1.52, 3.9, 0]}>
          <mesh position={[0, -0.25, 0]}>
            <boxGeometry args={[1.02, 0.52, 1.02]} />
            <meshStandardMaterial color={CLOTH_BLACK} roughness={0.82} />
          </mesh>
          <mesh position={[0, -1.26, 0]}>
            <boxGeometry args={[0.95, 1.5, 0.95]} />
            <meshStandardMaterial color={SKIN} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.72, 0]}>
            <boxGeometry args={[0.99, 0.14, 0.99]} />
            <meshStandardMaterial color="#2fae39" roughness={0.7} />
          </mesh>
        </group>
        <group ref={armRRef} position={[1.52, 3.9, 0]}>
          <mesh position={[0, -0.25, 0]}>
            <boxGeometry args={[1.02, 0.52, 1.02]} />
            <meshStandardMaterial color={CLOTH_BLACK} roughness={0.82} />
          </mesh>
          <mesh position={[0, -1.26, 0]}>
            <boxGeometry args={[0.95, 1.5, 0.95]} />
            <meshStandardMaterial color={SKIN} roughness={0.85} />
          </mesh>
          <mesh position={[0, -1.5, 0]}>
            <boxGeometry args={[1.0, 0.18, 1.0]} />
            <meshStandardMaterial map={checkerTex} roughness={0.75} />
          </mesh>
        </group>

        {/* Kaki — mini shorts + panel fishnet + thigh-high striped + converse */}
        <group ref={legLRef} position={[-0.5, 2, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <boxGeometry args={[1.06, 0.62, 1.06]} />
            <meshStandardMaterial color={CLOTH_BLACK} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.71, 0]}>
            <boxGeometry args={[0.94, 0.22, 0.94]} />
            <meshStandardMaterial color={SKIN} roughness={0.85} />
          </mesh>
          <mesh position={[0, -1.27, 0]}>
            <boxGeometry args={[1.0, 0.92, 1.0]} />
            <meshStandardMaterial map={stripesTex} roughness={0.78} />
          </mesh>
          <mesh position={[0, -1.84, 0.04]}>
            <boxGeometry args={[1.04, 0.26, 1.1]} />
            <meshStandardMaterial color={BOOT} roughness={0.45} />
          </mesh>
          <mesh position={[0, -1.9, 0.5]}>
            <boxGeometry args={[1.0, 0.14, 0.26]} />
            <meshStandardMaterial color="#e8e6e0" roughness={0.6} />
          </mesh>
          <mesh position={[0, -1.72, 0.3]}>
            <boxGeometry args={[0.6, 0.06, 0.34]} />
            <meshStandardMaterial color="#e8e6e0" roughness={0.7} />
          </mesh>
          <mesh position={[0, -1.97, 0.04]}>
            <boxGeometry args={[1.08, 0.07, 1.2]} />
            <meshStandardMaterial color="#e8e6e0" roughness={0.55} />
          </mesh>
        </group>
        <group ref={legRRef} position={[0.5, 2, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <boxGeometry args={[1.06, 0.62, 1.06]} />
            <meshStandardMaterial color={CLOTH_BLACK} roughness={0.8} />
          </mesh>
          <mesh position={[0.55, -0.34, 0]}>
            <boxGeometry args={[0.06, 0.44, 0.52]} />
            <meshStandardMaterial map={fishnetTex} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.71, 0]}>
            <boxGeometry args={[0.94, 0.22, 0.94]} />
            <meshStandardMaterial color={SKIN} roughness={0.85} />
          </mesh>
          <mesh position={[0, -1.27, 0]}>
            <boxGeometry args={[1.0, 0.92, 1.0]} />
            <meshStandardMaterial map={stripesTex} roughness={0.78} />
          </mesh>
          <mesh position={[0, -1.84, 0.04]}>
            <boxGeometry args={[1.04, 0.26, 1.1]} />
            <meshStandardMaterial color={BOOT} roughness={0.45} />
          </mesh>
          <mesh position={[0, -1.9, 0.5]}>
            <boxGeometry args={[1.0, 0.14, 0.26]} />
            <meshStandardMaterial color="#e8e6e0" roughness={0.6} />
          </mesh>
          <mesh position={[0, -1.72, 0.3]}>
            <boxGeometry args={[0.6, 0.06, 0.34]} />
            <meshStandardMaterial color="#e8e6e0" roughness={0.7} />
          </mesh>
          <mesh position={[0, -1.97, 0.04]}>
            <boxGeometry args={[1.08, 0.07, 1.2]} />
            <meshStandardMaterial color="#e8e6e0" roughness={0.55} />
          </mesh>
        </group>

        {/* Kepala + leher — skala head 0.95 dari API */}
        <group ref={headRef} position={[0, 4.05, 0]}>
          <group scale={0.95}>
            <mesh position={[0, 0.16, 0]}>
              <boxGeometry args={[0.52, 0.55, 0.52]} />
              <meshStandardMaterial color={SKIN} roughness={0.85} />
            </mesh>
            <RoundedBox args={[1.26, 1.26, 1.26]} radius={0.14} smoothness={4} position={[0, 0.95, 0]}>
              <meshStandardMaterial color={SKIN} roughness={0.8} />
            </RoundedBox>
            <mesh position={[0, 0.95, 0.634]}>
              <planeGeometry args={[1.12, 1.12]} />
              <meshStandardMaterial map={faceTex} roughness={0.75} transparent />
            </mesh>

            {/* rambut — kubah + volume belakang + bun, poni terang di depan */}
            <mesh position={[0, 0.95, -0.04]}>
              <sphereGeometry args={[0.73, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.44]} />
              <meshStandardMaterial color={HAIR} roughness={0.4} metalness={0.08} />
            </mesh>
            <RoundedBox args={[1.42, 1.05, 0.55]} radius={0.18} smoothness={4} position={[0, 0.82, -0.48]}>
              <meshStandardMaterial color={HAIR} roughness={0.4} metalness={0.08} />
            </RoundedBox>
            {[-0.42, -0.21, 0, 0.21, 0.42].map((x, i) => (
              <mesh
                key={i}
                position={[x, 1.28 - (i % 2) * 0.06, 0.68]}
                rotation={[0.08, 0, i % 2 === 0 ? 0.12 : -0.12]}
              >
                <boxGeometry args={[0.22, 0.38, 0.09]} />
                <meshStandardMaterial color={i % 2 === 0 ? HAIR_LIGHT : HAIR} roughness={0.42} />
              </mesh>
            ))}
            {/* lock samping */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.63, 0.72, -0.04]} rotation={[0, 0, s * 0.04]}>
                <boxGeometry args={[0.16, 0.74, 0.36]} />
                <meshStandardMaterial color={HAIR} roughness={0.42} />
              </mesh>
            ))}
            {/* bun besar + karet ikat */}
            <mesh position={[0, 1.92, -0.3]}>
              <sphereGeometry args={[0.38, 24, 20]} />
              <meshStandardMaterial color={HAIR} roughness={0.4} metalness={0.08} />
            </mesh>
            <mesh position={[0, 1.66, -0.26]} rotation={[0.5, 0, 0]}>
              <torusGeometry args={[0.15, 0.055, 12, 24]} />
              <meshStandardMaterial color="#0a0a0c" roughness={0.5} />
            </mesh>
            {/* helai berantakan */}
            {[
              [0.3, 2.1, -0.2, 0.5],
              [-0.28, 2.05, -0.24, -0.6],
              [0.05, 2.2, -0.3, 0.2],
            ].map(([x, y, z, rz], i) => (
              <mesh key={`fly${i}`} position={[x, y, z]} rotation={[0, 0, rz]}>
                <boxGeometry args={[0.05, 0.3, 0.05]} />
                <meshStandardMaterial color={HAIR_LIGHT} roughness={0.5} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  )
}
