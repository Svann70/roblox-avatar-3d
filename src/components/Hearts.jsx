import { forwardRef, useImperativeHandle, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function makeHeartTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')
  x.fillStyle = '#ff5d8f'
  x.beginPath()
  x.moveTo(32, 52)
  x.bezierCurveTo(61, 35, 51, 8, 32, 21)
  x.bezierCurveTo(13, 8, 3, 35, 32, 52)
  x.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Ledakan hati saat karakter diklik — panggil via ref: heartsRef.current.burst([x,y,z]) */
const Hearts = forwardRef(function Hearts(_, ref) {
  const groupRef = useRef(null)
  const texRef = useRef(null)
  const items = useRef([])

  useImperativeHandle(ref, () => ({
    burst(origin = [0, 3.8, 0.6]) {
      if (!texRef.current) texRef.current = makeHeartTexture()
      const g = groupRef.current
      if (!g) return
      for (let i = 0; i < 10; i++) {
        const mat = new THREE.SpriteMaterial({ map: texRef.current, transparent: true, depthWrite: false })
        const sprite = new THREE.Sprite(mat)
        sprite.scale.setScalar(0.22 + Math.random() * 0.2)
        sprite.position.set(
          origin[0] + (Math.random() - 0.5) * 1.1,
          origin[1] + Math.random() * 0.4,
          origin[2] + (Math.random() - 0.5) * 0.5,
        )
        g.add(sprite)
        items.current.push({
          sprite,
          vel: new THREE.Vector3((Math.random() - 0.5) * 1.1, 1.7 + Math.random() * 1.1, (Math.random() - 0.5) * 0.6),
          born: performance.now(),
          life: 1000 + Math.random() * 500,
        })
      }
    },
  }))

  useFrame((_, dt) => {
    const now = performance.now()
    const g = groupRef.current
    if (!g) return
    items.current = items.current.filter((it) => {
      const age = now - it.born
      if (age > it.life) {
        g.remove(it.sprite)
        it.sprite.material.dispose()
        return false
      }
      it.sprite.position.addScaledVector(it.vel, dt)
      it.vel.y -= dt * 1.4
      it.sprite.material.opacity = Math.max(0, 1 - age / it.life)
      return true
    })
  })

  return <group ref={groupRef} />
})

export default Hearts
