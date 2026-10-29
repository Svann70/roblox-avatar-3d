import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { parseRbxMesh } from '../lib/rbxMesh.js'
import { paintPartTexture, drawLines } from '../lib/partTextures.js'
import { makeFaceTexture } from '../textures.js'

const TAU = Math.PI * 2
const damp = THREE.MathUtils.damp

const SKIN = '#e9cfbc'
const CLOTH = '#111114'
const HAIR = '#17151c'
const HAIR_LIGHT = '#403a4e'

const SKIN_RGB = [233, 207, 188]
const CLOTH_RGB = [11, 11, 13]
const SOCK_GREEN = [53, 181, 63]
const BAND_GREEN = [47, 174, 57]
const BOOT_RGB = [12, 12, 15]
const SOLE_RGB = [232, 230, 224]

/** grafis makhluk hijau ala gir untuk kaos */
function drawGir(ctx, x, y, r, flipY = false) {
  ctx.save()
  ctx.translate(x, y)
  if (flipY) ctx.scale(1, -1)
  const s = r / 78
  ctx.scale(s, s)
  ctx.fillStyle = '#3fd44a'
  ctx.beginPath()
  ctx.ellipse(0, 20, 78, 88, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(-62, -34, 16, 26, -0.5, 0, Math.PI * 2)
  ctx.ellipse(62, -34, 16, 26, 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0b0b0d'
  ctx.beginPath()
  ctx.ellipse(-28, -6, 16, 22, 0, 0, Math.PI * 2)
  ctx.ellipse(28, -6, 16, 22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e5484d'
  ctx.beginPath()
  ctx.ellipse(0, 48, 18, 30, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Gabungkan parsed mesh → THREE.BufferGeometry */
function toGeometry(p) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(p.positions, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(p.normals, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(p.uvs, 2))
  g.setIndex(new THREE.BufferAttribute(p.indices, 1))
  g.computeBoundingSphere()
  return g
}

/**
 * Tekstur debug UV: tiap triangle digambar ke ruang UV dengan warna
 * sesuai arah normal 3D-nya (merah=depan, biru=belakang, kuning=atas, dst).
 */
function makeUVDebugTexture(parsed, size = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#14141c'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  for (let i = 0; i <= 10; i++) {
    ctx.beginPath(); ctx.moveTo((i / 10) * size, 0); ctx.lineTo((i / 10) * size, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, (i / 10) * size); ctx.lineTo(size, (i / 10) * size); ctx.stroke()
  }
  const { uvs, indices, normals } = parsed
  const col = (nx, ny, nz) => {
    if (ny > 0.6) return 'rgba(250, 220, 60, 0.85)'
    if (ny < -0.6) return 'rgba(120, 80, 40, 0.85)'
    if (nz > 0.5) return 'rgba(230, 60, 70, 0.85)'
    if (nz < -0.5) return 'rgba(60, 90, 230, 0.85)'
    if (nx > 0.5) return 'rgba(240, 150, 40, 0.85)'
    if (nx < -0.5) return 'rgba(40, 200, 190, 0.85)'
    return 'rgba(150, 150, 160, 0.5)'
  }
  for (let t = 0; t < indices.length; t += 3) {
    ctx.beginPath()
    for (let k = 0; k < 3; k++) {
      const vi = indices[t + k]
      const u = uvs[vi * 2] * size
      const v = (1 - uvs[vi * 2 + 1]) * size
      if (k === 0) ctx.moveTo(u, v)
      else ctx.lineTo(u, v)
    }
    ctx.closePath()
    const nx = normals[indices[t] * 3]
    const ny = normals[indices[t] * 3 + 1]
    const nz = normals[indices[t] * 3 + 2]
    ctx.fillStyle = col(nx, ny, nz)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Muat semua part mesh dari /parts/ */
async function loadParts() {
  const manifest = await fetch('/parts/manifest.json').then((r) => r.json())
  const out = {}
  for (const [name, info] of Object.entries(manifest.parts)) {
    const buf = await fetch(`/parts/${info.file}`).then((r) => r.arrayBuffer())
    out[name] = parseRbxMesh(buf)
  }
  return out
}

// ── parameter perakitan (dituning visual) ──
const FIT = {
  torso: { pos: [0, 2.78, 0], scale: [1.0, 1.0, 1.0] },
  leftLeg: { pos: [-0.36, 1.0, 0.0], scale: [0.8, 1.5, 0.8] },
  rightLeg: { pos: [0.36, 1.0, 0.0], scale: [0.8, 1.5, 0.8] },
  armSpan: 0.92,
  armScale: [1.0, 1.8, 1.0],
  armDrop: 0.75,
}

export default function RobloxRealAvatar({ emote = 'idle', onInteract, debugUV = false, debugY = false }) {
  const rootRef = useRef(null)
  const bodyRef = useRef(null)
  const headRef = useRef(null)
  const armLRef = useRef(null)
  const armRRef = useRef(null)
  const legLRef = useRef(null)
  const legRRef = useRef(null)

  const [parts, setParts] = useState(null)
  useEffect(() => {
    let alive = true
    loadParts()
      .then((p) => alive && setParts(p))
      .catch((e) => console.error('Gagal memuat parts:', e))
    return () => {
      alive = false
    }
  }, [])

  const geos = useMemo(() => {
    if (!parts) return null
    const g = {}
    for (const [name, parsed] of Object.entries(parts)) g[name] = toGeometry(parsed)
    return g
  }, [parts])

  const debugTexes = useMemo(() => {
    if (!parts || !debugUV) return null
    const t = {}
    for (const [name, parsed] of Object.entries(parts)) t[name] = makeUVDebugTexture(parsed)
    return t
  }, [parts, debugUV])

  const faceTex = useMemo(() => makeFaceTexture(), [])

  // ── tekstur pakaian dilukis dari data posisi mesh ──
  const painted = useMemo(() => {
    if (!parts || debugUV) return null
    const rainbow = debugY // merah=atas mesh, biru=bawah mesh
    const byY = (yFrac) => {
      const h = 240 - yFrac * 240
      const f = (n) => {
        const k = (n + h / 30) % 12
        return Math.round(255 * Math.max(0, Math.min(1, Math.min(k - 3, 9 - k, 1))))
      }
      return [f(0), f(8), f(4), 255]
    }

    // TORSO: kaos hitam penuh + seni ter-anchor di centroid pulau dada
    const torso = paintPartTexture(parts.torso, 1024, () => CLOTH_RGB)
    {
      // statistik pulau UV dada (triangle nz < -0.6)
      let mu = 0, mv = 0, n = 0
      const us = [], vs = []
      const { indices, uvs, normals } = parts.torso
      for (let t = 0; t < indices.length; t += 3) {
        let nz = 0
        for (let k = 0; k < 3; k++) nz += normals[indices[t + k] * 3 + 2] / 3
        if (nz >= -0.6) continue
        for (let k = 0; k < 3; k++) {
          us.push(uvs[indices[t + k] * 2])
          vs.push(uvs[indices[t + k] * 2 + 1])
        }
      }
      n = us.length
      if (n > 0) {
        mu = us.reduce((a, b) => a + b, 0) / n
        mv = vs.reduce((a, b) => a + b, 0) / n
        const su = Math.sqrt(us.reduce((a, b) => a + (b - mu) ** 2, 0) / n)
        const sv = Math.sqrt(vs.reduce((a, b) => a + (b - mv) ** 2, 0) / n)
        const size = 1024
        const px = mu * size
        const py = (1 - mv) * size
        const w = su * 2 * size // lebar efektif area dada
        drawLines(
          torso.ctx,
          { u0: mu - su * 0.95, u1: mu + su * 0.35, v0: mv + sv * 0.1, v1: mv + sv * 0.95 },
          size,
          ['SOMEBODY', 'NEEDS A', 'HUG'],
          { font: { sizePx: Math.min(w * 0.135, sv * size * 0.5) }, color: '#3fd44a', flipY: true },
        )
        drawGir(torso.ctx, px + w * 0.42, py + sv * size * 0.35, w * 0.17, true)
      }
    }

    // LENGAN: sleeve hitam di atas, skin di bawah, band aksen
    const armPaint = (side) => ({ yFrac, u, v }) => {
      if (rainbow) return byY(yFrac)
      if (yFrac > 0.52) return CLOTH_RGB
      if (side === 'right' && yFrac > 0.13 && yFrac < 0.21) {
        const check = (Math.floor(u * 26) + Math.floor(v * 26)) % 2 === 0
        return check ? BAND_GREEN : [13, 13, 16]
      }
      if (side === 'left' && yFrac > 0.4 && yFrac < 0.47) return BAND_GREEN
      return SKIN_RGB
    }
    const leftArm = paintPartTexture(parts.leftArm, 512, armPaint('left'))
    const rightArm = paintPartTexture(parts.rightArm, 512, armPaint('right'))

    // KAKI: shorts + panel fishnet, skin, thigh-high stripes, boots
    const legPaint = ({ cy, nx, yFrac, u, v }) => {
      if (rainbow) return byY(yFrac)
      if (yFrac >= 0.62) {
        if (Math.abs(nx) > 0.72 && yFrac > 0.68) {
          const check = (Math.floor(u * 20) + Math.floor(v * 20)) % 2 === 0
          return check ? BAND_GREEN : [13, 13, 16]
        }
        return CLOTH_RGB
      }
      if (yFrac >= 0.38) return SKIN_RGB
      if (yFrac >= 0.09) {
        return Math.floor((cy + 0.7) * 7.5) % 2 === 0 ? SOCK_GREEN : [16, 16, 19]
      }
      if (yFrac < 0.025) return SOLE_RGB
      return BOOT_RGB
    }
    const leftLeg = paintPartTexture(parts.leftLeg, 512, legPaint)
    const rightLeg = paintPartTexture(parts.rightLeg, 512, legPaint)

    return { torso, leftArm, rightArm, leftLeg, rightLeg }
  }, [parts, debugUV])


  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    const root = rootRef.current
    const body = bodyRef.current
    if (!root || !body) return

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
      armR.z = 2.45 + Math.sin(t * 9) * 0.3
      armR.x = -0.25
      headRotZ = 0.12
      headRotY = 0.15
      bodyY = Math.sin(t * 9) * 0.015
    } else if (emote === 'dance') {
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

    // bereaksi: kepala mengikuti posisi kursor
    headRotY += state.pointer.x * 0.55
    headRotX += -state.pointer.y * 0.3

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
    // karakter Roblox menghadap -Z lokal; dibalik 180° agar menghadap kamera
    <group rotation={[0, Math.PI, 0]}>
      <group ref={rootRef} position={[0, 0.32, 0]} scale={[0.98, 1.01, 0.99]}>
        <group ref={bodyRef} onClick={onInteract}>
        {geos && (
          <>
            {/* TORSO asli */}
            <mesh geometry={geos.torso} position={FIT.torso.pos} scale={FIT.torso.scale}>
              {debugUV ? (
                <meshStandardMaterial map={debugTexes.torso} emissiveMap={debugTexes.torso} emissive="#ffffff" emissiveIntensity={0.85} roughness={0.8} side={THREE.DoubleSide} />
              ) : painted ? (
                <meshStandardMaterial map={painted.torso.tex} roughness={0.82} side={THREE.DoubleSide} />
              ) : (
                <meshStandardMaterial color={CLOTH} roughness={0.82} side={THREE.DoubleSide} />
              )}
            </mesh>

            {/* Lengan asli — pivot bahu */}
            <group ref={armLRef} position={[-FIT.armSpan, 3.5, 0]}>
              <mesh geometry={geos.leftArm} position={[0, -FIT.armDrop, 0]} scale={FIT.armScale}>
                {debugUV ? (
                  <meshStandardMaterial map={debugTexes.leftArm} emissiveMap={debugTexes.leftArm} emissive="#ffffff" emissiveIntensity={0.85} roughness={0.8} side={THREE.DoubleSide} />
                ) : painted ? (
                  <meshStandardMaterial map={painted.leftArm.tex} emissiveMap={debugY ? painted.leftArm.tex : null} emissive={debugY ? '#ffffff' : '#000000'} roughness={0.85} side={THREE.DoubleSide} />
                ) : (
                  <meshStandardMaterial color={SKIN} roughness={0.85} side={THREE.DoubleSide} />
                )}
              </mesh>
            </group>
            <group ref={armRRef} position={[FIT.armSpan, 3.5, 0]}>
              <mesh geometry={geos.rightArm} position={[0, -FIT.armDrop, 0]} scale={FIT.armScale}>
                {debugUV ? (
                  <meshStandardMaterial map={debugTexes.rightArm} emissiveMap={debugTexes.rightArm} emissive="#ffffff" emissiveIntensity={0.85} roughness={0.8} side={THREE.DoubleSide} />
                ) : painted ? (
                  <meshStandardMaterial map={painted.rightArm.tex} emissiveMap={debugY ? painted.rightArm.tex : null} emissive={debugY ? '#ffffff' : '#000000'} roughness={0.85} side={THREE.DoubleSide} />
                ) : (
                  <meshStandardMaterial color={SKIN} roughness={0.85} side={THREE.DoubleSide} />
                )}
              </mesh>
            </group>

            {/* Kaki asli — pivot pinggul */}
            <group ref={legLRef} position={[-0.33, 2.0, 0]}>
              <mesh geometry={geos.leftLeg} position={[0, -1.0, 0]} scale={FIT.leftLeg.scale}>
                {debugUV ? (
                  <meshStandardMaterial map={debugTexes.leftLeg} emissiveMap={debugTexes.leftLeg} emissive="#ffffff" emissiveIntensity={0.85} roughness={0.8} side={THREE.DoubleSide} />
                ) : painted ? (
                  <meshStandardMaterial map={painted.leftLeg.tex} emissiveMap={debugY ? painted.leftLeg.tex : null} emissive={debugY ? '#ffffff' : '#000000'} roughness={0.85} side={THREE.DoubleSide} />
                ) : (
                  <meshStandardMaterial color={SKIN} roughness={0.85} side={THREE.DoubleSide} />
                )}
              </mesh>
            </group>
            <group ref={legRRef} position={[0.33, 2.0, 0]}>
              <mesh geometry={geos.rightLeg} position={[0, -1.0, 0]} scale={FIT.rightLeg.scale}>
                {debugUV ? (
                  <meshStandardMaterial map={debugTexes.rightLeg} emissiveMap={debugTexes.rightLeg} emissive="#ffffff" emissiveIntensity={0.85} roughness={0.8} side={THREE.DoubleSide} />
                ) : painted ? (
                  <meshStandardMaterial map={painted.rightLeg.tex} emissiveMap={debugY ? painted.rightLeg.tex : null} emissive={debugY ? '#ffffff' : '#000000'} roughness={0.85} side={THREE.DoubleSide} />
                ) : (
                  <meshStandardMaterial color={SKIN} roughness={0.85} side={THREE.DoubleSide} />
                )}
              </mesh>
            </group>
          </>
        )}

        {/* Kepala prosedural + rambut — menghadap -Z seperti badan */}
        <group ref={headRef} position={[0, 3.55, 0]}>
          <group rotation={[0, Math.PI, 0]}>
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
            <mesh position={[0, 0.95, -0.04]}>
              <sphereGeometry args={[0.73, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.44]} />
              <meshStandardMaterial color={HAIR} roughness={0.4} metalness={0.08} />
            </mesh>
            <RoundedBox args={[1.42, 1.05, 0.55]} radius={0.18} smoothness={4} position={[0, 0.82, -0.48]}>
              <meshStandardMaterial color={HAIR} roughness={0.4} metalness={0.08} />
            </RoundedBox>
            {[-0.48, -0.32, -0.16, 0, 0.16, 0.32, 0.48].map((x, i) => (
              <mesh
                key={i}
                position={[x, 1.26 - Math.abs(x) * 0.28, 0.67 - (i % 2) * 0.02]}
                rotation={[0.12, 0, x * 0.5]}
              >
                <boxGeometry args={[0.15, 0.42 - Math.abs(x) * 0.22, 0.08]} />
                <meshStandardMaterial color={i % 2 === 0 ? HAIR_LIGHT : HAIR} roughness={0.42} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.63, 0.72, -0.04]} rotation={[0, 0, s * 0.04]}>
                <boxGeometry args={[0.16, 0.74, 0.36]} />
                <meshStandardMaterial color={HAIR} roughness={0.42} />
              </mesh>
            ))}
            {/* helai panjang depan bahu */}
            {[-1, 1].map((s) => (
              <mesh key={`long${s}`} position={[s * 0.58, 0.05, 0.16]} rotation={[0, 0, s * 0.06]}>
                <boxGeometry args={[0.13, 1.05, 0.15]} />
                <meshStandardMaterial color={HAIR} roughness={0.42} />
              </mesh>
            ))}
            <mesh position={[0, 1.92, -0.3]}>
              <sphereGeometry args={[0.38, 24, 20]} />
              <meshStandardMaterial color={HAIR} roughness={0.4} metalness={0.08} />
            </mesh>
            <mesh position={[0, 1.66, -0.26]} rotation={[0.5, 0, 0]}>
              <torusGeometry args={[0.15, 0.055, 12, 24]} />
              <meshStandardMaterial color="#0a0a0c" roughness={0.5} />
            </mesh>
          </group>
          </group>
        </group>
      </group>
    </group>
    </group>
  )
}
