import * as THREE from 'three'

/**
 * Pelukis tekstur part berbasis posisi 3D → atlas UV.
 * Tiap triangle mesh dirasterisasi ke ruang UV dengan warna hasil
 * paintFn(centroid 3D, normal, fraksi tinggi Y, uv). Dengan cara ini
 * pola "dunia nyata" (strip horizontal, batas sleeve, dsb.) mengikuti
 * geometri mesin, bukan tebakan koordinat UV.
 */

function bboxOf(positions) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      const v = positions[i + a]
      if (v < min[a]) min[a] = v
      if (v > max[a]) max[a] = v
    }
  }
  return { min, max }
}

/**
 * @param {object} parsed  hasil parseRbxMesh
 * @param {number} size    ukuran canvas (persegi)
 * @param {function} paintFn ({cx,cy,cz, nx,ny,nz, yFrac, u,v}) => [r,g,b,a] | null
 * @returns {{ tex: THREE.CanvasTexture, frontRect: object }}
 */
export function paintPartTexture(parsed, size, paintFn) {
  const { positions, normals, uvs, indices } = parsed
  const bb = bboxOf(positions)
  const yMin = bb.min[1]
  const ySpan = Math.max(1e-6, bb.max[1] - bb.min[1])

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, size, size)

  // rect UV untuk kelompok normal (untuk menempatkan seni/gambar)
  const groups = { front: null, back: null, left: null, right: null }
  const grow = (key, u, v) => {
    const g = groups[key]
    if (!g) {
      groups[key] = { u0: u, u1: u, v0: v, v1: v }
    } else {
      g.u0 = Math.min(g.u0, u)
      g.u1 = Math.max(g.u1, u)
      g.v0 = Math.min(g.v0, v)
      g.v1 = Math.max(g.v1, v)
    }
  }

  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t]
    const i1 = indices[t + 1]
    const i2 = indices[t + 2]
    // centroid & rata-rata normal
    let cx = 0, cy = 0, cz = 0, nx = 0, ny = 0, nz = 0, su = 0, sv = 0
    for (const vi of [i0, i1, i2]) {
      cx += positions[vi * 3] / 3
      cy += positions[vi * 3 + 1] / 3
      cz += positions[vi * 3 + 2] / 3
      nx += normals[vi * 3] / 3
      ny += normals[vi * 3 + 1] / 3
      nz += normals[vi * 3 + 2] / 3
      su += uvs[vi * 2] / 3
      sv += uvs[vi * 2 + 1] / 3
    }
    const yFrac = (cy - yMin) / ySpan
    const rgba = paintFn({ cx, cy, cz, nx, ny, nz, yFrac, u: su, v: sv })
    if (rgba) {
      const alpha = rgba.length > 3 ? rgba[3] : 255
      ctx.fillStyle = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${alpha / 255})`
      ctx.beginPath()
      const corners = [i0, i1, i2]
      for (let k = 0; k < 3; k++) {
        const vi = corners[k]
        const px = uvs[vi * 2] * size
        const py = (1 - uvs[vi * 2 + 1]) * size
        if (k === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
    }
    if (nz > 0.6) grow('front', su, sv)
    else if (nz < -0.6) grow('back', su, sv)
    else if (nx < -0.6) grow('left', su, sv)
    else if (nx > 0.6) grow('right', su, sv)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return { tex, canvas, ctx, groups }
}

/** gambar teks multi-baris terpusat di dalam rect UV (koordinat canvas) */
export function drawLines(ctx, rect, size, lines, { font, color, lineGap = 1.18, flipX = false, flipY = false } = {}) {
  const u0 = rect.u0 * size
  const u1 = rect.u1 * size
  const v0 = (1 - rect.v1) * size
  const v1 = (1 - rect.v0) * size
  const cx = (u0 + u1) / 2
  const cy = (v0 + v1) / 2
  ctx.save()
  if (flipX || flipY) {
    ctx.translate(cx, cy)
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1)
    ctx.translate(-cx, -cy)
  }
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lh = font.sizePx * lineGap
  const total = lines.length * lh
  ctx.font = `${font.weight ?? 700} ${font.sizePx}px "Chakra Petch", "Arial Black", sans-serif`
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, cy - total / 2 + lh * (i + 0.5))
  })
  ctx.restore()
}
