// lineOfSight.js
import { CELL_TYPES } from '../stores/mapStore'

/**
 * Algoritmo di Bresenham per ottenere tutte le celle attraversate dalla linea
 * che collega (x0, y0) a (x1, y1), ESCLUSI gli estremi.
 * Le coordinate sono in celle della griglia (colonna, riga).
 * @param {number} x0 - colonna di partenza
 * @param {number} y0 - riga di partenza
 * @param {number} x1 - colonna di arrivo
 * @param {number} y1 - riga di arrivo
 * @returns {Array<{x: number, y: number}>} Array di celle intermedie
 */
export function getCellsOnLine(x0, y0, x1, y1) {
  const cells = []
  let dx = Math.abs(x1 - x0)
  let dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let x = x0, y = y0

  while (!(x === x1 && y === y1)) {
    if (!(x === x0 && y === y0)) {
      cells.push({ x, y })
    }
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x += sx }
    if (e2 < dx) { err += dx; y += sy }
  }
  return cells
}

/**
 * Verifica se due celle sono in linea di vista diretta, ovvero se non ci sono
 * blocchi (muri, porte chiuse, etc.) nelle celle intermedie.
 * @param {Array<Array<{type: string}>>} mapGrid - la griglia della mappa (matrice rows x cols)
 * @param {number} fromCol - colonna della cella di partenza
 * @param {number} fromRow - riga della cella di partenza
 * @param {number} toCol - colonna della cella di arrivo
 * @param {number} toRow - riga della cella di arrivo
 * @param {Array<string>} blockerTypes - tipi di cella che bloccano la vista (default: muri e porte chiuse)
 * @returns {boolean} true se la linea è libera, false se incontra un blocco
 */
export function hasLineOfSight(mapGrid, fromCol, fromRow, toCol, toRow, blockerTypes = ['wall', 'door_closed']) {
  // Se non c'è mappa, considera sempre visibile (caso campo aperto)
  if (!mapGrid || !mapGrid.length) return true

  const cells = getCellsOnLine(fromCol, fromRow, toCol, toRow)
  for (const cell of cells) {
    // Controlla che la cella sia dentro i limiti
    if (cell.x < 0 || cell.x >= mapGrid[0]?.length || cell.y < 0 || cell.y >= mapGrid.length) continue
    const cellType = mapGrid[cell.y]?.[cell.x]?.type
    if (blockerTypes.includes(cellType)) {
      return false
    }
  }
  return true
}

/**
 * Data una maschera di offset (matrice quadrata di dimensioni (2*gridRows+1) x (2*gridCols+1))
 * e una posizione di partenza, restituisce l'elenco delle celle raggiungibili
 * che soddisfano sia la maschera che la linea di vista senza ostacoli.
 * @param {Array<Array<boolean>>} mask - maschera degli offset (centrata)
 * @param {Array<Array<{type: string}>>} mapGrid - griglia della mappa (opzionale)
 * @param {number} fromCol - colonna della pedina
 * @param {number} fromRow - riga della pedina
 * @param {number} gridCols - numero di colonne della griglia (per calcolare centro maschera)
 * @param {number} gridRows - numero di righe della griglia
 * @param {Array<string>} blockerTypes - tipi di cella che bloccano la vista
 * @returns {Array<{col: number, row: number}>} Array di celle raggiungibili (col, row)
 */
export function getReachableCells(mask, mapGrid, fromCol, fromRow, gridCols, gridRows, blockerTypes = ['wall', 'door_closed']) {
  const reachable = []
  const centerRow = gridRows
  const centerCol = gridCols

  // Scorri tutti gli offset possibili
  for (let dy = -gridRows; dy <= gridRows; dy++) {
    for (let dx = -gridCols; dx <= gridCols; dx++) {
      const maskRow = centerRow + dy
      const maskCol = centerCol + dx
      // Controlla che l'offset sia attivo nella maschera
      if (mask[maskRow]?.[maskCol] === true) {
        const toCol = fromCol + dx
        const toRow = fromRow + dy
        // Verifica che la destinazione sia dentro la griglia
        if (toCol >= 0 && toCol < gridCols && toRow >= 0 && toRow < gridRows) {
          // Se non c'è mappa oppure la linea di vista è libera, aggiungi
          if (!mapGrid || hasLineOfSight(mapGrid, fromCol, fromRow, toCol, toRow, blockerTypes)) {
            reachable.push({ col: toCol, row: toRow })
          }
        }
      }
    }
  }
  return reachable
}

/**
 * Versione semplificata per il calcolo della linea di tiro: oltre ai blocchi statici,
 * esclude anche le celle occupate da altre pedine (non considerate qui, ma da usare
 * successivamente nel componente filtrando l'elenco delle destinazioni).
 * @param {Array<Array<boolean>>} mask - maschera degli offset
 * @param {Array<Array<{type: string}>>} mapGrid - griglia della mappa
 * @param {number} fromCol - colonna della pedina che spara
 * @param {number} fromRow - riga della pedina che spara
 * @param {number} gridCols - numero di colonne
 * @param {number} gridRows - numero di righe
 * @param {Array<string>} blockerTypes - tipi di cella che bloccano il tiro (inclusi muri, porte chiuse)
 * @returns {Array<{col: number, row: number}>} Celle che possono essere bersaglio (senza considerare altre pedine)
 */
export function getShootableCells(mask, mapGrid, fromCol, fromRow, gridCols, gridRows, blockerTypes = ['wall', 'door_closed']) {
  // Per la linea di tiro, gli stessi criteri della linea di vista (muri bloccano)
  // La differenza (altre pedine) verrà applicata a livello di componente.
  return getReachableCells(mask, mapGrid, fromCol, fromRow, gridCols, gridRows, blockerTypes)
}