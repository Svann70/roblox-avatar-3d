/**
 * Parser format mesh biner Roblox "version 2.00".
 *
 * Struktur (terverifikasi empiris terhadap 5 mesh body part R15):
 *   "version 2.00\n"           13 byte
 *   u32 flag                   (konstanta 0x0C28000C)
 *   u32 numVertices
 *   u32 numTriangles
 *   vertex × numVertices       40 byte: pos 3×f32, normal 3×f32, uv 2×f32, +8 byte meta
 *   index × numTriangles × 3   u32
 */
export function parseRbxMesh(buffer) {
  const dv = new DataView(buffer)
  const header = new TextDecoder().decode(new Uint8Array(buffer, 0, 13))
  if (header !== 'version 2.00\n') {
    throw new Error('Format mesh tidak didukung: ' + JSON.stringify(header))
  }
  const numVerts = dv.getUint32(17, true)
  const numTris = dv.getUint32(21, true)

  const positions = new Float32Array(numVerts * 3)
  const normals = new Float32Array(numVerts * 3)
  const uvs = new Float32Array(numVerts * 2)
  const indices = new Uint32Array(numTris * 3)

  let off = 25
  for (let i = 0; i < numVerts; i++) {
    positions[i * 3] = dv.getFloat32(off, true)
    positions[i * 3 + 1] = dv.getFloat32(off + 4, true)
    positions[i * 3 + 2] = dv.getFloat32(off + 8, true)
    normals[i * 3] = dv.getFloat32(off + 12, true)
    normals[i * 3 + 1] = dv.getFloat32(off + 16, true)
    normals[i * 3 + 2] = dv.getFloat32(off + 20, true)
    uvs[i * 2] = dv.getFloat32(off + 24, true)
    uvs[i * 2 + 1] = dv.getFloat32(off + 28, true)
    off += 40
  }
  for (let i = 0; i < numTris * 3; i++) {
    indices[i] = dv.getUint32(off, true)
    off += 4
  }
  return { positions, normals, uvs, indices, numVerts, numTris }
}

/** Bounding box cepat dari hasil parse */
export function bboxOf({ positions }) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      const v = positions[i + a]
      if (v < min[a]) min[a] = v
      if (v > max[a]) max[a] = v
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] }
}
