import * as THREE from 'three'

/**
 * Generator tekstur canvas — semua grafik avatar digambar prosedural
 * berdasarkan referensi visual avatar Roblox asli (userId 9011684825):
 * wajah kawaii chibi, kaos hitam "SOMEBODY NEEDS..." hijau (gir),
 * celana strip hijau-hitam, wristband kotak-kotak hijau.
 */

function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  return { canvas, ctx }
}

function toTexture(canvas, repeat = [1, 1]) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(...repeat)
  tex.anisotropy = 8
  return tex
}

function grain(ctx, width, height, alpha = 0.05, step = 3) {
  ctx.save()
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (Math.random() < 0.12) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * alpha})`
        ctx.fillRect(x, y, step, step)
      } else if (Math.random() < 0.1) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * alpha * 1.6})`
        ctx.fillRect(x, y, step, step)
      }
    }
  }
  ctx.restore()
}

/** Wajah anime menyerupai Dynamic Head asli: mata gelap glossy besar,
 *  blush sangat halus (tanpa blok pink besar), mulut kecil */
export function makeFaceTexture() {
  const { canvas, ctx } = createCanvas(512, 512)
  ctx.clearRect(0, 0, 512, 512)

  // mata besar glossy
  const eye = (cx) => {
    ctx.save()
    // putih mata
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(cx, 262, 34, 44, 0, 0, Math.PI * 2)
    ctx.fill()
    // iris gelap
    const grad = ctx.createRadialGradient(cx, 268, 5, cx, 268, 36)
    grad.addColorStop(0, '#4a4552')
    grad.addColorStop(0.7, '#262230')
    grad.addColorStop(1, '#15121c')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(cx, 268, 28, 36, 0, 0, Math.PI * 2)
    ctx.fill()
    // kilau utama + kecil
    ctx.fillStyle = 'rgba(255,255,255,0.98)'
    ctx.beginPath()
    ctx.ellipse(cx - 10, 252, 11, 13, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.beginPath()
    ctx.ellipse(cx + 9, 284, 5, 7, 0.4, 0, Math.PI * 2)
    ctx.fill()
    // garis bulu mata atas tebal
    ctx.strokeStyle = '#17141d'
    ctx.lineWidth = 11
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - 32, 226)
    ctx.quadraticCurveTo(cx, 204, cx + 32, 226)
    ctx.stroke()
    ctx.restore()
  }
  eye(168)
  eye(344)

  // alis tipis lembut
  ctx.strokeStyle = 'rgba(40,34,46,0.65)'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(142, 178)
  ctx.quadraticCurveTo(170, 170, 196, 178)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(316, 178)
  ctx.quadraticCurveTo(342, 170, 370, 178)
  ctx.stroke()

  // blush halus (tanpa blok pink besar)
  const blush = (cx) => {
    ctx.save()
    ctx.globalAlpha = 0.28
    const g = ctx.createRadialGradient(cx, 330, 3, cx, 330, 26)
    g.addColorStop(0, '#f2a0aa')
    g.addColorStop(1, 'rgba(242,160,170,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(cx, 330, 26, 14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  blush(128)
  blush(384)

  // hidung kecil (bayangan halus)
  ctx.fillStyle = 'rgba(180,130,120,0.35)'
  ctx.beginPath()
  ctx.ellipse(256, 312, 6, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  // mulut kecil senyum
  ctx.strokeStyle = '#7a3a4a'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(238, 350)
  ctx.quadraticCurveTo(256, 366, 274, 350)
  ctx.stroke()

  return toTexture(canvas)
}

/** Kaos hitam "SOMEBODY NEEDS..." dengan grafis hijau (motif gir) */
export function makeTeeTexture() {
  const { canvas, ctx } = createCanvas(512, 512)
  ctx.fillStyle = '#0b0b0d'
  ctx.fillRect(0, 0, 512, 512)

  // lipatan kain samar
  ctx.save()
  for (let i = 0; i < 5; i++) {
    const x = 40 + i * 100 + Math.random() * 30
    ctx.strokeStyle = 'rgba(255,255,255,0.028)'
    ctx.lineWidth = 26
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.quadraticCurveTo(x + 24, 256, x, 512)
    ctx.stroke()
  }
  ctx.restore()

  const green = '#3fd44a'
  ctx.fillStyle = green
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 62px "Chakra Petch", "Arial Black", sans-serif'
  ctx.fillText('SOMEBODY', 230, 118)
  ctx.fillText('NEEDS A', 230, 192)
  ctx.fillText('HUG', 230, 266)

  // grafis makhluk hijau ala gir di sisi kanan
  ctx.save()
  ctx.translate(360, 380)
  ctx.scale(0.85, 0.85)
  // badan
  ctx.fillStyle = green
  ctx.beginPath()
  ctx.ellipse(0, 20, 78, 88, 0, 0, Math.PI * 2)
  ctx.fill()
  // telinga
  ctx.beginPath()
  ctx.ellipse(-62, -34, 16, 26, -0.5, 0, Math.PI * 2)
  ctx.ellipse(62, -34, 16, 26, 0.5, 0, Math.PI * 2)
  ctx.fill()
  // mata hitam besar
  ctx.fillStyle = '#0b0b0d'
  ctx.beginPath()
  ctx.ellipse(-28, -6, 16, 22, 0, 0, Math.PI * 2)
  ctx.ellipse(28, -6, 16, 22, 0, 0, Math.PI * 2)
  ctx.fill()
  // lidah
  ctx.fillStyle = '#e5484d'
  ctx.beginPath()
  ctx.ellipse(0, 48, 18, 30, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  grain(ctx, 512, 512, 0.05)
  return toTexture(canvas)
}

/** Strip horizontal hijau-hitam untuk celana pendek */
export function makeStripesTexture() {
  const { canvas, ctx } = createCanvas(256, 256)
  const green = '#35b53f'
  const dark = '#101013'
  const band = 32
  for (let y = 0; y < 256; y += band) {
    ctx.fillStyle = (y / band) % 2 === 0 ? green : dark
    ctx.fillRect(0, y, 256, band)
  }
  // variasi benang
  ctx.save()
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 18, 2)
  }
  ctx.restore()
  grain(ctx, 256, 256, 0.04)
  return toTexture(canvas)
}

/** Kotak-kotak hijau-hitam untuk wristband */
export function makeCheckerTexture() {
  const { canvas, ctx } = createCanvas(64, 64)
  const cell = 8
  for (let y = 0; y < 64; y += cell) {
    for (let x = 0; x < 64; x += cell) {
      ctx.fillStyle = (x / cell + y / cell) % 2 === 0 ? '#2fae39' : '#0d0d10'
      ctx.fillRect(x, y, cell, cell)
    }
  }
  return toTexture(canvas)
}

/** Jaring ikan (fishnet) gelap untuk panel shorts */
export function makeFishnetTexture() {
  const { canvas, ctx } = createCanvas(64, 64)
  ctx.fillStyle = '#141419'
  ctx.fillRect(0, 0, 64, 64)
  ctx.strokeStyle = '#3a3a46'
  ctx.lineWidth = 3
  for (let i = -64; i <= 128; i += 16) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + 64, 64)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(i + 64, 0)
    ctx.lineTo(i, 64)
    ctx.stroke()
  }
  return toTexture(canvas)
}
