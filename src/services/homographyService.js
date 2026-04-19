/**
 * homographyService.js
 *
 * Calcola l'omografia H (3×3) che mappa pixel-camera → coordinate-griglia
 * usando i centri dei 4 marker angolo come punti di controllo.
 *
 *   NO (0,0) ──────── NE (cols,0)
 *     │                   │
 *   SO (0,rows) ────── SE (cols,rows)
 *
 * Implementazione: DLT con eliminazione gaussiana diretta su sistema 8×8.
 * Molto più stabile della SVD numerica per il caso esatto a 4 punti.
 */

// ─── DLT diretto (4 punti → H esatta) ───────────────────────────────────────
//
// Per ogni coppia (src_i, dst_i) il DLT produce 2 equazioni lineari in h[0..8].
// Fissando h[8]=1 otteniamo un sistema 8×8 risolvibile con Gauss.
//
// Le equazioni (con h[8]=1, dst = (u,v), src = (x,y)):
//   -x·h0 - y·h1 - h2            + u·x·h6 + u·y·h7 = -u
//             -x·h3 - y·h4 - h5  + v·x·h6 + v·y·h7 = -v

export function computeHomography(srcPts, dstPts) {
  // Costruisce il sistema A (8×8) e il vettore b (8)
  const A = []
  const b = []

  for (let i = 0; i < 4; i++) {
    const x = srcPts[i].x, y = srcPts[i].y
    const u = dstPts[i].x, v = dstPts[i].y

    A.push([-x, -y, -1,  0,  0,  0, u*x, u*y])
    b.push(-u)

    A.push([ 0,  0,  0, -x, -y, -1, v*x, v*y])
    b.push(-v)
  }

  // Eliminazione gaussiana con pivoting parziale
  const h8 = gaussSolve(A, b)   // [h0..h7]
  if (!h8) {
    console.warn('[homography] sistema singolare — corner collineari o coincidenti')
    return null
  }

  return [...h8, 1]              // [h0..h7, h8=1]
}

// ─── Gauss con pivoting parziale ─────────────────────────────────────────────
function gaussSolve(A, b) {
  const n = 8
  // Copia per non modificare l'originale
  const M = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    // Trova il pivot (riga con valore assoluto massimo nella colonna)
    let maxRow = col
    let maxVal = Math.abs(M[col][col])
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col])
        maxRow = row
      }
    }

    if (maxVal < 1e-10) return null   // sistema singolare

    // Scambia righe
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]

    // Elimina sotto
    for (let row = col + 1; row < n; row++) {
      const f = M[row][col] / M[col][col]
      for (let k = col; k <= n; k++) {
        M[row][k] -= f * M[col][k]
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0)
  for (let row = n - 1; row >= 0; row--) {
    x[row] = M[row][n]
    for (let k = row + 1; k < n; k++) {
      x[row] -= M[row][k] * x[k]
    }
    x[row] /= M[row][row]
  }

  return x
}

// ─── Applica H: pixel → griglia ──────────────────────────────────────────────
export function applyHomography(H, pt) {
  const { x, y } = pt
  const w   = H[6]*x + H[7]*y + H[8]
  const col = (H[0]*x + H[1]*y + H[2]) / w
  const row = (H[3]*x + H[4]*y + H[5]) / w
  return { col, row }
}

// ─── Cella discreta clampata alla griglia ────────────────────────────────────
export function pointToCell(H, pt, gridCols, gridRows) {
  const { col, row } = applyHomography(H, pt)
  return {
    col: Math.max(0, Math.min(gridCols - 1, Math.floor(col))),
    row: Math.max(0, Math.min(gridRows - 1, Math.floor(row))),
  }
}

// ─── Costruisce H dai 4 corner marker ────────────────────────────────────────
export function buildHomographyFromCorners(detectedCorners, gridCols, gridRows) {
  const { NO, NE, SO, SE } = detectedCorners
  if (!NO || !NE || !SO || !SE) return null

  const src = [NO.center, NE.center, SO.center, SE.center]
  const dst = [
    { x: 0,        y: 0        },   // NO
    { x: gridCols, y: 0        },   // NE
    { x: 0,        y: gridRows },   // SO
    { x: gridCols, y: gridRows },   // SE
  ]

  return computeHomography(src, dst)
}