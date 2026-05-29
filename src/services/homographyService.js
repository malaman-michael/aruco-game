// src/services/homographyService.js

function gaussSolve(A, b) {
  const n = A.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let maxRow = col, maxVal = Math.abs(M[col][col])
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col])
        maxRow = row
      }
    }
    if (maxVal < 1e-10) return null
    if (maxRow !== col) [M[col], M[maxRow]] = [M[maxRow], M[col]]
    for (let row = col + 1; row < n; row++) {
      const f = M[row][col] / M[col][col]
      for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k]
    }
  }
  const x = new Array(n).fill(0)
  for (let row = n - 1; row >= 0; row--) {
    x[row] = M[row][n]
    for (let k = row + 1; k < n; k++) x[row] -= M[row][k] * x[k]
    x[row] /= M[row][row]
  }
  return x
}

export function computeHomography(srcPts, dstPts) {
  if (srcPts.length !== dstPts.length || srcPts.length < 4) {
    throw new Error('Servono almeno 4 corrispondenze')
  }
  const n = srcPts.length
  const A = [], b = []
  for (let i = 0; i < n; i++) {
    const x = srcPts[i].x, y = srcPts[i].y, u = dstPts[i].x, v = dstPts[i].y
    A.push([-x, -y, -1,  0,  0,  0,  u*x, u*y]); b.push(-u)
    A.push([ 0,  0,  0, -x, -y, -1,  v*x, v*y]); b.push(-v)
  }
  const h8 = gaussSolve(A, b)
  if (!h8) return null
  return [...h8, 1]
}

export function applyHomography(H, pt) {
  const { x, y } = pt
  const w = H[6] * x + H[7] * y + H[8]
  const col = (H[0] * x + H[1] * y + H[2]) / w
  const row = (H[3] * x + H[4] * y + H[5]) / w
  return { col, row }
}

export function pointToCell(colRow, gridCols, gridRows) {
  return {
    col: Math.max(0, Math.min(gridCols - 1, Math.floor(colRow.col))),
    row: Math.max(0, Math.min(gridRows - 1, Math.floor(colRow.row)))
  }
}

export function buildHomographyFromMarkers(markerDetected, anchors, cellSize = 1) {
  const srcPts = [], dstPts = []
  for (const marker of markerDetected) {
    const anchor = anchors.find(a => a.id === marker.id)
    if (anchor) {
      srcPts.push({ x: marker.center.x, y: marker.center.y })
      dstPts.push({ x: anchor.col * cellSize, y: anchor.row * cellSize })
    }
  }
  if (srcPts.length < 4) {
    console.warn(`[Homography] solo ${srcPts.length} marker corrispondenti, servono almeno 4`)
    return null
  }
  return computeHomography(srcPts, dstPts)
}

// ⭐ ESPORTAZIONE RICHIESTA DAL TUO gameStore.js
export function buildHomographyFromCorners(detectedCorners, gridCols, gridRows) {
  const { NO, NE, SO, SE } = detectedCorners
  if (!NO || !NE || !SO || !SE) return null
  const src = [NO.center, NE.center, SO.center, SE.center]
  const dst = [
    { x: 0,        y: 0 },
    { x: gridCols, y: 0 },
    { x: 0,        y: gridRows },
    { x: gridCols, y: gridRows }
  ]
  return computeHomography(src, dst)
}

// Per sicurezza, esporta anche un oggetto di default con tutto (opzionale)
export default {
  computeHomography,
  applyHomography,
  pointToCell,
  buildHomographyFromMarkers,
  buildHomographyFromCorners
}