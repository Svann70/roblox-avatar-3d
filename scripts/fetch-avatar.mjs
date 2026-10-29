/**
 * Ekstraksi model 3D avatar Roblox asli langsung dari CDN.
 * Jalankan: npm run fetch-avatar
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'avatar')
const USER_ID = 9011684825 // atensiei (phobe)

function rbxCdnUrlFromHash(h) {
  let i = 31
  const n = Math.min(38, h.length)
  for (let t = 0; t < n; t++) i ^= h.charCodeAt(t)
  return `https://t${i % 8}.rbxcdn.com/${h}`
}

async function main() {
  await mkdir(OUT, { recursive: true })
  console.log(`→ Meminta metadata avatar 3D user ${USER_ID}…`)

  const thumbUrl = `https://roembed.com/r?url=${encodeURIComponent(`https://thumbnails.roblox.com/v1/users/avatar-3d?userId=${USER_ID}`)}`
  const thumbRes = await fetch(thumbUrl)
  if (!thumbRes.ok) throw new Error(`HTTP ${thumbRes.status} saat meminta thumbnail manifest`)
  const thumb = await thumbRes.json()

  if (!thumb.imageUrl) throw new Error('Data avatar 3D tidak ditemukan')

  console.log('→ Mengunduh JSON manifest…')
  const manifestUrl = `https://roembed.com/r?url=${encodeURIComponent(thumb.imageUrl)}`
  const manifestRes = await fetch(manifestUrl)
  const manifest = await manifestRes.json()
  await writeFile(join(OUT, 'avatar-3d.json'), JSON.stringify(manifest, null, 2))

  console.log('→ Mengunduh avatar.obj…')
  const objBuf = await fetch(rbxCdnUrlFromHash(manifest.obj)).then((r) => r.arrayBuffer())
  await writeFile(join(OUT, 'avatar.obj'), Buffer.from(objBuf))

  console.log('→ Mengunduh dan memperbaiki avatar.mtl…')
  const rawMtl = await fetch(rbxCdnUrlFromHash(manifest.mtl)).then((r) => r.text())

  // Bersihkan map_d yang menyebabkan bug transparansi pada pakaian gelap di Three.js
  const cleanMtl = rawMtl
    .split('\n')
    .filter((line) => !line.trim().startsWith('map_d') && !line.trim().startsWith('rbx_alphamode'))
    .map((line) => {
      // Pastikan nama tekstur memiliki ekstensi .png
      if (line.includes('30DAY-')) {
        return line.replace(/(30DAY-[a-f0-9]+)(?!\.png)/gi, '$1.png')
      }
      return line
    })
    .join('\n')
  await writeFile(join(OUT, 'avatar.mtl'), cleanMtl)

  for (const texHash of manifest.textures) {
    console.log(`→ Mengunduh tekstur ${texHash}…`)
    const texBuf = await fetch(rbxCdnUrlFromHash(texHash)).then((r) => r.arrayBuffer())
    const buf = Buffer.from(texBuf)
    await writeFile(join(OUT, `${texHash}.png`), buf)
    await writeFile(join(OUT, texHash), buf)
  }

  console.log('\n✓ Berhasil: Semua asset avatar asli tersimpan di public/avatar/ tanpa bug transparansi!')
}

main().catch((e) => {
  console.error('\n✗ Gagal:', e.message)
  process.exit(1)
})
