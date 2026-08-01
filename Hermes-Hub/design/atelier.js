/**
 * L'ATELIER - les molettes de design, dans la page.
 *
 * Ce fichier vit HORS de `src/`. Vite ne le voit donc jamais et il ne peut pas
 * entrer dans `dist/` : ce qui part chez un client ne contient pas une ligne de
 * ce qui suit. Le serveur ne le sert - et n'ajoute sa balise dans la page - que
 * si `HUB_ATELIER=1`, ce que seul `dev-v2.ps1` fait.
 *
 * Deux garde-fous plutot qu'un, parce qu'un seul finit toujours par sauter.
 *
 * Ce qu'il fait :
 *   - une pastille en bas a droite ouvre et ferme le panneau ;
 *   - les molettes ne sont PAS ecrites ici, elles sont decouvertes dans les
 *     feuilles de style : une variable ajoutee dans `index.css` apparait toute
 *     seule au prochain chargement ;
 *   - « Copier mes reglages » ne copie que ce qui a change, pret a coller ;
 *   - le viseur nomme la zone survolee, pour dire « ca » sans la decrire.
 *
 * Rien n'est enregistre. Recharger la page annule tout.
 */
;(function () {
  var ID = 'atelier-hub'
  var PREFIXES = ['--texte-', '--agent-', '--bulle-', '--densite']

  var LIBELLES = {
    '--texte-echelle': 'Echelle generale du texte',
    '--texte-nom': 'Taille des prenoms',
    '--texte-metier': 'Taille des metiers',
    '--texte-corps': 'Taille des descriptions',
    '--texte-detail': 'Taille des mentions',
    '--agent-point': "Taille du point d'identite",
    '--agent-point-compact': 'Taille du point compact',
    '--agent-lisere': 'Force du lisere (fiche)',
    '--agent-lisere-noeud': 'Force du lisere (organigramme)',
    '--agent-lisere-vignette': 'Force du lisere (vignette)',
    '--agent-halo': 'Halo autour du point',
    '--agent-halo-taille': 'Epaisseur du halo',
    '--bulle-rayon': 'Rondeur des bulles',
    '--bulle-largeur': 'Largeur des bulles',
    '--bulle-retrait': 'Retrait sous le nom',
    '--densite': 'Densite des listes',
  }

  /** Les molettes se decouvrent : ce fichier n'a pas a connaitre le projet. */
  function trouverMolettes() {
    var noms = []
    for (var i = 0; i < document.styleSheets.length; i++) {
      var regles
      try {
        regles = document.styleSheets[i].cssRules
      } catch (e) {
        continue // feuille d'une autre origine : illisible, on passe
      }
      for (var j = 0; j < regles.length; j++) {
        var st = regles[j].style
        if (!st) continue
        for (var k = 0; k < st.length; k++) {
          var p = st[k]
          if (p.indexOf('--') !== 0) continue
          for (var x = 0; x < PREFIXES.length; x++) {
            if (p.indexOf(PREFIXES[x]) === 0 && noms.indexOf(p) < 0) noms.push(p)
          }
        }
      }
    }
    return noms.sort()
  }

  function lire(v) {
    var brut = getComputedStyle(document.documentElement).getPropertyValue(v).trim()
    var m = brut.match(/-?[\d.]+/)
    return {
      n: m ? parseFloat(m[0]) : 0,
      calc: brut.indexOf('calc(') === 0,
      unite: brut.indexOf('%') > -1 ? '%' : brut.indexOf('px') > -1 ? 'px' : '',
    }
  }

  /** Des bornes deduites de la valeur : un reglage a 10px n'a pas la meme
      amplitude utile qu'un pourcentage. */
  function bornes(n, u) {
    if (u === '%') return [0, 100, 5]
    if (u === 'px') return [0, Math.max(30, Math.ceil(n * 2.5)), n < 6 ? 0.5 : 1]
    return [0.7, 1.5, 0.05]
  }

  var ouvert = null
  var arreterViseur = null

  function fermer() {
    if (ouvert) ouvert.remove()
    ouvert = null
    if (arreterViseur) arreterViseur()
    arreterViseur = null
  }

  function ouvrir() {
    var noms = trouverMolettes()
    var depart = {}
    var courant = {}

    var p = document.createElement('div')
    p.id = ID
    p.style.cssText =
      'position:fixed;bottom:64px;right:16px;z-index:2147483646;width:280px;max-height:78vh;' +
      'overflow:auto;padding:14px;border-radius:12px;background:#0c1524;color:#e2e8f0;' +
      'font:12px system-ui;box-shadow:0 12px 40px -8px rgba(0,0,0,.6)'

    var titre = document.createElement('div')
    titre.innerHTML =
      '<div style="font-weight:700">Atelier</div>' +
      '<div style="opacity:.6;margin-bottom:10px">' +
      noms.length +
      ' molettes - rien n est enregistre</div>'
    p.appendChild(titre)

    noms.forEach(function (v) {
      var d = lire(v)
      depart[v] = d.n
      courant[v] = d.n
      var b = bornes(d.n, d.unite)
      var suffixe = d.calc ? 'px' : d.unite

      var l = document.createElement('label')
      l.style.cssText = 'display:block;margin-bottom:11px'
      l.innerHTML =
        '<span style="display:flex;justify-content:space-between;gap:8px">' +
        '<span style="opacity:.9">' +
        (LIBELLES[v] || v) +
        '</span><b data-o="' +
        v +
        '">' +
        d.n +
        suffixe +
        '</b></span>'

      var i = document.createElement('input')
      i.type = 'range'
      i.min = b[0]
      i.max = b[1]
      i.step = b[2]
      i.value = d.n
      i.style.cssText = 'width:100%;margin-top:4px;accent-color:#38bdf8'
      i.oninput = function () {
        // Une taille declaree en `calc(Npx * var(--texte-echelle))` se regle par
        // son N : ecrire le resultat casserait l'echelle generale au premier
        // geste.
        var brut = d.calc ? 'calc(' + i.value + 'px * var(--texte-echelle))' : i.value + d.unite
        document.documentElement.style.setProperty(v, brut)
        courant[v] = parseFloat(i.value)
        p.querySelector('[data-o="' + v + '"]').textContent = i.value + suffixe
      }
      l.appendChild(i)
      p.appendChild(l)
    })

    var barre = document.createElement('div')
    barre.style.cssText = 'display:flex;gap:6px;margin-top:4px'
    function bouton(texte, fn) {
      var b = document.createElement('button')
      b.textContent = texte
      b.style.cssText =
        'flex:1;padding:7px;border:0;border-radius:8px;background:#1e293b;color:#e2e8f0;' +
        'font:600 11px system-ui;cursor:pointer'
      b.onclick = fn
      barre.appendChild(b)
      return b
    }

    var copier = bouton('Copier mes reglages', function () {
      var lignes = []
      Object.keys(courant).forEach(function (v) {
        if (courant[v] === depart[v]) return
        var d = lire(v)
        lignes.push(
          '  ' +
            v +
            ': ' +
            (d.calc ? 'calc(' + courant[v] + 'px * var(--texte-echelle))' : courant[v] + d.unite) +
            ';',
        )
      })
      var txt = lignes.length ? lignes.join('\n') : '(rien de change)'
      navigator.clipboard.writeText(txt).then(function () {
        copier.textContent = lignes.length ? 'Copie - colle-le a Claude' : 'Rien de change'
        setTimeout(function () {
          copier.textContent = 'Copier mes reglages'
        }, 2500)
      })
    })

    bouton('Tout remettre', function () {
      Object.keys(depart).forEach(function (v) {
        document.documentElement.style.removeProperty(v)
      })
      fermer()
    })
    p.appendChild(barre)

    // --- Le viseur : nommer ce qu'on montre du doigt -------------------------
    var badge = document.createElement('div')
    badge.style.cssText =
      'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:2147483646;' +
      'padding:8px 14px;border-radius:10px;background:#0c1524;color:#e2e8f0;font:12px system-ui;' +
      'box-shadow:0 8px 30px -6px rgba(0,0,0,.6);pointer-events:none;max-width:60vw'
    badge.textContent = 'Vise : promene ta souris sur la page'
    document.body.appendChild(badge)

    var dernier = null
    function surSouris(e) {
      var el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el || el === dernier || el.closest('#' + ID) || el.closest('#' + ID + '-bouton')) return
      if (dernier) dernier.style.outline = ''
      dernier = el
      el.style.outline = '2px solid #38bdf8'
      var zone = el.closest('[data-zone]')
      var st = getComputedStyle(el)
      window.__vise = {
        zone: zone ? zone.dataset.zone : '(hors zone)',
        texte: (el.textContent || '').trim().slice(0, 60),
        taille: st.fontSize,
      }
      badge.textContent =
        '[' + window.__vise.zone + '] ' + window.__vise.texte + '  -  ' + st.fontSize
    }
    document.addEventListener('mousemove', surSouris, { passive: true })
    arreterViseur = function () {
      document.removeEventListener('mousemove', surSouris)
      if (dernier) dernier.style.outline = ''
      badge.remove()
    }

    document.body.appendChild(p)
    ouvert = p
  }

  // --- La pastille : le seul point d'entree -----------------------------------
  function poser() {
    if (document.getElementById(ID + '-bouton')) return
    var b = document.createElement('button')
    b.id = ID + '-bouton'
    b.title = 'Atelier de design (developpement seulement)'
    b.innerHTML = '&#9881;'
    b.style.cssText =
      'position:fixed;bottom:16px;right:16px;z-index:2147483647;width:38px;height:38px;' +
      'border:0;border-radius:50%;background:#0c1524;color:#38bdf8;font-size:17px;' +
      'cursor:pointer;box-shadow:0 6px 20px -6px rgba(0,0,0,.7);opacity:.55;' +
      'transition:opacity .15s'
    b.onmouseenter = function () {
      b.style.opacity = '1'
    }
    b.onmouseleave = function () {
      b.style.opacity = ouvert ? '1' : '.55'
    }
    b.onclick = function () {
      if (ouvert) fermer()
      else ouvrir()
      b.style.opacity = ouvert ? '1' : '.55'
    }
    document.body.appendChild(b)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', poser)
  } else {
    poser()
  }
})()
