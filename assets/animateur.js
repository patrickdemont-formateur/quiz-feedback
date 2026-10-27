/* Espace animateur : accès (QR codes), résultats en direct, comparaison avant / après, participants */
(function () {
  'use strict';
  var U = window.U, CFG = window.CONFIG, esc = U.esc, norm = U.norm, f1 = U.f1;
  var P = new URLSearchParams(location.search);
  var themeId = /^[a-z0-9-]+$/.test(P.get('t') || '') ? P.get('t') : (CFG.THEME || 'feedback');
  var configure = U.isConfigured(CFG);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var theme, QA, QB, rows = [], demo = false, cle = '', timer = null, sig = '';
  var F = { groupe: P.get('g') !== null ? P.get('g') : undefined, tab: 'acces', phase: 'avant', revele: false, sel: {}, msg: null, qrGroupe: null };
  var mean = function (a) { a = a.filter(function (x) { return typeof x === 'number'; }); return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; };
  var byId = function (list) { var m = {}; list.forEach(function (q) { m[q.id] = q; }); return m; };

  /* ================= Données ================= */
  function parser(headers, values) {
    var cols = [];
    headers.forEach(function (h, i) { if (i < 4) return; var m = String(h).match(/^\s*([A-Za-z0-9_-]+)\s*·/); if (m) cols.push({ i: i, id: m[1] }); });
    return values.map(function (v) {
      var rep = {};
      cols.forEach(function (c) { var x = v[c.i]; if (x !== '' && x != null) rep[c.id] = typeof x === 'number' ? x : String(x); });
      return { date: +new Date(v[0]) || 0, phase: v[1] === 'apres' ? 'apres' : 'avant', groupe: String(v[2] || '').replace(/^'/, '').trim(),
               prenom: String(v[3] || '').replace(/^'/, '').trim(), rep: rep };
    }).filter(function (r) { return r.prenom; });
  }
  function lire() {
    if (demo) return Promise.resolve(rows);
    var url = CFG.APPS_SCRIPT_URL + '?action=lire&theme=' + encodeURIComponent(themeId) + '&key=' + encodeURIComponent(cle);
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'Erreur inconnue');
      return parser(j.headers || [], j.rows || []);
    });
  }
  function genDemo() {
    var noms = ['Alice', 'Bruno', 'Camille', 'David', 'Emma', 'Farid', 'Gaëlle', 'Hugo', 'Inès', 'Julien', 'Karima', 'Lucas', 'Manon', 'Nicolas'];
    var textes = ['Donner un retour précis à un collègue dès lundi.', 'Remplacer « tu es toujours en retard » par un fait daté.', 'Féliciter l’équipe sur un geste précis après la réunion qualité.',
      'Proposer un échange de 5 minutes en tête-à-tête, pas devant tout le monde.', 'Demander « comment tu l’as vécu ? » avant de conclure.', 'Préparer trois faits avant mon prochain entretien.'];
    var seed = 5, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var cl = function (x) { return Math.max(1, Math.min(4, Math.round(x))); }, out = [], t0 = Date.now() - 3 * 3600e3;
    noms.forEach(function (n, i) {
      var apt = (rnd() - 0.5) * 0.6, av = {}, ap = {};
      theme.questions.forEach(function (q) {
        if (q.dim === 'pratiques') { av[q.id] = cl(2.1 + apt * 2 + (rnd() - 0.5) * 2.2); ap[q.id] = cl(3.3 + (rnd() - 0.5) * 1.5); }
        else if (q.dim === 'confiance') { av[q.id] = cl(2.2 + apt * 2 + (rnd() - 0.5) * 1.6); ap[q.id] = cl(3.2 + (rnd() - 0.5) * 1.2); }
        else {
          var faux = q.options.filter(function (o) { return o.id !== q.bonne; }).map(function (o) { return o.id; });
          var pick = function () { var r = rnd(); return faux[r < 0.5 ? 0 : (r < 0.8 ? Math.min(1, faux.length - 1) : faux.length - 1)]; };
          av[q.id] = rnd() < 0.36 + apt ? q.bonne : pick(); ap[q.id] = rnd() < 0.86 + apt / 2 ? q.bonne : pick();
        }
      });
      ap.x1 = cl(3.4 + (rnd() - 0.5) * 1.2); ap.x2 = cl(3.2 + (rnd() - 0.5) * 1.4); if (i % 3 !== 2) ap.x3 = textes[i % textes.length];
      out.push({ date: t0 + i * 40e3, phase: 'avant', groupe: 'Démo', prenom: n, rep: av });
      out.push({ date: t0 + 2.5 * 3600e3 + i * 50e3, phase: 'apres', groupe: 'Démo', prenom: n, rep: ap });
    });
    out.push({ date: t0 + 9e5, phase: 'avant', groupe: 'Essai', prenom: 'Testeur', rep: out[0].rep });
    return out;
  }

  /* ================= Calculs ================= */
  function derniers(phase) {
    var map = {};
    rows.filter(function (r) { return r.phase === phase && (F.groupe === null || r.groupe === F.groupe); })
        .sort(function (a, b) { return a.date - b.date; })
        .forEach(function (r) { map[norm(r.groupe) + '|' + norm(r.prenom)] = r; });
    return map;
  }
  function calc() {
    var mA = derniers('avant'), mB = derniers('apres'), keys = {};
    Object.keys(mA).concat(Object.keys(mB)).forEach(function (k) { keys[k] = 1; });
    var parts = Object.keys(keys).map(function (k) {
      var a = mA[k] || null, b = mB[k] || null, ref = b || a;
      return { key: k, prenom: ref.prenom, groupe: ref.groupe, av: a, ap: b, sa: a ? U.scores(theme, a.rep) : null, sb: b ? U.scores(theme, b.rep) : null };
    }).sort(function (x, y) { return x.prenom.localeCompare(y.prenom, 'fr', { sensitivity: 'base' }); });
    return { parts: parts, nA: Object.keys(mA).length, nB: Object.keys(mB).length,
             pairs: parts.filter(function (p) { return p.av && p.ap; }) };
  }
  var subs = function (A, phase) { return A.parts.map(function (p) { return phase === 'avant' ? p.av : p.ap; }).filter(Boolean); };
  function pctOk(q, list) {
    var v = list.filter(function (r) { return r.rep[q.id] !== undefined; });
    return v.length ? 100 * v.filter(function (r) { return r.rep[q.id] === q.bonne; }).length / v.length : null;
  }
  function meanQ(q, list) { return mean(list.map(function (r) { return r.rep[q.id]; })); }
  var connQ = function () { return theme.questions.filter(function (q) { return q.dim === 'connaissances'; }); };
  var dimQ = function (d) { return theme.questions.filter(function (q) { return q.dim === d; }); };

  /* ================= Vues ================= */
  function vide(txt) { return '<div class="vide"><span class="live-dot"></span>' + txt + '</div>'; }

  /* ---- Accès : QR codes ---- */
  var baseUrl = function () { return location.href.split('#')[0].split('?')[0].replace(/[^\/]*$/, '') + 'index.html'; };
  function lien(phase) {
    var g = (F.qrGroupe !== null ? F.qrGroupe : (typeof F.groupe === 'string' ? F.groupe : '')).trim();
    return baseUrl() + '?t=' + encodeURIComponent(themeId) + '&p=' + phase + (g ? '&g=' + encodeURIComponent(g) : '');
  }
  function vAcces() {
    var g = F.qrGroupe !== null ? F.qrGroupe : (typeof F.groupe === 'string' ? F.groupe : '');
    var carte = function (ph, titre, cls) {
      return '<div class="qrcard ' + cls + '"><p class="eyebrow">' + titre + '</p><canvas id="qr-' + ph + '" width="300" height="300"></canvas>' +
        '<p class="url" id="url-' + ph + '"></p><div class="actions"><button class="btn sm" data-proj="' + ph + '">Projeter</button>' +
        '<button class="btn ghost sm" data-png="' + ph + '">PNG</button><button class="btn ghost sm" data-copy="' + ph + '">Copier le lien</button></div></div>';
    };
    return '<div class="card"><h2>Deux QR codes, un par moment</h2><p class="muted small" style="margin-top:4px">Projetez le QR « Avant » au début de la séquence, le QR « Après » à la fin. Les participants gardent le même appareil : leurs réponses « avant » y sont conservées pour construire leur fiche.</p>' +
      '<label class="field" for="qr-g" style="display:block;font-weight:700;margin:18px 0 8px">Nom du groupe (facultatif)</label>' +
      '<input type="text" id="qr-g" maxlength="40" placeholder="Par exemple : Formateurs-J2" value="' + esc(g) + '" style="max-width:360px">' +
      '<p class="hint" style="font-size:.85rem;color:var(--muted);margin-top:8px">Ce nom est inscrit dans les QR codes et dans le Google Sheet. Il permet de filtrer les résultats par groupe.</p></div>' +
      '<div class="qrcards">' + carte('avant', 'AVANT la séquence', 'av') + carte('apres', 'APRÈS la séquence', 'ap') + '</div>';
  }
  function dessinerQR(canvas, texte) {
    if (!canvas || typeof qrcode !== 'function') return;
    var qr = qrcode(0, 'M'); qr.addData(texte, 'Byte'); qr.make();
    var n = qr.getModuleCount(), marge = 4, cell = Math.max(1, Math.floor(1024 / (n + 2 * marge))), size = cell * (n + 2 * marge);
    canvas.width = canvas.height = size;
    var ctx = canvas.getContext && canvas.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#141B34';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + marge) * cell, (r + marge) * cell, cell, cell);
  }
  function majQR() {
    ['avant', 'apres'].forEach(function (ph) { dessinerQR($('#qr-' + ph), lien(ph)); var u = $('#url-' + ph); if (u) u.textContent = lien(ph); });
  }

  /* ---- En direct ---- */
  function vDirect(A) {
    var phase = F.phase, list = subs(A, phase), Q = phase === 'avant' ? QA : QB;
    var stats = '<div class="cards3"><div class="stat avant"><div class="k">Réponses « avant »</div><div class="v">' + A.nA + '</div></div>' +
      '<div class="stat apres"><div class="k">Réponses « après »</div><div class="v">' + A.nB + '</div></div>' +
      '<div class="stat pairs"><div class="k">Participants sur les deux temps</div><div class="v">' + A.pairs.length + '</div></div></div>';
    var seg = '<div class="titre-bloc"><h2>Résultats collectifs</h2><div class="seg"><button data-phase="avant"' + (phase === 'avant' ? ' class="on"' : '') + '>Avant</button><button data-phase="apres"' + (phase === 'apres' ? ' class="on"' : '') + '>Après</button></div></div>';
    if (!list.length) return stats + seg + vide('En attente des premières réponses « ' + (phase === 'avant' ? 'avant' : 'après') + ' »…');
    var n = list.length;
    var situ = Q.filter(function (q) { return q.type === 'qcm' || q.type === 'vraifaux'; }).map(function (q) {
      var cnt = {}; list.forEach(function (r) { var v = r.rep[q.id]; if (v !== undefined) cnt[v] = (cnt[v] || 0) + 1; });
      var tot = Object.keys(cnt).reduce(function (a, k) { return a + cnt[k]; }, 0) || 1;
      return '<div class="qcard"><div class="row-between"><h3>' + esc(q.court) + '</h3><span class="muted small">' + tot + ' réponse(s)</span></div>' +
        (q.contexte ? '<p class="ctx">' + esc(q.contexte) + '</p>' : '') + '<p style="font-weight:700;margin-bottom:12px">' + esc(q.texte) + '</p><div class="dist">' +
        q.options.map(function (o, k) {
          var c = cnt[o.id] || 0, pc = Math.round(100 * c / tot);
          return '<div class="drow' + (o.id === q.bonne ? ' bonne' : '') + '"><span class="lt">' + (q.type === 'vraifaux' ? ['V', 'F', '?'][k] : String.fromCharCode(65 + k)) + '</span>' +
            '<div class="dtrack"><i data-w="' + pc + '"></i><span>' + esc(o.texte) + '</span></div><span class="pc">' + pc + ' %</span></div>';
        }).join('') + '</div><div class="expl"><b>Pourquoi :</b> ' + esc(q.explication) + '</div></div>';
    }).join('');
    var echelle = function (dim, titre) {
      var qs = Q.filter(function (q) { return q.dim === dim; }); if (!qs.length) return '';
      var lab = qs[0].options.map(function (o) { return o.texte; });
      return '<div class="titre-bloc"><h2>' + titre + '</h2></div><div class="legend">' + lab.map(function (t, i) { return '<span class="k' + (i + 1) + '">' + esc(t) + '</span>'; }).join('') + '</div><div style="margin-top:14px">' +
        qs.map(function (q) {
          var c = [0, 0, 0, 0], tot = 0; list.forEach(function (r) { var v = r.rep[q.id]; if (v >= 1 && v <= 4) { c[v - 1]++; tot++; } });
          return '<div class="qcard"><div class="row-between"><h3>' + esc(q.court) + '</h3><span class="muted small">moyenne ' + f1(meanQ(q, list)) + ' / 4</span></div><p class="ctx">' + esc(q.texte) + '</p>' +
            '<div class="stack">' + c.map(function (x, i) { return '<i class="l' + (i + 1) + '" data-w="' + (tot ? 100 * x / tot : 0) + '"></i>'; }).join('') + '</div></div>';
        }).join('') + '</div>';
    };
    var reveal = '<div class="titre-bloc"><h2>Situations et idées reçues</h2><button class="btn sm" id="reveal">' + (F.revele ? 'Masquer les bonnes réponses' : 'Révéler les bonnes réponses') + '</button></div>';
    return stats + seg + '<p class="muted small" style="margin-bottom:6px">' + n + ' personne(s) ont répondu · mise à jour automatique</p>' + echelle('pratiques', 'Pratiques') + reveal + '<div id="situ" class="' + (F.revele ? 'revele' : '') + '">' + situ + '</div>' + echelle('confiance', 'Confiance');
  }

  /* ---- Avant → Après ---- */
  function agregats(A) {
    var sa = subs(A, 'avant'), sb = subs(A, 'apres');
    var ka = mean(A.parts.filter(function (p) { return p.sa; }).map(function (p) { return p.sa.connaissances.ok; }));
    var kb = mean(A.parts.filter(function (p) { return p.sb; }).map(function (p) { return p.sb.connaissances.ok; }));
    var ca = mean(A.parts.filter(function (p) { return p.sa; }).map(function (p) { return p.sa.confiance; }));
    var cb = mean(A.parts.filter(function (p) { return p.sb; }).map(function (p) { return p.sb.confiance; }));
    var gains = A.pairs.map(function (p) { return p.sb.connaissances.ok - p.sa.connaissances.ok; });
    return { sa: sa, sb: sb, ka: ka, kb: kb, ca: ca, cb: cb, gain: mean(gains), prog: gains.filter(function (g) { return g > 0; }).length };
  }
  function pbars(lbl, a, b, max, fmt) {
    var w = function (x) { return x == null ? 0 : Math.round(100 * x / max); };
    return '<div class="prow"><span class="lbl">' + esc(lbl) + '</span><div class="pbars">' +
      '<div class="pbar"><div class="meter"><i class="m-avant" data-w="' + w(a) + '"></i></div><span>' + (a == null ? '–' : fmt(a)) + '</span></div>' +
      '<div class="pbar"><div class="meter"><i class="m-apres" data-w="' + w(b) + '"></i></div><span style="color:var(--brand-dark)">' + (b == null ? '–' : fmt(b)) + '</span></div></div></div>';
  }
  function vCompare(A) {
    if (!A.nA && !A.nB) return vide('En attente des premières réponses…');
    var G = agregats(A), tot = connQ().length;
    var kpi = '<div class="cards3">' +
      '<div class="stat avant"><div class="k">Connaissances (moyenne)</div><div class="v">' + (G.ka == null ? '–' : f1(G.ka)) + ' <small>→</small> ' + (G.kb == null ? '–' : f1(G.kb)) + ' <small>/ ' + tot + '</small></div></div>' +
      '<div class="stat apres"><div class="k">Confiance (moyenne)</div><div class="v">' + (G.ca == null ? '–' : f1(G.ca)) + ' <small>→</small> ' + (G.cb == null ? '–' : f1(G.cb)) + ' <small>/ 4</small></div></div>' +
      '<div class="stat pairs"><div class="k">En progression (parmi ' + A.pairs.length + ' appariés)</div><div class="v">' + G.prog + ' <small>' + (A.pairs.length ? '· gain moyen +' + f1(Math.max(0, G.gain)) : '') + '</small></div></div></div>';
    var legend = '<div class="legend-av"><span><i style="background:var(--avant)"></i>Avant</span><span><i style="background:var(--brand)"></i>Après</span></div>';
    var situ = connQ().map(function (q) { return pbars(q.court, pctOk(q, G.sa), pctOk(q, G.sb), 100, function (x) { return Math.round(x) + ' %'; }); }).join('');
    var prat2 = dimQ('pratiques').map(function (q) { return pbars(q.court, meanQ(q, G.sa), meanQ(q, G.sb), 4, f1); }).join('');
    var conf = dimQ('confiance').map(function (q) { return pbars(q.court, meanQ(q, G.sa), meanQ(q, G.sb), 4, f1); }).join('');
    var eng = G.sb.filter(function (r) { return r.rep.x3; }).map(function (r) { return '<div>« ' + esc(r.rep.x3) + ' »<small>' + esc(r.prenom) + '</small></div>'; }).join('');
    return kpi + '<div class="qcard"><div class="row-between"><h3>Bonnes réponses par situation</h3>' + legend + '</div><p class="ctx">Part du groupe qui choisit la réponse recommandée.</p><div class="pairs">' + situ + '</div></div>' +
      '<div class="cards2"><div class="qcard"><h3>Pratiques : aujourd’hui et intention</h3><p class="ctx">Moyenne sur 4 (avant : fréquence · après : intention).</p><div class="pairs">' + prat2 + '</div></div>' +
      '<div class="qcard"><h3>Confiance</h3><p class="ctx">Moyenne sur 4.</p><div class="pairs">' + conf + '</div></div></div>' +
      (eng ? '<div class="titre-bloc"><h2>Premiers pas annoncés</h2></div><div class="engage">' + eng + '</div>' : '');
  }

  /* ---- Participants ---- */
  function vParticipants(A) {
    if (!A.parts.length) return vide('En attente des premières réponses…');
    var all = F.groupe === null;
    var msg = F.msg ? '<div class="banner ' + F.msg.t + '">' + esc(F.msg.m) + '</div>' : '';
    var tot = connQ().length;
    var lignes = A.parts.map(function (p, i) {
      var g = p.sa && p.sb ? p.sb.connaissances.ok - p.sa.connaissances.ok : null;
      return '<tr><td><input type="checkbox" class="chk-p" data-i="' + i + '"' + (F.sel[p.key] ? ' checked' : '') + ' aria-label="Sélectionner ' + esc(p.prenom) + '"></td>' +
        '<td><b>' + esc(p.prenom) + '</b></td><td class="muted">' + esc(p.groupe || '–') + '</td>' +
        '<td class="c">' + (p.sa ? p.sa.connaissances.ok + ' / ' + tot : '–') + '</td><td class="c"><b>' + (p.sb ? p.sb.connaissances.ok + ' / ' + tot : '–') + '</b></td>' +
        '<td class="c">' + (g == null ? '–' : '<span class="gain ' + (g > 0 ? 'pos' : (g < 0 ? 'neg' : 'zero')) + '">' + (g > 0 ? '+' : '') + g + '</span>') + '</td>' +
        '<td class="c">' + (p.sa ? f1(p.sa.confiance) : '–') + '</td><td class="c"><b>' + (p.sb ? f1(p.sb.confiance) : '–') + '</b></td></tr>';
    }).join('');
    return '<div class="card"><div class="row-between"><div><h2>Participants</h2><p class="muted small" style="margin-top:4px">Détail visible uniquement par vous. Les suppressions sont déplacées dans l’onglet « Corbeille_' + esc(themeId) + ' » du Google Sheet.</p></div>' +
      '<div class="actions"><button class="btn danger sm" id="del">Supprimer la sélection</button>' +
      '<button class="btn ghost sm" id="reset"' + (all ? ' disabled title="Choisissez un groupe dans la liste"' : '') + '>Réinitialiser ce groupe</button></div></div>' + '<div style="margin-top:16px">' + msg + '</div>' +
      '<div style="overflow:auto"><table class="liste"><thead><tr><th style="width:40px"><input type="checkbox" id="chk-all" aria-label="Tout sélectionner"></th><th>Prénom</th><th>Groupe</th>' +
      '<th class="c">Connaissances avant</th><th class="c">après</th><th class="c">Gain</th><th class="c">Confiance avant</th><th class="c">après</th></tr></thead><tbody>' + lignes + '</tbody></table></div></div>';
  }

  /* ================= Affichage ================= */
  var A = null;
  function groupes() {
    var g = {}; rows.forEach(function (r) { (g[r.groupe] = g[r.groupe] || {})[norm(r.prenom)] = 1; });
    return g;
  }
  function remplirGroupes() {
    var g = groupes(), noms = Object.keys(g).sort(function (a, b) { return a.localeCompare(b, 'fr'); }), sel = $('#f-groupe');
    if (F.groupe === undefined) {                                  // premier chargement : groupe le plus récent
      var dernier = rows.slice().sort(function (a, b) { return b.date - a.date; })[0];
      F.groupe = dernier ? dernier.groupe : null;
    }
    if (F.groupe !== null && noms.indexOf(F.groupe) < 0) F.groupe = null;
    var total = {}; rows.forEach(function (r) { total[r.groupe + '|' + norm(r.prenom)] = 1; });
    var val = function (x) { return x === '' ? '~' : x; };
    sel.innerHTML = '<option value="*">Tous les groupes (' + Object.keys(total).length + ')</option>' + noms.map(function (x) {
      return '<option value="' + esc(val(x)) + '">' + esc(x === '' ? 'Sans groupe' : x) + ' (' + Object.keys(g[x]).length + ')</option>';
    }).join('');
    sel.value = F.groupe === null ? '*' : val(F.groupe);
  }
  function afficher(force) {
    var s = rows.length + '|' + rows.reduce(function (m, r) { return Math.max(m, r.date); }, 0) + '|' + F.groupe + '|' + F.phase + '|' + F.revele;
    remplirGroupes();
    A = calc();
    if (!force && s === sig) return; sig = s;
    $('#tab-direct').innerHTML = vDirect(A);
    $('#tab-compare').innerHTML = vCompare(A);
    $('#tab-participants').innerHTML = vParticipants(A);
    if (!$('#qr-avant')) { $('#tab-acces').innerHTML = vAcces(); majQR(); }
    U.remplir($('#dash'));
    var all = $('#chk-all'); if (all) all.checked = A.parts.length && A.parts.every(function (p) { return F.sel[p.key]; });
  }
  function montrer(t) {
    F.tab = t;
    document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === t); });
    ['acces', 'direct', 'compare', 'participants'].forEach(function (n) { $('#tab-' + n).hidden = n !== t; });
    $('.toolbar').style.display = t === 'acces' ? 'none' : '';
    U.remplir($('#tab-' + t));
  }
  function ouvrir() {
    $('#gate').hidden = true; $('#dash').hidden = false; $('#tabs').hidden = false; $('#demo-banner').hidden = !demo;
    $('#sous-titre').textContent = theme.titre; montrer(F.tab);
  }
  function actualiser() {
    var b = $('#refresh'); b.disabled = true;
    return lire().then(function (r) { rows = r; afficher(false); }).catch(function (e) {
      $('#tab-direct').innerHTML = '<div class="banner err">Lecture impossible : ' + esc(e.message) + '</div>';
    }).then(function () { b.disabled = false; });
  }
  function relancer() {
    clearInterval(timer);
    if ($('#auto').checked && !demo) timer = setInterval(actualiser, (CFG.AUTO_REFRESH_SECONDES || 6) * 1000);
  }

  /* ================= Actions : suppression, exports ================= */
  var corresp = function (r, c) { return norm(r.groupe) === norm(c.groupe) && (c.prenom == null || norm(r.prenom) === norm(c.prenom)); };
  function executer(cibles, libelle) {
    F.msg = null;
    var p;
    if (demo) { var avant = rows.length; rows = rows.filter(function (r) { return !cibles.some(function (c) { return corresp(r, c); }); }); p = Promise.resolve({ ok: true, n: avant - rows.length }); }
    else {
      var corps = JSON.stringify({ action: 'supprimer', key: cle, theme: themeId, cibles: cibles }), h = { 'Content-Type': 'text/plain;charset=utf-8' };
      p = fetch(CFG.APPS_SCRIPT_URL, { method: 'POST', headers: h, body: corps }).then(function (r) {
        return r.json().then(function (j) {
          if (!j.ok) throw new Error(/invalide|manquant/.test(j.error || '') ? 'Le script Google n’est pas à jour : collez la dernière version de Code.gs et redéployez-le (README, section Mise à jour).' : j.error);
          return j;
        }, function () { return { ok: true, n: null }; });
      }, function () { return fetch(CFG.APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: h, body: corps }).then(function () { return { ok: true, n: null }; }); });
    }
    return p.then(function (res) { F.msg = { t: 'ok', m: (res.n == null ? 'Demande envoyée. Vérifiez la liste.' : res.n + ' réponse(s) déplacée(s) dans la Corbeille') + (libelle ? ' · ' + libelle : '') + (demo ? ' (démonstration)' : '') }; F.sel = {}; })
      .catch(function (e) { F.msg = { t: 'err', m: e.message }; }).then(function () { return actualiser(); }).then(function () { afficher(true); });
  }
  function exporterCSV() {
    var sep = ';', q = function (x) { return '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; }, ids = theme.questions.concat(theme.extras || []).map(function (x) { return x.id; });
    var lignes = [['Prénom', 'Groupe', 'Phase', 'Connaissances', 'Confiance'].concat(ids)];
    A.parts.forEach(function (p) {
      [['avant', p.av, p.sa], ['apres', p.ap, p.sb]].forEach(function (x) {
        if (x[1]) lignes.push([p.prenom, p.groupe, x[0], x[2].connaissances.ok, x[2].confiance == null ? '' : f1(x[2].confiance)].concat(ids.map(function (id) { var v = x[1].rep[id]; return v === undefined ? '' : v; })));
      });
    });
    var a = document.createElement('a'); a.download = 'resultats-' + themeId + '.csv';
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + lignes.map(function (l) { return l.map(q).join(sep); }).join('\r\n')], { type: 'text/csv;charset=utf-8' })); a.click();
  }
  function synthesePDF(btn) {
    var G = agregats(A);
    var data = { titre: theme.titre, groupe: F.groupe === null ? 'Tous les groupes' : (F.groupe || 'Sans groupe'), total: connQ().length, nAvant: A.nA, nApres: A.nB,
      kAvant: G.ka, kApres: G.kb, cAvant: G.ca, cApres: G.cb,
      parQ: connQ().map(function (q) { return { court: q.court, pctAvant: pctOk(q, G.sa), pctApres: pctOk(q, G.sb) }; }),
      prat: dimQ('pratiques').map(function (q) { return { court: q.court, avant: meanQ(q, G.sa), apres: meanQ(q, G.sb) }; }),
      participants: A.parts.map(function (p) { return { prenom: p.prenom, kA: p.sa ? p.sa.connaissances.ok : null, kB: p.sb ? p.sb.connaissances.ok : null, cA: p.sa ? p.sa.confiance : null, cB: p.sb ? p.sb.confiance : null }; }),
      engagements: G.sb.filter(function (r) { return r.rep.x3; }).map(function (r) { return { prenom: r.prenom, texte: r.rep.x3 }; }) };
    btn.disabled = true; var t = btn.textContent; btn.textContent = 'Préparation…';
    window.PDFKit.synthese(data).then(function (doc) { doc.save('synthese-' + themeId + '.pdf'); })
      .catch(function (e) { alert('PDF indisponible : ' + e.message); }).then(function () { btn.disabled = false; btn.textContent = t; });
  }

  /* ================= Événements ================= */
  $('#gate-form').addEventListener('submit', function (e) {
    e.preventDefault(); cle = $('#cle').value; var m = $('#gate-msg'); m.textContent = '';
    if (!configure) { m.textContent = 'L’adresse du script Google n’est pas renseignée dans config.js. Essayez d’abord la démonstration.'; return; }
    if (!cle) { m.textContent = 'Saisissez la clé animateur.'; return; }
    lire().then(function (r) { rows = r; try { sessionStorage.setItem('diag-cle', cle); } catch (x) {} ouvrir(); afficher(true); relancer(); })
      .catch(function (err) { m.textContent = 'Accès refusé ou script injoignable : ' + err.message; });
  });
  $('#demo-lien').addEventListener('click', function (e) {
    e.preventDefault(); demo = true; if (F.groupe === undefined) F.groupe = 'Démo'; rows = genDemo(); F.tab = 'direct'; ouvrir(); afficher(true); F.phase = 'avant';
  });
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('.tab-btn'); if (b) montrer(b.dataset.tab); });
  $('#f-groupe').addEventListener('change', function (e) { var v = e.target.value; F.groupe = v === '*' ? null : (v === '~' ? '' : v); F.qrGroupe = null; F.sel = {}; afficher(true); var g = $('#qr-g'); if (g) g.value = typeof F.groupe === 'string' ? F.groupe : ''; majQR(); });
  $('#refresh').addEventListener('click', function () { actualiser().then(function () { afficher(true); }); });
  $('#auto').addEventListener('change', relancer);
  $('#csv').addEventListener('click', exporterCSV);
  $('#pdf').addEventListener('click', function () { synthesePDF(this); });
  $('#projection').addEventListener('click', function () { this.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#projection').hidden = true; });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.phase) { F.phase = b.dataset.phase; afficher(true); }
    if (b.id === 'reveal') { F.revele = !F.revele; afficher(true); }
    if (b.dataset.proj) { var ph = b.dataset.proj; dessinerQR($('#proj-canvas'), lien(ph)); $('#proj-phase').textContent = ph === 'avant' ? 'Avant la séquence' : 'Après la séquence'; $('#proj-url').textContent = lien(ph); $('#projection').hidden = false; }
    if (b.dataset.png) { var a = document.createElement('a'); a.download = 'qr-' + b.dataset.png + '.png'; a.href = $('#qr-' + b.dataset.png).toDataURL('image/png'); a.click(); }
    if (b.dataset.copy) { var t = lien(b.dataset.copy); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'Copié ✓'; }, function () { window.prompt('Copiez ce lien :', t); }); }
    if (b.id === 'del') {
      var ch = A.parts.filter(function (p) { return F.sel[p.key]; });
      if (!ch.length) { F.msg = { t: 'err', m: 'Cochez au moins un participant.' }; afficher(true); return; }
      if (window.confirm('Supprimer les réponses de ' + ch.length + ' participant(s) ?\n\n' + ch.map(function (p) { return '• ' + p.prenom; }).join('\n') + '\n\nLes lignes sont déplacées dans la Corbeille du Google Sheet (récupérables).')) executer(ch.map(function (p) { return { groupe: p.groupe, prenom: p.prenom }; }), '');
    }
    if (b.id === 'reset' && F.groupe !== null) {
      if (window.confirm('Réinitialiser le groupe « ' + (F.groupe || 'Sans groupe') + ' » ?\n\nToutes ses réponses (avant et après) sont déplacées dans la Corbeille du Google Sheet.')) executer([{ groupe: F.groupe }], 'groupe réinitialisé');
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains('chk-p')) { var p = A.parts[+t.dataset.i]; if (t.checked) F.sel[p.key] = 1; else delete F.sel[p.key]; }
    if (t.id === 'chk-all') { A.parts.forEach(function (p) { if (t.checked) F.sel[p.key] = 1; else delete F.sel[p.key]; }); document.querySelectorAll('.chk-p').forEach(function (c) { c.checked = t.checked; }); }
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'qr-g') { F.qrGroupe = e.target.value; majQR(); } });

  /* ================= Démarrage ================= */
  U.loadTheme(themeId).then(function (t) {
    theme = t; QA = U.questions(theme, 'avant'); QB = U.questions(theme, 'apres');
    document.title = 'Animateur · ' + theme.titre;
    if (!configure) $('#gate-texte').textContent = 'L’adresse du script Google n’est pas encore renseignée dans config.js. Vous pouvez néanmoins découvrir le rendu avec des données fictives.';
    try { var k = sessionStorage.getItem('diag-cle'); if (k) $('#cle').value = k; } catch (x) {}
    window.__demo = function () { $('#demo-lien').click(); };
  }).catch(function (e) { $('#gate-texte').textContent = 'Erreur : ' + e.message; });
})();
