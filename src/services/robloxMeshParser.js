/**
 * Runtime Parser untuk file biner Roblox .mesh (v1.00, v1.01, v2.00, v3.00, v4.00, v4.01, v5.00).
 * Mendukung ekstraksi skeletal skinning chunk (bone weights, bone indices, hierarki tulang, inverse bind matrix)
 * dan membangun THREE.SkinnedMesh lengkap dengan THREE.Skeleton untuk animasi deformasi skeletal real-time.
 */
import * as THREE from 'three'

/**
 * Daftar nama tulang standar Roblox R15
 */
export const R15_BONE_NAMES = [
  'HumanoidRootPart', // 0
  'LowerTorso',       // 1
  'UpperTorso',       // 2
  'Head',             // 3
  'LeftUpperArm',     // 4
  'LeftLowerArm',     // 5
  'LeftHand',         // 6
  'RightUpperArm',    // 7
  'RightLowerArm',    // 8
  'RightHand',        // 9
  'LeftUpperLeg',     // 10
  'LeftLowerLeg',     // 11
  'LeftFoot',         // 12
  'RightUpperLeg',    // 13
  'RightLowerLeg',    // 14
  'RightFoot',        // 15
]

/**
 * Parsing ArrayBuffer file .mesh Roblox menjadi THREE.BufferGeometry
 * Mendukung ekstraksi bone weights & bone indices untuk mesh bertulang (skinned mesh v4/v5).
 * @param {ArrayBuffer|Uint8Array} input
 * @returns {THREE.BufferGeometry}
 */
export function parseRobloxMesh(input) {
  const buffer =
    input instanceof Uint8Array
      ? input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
      : input
  const bytes = new Uint8Array(buffer)
  const headerStr = String.fromCharCode(...bytes.subarray(0, 16))

  const geo = new THREE.BufferGeometry()

  // ─────────────────────────────────────────────────────────────
  // 1. Format ASCII (version 1.00 / 1.01)
  // ─────────────────────────────────────────────────────────────
  if (headerStr.startsWith('version 1.00') || headerStr.startsWith('version 1.01')) {
    const text = new TextDecoder().decode(bytes)
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const positions = []
    const normals = []
    const uvs = []

    const regex = /\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]/g
    for (let i = 2; i < lines.length; i++) {
      let match
      while ((match = regex.exec(lines[i])) !== null) {
        const p = match[1].split(',').map(Number)
        const n = match[2].split(',').map(Number)
        const u = match[3].split(',').map(Number)
        positions.push(...p)
        normals.push(...n)
        uvs.push(u[0], 1.0 - u[1])
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
    geo.userData.version = headerStr.slice(0, 12).trim()
    return geo
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Format Biner (version 2.00, 3.00, 4.00, 4.01, 5.00)
  // ─────────────────────────────────────────────────────────────
  if (
    headerStr.startsWith('version 2.00') ||
    headerStr.startsWith('version 3.00') ||
    headerStr.startsWith('version 4.00') ||
    headerStr.startsWith('version 4.01') ||
    headerStr.startsWith('version 5.00')
  ) {
    const dv = new DataView(buffer)
    const newlineIdx = bytes.indexOf(10) // '\n'
    if (newlineIdx === -1) throw new Error('Header .mesh Roblox rusak: tidak ditemukan newline')

    const offset = newlineIdx + 1
    const headerSize = dv.getUint16(offset, true)
    const vertexSize = dv.getUint8(offset + 2)
    const faceSize = dv.getUint8(offset + 3)

    const isV3Plus = !headerStr.startsWith('version 2.00')
    const lodCount = isV3Plus ? dv.getUint16(offset + 4, true) : 1
    const vertexCount = isV3Plus ? dv.getUint32(offset + 6, true) : dv.getUint32(offset + 4, true)
    const faceCount = isV3Plus ? dv.getUint32(offset + 10, true) : dv.getUint32(offset + 8, true)

    // Deteksi metadata tulang di header v4 / v5
    let boneCount = 0
    if (isV3Plus && headerSize >= 16) {
      boneCount = dv.getUint16(offset + 14, true)
    }

    const vStart = offset + headerSize
    const positions = new Float32Array(vertexCount * 3)
    const normals = new Float32Array(vertexCount * 3)
    const uvs = new Float32Array(vertexCount * 2)

    // Cek apakah vertex memiliki bone indices & weights inline (vertexSize >= 48)
    const hasInlineBones = vertexSize >= 48
    let skinIndices = hasInlineBones ? new Uint8Array(vertexCount * 4) : null
    let skinWeights = hasInlineBones ? new Float32Array(vertexCount * 4) : null

    for (let i = 0; i < vertexCount; i++) {
      const o = vStart + i * vertexSize
      // Posisi X, Y, Z
      positions[i * 3] = dv.getFloat32(o, true)
      positions[i * 3 + 1] = dv.getFloat32(o + 4, true)
      positions[i * 3 + 2] = dv.getFloat32(o + 8, true)

      // Normal NX, NY, NZ
      normals[i * 3] = dv.getFloat32(o + 12, true)
      normals[i * 3 + 1] = dv.getFloat32(o + 16, true)
      normals[i * 3 + 2] = dv.getFloat32(o + 20, true)

      // UV (Invert V untuk kompatibilitas Three.js WebGL)
      uvs[i * 2] = dv.getFloat32(o + 24, true)
      uvs[i * 2 + 1] = 1.0 - dv.getFloat32(o + 28, true)

      // Ekstraksi 4 bone indices dan 4 bone weights per vertex (v4/v5 inline)
      if (hasInlineBones) {
        const b0 = dv.getUint8(o + 40)
        const b1 = dv.getUint8(o + 41)
        const b2 = dv.getUint8(o + 42)
        const b3 = dv.getUint8(o + 43)

        const w0 = dv.getUint8(o + 44)
        const w1 = dv.getUint8(o + 45)
        const w2 = dv.getUint8(o + 46)
        const w3 = dv.getUint8(o + 47)
        const sum = w0 + w1 + w2 + w3 || 1

        skinIndices[i * 4] = b0
        skinIndices[i * 4 + 1] = b1
        skinIndices[i * 4 + 2] = b2
        skinIndices[i * 4 + 3] = b3

        skinWeights[i * 4] = w0 / sum
        skinWeights[i * 4 + 1] = w1 / sum
        skinWeights[i * 4 + 2] = w2 / sum
        skinWeights[i * 4 + 3] = w3 / sum
      }
    }

    // Segitiga / Wajah (Indices)
    const fStart = vStart + vertexCount * vertexSize
    const indices = new Uint32Array(faceCount * 3)
    for (let i = 0; i < faceCount; i++) {
      const o = fStart + i * faceSize
      indices[i * 3] = dv.getUint32(o, true)
      indices[i * 3 + 1] = dv.getUint32(o + 4, true)
      indices[i * 3 + 2] = dv.getUint32(o + 8, true)
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Parsing Chunk Skinning Eksternal (Bone Envelope Chunk v4/v5)
    // ─────────────────────────────────────────────────────────────
    let cursor = fStart + faceCount * faceSize

    // Lewati tabel LOD jika lodCount > 1
    if (lodCount > 1 && cursor + lodCount * 4 <= buffer.byteLength) {
      cursor += lodCount * 4
    }

    if (!hasInlineBones && boneCount > 0) {
      if (cursor + vertexCount * 8 <= buffer.byteLength) {
        skinIndices = new Uint8Array(vertexCount * 4)
        skinWeights = new Float32Array(vertexCount * 4)

        for (let i = 0; i < vertexCount; i++) {
          const so = cursor + i * 8
          const b0 = dv.getUint8(so)
          const b1 = dv.getUint8(so + 1)
          const b2 = dv.getUint8(so + 2)
          const b3 = dv.getUint8(so + 3)

          const w0 = dv.getUint8(so + 4)
          const w1 = dv.getUint8(so + 5)
          const w2 = dv.getUint8(so + 6)
          const w3 = dv.getUint8(so + 7)
          const sum = w0 + w1 + w2 + w3 || 1

          skinIndices[i * 4] = b0
          skinIndices[i * 4 + 1] = b1
          skinIndices[i * 4 + 2] = b2
          skinIndices[i * 4 + 3] = b3

          skinWeights[i * 4] = w0 / sum
          skinWeights[i * 4 + 1] = w1 / sum
          skinWeights[i * 4 + 2] = w2 / sum
          skinWeights[i * 4 + 3] = w3 / sum
        }
        cursor += vertexCount * 8
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Parsing Bone Hierarchy Table & Inverse Bind Matrices (v4/v5)
    // ─────────────────────────────────────────────────────────────
    const parsedBones = []
    if (boneCount > 0 && cursor < buffer.byteLength) {
      try {
        for (let b = 0; b < boneCount; b++) {
          if (cursor + 52 > buffer.byteLength) break

          // Parent index (Int32LE atau Int16LE)
          const parentIndex = dv.getInt32(cursor, true)
          cursor += 4

          // Matriks Transform / CFrame Inverse (3x4 Matrix: 12 floats = 48 bytes)
          const m = new THREE.Matrix4()
          const r00 = dv.getFloat32(cursor, true)
          const r01 = dv.getFloat32(cursor + 4, true)
          const r02 = dv.getFloat32(cursor + 8, true)
          const px  = dv.getFloat32(cursor + 12, true)

          const r10 = dv.getFloat32(cursor + 16, true)
          const r11 = dv.getFloat32(cursor + 20, true)
          const r12 = dv.getFloat32(cursor + 24, true)
          const py  = dv.getFloat32(cursor + 28, true)

          const r20 = dv.getFloat32(cursor + 32, true)
          const r21 = dv.getFloat32(cursor + 36, true)
          const r22 = dv.getFloat32(cursor + 40, true)
          const pz  = dv.getFloat32(cursor + 44, true)
          cursor += 48

          m.set(
            r00, r01, r02, px,
            r10, r11, r12, py,
            r20, r21, r22, pz,
            0,   0,   0,   1
          )

          parsedBones.push({
            index: b,
            name: R15_BONE_NAMES[b] || `Bone_${b}`,
            parentIndex,
            inverseBindMatrix: m,
          })
        }
      } catch (err) {
        console.warn('Gagal membaca tabel tulang tambahan:', err)
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geo.setIndex(new THREE.BufferAttribute(indices, 1))

    // Hubungkan atribut skinning jika ditemukan data tulang
    if (skinIndices && skinWeights) {
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4))
      geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4))
      geo.userData.hasSkinning = true
      geo.userData.boneCount = boneCount || Math.max(...skinIndices) + 1
      geo.userData.parsedBones = parsedBones
    }

    geo.userData.version = headerStr.slice(0, 12).trim()
    return geo
  }

  throw new Error(`Format .mesh tidak dikenali: ${headerStr.slice(0, 16)}`)
}

/**
 * Membangun THREE.SkinnedMesh lengkap dengan THREE.Skeleton dan hierarki THREE.Bone
 * Mendukung deformasi skeletal dinamis untuk UGC bertulang Roblox R15.
 * @param {THREE.BufferGeometry} geo - Geometri hasil parseRobloxMesh
 * @param {THREE.Material} [material] - Material Three.js
 * @param {Object} [options] - Konfigurasi kustom opsional
 * @returns {THREE.SkinnedMesh|THREE.Mesh}
 */
export function createRobloxSkinnedMesh(geo, material, options = {}) {
  const mat =
    material ||
    new THREE.MeshStandardMaterial({
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })

  // Jika geometri tidak memiliki skinning, kembalikan Mesh statis
  if (!geo.attributes.skinIndex || !geo.attributes.skinWeight) {
    return new THREE.Mesh(geo, mat)
  }

  const parsedBones = geo.userData.parsedBones || []
  const boneCount = Math.max(
    geo.userData.boneCount || 0,
    parsedBones.length,
    R15_BONE_NAMES.length
  )

  const bones = []
  const boneInverses = []

  for (let i = 0; i < boneCount; i++) {
    const bone = new THREE.Bone()
    bone.name =
      options.names?.[i] ||
      parsedBones[i]?.name ||
      R15_BONE_NAMES[i] ||
      `Bone_${i}`
    bones.push(bone)

    if (parsedBones[i]?.inverseBindMatrix) {
      boneInverses.push(parsedBones[i].inverseBindMatrix.clone())
    }
  }

  // Bangun hierarki relasi parent-child
  if (parsedBones.length > 0 && parsedBones.some((b) => b.parentIndex >= 0)) {
    parsedBones.forEach((pb) => {
      if (pb.parentIndex >= 0 && bones[pb.parentIndex] && bones[pb.index]) {
        bones[pb.parentIndex].add(bones[pb.index])
      }
    })
  } else if (options.parents) {
    options.parents.forEach((parentIdx, childIdx) => {
      if (parentIdx >= 0 && bones[parentIdx] && bones[childIdx]) {
        bones[parentIdx].add(bones[childIdx])
      }
    })
  } else {
    // Hierarki anatomis standar Roblox R15
    if (bones.length >= 16) {
      bones[0].add(bones[1]) // Root -> LowerTorso
      bones[1].add(bones[2]) // LowerTorso -> UpperTorso
      bones[2].add(bones[3]) // UpperTorso -> Head

      bones[2].add(bones[4]) // UpperTorso -> LeftUpperArm
      bones[4].add(bones[5]) // LeftUpperArm -> LeftLowerArm
      bones[5].add(bones[6]) // LeftLowerArm -> LeftHand

      bones[2].add(bones[7]) // UpperTorso -> RightUpperArm
      bones[7].add(bones[8]) // RightUpperArm -> RightLowerArm
      bones[8].add(bones[9]) // RightLowerArm -> RightHand

      bones[1].add(bones[10]) // LowerTorso -> LeftUpperLeg
      bones[10].add(bones[11]) // LeftUpperLeg -> LeftLowerLeg
      bones[11].add(bones[12]) // LeftLowerLeg -> LeftFoot

      bones[1].add(bones[13]) // LowerTorso -> RightUpperLeg
      bones[13].add(bones[14]) // RightUpperLeg -> RightLowerLeg
      bones[14].add(bones[15]) // RightLowerLeg -> RightFoot
    }
  }

  const rootBone = bones[0]
  const skeleton =
    boneInverses.length === bones.length
      ? new THREE.Skeleton(bones, boneInverses)
      : new THREE.Skeleton(bones)

  const skinnedMesh = new THREE.SkinnedMesh(geo, mat)
  skinnedMesh.add(rootBone)
  skinnedMesh.bind(skeleton)

  return skinnedMesh
}

/**
 * Animasi deformasi skeletal dinamis pada SkinnedMesh
 * @param {THREE.SkinnedMesh} skinnedMesh
 * @param {Object} pose - Rotasi tulang { [boneName]: { x, y, z } }
 */
export function applySkeletalPose(skinnedMesh, pose = {}) {
  if (!skinnedMesh || !skinnedMesh.isSkinnedMesh || !skinnedMesh.skeleton) return

  const bones = skinnedMesh.skeleton.bones
  bones.forEach((bone) => {
    const rot = pose[bone.name]
    if (rot) {
      if (typeof rot.x === 'number') bone.rotation.x = rot.x
      if (typeof rot.y === 'number') bone.rotation.y = rot.y
      if (typeof rot.z === 'number') bone.rotation.z = rot.z
    }
  })

  skinnedMesh.skeleton.update()
}

/**
 * Muat file .mesh dari URL dan ubah menjadi THREE.BufferGeometry
 * @param {string} url - URL path lokal atau CDN
 * @returns {Promise<THREE.BufferGeometry>}
 */
export async function loadRobloxMeshFromUrl(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} gagal memuat mesh: ${url}`)
  const buf = await res.arrayBuffer()
  return parseRobloxMesh(buf)
}

const assetMeshCache = new Map()

/**
 * Mengambil dan mengonversi mesh UGC Roblox langsung via Asset ID
 * Mendukung file mentah .mesh maupun model XML Accessory RBXMX dengan ekstraksi MeshId.
 * Otomatis melakukan normalisasi skala dan centering agar presisi di avatar.
 * @param {string|number} assetId
 * @returns {Promise<THREE.BufferGeometry>}
 */
export async function fetchRobloxAssetMesh(assetId) {
  const cleanId = String(assetId).trim()
  if (assetMeshCache.has(cleanId)) {
    return assetMeshCache.get(cleanId).clone()
  }

  const apiUrl = `/api/roblox-assetdelivery/v2/assetId/${cleanId}`
  const res = await fetch(apiUrl)
  if (!res.ok) throw new Error(`Assetdelivery status: ${res.status}`)

  const data = await res.json()
  const location = data.locations?.[0]?.location
  if (!location) throw new Error(`Lokasi file mesh untuk asset ${cleanId} tidak ditemukan`)

  const fileRes = await fetch(location)
  if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status} gagal unduh asset`)
  const buf = await fileRes.arrayBuffer()
  const bytes = new Uint8Array(buf)
  const header = String.fromCharCode(...bytes.subarray(0, 16))

  let geo = null
  let textureAssetId = null

  if (header.startsWith('version')) {
    geo = parseRobloxMesh(buf)
  } else {
    // Model XML RBXMX: ekstrak MeshId dan TextureId
    const text = new TextDecoder().decode(bytes)
    const meshMatch =
      text.match(/MeshId[^<]*<url>[^0-9]*([0-9]+)<\/url>/i) ||
      text.match(/<url>[^0-9]*([0-9]+)<\/url>/i)
    const texMatch = text.match(/TextureId[^<]*<url>[^0-9]*([0-9]+)<\/url>/i)
    if (texMatch) textureAssetId = texMatch[1]

    if (meshMatch && meshMatch[1]) {
      const subMeshId = meshMatch[1]
      const subApiUrl = `/api/roblox-assetdelivery/v2/assetId/${subMeshId}`
      const subRes = await fetch(subApiUrl)
      if (subRes.ok) {
        const subData = await subRes.json()
        const subLoc = subData.locations?.[0]?.location
        if (subLoc) {
          const subBuf = await (await fetch(subLoc)).arrayBuffer()
          geo = parseRobloxMesh(subBuf)
        }
      }
    }
  }

  if (!geo) {
    throw new Error(`Gagal memuat mesh UGC untuk asset ${cleanId}`)
  }

  // Normalisasi skala & posisi pusat geometris
  geo.computeBoundingBox()
  geo.center()
  if (geo.boundingBox) {
    const size = new THREE.Vector3()
    geo.boundingBox.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0) {
      const targetDim = 1.05
      const s = targetDim / maxDim
      geo.scale(s, s, s)
      geo.computeBoundingBox()
    }
  }

  if (textureAssetId) {
    geo.userData.textureAssetId = textureAssetId
  }

  assetMeshCache.set(cleanId, geo)
  return geo.clone()
}

/**
 * Mengambil mesh UGC Roblox dan membuat THREE.SkinnedMesh siap animasi
 * @param {string|number} assetId
 * @param {THREE.Material} [material]
 * @returns {Promise<THREE.SkinnedMesh|THREE.Mesh>}
 */
export async function fetchRobloxAssetSkinnedMesh(assetId, material) {
  const geo = await fetchRobloxAssetMesh(assetId)
  return createRobloxSkinnedMesh(geo, material)
}
