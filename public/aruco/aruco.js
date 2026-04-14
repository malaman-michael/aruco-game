/*
  aruco-bundle.js
  Carica cv.js e aruco.js in modo sicuro assicurando che window.CV
  sia disponibile prima che aruco.js lo legga con "this.CV".
  
  Questo file va in public/aruco/ e viene incluso come unico <script> in index.html.
*/

(function(global) {
  // Tutto il codice di cv.js viene eseguito qui dentro con global = window
  // In questo modo "this.CV = CV" diventa "window.CV = CV"

  // ─── cv.js inline placeholder ────────────────────────────────────────────
  // Il file reale viene caricato subito dopo, ma dobbiamo assicurarci
  // che window.CV esista prima che aruco.js venga parsato.
  // La strategia: usiamo XMLHttpRequest sincrono per caricare e valutare
  // cv.js e aruco.js nell'ordine corretto, con global = window esplicito.

  function loadSync(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false); // sincrono
    xhr.send(null);
    if (xhr.status === 200) {
      return xhr.responseText;
    }
    throw new Error('Impossibile caricare ' + url + ' (status ' + xhr.status + ')');
  }

  try {
    // 1. Carica ed esegui cv.js — definisce window.CV
    var cvCode = loadSync('/aruco/cv.js');
    // Sostituisce "this.CV = CV" con "window.CV = CV" per sicurezza
    cvCode = cvCode.replace(/\bthis\.CV\s*=/g, 'window.CV =');
    new Function('window', cvCode)(global);

    if (!global.CV) {
      throw new Error('cv.js caricato ma window.CV non definito');
    }
    console.log('[aruco-bundle] window.CV pronto');

    // 2. Carica ed esegui aruco.js — legge window.CV, scrive window.AR
    var arucoCode = loadSync('/aruco/aruco.js');
    // Sostituisce i riferimenti a this con window per sicurezza
    arucoCode = arucoCode.replace(/\bthis\.CV\b/g, 'window.CV');
    arucoCode = arucoCode.replace(/\bthis\.AR\s*=/g, 'window.AR =');
    new Function('window', arucoCode)(global);

    if (!global.AR) {
      throw new Error('aruco.js caricato ma window.AR non definito');
    }
    console.log('[aruco-bundle] window.AR pronto, dizionari:', Object.keys(global.AR.DICTIONARIES || {}));

  } catch(e) {
    console.error('[aruco-bundle] Errore caricamento:', e.message);
  }

})(window);