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
New-Item -ItemType Directory -Force -Path public\aruco          # PowerShell Windows
Copy-Item node_modules\js-aruco2\src\cv.js    public\aruco\
Copy-Item node_modules\js-aruco2\src\aruco.js public\aruco\
Copy-Item node_modules\js-aruco2\src\dictionaries\aruco_4x4_1000.js public\aruco\

# Su Linux/macOS:
mkdir -p public/aruco
cp node_modules/js-aruco2/src/cv.js               public/aruco/
cp node_modules/js-aruco2/src/aruco.js             public/aruco/
cp node_modules/js-aruco2/src/dictionaries/aruco_4x4_1000.js public/aruco/

# 4. Genera il bundle ArUco (Windows PowerShell)
$cv   = Get-Content node_modules\js-aruco2\src\cv.js -Raw
$ar   = Get-Content node_modules\js-aruco2\src\aruco.js -Raw
$dict = Get-Content node_modules\js-aruco2\src\dictionaries\aruco_4x4_1000.js -Raw

$cv   = $cv   -replace 'this\.CV', 'window.CV'
$ar   = $ar   -replace 'this\.CV', 'window.CV'
$ar   = $ar   -replace 'this\.AR', 'window.AR'
$ar   = $ar   -replace "var CV = window\.CV \|\| require\('./cv'\)\.CV;", "var CV = window.CV;"
$dict = $dict -replace 'this\.AR', 'window.AR'
$dict = $dict -replace "var AR = window\.AR \|\| require\('../aruco'\)\.AR;", "var AR = window.AR;"

"/* cv.js */`n$cv`n/* aruco.js */`n$ar`n/* aruco_4x4_1000.js */`n$dict" |
  Set-Content public\aruco\aruco-bundle.js -Encoding UTF8

# Su Linux/macOS (bash):
node -e "
const fs = require('fs');
let cv   = fs.readFileSync('node_modules/js-aruco2/src/cv.js','utf8');
let ar   = fs.readFileSync('node_modules/js-aruco2/src/aruco.js','utf8');
let dict = fs.readFileSync('node_modules/js-aruco2/src/dictionaries/aruco_4x4_1000.js','utf8');
cv   = cv  .replace(/\bthis\.CV\b/g,'window.CV');
ar   = ar  .replace(/\bthis\.CV\b/g,'window.CV').replace(/\bthis\.AR\b/g,'window.AR')
            .replace(\"var CV = window.CV || require('./cv').CV;\",\"var CV = window.CV;\");
dict = dict.replace(/\bthis\.AR\b/g,'window.AR')
            .replace(\"var AR = window.AR || require('../aruco').AR;\",\"var AR = window.AR;\");
fs.writeFileSync('public/aruco/aruco-bundle.js', '/* cv.js */\n'+cv+'\n/* aruco.js */\n'+ar+'\n/* dict */\n'+dict);
console.log('Bundle creato.');
"
```

---

## Avvio in sviluppo

```bash
# Espone il server su tutta la rete locale — necessario per accedere dal telefono
npm run dev
# oppure
npx vite --host
```

Apri `http://<IP-del-PC>:5173` sul telefono.

### HTTPS in rete locale (consigliato per Chrome mobile)

```bash
npm install -D vite-plugin-mkcert
```

Aggiungi in `vite.config.js`:

```js
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [vue(), mkcert()],
  server: { host: true }
})
```

Poi `npm run dev` — il certificato viene generato automaticamente.

---

## Build produzione

```bash
npm run build
npm run preview   # anteprima locale del build
```

Il risultato è in `dist/` — deployabile su qualsiasi hosting statico (Netlify, Vercel, GitHub Pages con `base` configurato).

---

## Struttura del progetto

```
aruco-game/
├── public/
│   └── aruco/
│       ├── aruco-bundle.js       ← bundle cv.js + aruco.js + dizionario (generato)
│       └── aruco_4x4_1000.js     ← dizionario originale (opzionale, già nel bundle)
├── src/
│   ├── main.js                   ← entry point Vue + Pinia + Router
│   ├── App.vue                   ← root con <RouterView>
│   │
│   ├── router/
│   │   └── index.js              ← rotte: / · /setup · /game
│   │
│   ├── stores/
│   │   ├── markersStore.js       ← registro marker (localStorage)
│   │   ├── gameStore.js          ← stato griglia e pedine per frame
│   │   └── cameraStore.js        ← impostazioni preprocessing (localStorage)
│   │
│   ├── services/
│   │   ├── arucoService.js       ← wrapper js-aruco2 + dizionario 4x4_50
│   │   ├── homographyService.js  ← DLT homography + inversione 3x3
│   │   ├── calibrationService.js ← taratura automatica (~300 combinazioni)
│   │   └── configio.js           ← import/export JSON configurazione
│   │
│   ├── components/
│   │   ├── CameraView.vue        ← canvas unico: feed + detection + overlay AR
│   │   ├── MarkerSetupDialog.vue ← bottom sheet per configurare nuovo marker
│   │   ├── CameraSettingsPanel.vue ← pannello impostazioni preprocessing
│   │   ├── CalibrationModal.vue  ← modal taratura automatica
│   │   ├── GameOverlay.vue       ← SVG overlay (non più usato — integrato in CameraView)
│   │   └── SliderRow.vue         ← componente slider riutilizzabile
│   │
│   └── views/
│       ├── HomeView.vue          ← schermata iniziale
│       ├── SetupView.vue         ← configurazione marker, griglia, import/export
│       └── GameView.vue          ← schermata di gioco principale
│
├── index.html                    ← carica aruco-bundle.js come script globale
├── vite.config.js
├── package.json
└── README.md
```

---

## Marker ArUco

Il progetto usa il dizionario **ARUCO\_4X4\_50** (OpenCV standard).  
Si tratta di marker con 4×4 bit interni + 1 bit di bordo = pattern 6×6 totali, con ID da 0 a 49.

### Stampa i marker

Usa il generatore online: **https://chev.me/arucogen/**

- Dictionary: **`4X4_50`**
- Marker ID: da `0` a `49`
- Dimensione consigliata: **6–10 cm** per lato (più grandi = rilevamento più stabile)
- Stampa su carta bianca opaca, evita carta lucida che riflette la luce

### Marker speciali: angoli della griglia

Quattro marker riservati ai vertici della griglia di gioco:

| Posizione | Significato |
|---|---|
| `NO` | Nord-Ovest (angolo in alto a sinistra) |
| `NE` | Nord-Est (angolo in alto a destra) |
| `SO` | Sud-Ovest (angolo in basso a sinistra) |
| `SE` | Sud-Est (angolo in basso a destra) |

Posiziona questi 4 marker agli angoli della tua plancia. Il programma li usa per calcolare l'omografia e mappare ogni altra pedina sulla griglia.

---

## Flusso d'uso

### Prima sessione

```
1. Apri /setup → imposta dimensioni griglia (default 10×10)
2. Apri /game → punta la camera su un marker mai visto
3. Appare il dialog → scegli il tipo:
     • Angolo griglia → assegna NO / NE / SO / SE
     • Giocatore      → scegli classe (Guerriero, Mago, Ranger, Ladro, Nano, Paladino)
     • Nemico         → scegli tipo (Scheletro, Orco, Goblin, Troll, Barbaro, Drago)
     • Mobile/Oggetto → scegli tipo (Porta aperta/chiusa, Forziere, Trappola, Altare)
4. Ripeti per ogni marker
5. Appena i 4 angoli sono configurati e visibili → griglia proiettata attiva
6. Le pedine mostrano: emoji + ID + posizione (col, row) + orientamento
```

### Sessioni successive

Tutti i marker sono in `localStorage` — il gioco li riconosce immediatamente senza ri-configurazione.

### Export/Import

- **Esporta** da `/setup` tab "Import/Export" → scarica `aruco-game-YYYY-MM-DD.json`
- **Importa** lo stesso file su un altro dispositivo → trasferisci tutta la configurazione

---

## Impostazioni fotocamera

Apri il pannello ⚙️ durante il gioco per regolare:

| Impostazione | Effetto sul rilevamento |
|---|---|
| **Luminosità** | Utile con stanze molto scure o molto chiare |
| **Contrasto** | Aumenta la nitidezza del pattern ArUco |
| **Saturazione** | Ridurre a 0 converte in scala di grigi |
| **Nitidezza** | Unsharp mask, aiuta con stampe sfocate |
| **Scala di grigi** | Elimina interferenze di colore |
| **Soglia binarizzazione** | Converte in bianco/nero puro — ottimo con illuminazione non uniforme |

### Preset rapidi

| Preset | Quando usarlo |
|---|---|
| ☀️ Luce intensa | Stanza molto illuminata, marker sovraesposti |
| 🌙 Poca luce | Stanza buia, marker poco visibili |
| ⛅ Mista | Illuminazione normale ma non uniforme |

### Taratura automatica

Il pulsante 🎯 **Taratura automatica** nel pannello impostazioni:

1. Cattura il frame corrente dalla camera
2. Testa ~300 combinazioni di brightness × contrast × threshold × grayscale
3. Sceglie le impostazioni che riconoscono il maggior numero di marker
4. Mostra un anteprima — puoi applicare o scartare

**Consiglio:** prima di avviare la taratura, metti almeno 3-4 marker nel campo visivo della fotocamera.

---

## Omografia

Quando i 4 marker angolo sono tutti visibili contemporaneamente, il sistema calcola automaticamente la trasformazione proiettiva (omografia) che mappa i pixel della camera sulla griglia di gioco.

Questo permette di:

- Sapere esattamente in quale cella `(col, row)` si trova ogni pedina
- Disegnare la griglia in prospettiva corretta sul feed video
- Calcolare l'orientamento relativo alla plancia (non alla camera)

L'omografia viene mantenuta per 2 secondi anche se i marker angolo escono temporaneamente dall'inquadratura.

---

## Formato file di configurazione

```json
{
  "version": "1.0",
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "grid": {
    "cols": 10,
    "rows": 10
  },
  "camera": {
    "brightness": 100,
    "contrast": 120,
    "saturation": 100,
    "threshold": 0,
    "grayscale": false,
    "sharpness": 1,
    "showGrid": true,
    "showIds": true,
    "showCubes": true,
    "gridOpacity": 0.5
  },
  "markers": [
    {
      "id": 0,
      "category": "corner",
      "role": "NO",
      "label": "Angolo Nord-Ovest",
      "emoji": "📍",
      "description": ""
    },
    {
      "id": 5,
      "category": "player",
      "role": "warrior",
      "label": "Guerriero",
      "emoji": "⚔️",
      "description": "Il tank del gruppo"
    },
    {
      "id": 12,
      "category": "enemy",
      "role": "skeleton",
      "label": "Scheletro",
      "emoji": "💀",
      "description": ""
    },
    {
      "id": 20,
      "category": "furniture",
      "role": "door_open",
      "label": "Porta aperta",
      "emoji": "🚪",
      "description": "Uscita dalla stanza"
    }
  ]
}
```

### Valori validi per `category` e `role`

**category: `corner`** — role: `NO` · `NE` · `SO` · `SE`

**category: `player`** — role: `warrior` · `dwarf` · `mage` · `rogue` · `paladin` · `ranger`

**category: `enemy`** — role: `skeleton` · `orc` · `barbarian` · `goblin` · `troll` · `dragon`

**category: `furniture`** — role: `door_open` · `door_closed` · `chest` · `trap` · `altar`

---

## Troubleshooting

### La camera non si avvia
- Assicurati di accedere via **HTTPS** o **localhost** — Chrome blocca `getUserMedia` su HTTP in rete locale
- Controlla i permessi camera nelle impostazioni del browser
- Su iOS Safari: Impostazioni → Safari → Camera → Consenti

### I marker non vengono rilevati
1. Prova la **taratura automatica** (⚙️ → 🎯)
2. Aumenta il contrasto con il preset ☀️ o 🌙
3. Assicurati che i marker siano a fuoco e ben illuminati
4. Evita riflessi sulla carta (usa carta opaca, non lucida)
5. La distanza ottimale è circa 30–60 cm per marker da 8 cm

### `window.AR non trovato`
Il bundle ArUco non è stato generato correttamente. Rigenera `public/aruco/aruco-bundle.js` con i comandi nella sezione Installazione.

### I marker vengono rilevati ma con ID sbagliati
Stai usando marker di un dizionario diverso da `4X4_50`. Stampa i marker da https://chev.me/arucogen/ selezionando esattamente **4X4_50**.

### La griglia non appare
I 4 marker angolo (NO, NE, SO, SE) devono essere **tutti visibili contemporaneamente** nel campo visivo della camera. Verifica in `/setup` → tab Griglia che tutti e 4 siano assegnati.

---

## Note tecniche

### Perché js-aruco2 viene caricato come script globale

js-aruco2 usa internamente `this.CV` e `this.AR = AR` a livello top-level del modulo. In un ES module (o quando bundlato da Vite), `this` è `undefined` in strict mode — causando il crash `Cannot read properties of undefined (reading 'CV')`. Caricandolo come `<script>` classico nel `<head>`, `this` è garantito essere `window` e le assegnazioni funzionano correttamente.

### Calcolo dell'omografia

Viene usato il metodo DLT (Direct Linear Transform) con SVD numerica per trovare la matrice di omografia 3×3 dai 4 punti di controllo (angoli della griglia). La matrice inversa (3×3) viene calcolata analiticamente per la proiezione griglia → pixel usata per disegnare la griglia sul video.

### Performance

Il loop di rilevamento gira a `requestAnimationFrame` (~60fps) ma la detection ArUco è computazionalmente pesante. Su dispositivi mobili di fascia media si ottengono tipicamente 15–30fps di detection effettiva. Il canvas offscreen per il preprocessing evita allocazioni per frame.

---

## Licenza

Progetto personale — uso libero.  
js-aruco2 è rilasciato sotto licenza MIT.  
Il dizionario ArUco 4×4 è parte di OpenCV (licenza BSD-3).