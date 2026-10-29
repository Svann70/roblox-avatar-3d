/**
 * Layanan API Roblox Marketplace / Catalog resmi
 * Mengambil data baju, celana, aksesoris, dan rambut langsung dari endpoint Roblox.
 */

const FALLBACK_POPULAR_ITEMS = [
  {
    id: 15974637704,
    name: 'Emo Shirt',
    price: 65,
    creator: "Deki's UGC",
    creatorVerified: false,
    thumb: 'https://tr.rbxcdn.com/180DAY-9ebd314ef4eee91a47f70a5fc9b4227f/420/420/ShirtAccessory/Png/noFilter',
    type: 65,
  },
  {
    id: 16774315581,
    name: 'Goth Pants',
    price: 75,
    creator: 'Keysmash',
    creatorVerified: true,
    thumb: 'https://tr.rbxcdn.com/180DAY-06fd172a8bf356d49ce71733e854238f/420/420/PantsAccessory/Png/noFilter',
    type: 66,
  },
  {
    id: 89091414775116,
    name: 'Coquette Bow Clips',
    price: 95,
    creator: 'Sweetie',
    creatorVerified: false,
    thumb: 'https://tr.rbxcdn.com/180DAY-4ff4c97d24387953bcc7e5e5e3a7c80a/420/420/FaceAccessory/Png/noFilter',
    type: 42,
  },
  {
    id: 9010735578,
    name: 'Black Neko Cat Ears',
    price: 95,
    creator: 'hu2an',
    creatorVerified: false,
    thumb: 'https://tr.rbxcdn.com/180DAY-4ff4c97d24387953bcc7e5e5e3a7c80a/420/420/Hat/Png/noFilter',
    type: 8,
  },
  {
    id: 77938992768406,
    name: 'Coquette Bow Heart Plaid Babydoll Fit',
    price: 120,
    creator: 'Pastel Dreams',
    creatorVerified: true,
    thumb: 'https://tr.rbxcdn.com/180DAY-a3780f4606df772d3901a2eaaefb8888/420/420/DressSkirtAccessory/Png/noFilter',
    type: 72,
  },
  {
    id: 9240757332,
    name: 'Knit Sweater - Black',
    price: 0,
    creator: 'Roblox',
    creatorVerified: true,
    thumb: 'https://tr.rbxcdn.com/180DAY-348a236664603ed2f98acc693d591330/420/420/SweaterAccessory/Png/noFilter',
    type: 68,
  },
  {
    id: 7192553841,
    name: 'Zip Hoodie - Black',
    price: 0,
    creator: 'Roblox',
    creatorVerified: true,
    thumb: 'https://tr.rbxcdn.com/180DAY-d172a3ffbf00fba41d86b8a1cddd0c7f/420/420/JacketAccessory/Png/noFilter',
    type: 67,
  },
  {
    id: 111345380055592,
    name: 'Flared Goth Pants with Chains',
    price: 75,
    creator: 'Darkside',
    creatorVerified: false,
    thumb: 'https://tr.rbxcdn.com/180DAY-06fd172a8bf356d49ce71733e854238f/420/420/PantsAccessory/Png/noFilter',
    type: 66,
  },
  {
    id: 5410735511,
    name: 'Angel Glowing Halo',
    price: 100,
    creator: 'Starlight',
    creatorVerified: true,
    thumb: 'https://tr.rbxcdn.com/180DAY-4ff4c97d24387953bcc7e5e5e3a7c80a/420/420/Hat/Png/noFilter',
    type: 8,
  },
  {
    id: 5410735512,
    name: 'White Fairy Wings',
    price: 150,
    creator: 'Ethereal',
    creatorVerified: true,
    thumb: 'https://tr.rbxcdn.com/180DAY-4ff4c97d24387953bcc7e5e5e3a7c80a/420/420/BackAccessory/Png/noFilter',
    type: 46,
  },
  {
    id: 8810735513,
    name: 'Goth Waist Chain & Belt',
    price: 60,
    creator: 'Darkside',
    creatorVerified: false,
    thumb: 'https://tr.rbxcdn.com/180DAY-4ff4c97d24387953bcc7e5e5e3a7c80a/420/420/WaistAccessory/Png/noFilter',
    type: 47,
  },
  {
    id: 8810735514,
    name: 'Cute Shoulder Pet',
    price: 85,
    creator: 'Sweetie',
    creatorVerified: false,
    thumb: 'https://tr.rbxcdn.com/180DAY-4ff4c97d24387953bcc7e5e5e3a7c80a/420/420/ShoulderAccessory/Png/noFilter',
    type: 44,
  },
  {
    id: 8810735515,
    name: 'Y2K Gold Round Glasses',
    price: 50,
    creator: 'Vintage',
    creatorVerified: true,
    thumb: 'https://tr.rbxcdn.com/180DAY-4ff4c97d24387953bcc7e5e5e3a7c80a/420/420/FaceAccessory/Png/noFilter',
    type: 42,
  },
  {
    id: 8810735516,
    name: 'Fluffy Neko Tail',
    price: 90,
    creator: 'hu2an',
    creatorVerified: false,
    thumb: 'https://tr.rbxcdn.com/180DAY-4ff4c97d24387953bcc7e5e5e3a7c80a/420/420/WaistAccessory/Png/noFilter',
    type: 47,
  },
]

/**
 * Mencari item dari Roblox Marketplace API
 * @param {Object} options
 * @param {string} [options.keyword=''] - Kata kunci pencarian (misal: 'shirt', 'pants', 'y2k', 'dress')
 * @param {number} [options.category=3] - Kategori (1: All, 3: Clothing, 11: Accessories)
 * @param {number} [options.limit=10] - Jumlah item (10, 28, atau 30)
 */
export async function searchRobloxMarketplace({ keyword = '', category = 3, limit = 10 } = {}) {
  try {
    // 1. Panggil catalog API via Vite proxy
    const params = new URLSearchParams()
    if (category) params.set('category', category.toString())
    if (keyword && keyword.trim()) params.set('keyword', keyword.trim())
    params.set('limit', limit.toString())

    const catalogUrl = `/api/roblox-catalog/v1/search/items/details?${params.toString()}`
    const res = await fetch(catalogUrl)

    if (!res.ok) {
      throw new Error(`Catalog API status: ${res.status}`)
    }

    const data = await res.json()
    const items = data.data || []

    if (items.length === 0) {
      return []
    }

    // 2. Ambil thumbnail batch dari Roblox CDN
    const ids = items.map((i) => i.id).filter(Boolean)
    const thumbMap = await fetchThumbnailsBatch(ids)

    return items.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price ?? 0,
      priceFormatted: i.priceStatus === 'Free' || i.price === 0 ? 'Free' : `R$ ${i.price}`,
      creator: i.creatorName || 'Roblox Creator',
      creatorVerified: Boolean(i.creatorHasVerifiedBadge),
      thumb: thumbMap[i.id] || `https://tr.rbxcdn.com/default/150/150/Png/noFilter`,
      type: i.assetType,
      robloxUrl: `https://www.roblox.com/catalog/${i.id}`,
    }))
  } catch (err) {
    console.warn('Gagal fetch Roblox API live, memakai data marketplace fallback:', err.message)
    // Filter fallback sesuai keyword jika ada
    if (keyword && keyword.trim()) {
      const q = keyword.toLowerCase().trim()
      const filtered = FALLBACK_POPULAR_ITEMS.filter(
        (i) => i.name.toLowerCase().includes(q) || i.creator.toLowerCase().includes(q),
      )
      return filtered.length > 0 ? filtered : FALLBACK_POPULAR_ITEMS
    }
    return FALLBACK_POPULAR_ITEMS
  }
}

/**
 * Mengambil gambar thumbnail batch dari Roblox
 */
async function fetchThumbnailsBatch(ids) {
  if (!ids || ids.length === 0) return {}
  const map = {}
  try {
    const thumbUrl = `/api/roblox-thumbnails/v1/assets?assetIds=${ids.join(',')}&format=Png&size=420x420`
    const res = await fetch(thumbUrl)
    if (res.ok) {
      const data = await res.json()
      ;(data.data || []).forEach((t) => {
        if (t.targetId && t.imageUrl) {
          map[t.targetId] = t.imageUrl
        }
      })
    }
  } catch (err) {
    console.warn('Gagal ambil batch thumbnail:', err.message)
  }
  return map
}

/**
 * Mencari item Roblox spesifik berdasarkan Asset ID
 */
export async function fetchItemById(assetId) {
  if (!assetId) return null
  const cleanId = String(assetId).trim()
  try {
    const res = await fetch(`/api/roblox-economy/v2/assets/${cleanId}/details`)
    if (!res.ok) throw new Error(`Economy API status: ${res.status}`)
    const data = await res.json()

    // Ambil thumbnail
    const thumbMap = await fetchThumbnailsBatch([cleanId])

    return {
      id: cleanId,
      name: data.Name,
      price: data.PriceInRobux ?? 0,
      priceFormatted: data.PriceInRobux ? `R$ ${data.PriceInRobux}` : 'Free',
      creator: data.Creator?.Name || 'Roblox Creator',
      creatorVerified: Boolean(data.Creator?.HasVerifiedBadge),
      thumb: thumbMap[cleanId] || '',
      type: data.AssetTypeId,
      robloxUrl: `https://www.roblox.com/catalog/${cleanId}`,
    }
  } catch (err) {
    console.warn(`Gagal ambil detail item ID ${cleanId}:`, err.message)
    // Fallback: Ambil thumbnail langsung jika economy API membatasi akses publik
    try {
      const thumbMap = await fetchThumbnailsBatch([cleanId])
      if (thumbMap[cleanId]) {
        return {
          id: cleanId,
          name: `Roblox Asset #${cleanId}`,
          price: 0,
          priceFormatted: 'Market Item',
          creator: 'Roblox Creator',
          creatorVerified: true,
          thumb: thumbMap[cleanId],
          type: 42,
          robloxUrl: `https://www.roblox.com/catalog/${cleanId}`,
        }
      }
    } catch (_) {}
    return null
  }
}
