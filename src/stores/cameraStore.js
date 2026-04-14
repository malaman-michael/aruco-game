/**
 * cameraStore.js
 * Impostazioni di preprocessamento immagine per migliorare il rilevamento ArUco.
 * Tutti i valori sono applicati al frame prima della detection.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'aruco-camera-settings'

export const useCameraStore = defineStore('camera', () => {
  // ─── Impostazioni ──────────────────────────────────────────────────────────
  const brightness  = ref(100)   // % (CSS filter), 50–200
  const contrast    = ref(100)   // % (CSS filter), 50–300
  const saturation  = ref(100)   // % (CSS filter), 0–200
  const sharpness   = ref(0)     // 0–5 passate di unsharp mask
  const threshold   = ref(0)     // 0 = off, 1–255 = soglia binarizzazione adattiva
  const grayscale   = ref(false) // converti in grigio prima del threshold
  const showGrid    = ref(true)  // mostra griglia proiettata
  const showIds     = ref(true)  // mostra ID sui marker
  const showCubes   = ref(true)  // effetto cubo 3D
  const gridOpacity = ref(0.5)   // opacità griglia 0–1

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const s = JSON.parse(raw)
      brightness.value  = s.brightness  ?? 100
      contrast.value    = s.contrast    ?? 100
      saturation.value  = s.saturation  ?? 100
      sharpness.value   = s.sharpness   ?? 0
      threshold.value   = s.threshold   ?? 0
      grayscale.value   = s.grayscale   ?? false
      showGrid.value    = s.showGrid    ?? true
      showIds.value     = s.showIds     ?? true
      showCubes.value   = s.showCubes   ?? true
      gridOpacity.value = s.gridOpacity ?? 0.5
    } catch {}
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      brightness:  brightness.value,
      contrast:    contrast.value,
      saturation:  saturation.value,
      sharpness:   sharpness.value,
      threshold:   threshold.value,
      grayscale:   grayscale.value,
      showGrid:    showGrid.value,
      showIds:     showIds.value,
      showCubes:   showCubes.value,
      gridOpacity: gridOpacity.value,
    }))
  }

  function reset() {
    brightness.value = 100; contrast.value = 100; saturation.value = 100
    sharpness.value = 0; threshold.value = 0; grayscale.value = false
    showGrid.value = true; showIds.value = true; showCubes.value = true
    gridOpacity.value = 0.5
    save()
  }

  load()

  return {
    brightness, contrast, saturation, sharpness,
    threshold, grayscale, showGrid, showIds, showCubes, gridOpacity,
    save, reset,
  }
})