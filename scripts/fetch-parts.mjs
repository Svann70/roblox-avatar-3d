/**
 * Mengunduh mesh tubuh R15 ASLI avatar Roblox via endpoint metadata
 * assetdelivery v2 (publik, tanpa auth — berlaku untuk body parts bawaan Roblox).
 *
 * Pipeline per bagian tubuh:
 *   asset body part (rbxm) -> ekstrak MeshId -> unduh file .mesh biner
 * Hasil: public/parts/*.mesh + manifest.json
 *
 * Jalankan: npm run fetch-parts
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'parts')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// Bagian tubuh dari avatar atensiei (avatar.roblox.com API)
const PARTS = {
  torso: 86499666,
  rightArm: 86499698,
  leftArm: 86499716,
  leftLeg: 4637242166,
  rightLeg: 4637243648,
}

async function getLocation(assetId) {
  const res = await fetch(`https://assetdelivery.roblox.com/v2/assetId/${assetId}`, {
    headers: { 'User-Agent': UA },
  })
  const j = await res.json()
  const loc = j.locations?.[0]?.location
  if (!loc) throw new Error(`asset ${assetId}: tidak ada location (${JSON.stringify(j).slice(0, 120)})`)
  return loc
}

async function download(assetId) {
  const loc = await getLocation(assetId)
  const res = await fetch(loc, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`unduh ${assetId}: HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const manifest = { format: 'rbxmesh-v2', parts: {} }

  for (const [name, partId] of Object.entries(PARTS)) {
    process.stdout.write(`→ ${name} (asset ${partId})… `)
    const rbxm = await download(partId)

    // MeshId = asset id pertama yang muncul sebagai /?id=<digits> di rbxm
    const s = rbxm.toString('latin1')
    const ids = [...new Set([...s.matchAll(/\/\?id=(\d+)/g)].map((m) => m[1]))]
    if (!ids.length) throw new Error(`${name}: MeshId tidak ditemukan di rbxm`)
    const meshId = ids[0]

    const mesh = await download(meshId)
    if (mesh.slice(0, 13).toString('latin1') !== 'version 2.00\n') {
      throw new Error(`${name}: format mesh tidak didukung: ${mesh.slice(0, 13)}`)
    }
    await writeFile(join(OUT, `${name}.mesh`), mesh)
    manifest.parts[name] = { partAsset: partId, meshAsset: Number(meshId), file: `${name}.mesh` }
    console.log(`mesh ${meshId} (${mesh.length} bytes) ✓`)
  }

  await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`\n✓ ${Object.keys(PARTS).length} mesh asli tersimpan di public/parts/`)
}

main().catch((e) => {
  console.error('\n✗ Gagal:', e.message)
  process.exit(1)
})
