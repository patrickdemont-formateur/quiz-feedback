/* Fonctions communes : thème, questions par phase, calculs de scores */
(function (w) {
  'use strict';
  var U = {};

  /* Typographie française : espaces insécables dans « … » et avant ? ! : ; */
  U.typo = function (s) { return String(s).replace(/«[ ]/g, '«\u00a0').replace(/[ ]»/g, '\u00a0»').replace(/ ([?!:;])/g, '\u00a0$1'); };
  U.esc = function (s) {
    return U.typo(String(s == null ? '' : s)).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  U.norm = function (s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); };
  U.f1 = function (x) { return x == null ? '–' : (Math.round(x * 10) / 10).toFixed(1).replace('.', ','); };
  U.isConfigured = function (cfg) { return /^https:\/\/script\.google\.com\//.test((cfg && cfg.APPS_SCRIPT_URL) || ''); };

  U.loadScript = function (src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement('script'); s.src = src; s.onload = ok;
      s.onerror = function () { ko(new Error('Chargement impossible : ' + src)); };
      document.head.appendChild(s);
    });
  };
  U.loadTheme = function (id) {
    if (w.THEMES && w.THEMES[id]) return Promise.resolve(w.THEMES[id]);
    return U.loadScript('themes/' + id + '.js').then(function () {
      if (!w.THEMES || !w.THEMES[id]) throw new Error('Thème introuvable : ' + id);
      return w.THEMES[id];
    });
  };

  /* Liste ordonnée des questions pour une phase, avec les textes propres à la phase */
  U.questions = function (theme, phase) {
    var apres = phase === 'apres', out = [];
    var blocs = theme.blocs.slice();
    var all = theme.questions.slice();
    if (apres && theme.extras && theme.extras.length) { blocs.push(theme.blocBilan); all = all.concat(theme.extras); }
    blocs.forEach(function (b) {
      var first = true;
      all.filter(function (q) { return q.bloc === b.id; }).forEach(function (q) {
        var echelle = (apres && q.echelleApres) ? q.echelleApres : q.echelle;
        var opts = q.options ? q.options : (echelle ? theme.echelles[echelle].map(function (t, i) { return { id: String(i + 1), texte: t }; }) : null);
        out.push({
          id: q.id, bloc: b.id, blocTitre: b.titre, premier: first,
          blocIntro: first ? (apres && b.introApres ? b.introApres : b.intro) : null,
          dim: q.dim, type: q.type, court: q.court, contexte: q.contexte || null,
          texte: (apres && q.texteApres) ? q.texteApres : q.texte,
          options: opts, echelle: echelle, bonne: q.bonne || null, explication: q.explication || null,
          facultatif: !!q.facultatif, placeholder: q.placeholder || ''
        });
        first = false;
      });
    });
    return out;
  };

  /* Scores d'un jeu de réponses (rep : {idQuestion: valeur}) */
  U.scores = function (theme, rep) {
    var mean = function (ids) {
      var v = ids.map(function (id) { return rep[id]; }).filter(function (x) { return typeof x === 'number'; });
      return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
    };
    var ids = function (dim) { return theme.questions.filter(function (q) { return q.dim === dim; }).map(function (q) { return q.id; }); };
    var conn = theme.questions.filter(function (q) { return q.dim === 'connaissances'; });
    var ok = {}, n = 0, repondu = 0;
    conn.forEach(function (q) { if (rep[q.id] !== undefined) { repondu++; } ok[q.id] = rep[q.id] === q.bonne; if (ok[q.id]) n++; });
    return { pratiques: mean(ids('pratiques')), confiance: mean(ids('confiance')),
             connaissances: { ok: n, total: conn.length, repondu: repondu }, parQuestion: ok };
  };

  U.etiquette = function (theme, echelle, valeur) {
    var l = theme.echelles[echelle]; var i = Math.round(valeur) - 1;
    return l && l[Math.max(0, Math.min(l.length - 1, i))] || '';
  };
  U.dots = function (v, total, cls) {
    var h = '<span class="dots ' + (cls || '') + '" aria-hidden="true">';
    for (var i = 1; i <= (total || 4); i++) h += '<i' + (i <= Math.round(v || 0) ? ' class="on"' : '') + '></i>';
    return h + '</span>';
  };
  U.compter = function (el, de, a, dec, dur) {         // animation de compteur
    if (!el) return;
    var reduit = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fmt = function (x) { return dec ? U.f1(x) : String(Math.round(x)); };
    if (reduit || de === a) { el.textContent = fmt(a); return; }
    var t0 = null; dur = dur || 900;
    function pas(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(de + (a - de) * e); if (p < 1) requestAnimationFrame(pas); }
    requestAnimationFrame(pas);
  };
  U.remplir = function (racine) {                      // fait grandir les barres (data-w = largeur en %)
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      (racine || document).querySelectorAll('[data-w]').forEach(function (e) { e.style.width = e.getAttribute('data-w') + '%'; });
    }); });
  };
  U.date = function (d) { return new Date(d || Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); };

  w.U = U;
})(window);
