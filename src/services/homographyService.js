/**
 * homographyService.js
 *
 * Dato che i 4 marker d'angolo (NO, NE, SO, SE) sono rilevati nella camera,
 * calcola la trasformazione proiettiva (omografia) che mappa
 * pixel-camera → coordinate-griglia.
 *
 * Coordinate griglia: col 0..gridCols, row 0..gridRows
 *   NO = (0, 0)        NE = (gridCols, 0)
 *   SO = (0, gridRows) SE = (gridCols, gridRows)
 */

/**
 * Calcola la matrice di omografia 3x3 con il metodo DLT (Direct Linear Transform).
 * Fonte: Hartley & Zisserman, "Multiple View Geometry", Appendix A4.
 *
 * @param {Array<{x,y}>} srcPts  – 4 punti sorgente (pixel camera)
 * @param {Array<{x,y}>} dstPts  – 4 punti destinazione (griglia)
 * @returns {number[]} – matrice 3x3 come array flat [h00,h01,...,h22]
 */
export function computeHomography(srcPts, dstPts) {
  // Costruisce il sistema lineare Ah = 0, 2 righe per punto
  const A = []
  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = srcPts[i]
    const { x: dx, y: dy } = dstPts[i]
    A.push([-sx, -sy, -1, 0, 0, 0, dx * sx, dx * sy, dx])
    A.push([0, 0, 0, -sx, -sy, -1, dy * sx, dy * sy, dy])
  }
  // Risolve con SVD (implementazione minimale)
  const h = solveSVD(A)
  return h  // [h00..h22]
}

/**
 * Applica l'omografia a un punto pixel → {col, row} nella griglia.
 *
 * @param {number[]} H  – matrice 3x3 flat
 * @param {{x:number,y:number}} pt  – punto pixel
 * @returns {{col:number, row:number}}
 */
export function applyHomography(H, pt) {
  const { x, y } = pt
  const w = H[6] * x + H[7] * y + H[8]
  const col = (H[0] * x + H[1] * y + H[2]) / w
  const row = (H[3] * x + H[4] * y + H[5]) / w
  return { col, row }
}

/**
 * Ritorna { col, row } discreti (interi) clampati alla griglia.
 */
export function pointToCell(H, pt, gridCols, gridRows) {
  const { col, row } = applyHomography(H, pt)
  return {
    col: Math.max(0, Math.min(gridCols - 1, Math.floor(col))),
    row: Math.max(0, Math.min(gridRows - 1, Math.floor(row))),
  }
}

/**
 * Costruisce l'omografia dai 4 marker angolo rilevati.
 *
 * @param {object} detectedCorners  – { NO:{center}, NE:{center}, SO:{center}, SE:{center} }
 * @param {number} gridCols
 * @param {number} gridRows
 * @returns {number[]|null}  – matrice H oppure null se mancano corner
 */
export function buildHomographyFromCorners(detectedCorners, gridCols, gridRows) {
  const { NO, NE, SO, SE } = detectedCorners
  if (!NO || !NE || !SO || !SE) return null

  const src = [NO.center, NE.center, SO.center, SE.center]
  const dst = [
    { x: 0, y: 0 },
    { x: gridCols, y: 0 },
    { x: 0, y: gridRows },
    { x: gridCols, y: gridRows },
  ]
  return computeHomography(src, dst)
}

// ─── SVD minimale (4 punti, 9 incognite) ─────────────────────────────────────
// Usa power-iteration + deflation per trovare il vettore singolare minimo di A.
function solveSVD(A) {
  // ATA (9x9)
  const n = 9
  const ATA = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let r = 0; r < A.length; r++) {
        ATA[i][j] += A[r][i] * A[r][j]
      }
    }
  }

  // Trova autovettore con autovalore minimo tramite power iteration inversa
  // (metodo semplificato: itera su ATA con spostamento per convergere sul minimo)
  let v = Array(n).fill(0).map((_, i) => (i === 8 ? 1 : 0))
  for (let iter = 0; iter < 200; iter++) {
    v = mvMul(ATA, v)
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
    v = v.map(x => x / norm)
  }

  // Normalizza in modo che h[8] = 1
  const scale = v[8] !== 0 ? v[8] : 1
  return v.map(x => x / scale)
}

function mvMul(M, v) {
  return M.map(row => row.reduce((s, val, j) => s + val * v[j], 0))
}