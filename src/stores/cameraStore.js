// src/stores/cameraStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'aruco-camera-settings'

export const useCameraStore = defineStore('camera', () => {
  const brightness = ref(100)
  const contrast = ref(100)
  const saturation = ref(100)
  const sharpness = ref(0)
  const threshold = ref(0)
  const grayscale = ref(false)
  const showGrid = ref(true)
  const showIds = ref(true)
  const showCubes = ref(true)
  const gridOpacity = ref(0.5)
  const videoResolution = ref('1280x720')
  const frameSkip = ref(2)
  const digitalZoom = ref(0.6)  

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const s = JSON.parse(raw)
      brightness.value = s.brightness ?? 100
      contrast.value = s.contrast ?? 100
      saturation.value = s.saturation ?? 100
      sharpness.value = s.sharpness ?? 0
      threshold.value = s.threshold ?? 0
      grayscale.value = s.grayscale ?? false
      showGrid.value = s.showGrid ?? true
      showIds.value = s.showIds ?? true
      showCubes.value = s.showCubes ?? true
      gridOpacity.value = s.gridOpacity ?? 0.5
      videoResolution.value = s.videoResolution ?? '1280x720'
      frameSkip.value = s.frameSkip ?? 2
      digitalZoom.value = Math.max(1, s.digitalZoom ?? 1)
    } catch {}
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      brightness: brightness.value,
      contrast: contrast.value,
      saturation: saturation.value,
      sharpness: sharpness.value,
      threshold: threshold.value,
      grayscale: grayscale.value,
      showGrid: showGrid.value,
      showIds: showIds.value,
      showCubes: showCubes.value,
      gridOpacity: gridOpacity.value,
      videoResolution: videoResolution.value,
      frameSkip: frameSkip.value,
      digitalZoom: digitalZoom.value,
    }))
  }

  function reset() {
    brightness.value = 100
    contrast.value = 100
    saturation.value = 100
    sharpness.value = 0
    threshold.value = 0
    grayscale.value = false
    showGrid.value = true
    showIds.value = true
    showCubes.value = true
    gridOpacity.value = 0.5
    videoResolution.value = '1280x720'
    frameSkip.value = 2
    digitalZoom.value = 0.6
    save()
  }

  load()

  return {
    brightness,
    contrast,
    saturation,
    sharpness,
    threshold,
    grayscale,
    showGrid,
    showIds,
    showCubes,
    gridOpacity,
    videoResolution,
    frameSkip,
    digitalZoom,
    save,
    reset,
  }
})