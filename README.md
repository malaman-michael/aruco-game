# ArUco Game
Gioco da tavolo in realtà aumentata per dispositivi mobili.
La fotocamera del telefono punta sulla plancia di gioco, riconosce i marker ArUco stampati sulle pedine e mostra in sovrimpressione la griglia, le posizioni e i ruoli di ogni personaggio.

---

## Tecnologie

| Libreria | Versione | Uso |
|---|---|---|
| Vue 3 | ^3.4 | Framework UI (Composition API) |
| Vue Router | ^4.2 | Navigazione tra schermate |
| Pinia | ^2.1 | State management |
| Axios | ^1.6 | HTTP client (pronto per API future) |
| js-aruco2 | ^2.0.1 | Rilevamento marker ArUco |
| Vite | ^5.0 | Build tool |

---

## Requisiti
- Node.js ≥ 18
- Browser moderno con supporto `getUserMedia` (Chrome, Safari iOS 15+)
- **HTTPS obbligatorio** per accesso alla fotocamera da dispositivi mobili in rete locale (vedi setup)

---

## Installazione

```bash
# 1. Clona / scarica il progetto
cd aruco-game

# 2. Installa le dipendenze
npm install

# 3. Copia i file di js-aruco2 in public/ (necessario per il caricamento corretto)
# PowerShell Windows
New-Item -ItemType Directory -Force -Path public\aruco
Copy-Item node_modules\js-aruco2\src\cv.js public\aruco\
Copy-Item node_modules\js-aruco2\src\aruco.js public\aruco\
Copy-Item node_modules\js-aruco2\src\dictionaries\aruco_4x4_1000.js public\aruco\

# Su Linux/macOS:
mkdir -p public/aruco
cp node_modules/js-aruco2/src/cv.js public/aruco/
cp node_modules/js-aruco2/src/aruco.js public/aruco/
cp node_modules/js-aruco2/src/dictionaries/aruco_4x4_1000.js public/aruco/

# 4. Genera il bundle ArUco (Windows PowerShell)
$cv = Get-Content node_modules\js-aruco2\src\cv.js -Raw
$ar = Get-Content node_modules\js-aruco2\src\aruco.js -Raw
$dict = Get-Content node_modules\js-aruco2\src\dictionaries\aruco_4x4_1000.js -Raw
$cv = $cv -replace 'this\.CV', 'window.CV'
$ar = $ar -replace 'this\.CV', 'window.CV'
$ar = $ar -replace 'this\.AR', 'window.AR'
$ar = $ar -replace "var CV = window\.CV \|\| require\('./cv'\)\.CV;", "var CV = window.CV;"
$dict = $dict -replace 'this\.AR', 'window.AR'
$dict = $dict -replace "var AR = window\.AR \|\| require\('../aruco'\)\.AR;", "var AR = window.AR;"
"/* cv.js */`n$cv`n/* aruco.js */`n$ar`n/* aruco_4x4_1000.js */`n$dict" | Set-Content public\aruco\aruco-bundle.js -Encoding UTF8

# Su Linux/macOS (bash):
node -e "
const fs = require('fs');
let cv = fs.readFileSync('node_modules/js-aruco2/src/cv.js','utf8');
let ar = fs.readFileSync('node_modules/js-aruco2/src/aruco.js','utf8');
let dict = fs.readFileSync('node_modules/js-aruco2/src/dictionaries/aruco_4x4_1000.js','utf8');
cv = cv .replace(/\bthis\.CV\b/g,'window.CV');
ar = ar .replace(/\bthis\.CV\b/g,'window.CV').replace(/\bthis\.AR\b/g,'window.AR')
.replace(\"var CV = window.CV || require('./cv').CV;\",\"var CV = window.CV;\");
dict = dict.replace(/\bthis\.AR\b/g,'window.AR')
.replace(\"var AR = window.AR || require('../aruco').AR;\",\"var AR = window.AR;\");
fs.writeFileSync('public/aruco/aruco-bundle.js', '/* cv.js */\n'+cv+'\n/* aruco.js */\n'+ar+'\n/* dict */\n'+dict);
console.log('Bundle creato.');
"