import assert from 'node:assert'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const AVATAR_DIR = join(ROOT, 'public', 'avatar')

// 1. Cek file avatar asli tersedia lengkap
assert(existsSync(join(AVATAR_DIR, 'avatar.obj')), 'avatar.obj harus ada')
assert(existsSync(join(AVATAR_DIR, 'avatar.mtl')), 'avatar.mtl harus ada')
assert(existsSync(join(AVATAR_DIR, 'avatar-3d.json')), 'avatar-3d.json harus ada')

// 2. Cek bug transparansi: avatar.mtl tidak boleh punya map_d
const mtl = readFileSync(join(AVATAR_DIR, 'avatar.mtl'), 'utf8')
assert(!mtl.includes('map_d'), 'avatar.mtl tidak boleh memuat map_d (penyebab avatar transparan)')

// 3. Cek tekstur .png ada
assert(existsSync(join(AVATAR_DIR, '30DAY-c1d75bb16626a918d29492321180c8cd.png')), 'tekstur 1 harus ada')
assert(existsSync(join(AVATAR_DIR, '30DAY-4e54a3a32fe0c76ed083bfe8af72df78.png')), 'tekstur 2 harus ada')
assert(existsSync(join(AVATAR_DIR, '30DAY-74b8724f8a96bb58333ebdb25c392060.png')), 'tekstur 3 harus ada')

console.log('✓ Verifikasi avatar asli & fix transparansi lulus 100%')
