import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import * as THREE from 'three'
import { fetchRobloxAssetMesh } from '../services/robloxMeshParser.js'

const TAU = Math.PI * 2
const damp = THREE.MathUtils.damp

/**
 * Model avatar Roblox ASLI (avatar.obj + avatar.mtl + tekstur asli).
 * Dilengkapi kustomisasi Catalog Avatar Creator:
 * - Baju & Celana (outfitUrl)
 * - Warna & style rambut (hairColor, hair toggle)
 * - Aksesoris 3D (catEars, halo, glasses, horns)
 * - Kinematika halus R15 Roblox resmi
 */
export default function RealAvatar({
  emote = 'idle',
  rigType = 'R15',
  outfitUrl,
  hairColor = '#18151c',
  accessories = {},
  accColors = {},
  accScale = 1.0,
  onInteract,
  onLoadError,
  equippedItems = [],
}) {
  const rootRef = useRef(null)
  const bodyRef = useRef(null)
  const jointsRef = useRef(null)
  const accGroupRef = useRef(null)
  const backAccGroupRef = useRef(null)
  const waistAccGroupRef = useRef(null)
  const leftLegAccGroupRef = useRef(null)
  const rightLegAccGroupRef = useRef(null)
  const origBodyMapsRef = useRef(new Map())
  const [model, setModel] = useState(null)
  const clickBoost = useRef(0)

  // 1. Muat model avatar asli Roblox
  useEffect(() => {
    let alive = true
    const manager = new THREE.LoadingManager()

    // Resolusi URL aman + cache buster agar perubahan wajah & baju langsung tampil
    manager.setURLModifier((url) => {
      if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('data:') ||
        url.startsWith('blob:')
      ) {
        return url
      }
      const clean = url.split('/').pop().split('?')[0]
      if (clean.endsWith('.mtl') || clean.endsWith('.obj')) {
        return `/avatar/${clean}?v=4`
      }
      const ext = clean.includes('.') ? clean : `${clean}.png`
      return `/avatar/${ext}?v=4`
    })

    const loadOBJ = (materials) => {
      const loader = new OBJLoader(manager)
      if (materials) loader.setMaterials(materials)
      loader.setPath('/avatar/')
      loader.load(
        'avatar.obj',
        (obj) => {
          if (!alive) return

          // Normalisasi material menjadi solid MeshStandardMaterial
          obj.traverse((c) => {
            if (c.isMesh) {
              const mats = Array.isArray(c.material) ? c.material : [c.material]
              const converted = mats.map((mat) => {
                const map = mat?.map || null
                const newMat = new THREE.MeshStandardMaterial({
                  map,
                  roughness: 0.55,
                  metalness: 0.04,
                  side: THREE.DoubleSide,
                  transparent: false,
                  depthWrite: true,
                  depthTest: true,
                })
                if (newMat.map) {
                  newMat.map.colorSpace = THREE.SRGBColorSpace
                  newMat.map.generateMipmaps = true
                }
                return newMat
              })
              c.material = Array.isArray(c.material) ? converted : converted[0]
              c.castShadow = true
              c.receiveShadow = true
            }
          })

          // Pisahkan bagian-bagian R15 ke dalam sendi pivot mandiri
          const parts = {}
          const children = [...obj.children]
          children.forEach((c) => {
            parts[c.name] = c
            obj.remove(c)
          })

          const head = new THREE.Group()
          head.position.set(0, 104.12, 0)

          // Container aksesoris di kepala
          const accGroup = new THREE.Group()
          head.add(accGroup)
          accGroupRef.current = accGroup

          const rightArm = new THREE.Group()
          rightArm.position.set(0.81, 103.87, 0)

          const leftArm = new THREE.Group()
          leftArm.position.set(-0.81, 103.87, 0)

          const leftLeg = new THREE.Group()
          leftLeg.position.set(-0.25, 102.62, 0)
          const leftLegAccGroup = new THREE.Group()
          leftLeg.add(leftLegAccGroup)
          leftLegAccGroupRef.current = leftLegAccGroup

          const rightLeg = new THREE.Group()
          rightLeg.position.set(0.25, 102.62, 0)
          const rightLegAccGroup = new THREE.Group()
          rightLeg.add(rightLegAccGroup)
          rightLegAccGroupRef.current = rightLegAccGroup

          const torso = new THREE.Group()
          torso.position.set(0, 102.5, 0)

          // Container aksesoris punggung (Sayap, dsb)
          const backAccGroup = new THREE.Group()
          torso.add(backAccGroup)
          backAccGroupRef.current = backAccGroup

          // Container aksesoris pinggang (Sabuk 3D, rantai celana, dsb)
          const waistAccGroup = new THREE.Group()
          torso.add(waistAccGroup)
          waistAccGroupRef.current = waistAccGroup

          function attach(pivot, ...names) {
            for (const name of names) {
              const m = parts[name]
              if (m) {
                m.position.sub(pivot.position)
                pivot.add(m)
              }
            }
          }

          // Pasang mesh ke sendi anatomis
          attach(head, 'Player1', 'Handle1') // Kepala + Rambut
          attach(rightArm, 'Player4', 'Player3', 'Player2') // Lengan kanan
          attach(leftArm, 'Player7', 'Player6', 'Player5') // Lengan kiri
          attach(leftLeg, 'Player12', 'Player11', 'Player10') // Kaki kiri
          attach(rightLeg, 'Player15', 'Player14', 'Player13') // Kaki kanan
          attach(torso, 'Player9', 'Player8') // Badan

          obj.add(torso, head, rightArm, leftArm, leftLeg, rightLeg)
          jointsRef.current = { head, rightArm, leftArm, leftLeg, rightLeg, torso, parts }

          // Simpan referensi tekstur asli badan agar bisa di-restore kapan saja
          const origMaps = new Map()
          obj.traverse((c) => {
            if (c.isMesh && c.name.startsWith('Player') && c.name !== 'Player1') {
              const mat = Array.isArray(c.material) ? c.material[0] : c.material
              if (mat?.map) {
                origMaps.set(c.name, mat.map)
              }
            }
          })
          origBodyMapsRef.current = origMaps

          // Bounding box & scaling
          const aabb = new THREE.Box3().setFromObject(obj)
          const size = new THREE.Vector3().subVectors(aabb.max, aabb.min)
          const height = size.y || 5.96
          const scale = 5.3 / height
          const cx = (aabb.min.x + aabb.max.x) / 2
          const cz = (aabb.min.z + aabb.max.z) / 2

          obj.scale.setScalar(scale)
          obj.position.set(-cx * scale, -aabb.min.y * scale, -cz * scale)

          setModel(obj)
        },
        undefined,
        (err) => {
          console.error('Gagal memuat avatar.obj:', err)
          onLoadError?.(err)
        },
      )
    }

    const mtlLoader = new MTLLoader(manager)
    mtlLoader.setPath('/avatar/')
    mtlLoader.load(
      'avatar.mtl',
      (materials) => {
        materials.preload()
        Object.values(materials.materials).forEach((m) => {
          m.transparent = false
          m.alphaMap = null
          m.depthWrite = true
          m.depthTest = true
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace
        })
        loadOBJ(materials)
      },
      undefined,
      (err) => {
        console.warn('Gagal memuat avatar.mtl, fallback load obj:', err)
        loadOBJ(null)
      },
    )

    return () => {
      alive = false
    }
  }, [onLoadError])

  // 2. Kustomisasi Baju & Celana (Outfit)
  useEffect(() => {
    if (!model) return

    // Jika outfitUrl adalah default atau kosong, kembalikan baju & celana asli Roblox
    if (!outfitUrl || outfitUrl === 'default') {
      model.traverse((c) => {
        if (c.isMesh && c.name.startsWith('Player') && c.name !== 'Player1') {
          const orig = origBodyMapsRef.current?.get(c.name)
          if (orig) {
            const mats = Array.isArray(c.material) ? c.material : [c.material]
            mats.forEach((m) => {
              m.map = orig
              m.needsUpdate = true
            })
          }
        }
      })
      return
    }

    // Jika outfitUrl kustom diberikan (preset, upload, atau template)
    const loader = new THREE.TextureLoader()
    loader.load(
      outfitUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.flipY = true // PENTING: harus true agar sesuai dengan koordinat UV OBJ Roblox
        model.traverse((c) => {
          // Player2 s/d Player15 adalah bagian badan, lengan, dan kaki
          if (c.isMesh && c.name.startsWith('Player') && c.name !== 'Player1') {
            const mats = Array.isArray(c.material) ? c.material : [c.material]
            mats.forEach((m) => {
              m.map = tex
              m.needsUpdate = true
            })
          }
        })
      },
      undefined,
      (err) => console.error('Gagal memuat tekstur outfit:', err),
    )
  }, [model, outfitUrl])

  // 3. Kustomisasi Rambut (Warna & Visibilitas)
  useEffect(() => {
    if (!model) return
    model.traverse((c) => {
      if (c.isMesh && c.name === 'Handle1') {
        c.visible = accessories.hair !== false
        if (c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material]
          mats.forEach((m) => {
            m.color.set(hairColor || '#18151c')
            m.needsUpdate = true
          })
        }
      }
    })
  }, [model, hairColor, accessories.hair])

  // 4. Kustomisasi Koleksi Aksesoris 3D Asli (Kepala & Badan)
  useEffect(() => {
    const headGroup = accGroupRef.current
    const backGroup = backAccGroupRef.current
    const waistGroup = waistAccGroupRef.current
    const leftLegGroup = leftLegAccGroupRef.current
    const rightLegGroup = rightLegAccGroupRef.current

    function clearGroup(grp) {
      if (!grp) return
      grp.traverse((child) => {
        if (child !== grp) {
          if (child.geometry) child.geometry.dispose()
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m?.dispose())
            else child.material?.dispose()
          }
        }
      })
      while (grp.children.length > 0) {
        grp.remove(grp.children[0])
      }
    }

    clearGroup(headGroup)
    clearGroup(backGroup)
    clearGroup(waistGroup)
    clearGroup(leftLegGroup)
    clearGroup(rightLegGroup)

    if (!headGroup) return

    // 1. Telinga Kucing (Neko Ears - Di Atas Rambut Ponytail)
    if (accessories.catEars) {
      const earsGroup = new THREE.Group()
      earsGroup.position.set(0, 1.12, -0.08)
      earsGroup.scale.setScalar(accScale)
      const earGeo = new THREE.ConeGeometry(0.24, 0.58, 4)
      const earMat = new THREE.MeshStandardMaterial({
        color: accColors.catEars || hairColor || '#18151c',
        roughness: 0.55,
      })
      const innerMat = new THREE.MeshStandardMaterial({
        color: '#f472b6',
        roughness: 0.35,
      })

      const leftEar = new THREE.Mesh(earGeo, earMat)
      leftEar.position.set(-0.46, 0, 0)
      leftEar.rotation.set(-0.12, 0, 0.28)
      const leftInner = new THREE.Mesh(earGeo, innerMat)
      leftInner.scale.set(0.65, 0.65, 0.65)
      leftInner.position.set(0, -0.02, -0.05)
      leftEar.add(leftInner)

      const rightEar = new THREE.Mesh(earGeo, earMat)
      rightEar.position.set(0.46, 0, 0)
      rightEar.rotation.set(-0.12, 0, -0.28)
      const rightInner = new THREE.Mesh(earGeo, innerMat)
      rightInner.scale.set(0.65, 0.65, 0.65)
      rightInner.position.set(0, -0.02, -0.05)
      rightEar.add(rightInner)

      earsGroup.add(leftEar, rightEar)
      headGroup.add(earsGroup)
    }

    // 2. Telinga Kelinci Lucu (Bunny Ears - Menjulang Tinggi di Atas Ponytail)
    if (accessories.bunnyEars) {
      const g = new THREE.Group()
      g.position.set(0, 1.15, -0.08)
      g.scale.setScalar(accScale)
      const earGeo = new THREE.CylinderGeometry(0.08, 0.13, 0.85, 12)
      const tipGeo = new THREE.SphereGeometry(0.08, 12, 12)
      const earMat = new THREE.MeshStandardMaterial({
        color: accColors.bunnyEars || '#ffffff',
        roughness: 0.4,
      })
      const inMat = new THREE.MeshStandardMaterial({
        color: '#fca5a5',
        roughness: 0.3,
      })

      ;[-1, 1].forEach((side) => {
        const ear = new THREE.Group()
        ear.position.set(side * 0.36, 0, 0)
        ear.rotation.set(-0.08, 0, side * 0.22)
        const shaft = new THREE.Mesh(earGeo, earMat)
        shaft.position.set(0, 0.40, 0)
        const tip = new THREE.Mesh(tipGeo, earMat)
        tip.position.set(0, 0.82, 0)
        const inner = new THREE.Mesh(earGeo, inMat)
        inner.scale.set(0.6, 0.75, 0.4)
        inner.position.set(0, 0.38, -0.05)
        ear.add(shaft, tip, inner)
        g.add(ear)
      })
      headGroup.add(g)
    }

    // 3. Pita Rambut Estetik (3D Coquette Ribbon Bow Clips - Depan Ponytail & Poni)
    if (accessories.bow) {
      const g = new THREE.Group()
      g.scale.setScalar(accScale)
      const bowCol = accColors.bow || '#f472b6'
      const bowMat = new THREE.MeshStandardMaterial({
        color: bowCol,
        roughness: 0.35,
        side: THREE.DoubleSide,
      })
      const knotGeo = new THREE.SphereGeometry(0.08, 12, 12)
      const loopGeo = new THREE.TorusGeometry(0.15, 0.042, 12, 24)
      const ribbonGeo = new THREE.CylinderGeometry(0.02, 0.05, 0.32, 8)

      ;[-1, 1].forEach((side) => {
        const clip = new THREE.Group()
        // Diletakkan di atas poni depan samping kepala (-Z)
        clip.position.set(side * 0.44, 0.72, -0.38)
        clip.rotation.set(-0.25, side * 0.2, 0)
        const knot = new THREE.Mesh(knotGeo, bowMat)
        const loop1 = new THREE.Mesh(loopGeo, bowMat)
        loop1.position.set(-0.11, 0.07, 0)
        loop1.rotation.set(0, 0.2, 0.5)
        const loop2 = new THREE.Mesh(loopGeo, bowMat)
        loop2.position.set(0.11, 0.07, 0)
        loop2.rotation.set(0, -0.2, -0.5)
        const tail1 = new THREE.Mesh(ribbonGeo, bowMat)
        tail1.position.set(-0.06, -0.18, 0)
        tail1.rotation.set(0, 0, -0.3)
        const tail2 = new THREE.Mesh(ribbonGeo, bowMat)
        tail2.position.set(0.06, -0.18, 0)
        tail2.rotation.set(0, 0, 0.3)
        clip.add(knot, loop1, loop2, tail1, tail2)
        g.add(clip)
      })
      headGroup.add(g)
    }

    // 4. Jaket / Hoodie 3D (Tudung di Belakang +Z, Tali di Dada -Z)
    if (accessories.jacket3d && waistGroup) {
      const g = new THREE.Group()
      g.scale.setScalar(accScale)
      const jacketCol = accColors.jacket3d || '#1e1b4b'
      const jacketMat = new THREE.MeshStandardMaterial({
        color: jacketCol,
        roughness: 0.65,
      })
      const stringMat = new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.4,
      })
      const metalMat = new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        metalness: 0.9,
        roughness: 0.2,
      })

      // Kerah / Tudung Hoodie di Leher Belakang (+Z)
      const hood = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.10, 12, 24, Math.PI * 1.15), jacketMat)
      hood.position.set(0, 1.62, 0.14)
      hood.rotation.set(0.35, 0, 0)
      g.add(hood)

      // Tali Hoodie (Drawstrings) Menjuntai di Dada Depan (-Z)
      ;[-1, 1].forEach((side) => {
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8), stringMat)
        str.position.set(side * 0.14, 1.35, -0.38)
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 8), metalMat)
        tip.position.set(side * 0.14, 1.14, -0.38)
        g.add(str, tip)
      })

      waistGroup.add(g)
    }

    // Rok / Dress 3D (3D Flared Skirt Frills)
    const isDressActive = accessories.dress3d || equippedItems.some((i) => i.slot === 'dress')
    if (isDressActive && waistGroup) {
      const g = new THREE.Group()
      g.position.set(0, -0.42, 0)
      g.scale.setScalar(accScale)
      const dressCol = accColors.dress || '#f472b6'
      const skirtMat = new THREE.MeshStandardMaterial({
        color: dressCol,
        roughness: 0.55,
        side: THREE.DoubleSide,
      })
      const skirtGeo = new THREE.CylinderGeometry(0.58, 1.08, 0.88, 24, 1, true)
      const skirt = new THREE.Mesh(skirtGeo, skirtMat)
      skirt.scale.set(1.0, 1.0, 0.78)

      const hemGeo = new THREE.TorusGeometry(0.96, 0.04, 8, 24)
      const hemMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 })
      const hem = new THREE.Mesh(hemGeo, hemMat)
      hem.position.set(0, -0.42, 0)
      hem.rotation.set(Math.PI / 2, 0, 0)
      hem.scale.set(1.0, 0.78, 1.0)

      g.add(skirt, hem)
      waistGroup.add(g)
    }

    // 17. UGC 3D Mesh Asli & Model 3D Barang Marketplace
    equippedItems.forEach((item) => {
      if (item.kind !== 'accessory') return
      const cleanId = String(item.id || '')
      if (cleanId.startsWith('acc-') || cleanId.startsWith('preset-')) return

      // Tentukan grup sendi attachment yang tepat
      let targetGroup = headGroup
      let pos = [0, 0.65, -0.15]
      let rot = [0, 0, 0]

      const name = (item.name || '').toLowerCase()
      const slot = item.slot || ''
      const type = item.type

      if (slot === 'wings' || type === 46 || name.includes('wing') || name.includes('sayap') || name.includes('cape')) {
        targetGroup = backGroup
        pos = [0, 1.45, 0.38]
      } else if (slot === 'shoulderPet' || type === 44 || name.includes('shoulder') || name.includes('pet')) {
        targetGroup = waistGroup
        pos = [-0.76, 1.38, -0.04]
      } else if (slot === 'tail' || name.includes('tail') || name.includes('ekor')) {
        targetGroup = waistGroup
        pos = [0, -0.16, 0.38]
      } else if (slot === 'waist' || type === 47 || name.includes('waist') || name.includes('belt') || name.includes('chain')) {
        targetGroup = waistGroup
        pos = [0, -0.02, 0]
      } else if (slot === 'choker' || type === 43 || type === 45 || name.includes('choker') || name.includes('neck') || name.includes('kalung')) {
        targetGroup = headGroup
        pos = [0, -0.48, -0.10]
      } else if (slot === 'glasses' || type === 42 || name.includes('glass') || name.includes('kacamata')) {
        targetGroup = headGroup
        pos = [0, 0.08, -0.56]
      } else if (slot === 'hat' || type === 8 || name.includes('hat') || name.includes('beanie') || name.includes('cap')) {
        targetGroup = headGroup
        pos = [0, 1.05, 0.04]
      } else if (slot === 'halo' || name.includes('halo')) {
        targetGroup = headGroup
        pos = [0, 1.85, 0.02]
      }

      if (!targetGroup) return

      // Container 3D khusus untuk item marketplace ini
      const itemGroup = new THREE.Group()
      itemGroup.name = `marketplace-item-${cleanId}`
      itemGroup.position.set(pos[0], pos[1], pos[2])
      itemGroup.rotation.set(rot[0], rot[1], rot[2])
      itemGroup.scale.setScalar(accScale)
      targetGroup.add(itemGroup)

      // Muat 3D Mesh UGC biner resmi dari CDN Roblox jika tersedia
      fetchRobloxAssetMesh(cleanId)
        .then((geo) => {
          if (!geo) return
          let map = null
          if (item.thumb) {
            try {
              map = new THREE.TextureLoader().load(item.thumb)
              map.colorSpace = THREE.SRGBColorSpace
            } catch (_) {}
          }
          const mat = new THREE.MeshStandardMaterial({
            color: accColors[item.slot] || '#ffffff',
            map,
            roughness: 0.45,
            metalness: 0.15,
            side: THREE.DoubleSide,
          })
          const ugcMesh = new THREE.Mesh(geo, mat)
          ugcMesh.name = `ugc-mesh-${cleanId}`
          while (itemGroup.children.length > 0) {
            itemGroup.remove(itemGroup.children[0])
          }
          itemGroup.add(ugcMesh)
        })
        .catch(() => {
          // Model 3D prosedural presisi tetap aktif jika mesh CDN Roblox tidak publik
        })
    })
  }, [model, accessories, accColors, accScale, hairColor, equippedItems])

  // 5. Animasi Gerak Kinematika Roblox (Support Rig R15 & R6)
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    const root = rootRef.current
    const body = bodyRef.current
    const j = jointsRef.current
    if (!root || !body || !model || !j) return

    const isR6 = rigType === 'R6'

    // Proporsi blok bentuk R6 vs R15
    const targetTorsoX = isR6 ? 1.08 : 1.0
    const targetTorsoY = isR6 ? 0.98 : 1.0
    const targetTorsoZ = isR6 ? 1.06 : 1.0
    const targetLimb = isR6 ? 1.04 : 1.0

    j.torso.scale.x = damp(j.torso.scale.x, targetTorsoX, 8, d)
    j.torso.scale.y = damp(j.torso.scale.y, targetTorsoY, 8, d)
    j.torso.scale.z = damp(j.torso.scale.z, targetTorsoZ, 8, d)

    j.rightArm.scale.x = damp(j.rightArm.scale.x, targetLimb, 8, d)
    j.rightArm.scale.z = damp(j.rightArm.scale.z, targetLimb, 8, d)
    j.leftArm.scale.x = damp(j.leftArm.scale.x, targetLimb, 8, d)
    j.leftArm.scale.z = damp(j.leftArm.scale.z, targetLimb, 8, d)
    j.rightLeg.scale.x = damp(j.rightLeg.scale.x, targetLimb, 8, d)
    j.rightLeg.scale.z = damp(j.rightLeg.scale.z, targetLimb, 8, d)
    j.leftLeg.scale.x = damp(j.leftLeg.scale.x, targetLimb, 8, d)
    j.leftLeg.scale.z = damp(j.leftLeg.scale.z, targetLimb, 8, d)

    let bodyY = 0
    let rotX = 0
    let rotY = 0
    let rotZ = 0

    let headX = 0
    let headY = 0
    let headZ = 0

    let armRX = 0
    let armRY = 0
    let armRZ = 0.16

    let armLX = 0
    let armLY = 0
    let armLZ = -0.16

    let legLX = 0
    let legLZ = 0

    let legRX = 0
    let legRZ = 0

    let torsoX = 0
    let torsoY = 0
    let torsoZ = 0

    if (isR6) {
      // ── KINEMATIKA NOSTALGIA ROBLOX R6 (6 Sendi Kaku Tradisional) ──
      // Lengan lurus tegak di samping torso tanpa lekukan siku/bahu
      armRZ = 0.03
      armLZ = -0.03
      armRX = 0
      armLX = 0
      armRY = 0
      armLY = 0
      torsoX = 0
      torsoY = 0
      torsoZ = 0
      legLX = 0
      legRX = 0
      legLZ = 0
      legRZ = 0

      // Di R6 leher hanya berputar horizontal pada sumbu Y (silinder leher kaku)
      headY = state.pointer.x * 0.35
      headX = 0
      headZ = 0

      if (emote === 'toy') {
        // R6 Classic Robot Walk: Ayunan pendulum kaku
        const swing = Math.sin(t * 4.0) * 0.45
        armRX = swing
        armLX = -swing
        legRX = -swing * 0.65
        legLX = swing * 0.65
        bodyY = Math.abs(Math.sin(t * 8.0)) * 0.02
      } else if (emote === 'float') {
        // R6 Levitate: Terbang melayang kaku
        bodyY = 0.28 + Math.sin(t * 2.5) * 0.08
        armRX = 0.25
        armLX = 0.25
        headX = -0.08
      } else if (emote === 'wave') {
        // R6 Iconic Wave: Lengan kanan tegak kaku ~75° dan melambai ke kiri-kanan
        armRZ = 0.35
        armRX = -1.35
        armRY = Math.sin(t * 8.0) * 0.42
        bodyY = Math.sin(t * 4.0) * 0.015
      } else if (emote === 'cheer') {
        // R6 Iconic Cheer: Kedua lengan naik lurus 180° ke atas langit!
        const bounce = Math.abs(Math.sin(t * 6.5))
        bodyY = bounce * 0.22
        armRX = -Math.PI * 0.88
        armLX = -Math.PI * 0.88
        armRZ = 0.08
        armLZ = -0.08
        headX = -0.15
      } else if (emote === 'dance') {
        // R6 Classic /e dance: Gerakan ayunan tari legendaris Roblox 2006
        const swing = Math.sin(t * 5.2) * 0.65
        armRX = swing
        armLX = -swing
        legLX = -swing * 0.45
        legRX = swing * 0.45
        torsoY = Math.sin(t * 5.2) * 0.12
        bodyY = Math.abs(Math.sin(t * 5.2)) * 0.06
      } else if (emote === 'laugh') {
        // R6 Laugh: Torso miring ke belakang & bergetar
        const vib = Math.sin(t * 14.0)
        torsoX = -0.22 + vib * 0.03
        headX = -0.25 + vib * 0.04
        armRX = -0.18
        armLX = -0.18
        bodyY = Math.abs(vib) * 0.03
      } else if (emote === 'point') {
        // R6 Point: Lengan kanan lurus lurus ke depan
        armRX = -Math.PI / 2
        armRY = 0
        armRZ = 0.02
        armLX = 0
        armLZ = -0.03
      } else {
        // R6 Idle Klasik: Torso hening total, hanya kepala mengangguk mikro
        headX = Math.sin(t * 1.8) * 0.02
        bodyY = Math.abs(Math.sin(t * 1.8)) * 0.008
      }
    } else {
      // ── KINEMATIKA MODERN ROBLOX R15 (15 Sendi Artikulasi Halus) ──
      headY += state.pointer.x * 0.22
      headX += -state.pointer.y * 0.14

      if (emote === 'toy') {
        armRZ = 0.2
        armLZ = -0.2
        armRX = -0.16
        armLX = -0.16
        headZ = 0.16
        headY += 0.06
        bodyY = Math.abs(Math.sin(t * 2.8)) * 0.03
      } else if (emote === 'float') {
        bodyY = 0.24 + Math.sin(t * 2.2) * 0.08
        torsoX = -0.05
        armRZ = 0.38 + Math.sin(t * 2.2) * 0.06
        armLZ = -0.38 - Math.sin(t * 2.2) * 0.06
        armRX = -0.14
        armLX = -0.14
        legRX = 0.2
        legRZ = -0.06
        legLX = 0.12
        legLZ = 0.06
        headX = -0.08
      } else if (emote === 'wave') {
        armRZ = 2.45
        armRX = -0.32
        armRY = Math.sin(t * 8.0) * 0.35
        armLZ = -0.14
        headZ = 0.12
        headY += 0.1
        bodyY = Math.sin(t * 4.0) * 0.02
      } else if (emote === 'cheer') {
        const jump = Math.abs(Math.sin(t * 6.5))
        bodyY = jump * 0.2
        armRZ = 2.65 + Math.sin(t * 6.5) * 0.12
        armLZ = -2.65 - Math.sin(t * 6.5) * 0.12
        armRX = -0.26
        armLX = -0.26
        headX = -0.2
      } else if (emote === 'dance') {
        const b = Math.sin(t * 4.6)
        const c = Math.cos(t * 4.6)
        bodyY = Math.abs(b) * 0.12
        torsoY = b * 0.28
        torsoZ = b * 0.05
        armRZ = 0.75 + b * 0.55
        armRX = c * 0.42
        armLZ = -(0.75 - b * 0.55)
        armLX = -c * 0.42
        legLX = b * 0.3
        legRX = -b * 0.3
        headY += -b * 0.12
        headX = Math.abs(c) * 0.08
      } else if (emote === 'laugh') {
        const l = Math.sin(t * 13.0)
        armRZ = 0.46
        armLZ = -0.46
        armRX = -0.36
        armLX = -0.36
        bodyY = Math.abs(l) * 0.035
        torsoX = -0.12 + l * 0.035
        headX = -0.22 + l * 0.05
      } else if (emote === 'point') {
        armRX = -1.5
        armRZ = 0.08
        armRY = -0.06
        armLZ = -0.18
        armLX = 0.08
        torsoY = -0.12
        headY += -0.1
      } else {
        // Default Roblox R15 Idle
        const breathe = Math.sin(t * 2.0)
        bodyY = breathe * 0.02
        torsoX = breathe * 0.025
        torsoZ = Math.sin(t * 1.0) * 0.012
        armRZ = 0.16 + breathe * 0.025
        armLZ = -0.16 - breathe * 0.025
        headX = -breathe * 0.02
      }
    }

    if (clickBoost.current > 0.001) {
      bodyY += clickBoost.current * 0.22
      headX -= clickBoost.current * 0.16
      armRZ += clickBoost.current * 0.25
      armLZ -= clickBoost.current * 0.25
      clickBoost.current = damp(clickBoost.current, 0, 7, d)
    }

    if (emote === 'spin') {
      root.rotation.y += d * 3.6
      armRZ = 0.24
      armLZ = -0.24
    } else {
      const settled = Math.round((root.rotation.y - Math.PI) / TAU) * TAU + Math.PI
      root.rotation.y = damp(root.rotation.y, settled, 8, d)
    }

    // Terapkan interpolasi halus
    body.position.y = damp(body.position.y, bodyY, 10, d)
    body.rotation.x = damp(body.rotation.x, rotX, 7, d)
    body.rotation.y = damp(body.rotation.y, rotY, 7, d)
    body.rotation.z = damp(body.rotation.z, rotZ, 7, d)

    j.head.rotation.x = damp(j.head.rotation.x, headX, 9, d)
    j.head.rotation.y = damp(j.head.rotation.y, headY, 9, d)
    j.head.rotation.z = damp(j.head.rotation.z, headZ, 9, d)

    j.rightArm.rotation.x = damp(j.rightArm.rotation.x, armRX, 9, d)
    j.rightArm.rotation.y = damp(j.rightArm.rotation.y, armRY, 9, d)
    j.rightArm.rotation.z = damp(j.rightArm.rotation.z, armRZ, 9, d)

    j.leftArm.rotation.x = damp(j.leftArm.rotation.x, armLX, 9, d)
    j.leftArm.rotation.y = damp(j.leftArm.rotation.y, armLY, 9, d)
    j.leftArm.rotation.z = damp(j.leftArm.rotation.z, armLZ, 9, d)

    j.leftLeg.rotation.x = damp(j.leftLeg.rotation.x, legLX, 9, d)
    j.leftLeg.rotation.z = damp(j.leftLeg.rotation.z, legLZ, 9, d)

    j.rightLeg.rotation.x = damp(j.rightLeg.rotation.x, legRX, 9, d)
    j.rightLeg.rotation.z = damp(j.rightLeg.rotation.z, legRZ, 9, d)

    j.torso.rotation.x = damp(j.torso.rotation.x, torsoX, 9, d)
    j.torso.rotation.y = damp(j.torso.rotation.y, torsoY, 9, d)
    j.torso.rotation.z = damp(j.torso.rotation.z, torsoZ, 9, d)
  })

  const handleClick = (e) => {
    e.stopPropagation()
    clickBoost.current = 1.0
    onInteract?.()
  }

  return (
    <group ref={rootRef} position={[0, 0.32, 0]} rotation={[0, Math.PI, 0]}>
      <group
        ref={bodyRef}
        onClick={handleClick}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        {/* Invisible hit cylinder for 100% reliable click/tap detection */}
        <mesh position={[0, 2.7, 0]}>
          <cylinderGeometry args={[1.5, 1.5, 5.4, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {model ? <primitive object={model} /> : null}
      </group>
    </group>
  )
}
