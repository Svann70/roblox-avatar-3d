import { useCallback, useEffect, useRef, useState } from 'react'
import AvatarCanvas, { BG_PRESETS } from './components/AvatarCanvas.jsx'

// Karakter awal asli Roblox ID 9011684825 (phobe / @atensiei)
const USER = {
  id: 9011684825,
  name: 'atensiei',
  displayName: 'phobe',
}

const MAIN_TABS = [
  { id: 'emotes', label: 'Gerakan & Emote', icon: '💃' },
  { id: 'accessories', label: 'Aksesoris 3D', icon: '🎀' },
  { id: 'outfits', label: 'Gaya & Baju', icon: '✨' },
  { id: 'backgrounds', label: 'Latar 3D', icon: '🌌' },
]

const EMOTES = [
  { key: 'idle', label: 'R15 Idle', icon: 'M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-3 7h6v5h-2v6h-2v-6H9V9Z' },
  { key: 'dance', label: 'Dance', icon: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' },
  { key: 'wave', label: 'Wave', icon: 'M7 11V6a2 2 0 0 1 4 0m0 5V4a2 2 0 0 1 4 0v7m0-5a2 2 0 0 1 4 0v8a8 8 0 0 1-8 8h-1c-2.8 0-4.5-.9-6-2.3L2.4 14a2 2 0 0 1 2.8-2.8L7 13' },
  { key: 'cheer', label: 'Cheer', icon: 'M6 4l4 6m8-6l-4 6M12 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-3 7h6v6H9v-6Z' },
  { key: 'laugh', label: 'Laugh', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-4 7h.01M16 9h.01M8 14s1.5 3 4 3 4-3 4-3' },
  { key: 'toy', label: 'Toy Idle', icon: 'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-4 8h8v4h-2v7h-4v-7H8v-4Z' },
  { key: 'float', label: 'Levitate', icon: 'M12 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM5 11l4 2 3-2 3 2 4-2M10 16l2 5 2-5' },
  { key: 'point', label: 'Point', icon: 'M3 12h11m0 0l-4-4m4 4l-4 4M19 8v8' },
  { key: 'spin', label: '360° Spin', icon: 'M21 12a9 9 0 1 1-3-6.7M21 3v6h-6' },
]

const OUTFIT_PRESETS = [
  { id: 'default', name: 'Gir Scene Asli', desc: 'Baju Asli Roblox 9011684825', url: 'default', color: '#22c55e' },
  { id: 'coquette', name: 'Pastel Coquette', desc: 'Pink Ribbon Lace Fit', url: '/avatar/outfits/coquette.png', color: '#f472b6' },
  { id: 'goth', name: 'Goth Velvet', desc: 'Midnight Grunge Dark', url: '/avatar/outfits/goth.png', color: '#c084fc' },
  { id: 'cyber', name: 'Cyber Wave', desc: 'Neon Tech Streetwear', url: '/avatar/outfits/cyber.png', color: '#38bdf8' },
]

const HAIR_COLORS = [
  { label: 'Hitam Asli', value: '#18151c' },
  { label: 'Blonde Emas', value: '#eedc9a' },
  { label: 'Pastel Pink', value: '#ffb4c8' },
  { label: 'Lavender', value: '#cfbaf0' },
  { label: 'Silver White', value: '#e2e8f0' },
  { label: 'Cherry Wine', value: '#881337' },
]

const ACCESSORY_LIST = [
  { id: 'hair', label: 'Rambut Ponytail', icon: '💇‍♀️' },
  { id: 'bow', label: 'Pita Coquette', icon: '🎀' },
  { id: 'catEars', label: 'Telinga Kucing', icon: '🐱' },
  { id: 'bunnyEars', label: 'Telinga Kelinci', icon: '🐰' },
  { id: 'jacket3d', label: 'Kerah Hoodie', icon: '🧥' },
]

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

const HEART_PATH = 'M12 21s-7.5-4.7-10-9.3C.4 8.6 2.4 5 6 5c2.2 0 3.6 1.2 4.5 2.5h3C14.4 6.2 15.8 5 18 5c3.6 0 5.6 3.6 4 6.7C19.5 16.3 12 21 12 21Z'

export default function App() {
  const [showOpening, setShowOpening] = useState(false)
  const [isOpeningExiting, setIsOpeningExiting] = useState(false)
  const [activeTab, setActiveTab] = useState('emotes')
  const [isDockOpen, setIsDockOpen] = useState(true)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)
  const currentDeltaY = useRef(0)
  const [emote, setEmote] = useState('idle')
  const [rigType, setRigType] = useState('R15')
  const [viewMode, setViewMode] = useState('body')
  const [autoRotate, setAutoRotate] = useState(false)
  const [resetCount, setResetCount] = useState(0)

  // 3D Background & Picture Mode
  const [bgPresetId, setBgPresetId] = useState('studio')
  const [isPhotoMode, setIsPhotoMode] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const toastTimeoutRef = useRef(null)

  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 2800)
  }, [])

  // Kustomisasi Avatar
  const [outfitUrl, setOutfitUrl] = useState('default')
  const [equippedItems, setEquippedItems] = useState([])
  const [hairColor, setHairColor] = useState('#18151c')
  const [accessories, setAccessories] = useState({
    hair: true,
    bow: false,
    catEars: false,
    bunnyEars: false,
    jacket3d: false,
  })
  const [accColors, setAccColors] = useState({})
  const [accScale, setAccScale] = useState(1.0)

  // Reaksi & Interaksi Avatar
  const [likes, setLikes] = useState(72)
  const [hearts, setHearts] = useState([])
  const heartId = useRef(0)
  const fileInputRef = useRef(null)

  // Partikel Hati saat Interaksi Avatar
  const burstHearts = useCallback((customPos = null) => {
    setLikes((l) => l + 1)
    const baseColors = ['#f472b6', '#ec4899', '#fbcfe8', '#fda4af', '#f43f5e', '#c084fc']
    const newHearts = Array.from({ length: 6 }).map((_, i) => ({
      id: `${Date.now()}-${heartId.current++}-${i}`,
      x: customPos ? customPos.x + (Math.random() - 0.5) * 16 : 50 + (Math.random() - 0.5) * 20,
      y: customPos ? customPos.y + (Math.random() - 0.5) * 10 : 38 + Math.random() * 25,
      size: 16 + Math.random() * 20,
      color: baseColors[Math.floor(Math.random() * baseColors.length)],
    }))

    setHearts((prev) => [...prev, ...newHearts])
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)))
    }, 1200)
  }, [])

  // Klik langsung ke badan avatar (Interaktif)
  const handleAvatarClick = useCallback(() => {
    burstHearts()
    const sequence = ['dance', 'wave', 'cheer', 'spin', 'laugh', 'toy', 'point', 'float']
    setEmote((curr) => {
      const idx = sequence.indexOf(curr)
      return sequence[(idx + 1) % sequence.length]
    })
  }, [burstHearts])

  // Multi-Finger Pinch Gesture untuk Zoom / Skala Aksesoris 3D
  const pinchStartDist = useRef(0)
  const pinchStartScale = useRef(1.0)

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        pinchStartDist.current = Math.hypot(dx, dy)
        pinchStartScale.current = accScale
      }
    }

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && pinchStartDist.current > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const currentDist = Math.hypot(dx, dy)
        const ratio = currentDist / pinchStartDist.current
        const nextScale = Math.min(2.0, Math.max(0.4, Number((pinchStartScale.current * ratio).toFixed(2))))
        setAccScale(nextScale)
      }
    }

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        pinchStartDist.current = 0
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [accScale])

  // Masuk dari Opening Screen ke Studio Utama
  const handleEnterStudio = () => {
    setIsOpeningExiting(true)
    burstHearts()
    setEmote('dance')
    setTimeout(() => {
      setShowOpening(false)
      setIsOpeningExiting(false)
    }, 380)
  }

  // Gesture Swipe-Down Drag untuk Tutup Bottom Sheet
  const handleDragPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    dragStartY.current = e.clientY
    currentDeltaY.current = 0
    setIsDragging(true)
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch (_) {}
  }

  const handleDragPointerMove = (e) => {
    if (!dragStartY.current) return
    const delta = e.clientY - dragStartY.current
    if (delta > 0) {
      currentDeltaY.current = delta
      setDragOffset(delta)
    }
  }

  const handleDragPointerUp = () => {
    if (currentDeltaY.current > 70) {
      setIsDockOpen(false)
    }
    dragStartY.current = 0
    currentDeltaY.current = 0
    setIsDragging(false)
    setDragOffset(0)
  }

  // Upload Template Baju/Celana Sendiri
  const handleUploadTexture = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setOutfitUrl(url)
    setAccessories((p) => ({ ...p, jacket3d: false }))
    setEquippedItems([
      {
        id: 'custom-upload',
        name: file.name.replace(/\.[^/.]+$/, ''),
        kind: 'clothing',
        slot: 'clothing',
        thumb: url,
      },
    ])
    burstHearts()
  }

  // Reset ke avatar default asli
  const resetToOriginal = () => {
    setOutfitUrl('default')
    setEquippedItems([])
    setHairColor('#18151c')
    setAccessories({
      hair: true,
      bow: false,
      catEars: false,
      bunnyEars: false,
      jacket3d: false,
    })
    setAccColors({})
    setAccScale(1.0)
    setBgPresetId('studio')
    setViewMode('body')
    setResetCount((c) => c + 1)
    burstHearts()
  }

  // Ambil Foto Canvas (Download PNG)
  const handleSnapPhoto = useCallback(() => {
    try {
      const canvas = document.querySelector('.cac-app canvas')
      if (!canvas) return
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `phobe-roblox-${bgPresetId}-${Date.now()}.png`
      link.href = dataUrl
      link.click()
      burstHearts()
      showToast('📸 Foto berhasil disimpan!')
    } catch (err) {
      console.error(err)
      showToast('Gagal mengambil foto canvas')
    }
  }, [bgPresetId, burstHearts, showToast])

  // Bagikan Foto / Tautan Studio
  const handleShare = useCallback(async () => {
    burstHearts()
    const fallbackCopy = () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href)
        showToast('🔗 Tautan studio disalin!')
      } else {
        showToast('Salin tautan dari browser')
      }
    }

    try {
      const canvas = document.querySelector('.cac-app canvas')
      if (canvas && navigator.share && window.File) {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            fallbackCopy()
            return
          }
          const file = new File([blob], 'phobe-roblox-avatar.png', { type: 'image/png' })
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: 'Roblox 3D Avatar phobe (@atensiei)',
                text: 'Lihat avatar Roblox 3D interaktif phobe spesial untuk Jupie!',
                files: [file],
              })
              showToast('✨ Berhasil dibagikan!')
              return
            } catch (shareErr) {
              if (shareErr.name === 'AbortError') return
            }
          }
          fallbackCopy()
        }, 'image/png')
      } else {
        fallbackCopy()
      }
    } catch (_) {
      fallbackCopy()
    }
  }, [burstHearts, showToast])

  const activeEmoteObj = EMOTES.find((e) => e.key === emote)

  return (
    <div className={`cac-app${isPhotoMode ? ' in-photo-mode' : ''}`}>
      <AvatarCanvas
        emote={emote}
        rigType={rigType}
        outfitUrl={outfitUrl}
        hairColor={hairColor}
        accessories={accessories}
        accColors={accColors}
        accScale={accScale}
        bgPresetId={bgPresetId}
        viewMode={viewMode}
        autoRotate={autoRotate}
        resetCount={resetCount}
        onAvatarClick={handleAvatarClick}
        equippedItems={equippedItems}
      />

      {/* Floating Hearts Animation */}
      {hearts.map((h) => (
        <span key={h.id} className="float-heart" style={{ left: `${h.x}%`, bottom: `${h.y}%` }}>
          <svg viewBox="0 0 24 24" width={h.size} height={h.size} fill={h.color} aria-hidden="true">
            <path d={HEART_PATH} />
          </svg>
        </span>
      ))}

      {/* Toast Feedback Notification */}
      {toastMsg && (
        <div className="cac-toast" role="status" aria-live="polite">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Overlay Normal (Disembunyikan saat Picture Mode Aktif) */}
      {!isPhotoMode && (
        <div className="cac-overlay">
          {/* Header Profil Avatar & Action Bar */}
          <header className="cac-header">
            <div className="cac-profile-card">
              <div className="avatar-frame">
                <img className="avatar-img" src="/img/headshot.png" alt={`Avatar Roblox ${USER.name}`} />
                <span className="online-dot" title="Roblox CAC Active" />
              </div>
              <div className="profile-info">
                <div className="name-row">
                  <span className="display-name">{USER.displayName}</span>
                  <span className="verified-badge" title="Roblox Verified">★</span>
                </div>
                <span className="username">@{USER.name} · ID {USER.id}</span>
              </div>
            </div>

            {/* Quick Tip Interaction Pill */}
            <button
              type="button"
              className="cac-interactive-pill"
              onClick={handleAvatarClick}
              title="Klik untuk putar animasi ekspresif acak"
            >
              <span className="pill-dot" />
              <span className="pill-text">Klik Avatar untuk Interaksi</span>
            </button>

            <div className="cac-top-actions">
              {/* Rig Switcher (R15 vs R6) */}
              <div className="cac-rig-selector" role="group" aria-label="Pilih Tipe Rig Roblox">
                <button
                  type="button"
                  className={`rig-btn${rigType === 'R15' ? ' active' : ''}`}
                  onClick={() => {
                    setRigType('R15')
                    burstHearts()
                  }}
                  title="Rig Modern R15 (15 Bagian Sendi Halus)"
                >
                  R15
                </button>
                <button
                  type="button"
                  className={`rig-btn${rigType === 'R6' ? ' active' : ''}`}
                  onClick={() => {
                    setRigType('R6')
                    burstHearts()
                  }}
                  title="Rig Klasik R6 (6 Bagian Blok Retro)"
                >
                  R6
                </button>
              </div>

              {/* Special Gift Badge for Jupie */}
              <button
                type="button"
                className="cac-jupie-badge"
                onClick={() => {
                  setShowOpening(true)
                  burstHearts()
                }}
                title="Buka kembali pesan pembuka spesial untuk Jupie"
                aria-label="Pesan untuk Jupie"
              >
                💌 Buat Jupie
              </button>

              {/* Reset Button */}
              <button
                type="button"
                className="cac-reset-top-btn"
                onClick={resetToOriginal}
                title="Reset ke tampilan avatar asli Roblox"
                aria-label="Reset Avatar Asli"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Reset</span>
              </button>

              {/* Like Counter */}
              <button
                type="button"
                className="cac-like-btn"
                onClick={() => burstHearts()}
                aria-label="Kirim Hati & Reaksi"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d={HEART_PATH} />
                </svg>
                <span>{likes}</span>
              </button>
            </div>
          </header>

          {/* Floating Side Camera Toolbar (Kanan) */}
          <aside className="cac-cam-bar" role="toolbar" aria-label="Kontrol Kamera">
            <button
              type="button"
              className={`cam-btn${viewMode === 'body' ? ' active' : ''}`}
              onClick={() => {
                setViewMode('body')
                setResetCount((c) => c + 1)
              }}
              title="Tampilan Seluruh Badan Depan"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-6 18v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3" />
              </svg>
              <span>Badan</span>
            </button>

            <button
              type="button"
              className={`cam-btn${viewMode === 'face' ? ' active' : ''}`}
              onClick={() => {
                setViewMode('face')
                setResetCount((c) => c + 1)
              }}
              title="Zoom Wajah / Headshot Depan"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <circle cx="9" cy="10" r="1.2" fill="currentColor" />
                <circle cx="15" cy="10" r="1.2" fill="currentColor" />
                <path d="M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5" />
              </svg>
              <span>Wajah</span>
            </button>

            <button
              type="button"
              className={`cam-btn${autoRotate ? ' active' : ''}`}
              onClick={() => setAutoRotate((r) => !r)}
              title="Putar Otomatis 360°"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" />
              </svg>
              <span>360°</span>
            </button>

            <button
              type="button"
              className="cam-btn photo-trigger-btn"
              onClick={() => {
                setIsPhotoMode(true)
                burstHearts()
              }}
              title="Mode Foto & Bagikan"
              aria-label="Buka Mode Foto"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>Foto</span>
            </button>

            <button
              type="button"
              className="cam-btn"
              onClick={() => setResetCount((c) => c + 1)}
              title="Reset Sudut Kamera ke Depan"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
              </svg>
              <span>Reset</span>
            </button>
          </aside>

          {/* Tombol Melayang Saat Panel Ditutup */}
          {!isDockOpen && (
            <div className="cac-floating-dock-controls">
              <button
                type="button"
                className="cac-floating-open-btn"
                onClick={() => setIsDockOpen(true)}
                aria-label="Buka Menu Interaksi Avatar"
              >
                <span className="open-btn-icon">💃</span>
                <span className="open-btn-title">Menu Interaksi</span>
                <span className="open-btn-badge">{rigType} · {activeEmoteObj?.label || emote}</span>
              </button>
            </div>
          )}

          {/* Bottom Dock Menu Catalog Avatar Creator */}
          <section
            className={`cac-bottom-dock cac-dock${isDockOpen ? ' open' : ' hidden closed'}${isDragging ? ' dragging' : ''}`}
            aria-label="Panel Interaksi Avatar"
            style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
          >
            {/* Native Drag Handle Bar */}
            <div
              className="dock-drag-bar"
              onPointerDown={handleDragPointerDown}
              onPointerMove={handleDragPointerMove}
              onPointerUp={handleDragPointerUp}
              onPointerCancel={handleDragPointerUp}
              title="Geser ke bawah untuk menutup menu"
              aria-label="Tarik ke bawah untuk menutup"
            >
              <span className="dock-drag-handle" />
            </div>

            <div className="dock-top-bar">
              <nav className="cac-tabs" role="tablist">
                {MAIN_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`cac-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                    onClick={() => {
                      setActiveTab(tab.id)
                      burstHearts()
                    }}
                  >
                    <span className="tab-icon">{tab.icon}</span>
                    <span className="tab-label">{tab.label}</span>
                  </button>
                ))}
              </nav>

              <span className="dock-status-tag">{rigType} Active</span>

              <button
                type="button"
                className="cac-close-dock-btn"
                onClick={() => setIsDockOpen(false)}
                title="Tutup Menu Bawah"
                aria-label="Tutup panel menu"
              >
                ✕ Tutup
              </button>
            </div>

            {/* TAB 1: EMOTE & ANIMASI ROBOLX */}
            {activeTab === 'emotes' && (
              <div className="cac-section-content emotes-content">
                <div className="cac-emotes-list">
                  {EMOTES.map((e) => (
                    <button
                      key={e.key}
                      type="button"
                      className={`cac-emote-btn${emote === e.key ? ' active' : ''}`}
                      onClick={() => {
                        setEmote(e.key)
                        burstHearts()
                      }}
                    >
                      <div className="emote-icon-wrap">
                        <Icon d={e.icon} />
                      </div>
                      <span className="emote-name">{e.label}</span>
                      {emote === e.key && <span className="emote-indicator-dot" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: AKSESORIS 3D & RAMBUT */}
            {activeTab === 'accessories' && (
              <div className="cac-section-content accessories-content">
                <div className="cac-acc-row">
                  {ACCESSORY_LIST.map((acc) => {
                    const isActive = !!accessories[acc.id]
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        className={`acc-toggle-btn${isActive ? ' active' : ''}`}
                        onClick={() => {
                          const nextVal = !accessories[acc.id]
                          setAccessories((p) => ({ ...p, [acc.id]: nextVal }))
                          burstHearts()
                        }}
                      >
                        <span className="acc-icon">{acc.icon}</span>
                        <span className="acc-label">{acc.label}</span>
                        <span className={`acc-status-indicator${isActive ? ' on' : ''}`} />
                      </button>
                    )
                  })}
                </div>

                <div className="cac-color-row">
                  <span className="color-label">Warna Rambut:</span>
                  <div className="color-swatches">
                    {HAIR_COLORS.map((hc) => (
                      <button
                        key={hc.value}
                        type="button"
                        className={`swatch-btn${hairColor === hc.value ? ' active' : ''}`}
                        style={{ background: hc.value }}
                        onClick={() => {
                          setHairColor(hc.value)
                          burstHearts()
                        }}
                        title={hc.label}
                        aria-label={hc.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Ukuran Aksesoris (Slider & Preset Scale Multiplier) */}
                <div className="cac-scale-control-row">
                  <div className="scale-info-row">
                    <span className="scale-label">🤏 Ukuran Aksesoris:</span>
                    <span className="scale-badge">{Math.round(accScale * 100)}%</span>
                    <span className="scale-tip">(Cubit 2 jari di layar)</span>
                  </div>
                  <div className="scale-inputs-wrap">
                    <input
                      type="range"
                      min="0.5"
                      max="1.8"
                      step="0.05"
                      value={accScale}
                      onChange={(e) => setAccScale(parseFloat(e.target.value))}
                      className="cac-scale-slider"
                      aria-label="Atur ukuran aksesoris"
                    />
                    <div className="scale-preset-chips">
                      {[0.8, 1.0, 1.25, 1.5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`scale-chip-btn${accScale === s ? ' active' : ''}` }
                          onClick={() => {
                            setAccScale(s)
                            burstHearts()
                          }}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: OUTFIT & GAYA */}
            {activeTab === 'outfits' && (
              <div className="cac-section-content outfits-content">
                <div className="cac-outfit-grid">
                  {OUTFIT_PRESETS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className={`outfit-card${outfitUrl === o.url ? ' active' : ''}`}
                      onClick={() => {
                        setOutfitUrl(o.url)
                        setAccessories((p) => ({ ...p, jacket3d: false }))
                        if (o.url === 'default') {
                          setEquippedItems((prev) => prev.filter((i) => i.kind !== 'clothing'))
                        } else {
                          setEquippedItems((prev) => [
                            ...prev.filter((i) => i.kind !== 'clothing'),
                            {
                              id: o.id,
                              name: o.name,
                              kind: 'clothing',
                              slot: 'clothing',
                            },
                          ])
                        }
                        burstHearts()
                      }}
                    >
                      <span className="outfit-dot" style={{ background: o.color }} />
                      <div className="outfit-info">
                        <span className="outfit-name">{o.name}</span>
                        <span className="outfit-desc">{o.desc}</span>
                      </div>
                    </button>
                  ))}

                  {/* Upload Template Baju Sendiri */}
                  <button
                    type="button"
                    className="outfit-card upload-card"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Template Baju/Celana Roblox Sendiri"
                  >
                    <span className="outfit-dot upload-dot">+</span>
                    <div className="outfit-info">
                      <span className="outfit-name">Upload Baju Sendiri</span>
                      <span className="outfit-desc">PNG / JPG Roblox</span>
                    </div>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleUploadTexture}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: LATAR 3D (3D BACKGROUND TEMPLATES) */}
            {activeTab === 'backgrounds' && (
              <div className="cac-section-content backgrounds-content">
                <div className="cac-bg-grid">
                  {BG_PRESETS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`bg-card${bgPresetId === b.id ? ' active' : ''}`}
                      onClick={() => {
                        setBgPresetId(b.id)
                        burstHearts()
                      }}
                    >
                      <span className="bg-card-icon">{b.icon}</span>
                      <div className="bg-card-info">
                        <span className="bg-card-name">{b.label}</span>
                        <span className="bg-card-desc">{b.desc}</span>
                      </div>
                      <span
                        className="bg-color-preview"
                        style={{ background: b.bg, borderColor: b.ring1 }}
                        title={`Preview ${b.label}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* PICTURE MODE / PHOTO MODE OVERLAY (Ketika isPhotoMode Aktif) */}
      {isPhotoMode && (
        <div className="cac-photo-overlay" role="dialog" aria-label="Mode Foto & Bagikan">
          {/* Top Floating Control Bar */}
          <div className="photo-top-bar">
            <div className="photo-branding">
              <span className="photo-badge">📸 Mode Foto Studio</span>
              <span className="photo-title">phobe · @atensiei</span>
            </div>
            <button
              type="button"
              className="photo-close-btn"
              onClick={() => setIsPhotoMode(false)}
              title="Keluar dari Mode Foto"
              aria-label="Tutup Mode Foto"
            >
              ✕ Keluar
            </button>
          </div>

          {/* Quick Background Selector Pills */}
          <div className="photo-bg-pills-wrap">
            <div className="photo-bg-pills" role="radiogroup" aria-label="Pilih Latar 3D Foto">
              {BG_PRESETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`photo-bg-pill${bgPresetId === b.id ? ' active' : ''}`}
                  onClick={() => {
                    setBgPresetId(b.id)
                    burstHearts()
                  }}
                >
                  <span className="pill-icon">{b.icon}</span>
                  <span className="pill-name">{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Floating Action Bar */}
          <div className="photo-bottom-bar">
            {/* Emote Selector Quick Pills */}
            <div className="photo-emote-pills">
              {['dance', 'wave', 'cheer', 'spin', 'idle'].map((k) => {
                const em = EMOTES.find((e) => e.key === k)
                return (
                  <button
                    key={k}
                    type="button"
                    className={`photo-emote-pill${emote === k ? ' active' : ''}`}
                    onClick={() => {
                      setEmote(k)
                      burstHearts()
                    }}
                  >
                    {em?.label || k}
                  </button>
                )
              })}
            </div>

            {/* Main Action Buttons: Snap & Share */}
            <div className="photo-action-buttons">
              <button
                type="button"
                className="photo-main-btn photo-snap-btn"
                onClick={handleSnapPhoto}
                title="Ambil Foto Resolusi Tinggi (Download PNG)"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Ambil Foto</span>
              </button>

              <button
                type="button"
                className="photo-main-btn photo-share-btn"
                onClick={handleShare}
                title="Bagikan Foto ke Teman atau Medsos"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>Bagikan</span>
              </button>

              <button
                type="button"
                className="photo-aux-btn"
                onClick={() => setResetCount((c) => c + 1)}
                title="Reset Kamera Depan"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opening Welcome Screen untuk Jupie */}
      {showOpening && (
        <div
          className={`cac-opening-overlay${isOpeningExiting ? ' exiting' : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleEnterStudio()
            }
          }}
        >
          <div className="opening-card">
            <button
              type="button"
              className="opening-card-close"
              onClick={handleEnterStudio}
              aria-label="Tutup pesan"
            >
              ✕
            </button>

            <div className="opening-badge">
              <span className="opening-sparkle">✨</span>
              <span>Spesial Untuk Jupie</span>
              <span className="opening-sparkle">✨</span>
            </div>

            <div className="opening-avatar-preview">
              <div className="opening-avatar-glow" />
              <img className="opening-avatar-img" src="/img/headshot.png" alt="Avatar Roblox" />
              <span className="opening-online-dot" />
            </div>

            <h1 className="opening-title">Halo, Jupie! 💖</h1>
            <p className="opening-desc">
              Selamat datang di studio 3D avatar Roblox! Di sini kamu bisa gerakin karakter sesukamu, pasang aksesoris 3D keren, dan klik langsung avatarnya buat lihat reaksinya.
            </p>

            <div className="opening-features">
              <div className="opening-feat-item">
                <span className="feat-icon">💃</span>
                <div className="feat-text">
                  <strong>Gerakan & Emote</strong>
                  <span>Roblox Dance, Wave, Cheer, 360° Spin</span>
                </div>
              </div>
              <div className="opening-feat-item">
                <span className="feat-icon">👑</span>
                <div className="feat-text">
                  <strong>Latar 3D & Mode Foto</strong>
                  <span>Ganti background 3D, foto & bagikan</span>
                </div>
              </div>
              <div className="opening-feat-item">
                <span className="feat-icon">👆</span>
                <div className="feat-text">
                  <strong>Sentuh Avatar</strong>
                  <span>Klik layar untuk reaksi hati ekspresif</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="opening-cta-btn"
              onClick={handleEnterStudio}
            >
              <span>Mulai Jelajahi Studio 3D</span>
              <span className="cta-arrow">→</span>
            </button>

            <span className="opening-signature">Dibuat khusus untuk Jupie · Roblox 3D Interactive</span>
          </div>
        </div>
      )}
    </div>
  )
}
