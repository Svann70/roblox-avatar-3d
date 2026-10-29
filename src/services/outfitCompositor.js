/**
 * Meng-composite tekstur pakaian Roblox Marketplace secara presisi ke UV tubuh avatar.
 * Memotong margin transparan dan memetakan bagian baju (dada, kerah, lengan, manset)
 * dan celana (pinggang, paha, lipatan, sepatu) secara anatomis sesuai UV R15 Roblox.
 */

let cachedBaseImg = null

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

// Cari bounding box ketat dari item di dalam gambar (menghapus margin transparan kosong)
function getNonTransparentBounds(ctx, width, height) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height).data
    let minX = width, maxX = 0, minY = height, maxY = 0
    let hasPixel = false

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const a = imgData[(y * width + x) * 4 + 3]
        if (a > 30) {
          hasPixel = true
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (hasPixel && minX < maxX && minY < maxY) {
      return { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1 }
    }
  } catch (e) {
    console.warn('Gagal scan bounds item:', e)
  }
  return { minX: 0, maxX: width, minY: 0, maxY: height, w: width, h: height }
}

// Ekstrak warna dominan kain pakaian
function extractClothColor(ctx, bounds) {
  try {
    const imgData = ctx.getImageData(bounds.minX, bounds.minY, bounds.w, bounds.h).data
    let r = 0, g = 0, b = 0, count = 0
    for (let i = 0; i < imgData.length; i += 16) {
      const a = imgData[i + 3]
      if (a > 60) {
        r += imgData[i]
        g += imgData[i + 1]
        b += imgData[i + 2]
        count++
      }
    }
    if (count > 0) {
      return {
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count),
      }
    }
  } catch (e) {
    console.warn('Gagal ekstrak warna dominan:', e)
  }
  return { r: 35, g: 30, b: 45 }
}

export function isBottomCloth(item) {
  if (!item) return false
  const type = item.type
  const name = (item.name || '').toLowerCase()
  // Hindari aksesoris pinggang/rantai/belt terdeteksi salah sebagai tekstur celana
  if (type === 47 || type === 8 || type === 41 || type === 42 || type === 43 || type === 44 || type === 45 || type === 46) {
    return false
  }
  if (name.includes('chain') || name.includes('belt') || name.includes('clip') || name.includes('pin') || name.includes('keychain')) {
    return false
  }
  return (
    type === 66 ||
    type === 69 ||
    type === 12 ||
    name.includes('pants') ||
    name.includes('celana') ||
    name.includes('jeans') ||
    name.includes('shorts') ||
    name.includes('skirt') ||
    name.includes('sweats')
  )
}

export function isTopCloth(item) {
  if (!item) return false
  const type = item.type
  const name = (item.name || '').toLowerCase()
  if (type === 47 || type === 8 || type === 41 || type === 42 || type === 43 || type === 44 || type === 45 || type === 46) {
    return false
  }
  if (name.includes('clip') || name.includes('pin') || name.includes('earring') || name.includes('bow')) {
    return false
  }
  return (
    type === 64 ||
    type === 65 ||
    type === 67 ||
    type === 68 ||
    type === 11 ||
    name.includes('shirt') ||
    name.includes('baju') ||
    name.includes('hoodie') ||
    name.includes('sweater') ||
    name.includes('jacket') ||
    name.includes('corset') ||
    name.includes('top') ||
    name.includes('tee') ||
    name.includes('vest')
  )
}

export function isFullCloth(item) {
  if (!item) return false
  const type = item.type
  const name = (item.name || '').toLowerCase()
  if (type === 47 || type === 8 || type === 41 || type === 42 || type === 43 || type === 44 || type === 45 || type === 46) {
    return false
  }
  return (
    type === 72 ||
    name.includes('dress') ||
    name.includes('fit') ||
    name.includes('outfit') ||
    name.includes('babydoll') ||
    name.includes('set')
  )
}

/**
 * Composite item pakaian dari Roblox Marketplace ke tekstur avatar
 * Menerima item tunggal ATAU daftar pakaian terpasang (Top + Bottom).
 * @param {Object|Array} input - Satu item atau array item terpilih
 * @returns {Promise<string>} Data URL tekstur PNG
 */
export async function compositeMarketplaceOutfit(input) {
  let items = []
  if (Array.isArray(input)) {
    items = input.filter(Boolean)
  } else if (input && typeof input === 'object') {
    if (input.topItem || input.bottomItem || input.dressItem) {
      if (input.dressItem) items.push(input.dressItem)
      if (input.topItem) items.push(input.topItem)
      if (input.bottomItem) items.push(input.bottomItem)
    } else if (input.thumb) {
      items.push(input)
    }
  }

  if (items.length === 0) return 'default'

  // Canvas resolusi asli atlas badan Roblox (916 x 568)
  const canvas = document.createElement('canvas')
  canvas.width = 916
  canvas.height = 568
  const ctx = canvas.getContext('2d')

  // 1. Gambar dasar badan avatar asli (dengan warna kulit dan shading asli)
  if (!cachedBaseImg) {
    cachedBaseImg = await loadImg('/avatar/30DAY-c1d75bb16626a918d29492321180c8cd.png')
  }
  ctx.drawImage(cachedBaseImg, 0, 0, 916, 568)

  // Identifikasi slot pakaian yang aktif
  const dressItem = items.find((i) => isFullCloth(i))
  const topItem = dressItem || items.find((i) => isTopCloth(i))
  const bottomItem = dressItem || items.find((i) => isBottomCloth(i))

  // A. RENDER TOP / BAJU
  if (topItem && topItem.thumb) {
    try {
      const thumbImg = await loadImg(topItem.thumb)
      const scanCanvas = document.createElement('canvas')
      scanCanvas.width = thumbImg.width || 420
      scanCanvas.height = thumbImg.height || 420
      const scanCtx = scanCanvas.getContext('2d')
      scanCtx.drawImage(thumbImg, 0, 0, scanCanvas.width, scanCanvas.height)

      const bounds = getNonTransparentBounds(scanCtx, scanCanvas.width, scanCanvas.height)
      const clothColor = extractClothColor(scanCtx, bounds)

      // Shading dasar kain baju
      ctx.fillStyle = `rgba(${clothColor.r}, ${clothColor.g}, ${clothColor.b}, 0.92)`
      // Dada & Punggung (Upper Torso X: 2..388, Y: 2..168)
      ctx.fillRect(2, 2, 386, 168)
      // Lengan Kiri & Kanan (X: 390..654 dan 654..914, Y: 2..220)
      ctx.fillRect(390, 2, 260, 220)
      ctx.fillRect(654, 2, 260, 220)

      // Pemetaan detail dada depan
      const torsoSx = bounds.minX + bounds.w * 0.16
      const torsoSy = bounds.minY
      const torsoSw = bounds.w * 0.68
      const torsoSh = bounds.h

      ctx.save()
      ctx.beginPath()
      ctx.roundRect(130, 10, 210, 160, 6)
      ctx.clip()
      ctx.drawImage(thumbImg, torsoSx, torsoSy, torsoSw, torsoSh, 130, 10, 210, 160)
      ctx.restore()

      // Pemetaan punggung belakang
      ctx.save()
      ctx.beginPath()
      ctx.rect(2, 10, 126, 160)
      ctx.rect(342, 10, 46, 160)
      ctx.clip()
      ctx.drawImage(thumbImg, torsoSx, torsoSy, torsoSw, torsoSh, 2, 10, 126, 160)
      ctx.drawImage(thumbImg, torsoSx, torsoSy, torsoSw, torsoSh, 342, 10, 46, 160)
      ctx.restore()

      // Pemetaan lengan kiri & kanan
      const leftArmSx = bounds.minX
      const leftArmSy = bounds.minY + bounds.h * 0.05
      const leftArmSw = bounds.w * 0.35
      const leftArmSh = bounds.h * 0.88

      ctx.save()
      ctx.beginPath()
      ctx.rect(390, 2, 260, 220)
      ctx.clip()
      ctx.drawImage(thumbImg, leftArmSx, leftArmSy, leftArmSw, leftArmSh, 390, 2, 260, 220)
      ctx.restore()

      const rightArmSx = bounds.minX + bounds.w * 0.65
      const rightArmSy = bounds.minY + bounds.h * 0.05
      const rightArmSw = bounds.w * 0.35
      const rightArmSh = bounds.h * 0.88

      ctx.save()
      ctx.beginPath()
      ctx.rect(654, 2, 260, 220)
      ctx.clip()
      ctx.drawImage(thumbImg, rightArmSx, rightArmSy, rightArmSw, rightArmSh, 654, 2, 260, 220)
      ctx.restore()
    } catch (err) {
      console.warn('Gagal render top cloth:', err)
    }
  }

  // B. RENDER BOTTOM / CELANA (Perbaikan Presisi UV Atlas Roblox)
  if (bottomItem && bottomItem.thumb) {
    try {
      const thumbImg = await loadImg(bottomItem.thumb)
      const scanCanvas = document.createElement('canvas')
      scanCanvas.width = thumbImg.width || 420
      scanCanvas.height = thumbImg.height || 420
      const scanCtx = scanCanvas.getContext('2d')
      scanCtx.drawImage(thumbImg, 0, 0, scanCanvas.width, scanCanvas.height)

      const bounds = getNonTransparentBounds(scanCtx, scanCanvas.width, scanCanvas.height)
      const clothColor = extractClothColor(scanCtx, bounds)

      // 1. Shading dasar celana (Menutup lower torso secara rapat TANPA celah jahitan)
      ctx.fillStyle = `rgba(${clothColor.r}, ${clothColor.g}, ${clothColor.b}, 0.95)`
      // Pinggang/Panggul (Lower Torso X: 2..388, Y: 168..268)
      ctx.fillRect(2, 168, 386, 100)
      // Kaki Kiri (X: 390..654, Y: 275..568)
      ctx.fillRect(390, 275, 264, 293)
      // Kaki Kanan (X: 654..914, Y: 275..568)
      ctx.fillRect(654, 275, 260, 293)

      // 2. Pemetaan Pinggang / Sabuk Celana Asli (360 derajat wrap)
      const waistSx = bounds.minX + bounds.w * 0.12
      const waistSy = bounds.minY
      const waistSw = bounds.w * 0.76
      const waistSh = bounds.h * 0.35

      // Depan pinggang (X: 128..342)
      ctx.save()
      ctx.beginPath()
      ctx.rect(128, 168, 214, 100)
      ctx.clip()
      ctx.drawImage(thumbImg, waistSx, waistSy, waistSw, waistSh, 128, 168, 214, 100)
      ctx.restore()

      // Belakang pinggang kiri & kanan (X: 2..128 & 342..388)
      ctx.save()
      ctx.beginPath()
      ctx.rect(2, 168, 126, 100)
      ctx.rect(342, 168, 46, 100)
      ctx.clip()
      ctx.drawImage(thumbImg, waistSx, waistSy, waistSw, waistSh, 2, 168, 126, 100)
      ctx.drawImage(thumbImg, waistSx, waistSy, waistSw, waistSh, 342, 168, 46, 100)
      ctx.restore()

      // 3. Pemetaan Kaki Celana Sesuai Anatomi Roblox
      // Dari sudut pandang penonton: bagian kanan thumbnail adalah Kaki Kiri avatar
      const legLeftSx = bounds.minX + bounds.w * 0.50
      const legLeftSy = bounds.minY + bounds.h * 0.18
      const legLeftSw = bounds.w * 0.48
      const legLeftSh = bounds.h * 0.82

      ctx.save()
      ctx.beginPath()
      ctx.rect(390, 275, 264, 293)
      ctx.clip()
      ctx.drawImage(thumbImg, legLeftSx, legLeftSy, legLeftSw, legLeftSh, 390, 275, 264, 293)
      ctx.restore()

      // Bagian kiri thumbnail adalah Kaki Kanan avatar
      const legRightSx = bounds.minX + bounds.w * 0.02
      const legRightSy = bounds.minY + bounds.h * 0.18
      const legRightSw = bounds.w * 0.48
      const legRightSh = bounds.h * 0.82

      ctx.save()
      ctx.beginPath()
      ctx.rect(654, 275, 260, 293)
      ctx.clip()
      ctx.drawImage(thumbImg, legRightSx, legRightSy, legRightSw, legRightSh, 654, 275, 260, 293)
      ctx.restore()
    } catch (err) {
      console.warn('Gagal render bottom cloth:', err)
    }
  }

  return canvas.toDataURL('image/png')
}
