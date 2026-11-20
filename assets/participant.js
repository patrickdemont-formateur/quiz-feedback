/* Parcours stagiaire : accueil, une question par écran, restitution personnelle, fiche PDF */
(function () {
  'use strict';
  var U = window.U, CFG = window.CONFIG, esc = U.esc;
  var P = new URLSearchParams(location.search);
  var themeId = /^[a-z0-9-]+$/.test(P.get('t') || '') ? P.get('t') : (CFG.THEME || 'feedback');
  var phase = P.get('p') === 'apres' ? 'apres' : 'avant';
  var groupeUrl = (P.get('g') || CFG.GROUPE || '').trim().slice(0, 40);
  var configure = U.isConfigured(CFG);
  var app = document.getElementById('app');
  var theme, Q, timer = null, lastPct = 0;
  var st = { screen: 'accueil', i: 0, prenom: '', groupe: groupeUrl, rep: {}, envoi: { etat: 'idle' }, avant: null, sid: null };

  /* La phase pilote la couleur de toute l'interface : gris = avant, indigo = après (voir style.css) */
  document.body.classList.add('ph-' + phase);

  /* ---------- stockage local (sur l'appareil du stagiaire) ---------- */
  var kAvant = function () { return 'av:' + themeId + ':' + U.norm(st.prenom); };
  var kBrouillon = function () { return 'dr:' + themeId + ':' + phase; };
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function brouillon() { lsSet(kBrouillon(), { prenom: st.prenom, groupe: st.groupe, i: st.i, rep: st.rep }); }
  var uid = function () { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 's' + Date.now() + Math.random().toString(16).slice(2); };

  /* ---------- icônes vectorielles (aucun emoji) ---------- */
  var D = {
    check: 'M4 10.5l4 4 8-9', droite: 'M4 10h12M11 5l5 5-5 5', gauche: 'M16 10H4M9 5l-5 5 5 5',
    fleche: 'M3 10h14M12 5l5 5-5 5', bas: 'M5 8l5 5 5-5', dl: 'M10 3v10M5.5 9l4.5 4.5L14.5 9M4 17h12',
    croix: 'M5 5l10 10M15 5L5 15', cadenas: 'M6 9V6.5a4 4 0 018 0V9M4.5 9h11v8h-11z'
  };
  function svg(d, o) {
    o = o || {};
    return '<svg' + (o.c ? ' class="' + o.c + '"' : '') + ' width="' + (o.s || 20) + '" height="' + (o.s || 20) + '" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="' + (o.w || 2) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  }
  /* typographie française : U.esc applique déjà les espaces insécables (« », ? ! : ;) */
  var fr = esc;

  /* ---------- gabarits ---------- */
  var page = function (top, main, cls) { return '<div class="page ' + (cls || '') + '">' + top + '<main class="stage">' + main + '</main></div>'; };
  var topBadge = function (txt) { return '<header class="top"><span class="badge"><i></i>' + esc(txt) + '</span></header>'; };
  var sec = function (titre, sous, corps, cls) {
    return '<section class="sec ' + (cls || '') + '">' + (titre ? '<h2>' + titre + '</h2>' : '') + (sous ? '<p class="sous">' + sous + '</p>' : '') + corps + '</section>';
  };

  function vAccueil() {
    var ph = theme.phases[phase];
    var ech = theme.echelles[phase === 'apres' ? 'intention' : 'frequence'];
    var m = /^(\d+)\s*(.*)$/.exec(theme.duree || '');
    var duree = m ? '<b>' + esc(m[1]) + '</b><span>' + esc(m[2]) + '</span>' : '<span>' + esc(theme.duree || '') + '</span>';
    var legende = ech.map(function (l, k) { return '<div>' + U.dots(k + 1, 4, 'mini') + '<span>' + esc(l) + '</span></div>'; }).join('');
    return page(topBadge(ph.badge),
      (configure ? '' : '<div class="banner" style="margin-top:20px"><b>Mode test.</b> Le script Google n’est pas configuré : vous pouvez tout essayer, mais rien n’est envoyé.</div>') +
      '<h1>' + fr(ph.titre) + '</h1><p class="lead">' + fr(ph.texte) + '</p>' +
      '<div class="legende" aria-hidden="true">' + legende + '</div>' +
      '<div class="bande"><div>' + duree + '</div><div><b>' + Q.length + '</b><span>questions</span></div><div>Sans note ni classement</div></div>' +
      '<label class="field" for="prenom">Votre prénom</label>' +
      '<input type="text" id="prenom" maxlength="40" autocomplete="given-name" placeholder="Par exemple : Camille" value="' + esc(st.prenom) + '">' +
      (groupeUrl ? '<p class="hint">Groupe : <b>' + esc(groupeUrl) + '</b></p>'
                 : '<label class="field" for="groupe">Groupe (facultatif)</label><input type="text" id="groupe" maxlength="40" value="' + esc(st.groupe) + '">') +
      '<div class="cta"><button type="button" class="btn block" id="go" disabled>Commencer ' + svg(D.droite) + '</button>' +
      '<p class="hint">Vos réponses individuelles restent entre vous et le formateur.</p></div>', 'accueil');
  }

  function vQuestion() {
    var q = Q[st.i], n = Q.length, val = st.rep[q.id], corps;
    if (q.type === 'texte') {
      corps = '<div class="opts"><textarea id="txt" maxlength="300" aria-label="' + esc(q.court) + '" placeholder="' + esc(q.placeholder) + '">' + esc(val || '') + '</textarea></div>';
    } else {
      corps = '<div class="opts" role="radiogroup" aria-label="Réponses">' + q.options.map(function (o, k) {
        var sel = String(val) === String(o.id), lead;
        if (q.type === 'echelle') lead = U.dots(k + 1, 4);
        else if (q.type === 'vraifaux') lead = '<span class="lt">' + ['<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + D.check + '"/></svg>',
          '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + D.croix + '"/></svg>', '?'][k] + '</span>';
        else lead = '<span class="lt">' + String.fromCharCode(65 + k) + '</span>';
        return '<button type="button" class="opt ' + q.type + (sel ? ' sel' : '') + '" role="radio" aria-checked="' + sel + '" data-v="' + esc(o.id) + '">' +
          lead + '<span class="t">' + fr(o.texte) + '</span>' + svg(D.check, { c: 'ck', w: 2.4 }) + '</button>';
      }).join('') + '</div>';
    }
    var suivant = '';
    if (q.type === 'texte') suivant = '<button type="button" class="btn" data-act="fin">Terminer</button>';
    else if (val !== undefined) suivant = '<button type="button" class="btn ghost" data-act="suivant">Suivant ' + svg(D.droite) + '</button>';
    var top = '<header class="top"><div class="top-row">' +
      (st.i > 0 ? '<button type="button" class="back" data-act="retour">' + svg(D.gauche) + 'Retour</button>' : '<span></span>') +
      '<span class="count"><b>' + (st.i + 1) + '</b>&nbsp;/&nbsp;' + n + '</span></div>' +
      '<div class="progress" role="progressbar" aria-label="Progression" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + (st.i + 1) + '"><i style="width:' + lastPct + '%"></i></div></header>';
    return page(top,
      '<p class="bloc">' + esc(q.blocTitre) + '</p>' +
      (q.blocIntro ? '<p class="consigne">' + fr(q.blocIntro) + '</p>' : '') +
      (q.contexte ? '<div class="situation"><p class="lbl">La situation</p><p>' + fr(q.contexte) + '</p></div>' : '') +
      '<h1 class="q">' + fr(q.texte) + '</h1>' + corps +
      '<div class="nav">' + suivant + '</div>', 'question');
  }

  /* ---------- résultats ---------- */
  var scalesLabel = function (q, v) { return U.etiquette(theme, q.echelleApres && phase === 'apres' ? q.echelleApres : q.echelle, v); };
  function statutHtml() {
    var e = st.envoi.etat;
    if (e === 'test') return '<span class="statut">Mode test · réponses non envoyées</span>';
    if (e === 'envoi' || e === 'idle') return '<span class="statut">Envoi en cours…</span>';
    if (e === 'echec') return '<span class="statut err">Non transmis · <button type="button" data-act="renvoyer">Réessayer</button></span>';
    return '<span class="statut ok">' + svg(D.check, { s: 16, w: 2.4 }) + 'Réponses transmises</span>';
  }
  function majStatut() { var s = document.getElementById('statut'); if (s) s.innerHTML = statutHtml(); }

  var pratiquesQ = function () { return theme.questions.filter(function (q) { return q.dim === 'pratiques'; }); };
  var connQ = function () { return theme.questions.filter(function (q) { return q.dim === 'connaissances'; }); };

  function resAvant() {
    var sc = U.scores(theme, st.rep), pq = pratiquesQ(), conf = sc.confiance;
    var max = pq.reduce(function (a, q) { return st.rep[q.id] > st.rep[a.id] ? q : a; }, pq[0]);
    var min = pq.reduce(function (a, q) { return st.rep[q.id] < st.rep[a.id] ? q : a; }, pq[0]);
    var rows = '<div class="prats">' + pq.map(function (q) {
      return '<div class="prat"><p class="l">' + esc(q.court) + '</p><div class="line">' + U.dots(st.rep[q.id], 4, 'grey big') + '<span class="lab">' + esc(scalesLabel(q, st.rep[q.id])) + '</span></div></div>';
    }).join('') + '</div>';
    var insights = (st.rep[max.id] !== st.rep[min.id]) ?
      '<div class="insights"><div class="insight"><b>Votre habitude la plus ancrée</b>' + esc(max.court) + '</div>' +
      '<div class="insight"><b>Votre terrain d’exploration</b>' + esc(min.court) + '</div></div>' : '';
    var confiance = '<div class="compare"><div class="crow"><span class="tag">Départ</span><div class="meter"><i class="m-avant" data-w="' + Math.round((conf - 1) / 3 * 100) + '"></i></div><span class="num">' + U.f1(conf) + '</span></div></div>' +
      '<p class="sous" style="margin-top:14px">Échelle de 1 à 4 · en moyenne : ' + fr('« ' + U.etiquette(theme, 'accord', conf) + ' ».') + '</p>';
    return page(topBadge(theme.phases.avant.badge),
      '<section class="hero"><p class="salut">' + fr('Merci ' + st.prenom.trim() + ' !') + '</p><h1>' + fr(theme.phases.avant.merci) + '</h1>' +
      '<p class="lead">Une photo de départ, sans jugement : elle sert de repère pour mesurer ce qui va bouger.</p><div id="statut">' + statutHtml() + '</div></section>' +
      sec('Vos pratiques aujourd’hui', 'Ce que vous faites déjà, à votre rythme.', rows + insights) +
      sec('Votre confiance', '', confiance) +
      sec('Vos connaissances', '', '<div class="locked">' + svg(D.cadenas, { s: 22 }) + '<div><b>Résultat dévoilé après la séquence.</b><p>' +
        connQ().length + ' questions vous ont fait réfléchir. Gardez en tête celles qui vous ont fait hésiter : les réponses expliquées vous attendent.</p></div></div>') +
      '<p class="footnote">Rendez-vous après la séquence : scannez le QR code « Après » avec <b>ce même appareil</b>, vos réponses y sont conservées.</p>', 'resultat');
  }

  function statutQ(q, av, ap) {
    var okB = ap === q.bonne, okA = av !== undefined && av === q.bonne;
    if (!okB) return { c: 'revoir', t: 'À approfondir' };
    if (av === undefined) return { c: 'acquis', t: 'Acquis' };
    return okA ? { c: 'acquis', t: 'Déjà acquis' } : { c: 'progres', t: 'Progression' };
  }
  var texteOption = function (q, id) { var o = (q.options || []).filter(function (x) { return String(x.id) === String(id); })[0]; return o ? o.texte : '–'; };

  function resApres() {
    var av = st.avant ? st.avant.rep : null;
    var sc = U.scores(theme, st.rep), sa = av ? U.scores(theme, av) : null;
    var tot = sc.connaissances.total, ok = sc.connaissances.ok, ok0 = sa ? sa.connaissances.ok : ok, gain = ok - ok0;
    var big = '<div class="gain-big" role="group" aria-label="Bonnes réponses : ' + (sa ? ok0 + ' avant, ' : '') + ok + ' après, sur ' + tot + '">' +
      (sa ? '<span class="from">' + ok0 + '</span>' + svg(D.fleche, { s: 28, w: 1.8, c: 'arrow' }) : '') +
      '<span class="to" id="cnt" data-from="' + (sa ? ok0 : 0) + '" data-to="' + ok + '">' + (sa ? ok0 : 0) + '</span>' +
      (sa && gain > 0 ? '<span class="plus">+' + gain + '</span>' : '') + '</div>' +
      '<p class="sous">bonnes réponses sur ' + tot + (sa ? '' : ' · test « avant » non retrouvé sur cet appareil') + '</p>';

    var confA = sa ? sa.confiance : null, confB = sc.confiance;
    var confBloc = '<div class="compare">' +
      (sa ? '<div class="crow"><span class="tag">Avant</span><div class="meter"><i class="m-avant" data-w="' + Math.round((confA - 1) / 3 * 100) + '"></i></div><span class="num">' + U.f1(confA) + '</span></div>' : '') +
      '<div class="crow"><span class="tag ap">Après</span><div class="meter"><i class="m-apres" data-w="' + Math.round((confB - 1) / 3 * 100) + '"></i></div><span class="num">' + U.f1(confB) + '</span></div></div>' +
      '<p class="sous" style="margin-top:14px">Échelle de 1 à 4 · ' + (sa ? fr('avant : « ' + U.etiquette(theme, 'accord', confA) + ' », ') : '') + fr('après : « ' + U.etiquette(theme, 'accord', confB) + ' ».') + '</p>';

    var prat = '<div class="prats">' + pratiquesQ().map(function (q) {
      var a = av ? av[q.id] : null, b = st.rep[q.id];
      return '<div class="prat"><p class="l">' + esc(q.court) + '</p><div class="line">' + (a ? U.dots(a, 4, 'grey big') + svg(D.fleche, { s: 16 }) : '') +
        U.dots(b, 4, 'big') + '<span class="lab">' + esc(U.etiquette(theme, 'intention', b)) + '</span></div></div>';
    }).join('') + '</div>';

    var detail = '<div class="items">' + connQ().map(function (q) {
      var a = av ? av[q.id] : undefined, b = st.rep[q.id], s = statutQ(q, a, b), juste = String(b) === String(q.bonne);
      var qq = Q.filter(function (x) { return x.id === q.id; })[0] || q;
      return '<details class="item"><summary><span class="sum"><span class="nom">' + esc(q.court) + '</span><span class="st ' + s.c + '">' + s.t + '</span></span>' + svg(D.bas, { c: 'chev' }) + '</summary><div class="corps">' +
        (q.contexte ? '<p class="ctx">' + fr(q.contexte) + '</p>' : '') + '<p class="enonce">' + fr(q.texte) + '</p>' +
        (a !== undefined ? '<div class="rep"><i class="pt av"></i><p><b class="av">Avant :</b> ' + fr(texteOption(qq, a)) + '</p></div>' : '') +
        '<div class="rep"><i class="pt ap"></i><div><p><b class="ap">Après :</b> ' + fr(texteOption(qq, b)) + '</p>' +
          (juste ? '<span class="bonne">' + svg(D.check, { s: 14, w: 2.6 }) + 'Bonne réponse</span>' : '') + '</div></div>' +
        (juste ? '' : '<p class="bonne-ligne"><b>Bonne réponse :</b> ' + fr(texteOption(qq, q.bonne)) + '</p>') +
        '<p class="explic">' + fr(q.explication) + '</p></div></details>';
    }).join('') + '</div>';

    var eng = (st.rep.x3 || '').trim();
    return page(topBadge(theme.phases.apres.badge),
      '<section class="hero"><p class="salut">' + fr('Bravo ' + st.prenom.trim() + ' !') + '</p><h1>' + fr(theme.phases.apres.merci) + '</h1></section>' +
      sec('', '', big + '<div id="statut">' + statutHtml() + '</div>', 'gain-sec') +
      sec('Votre confiance', '', confBloc) +
      sec(fr('Vos pratiques : ' + (av ? 'aujourd’hui → je vise' : 'ce que je vise')), 'Pastilles grises : avant · pastilles indigo : ce que vous visez dans deux semaines.', prat) +
      sec('Les situations en détail', 'Touchez une situation pour voir la réponse expliquée.', detail) +
      (eng ? sec('Mon premier pas', '', '<blockquote class="engagement">«\u00a0' + esc(eng) + '\u00a0»</blockquote>') : '') +
      sec('Votre fiche personnelle', 'Une fiche A4 avec votre progression et les réponses expliquées, à conserver.',
        '<button type="button" class="btn block pdf-btn" id="pdf">' + svg(D.dl) + 'Télécharger ma fiche (PDF)</button>'), 'resultat');
  }

  /* ---------- rendu ---------- */
  function render() {
    var v = st.screen === 'accueil' ? vAccueil : (st.screen === 'question' ? vQuestion : (phase === 'avant' ? resAvant : resApres));
    app.innerHTML = v();
    window.scrollTo(0, 0);
    if (st.screen === 'accueil') {
      var go = document.getElementById('go'), pr = document.getElementById('prenom');
      go.disabled = st.prenom.trim().length < 2; pr.focus({ preventScroll: true });
    }
    if (st.screen === 'question') {
      var pct = Math.round((st.i + 1) / Q.length * 100), bar = app.querySelector('.progress i');
      requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.width = pct + '%'; lastPct = pct; }); });
      var t = document.getElementById('txt'); if (t) t.focus({ preventScroll: true });
    }
    if (st.screen === 'resultat') {
      U.remplir(app);
      var c = document.getElementById('cnt'); if (c) U.compter(c, +c.dataset.from, +c.dataset.to, 0, 1100);
    }
  }

  /* ---------- logique ---------- */
  function demarrer() {
    st.prenom = st.prenom.trim(); st.groupe = (st.groupe || '').trim();
    if (phase === 'apres') st.avant = lsGet(kAvant());
    st.screen = 'question'; st.i = 0; lastPct = 0; brouillon(); render();
  }
  function choisir(v, bouton) {
    var q = Q[st.i];
    st.rep[q.id] = q.type === 'echelle' ? Number(v) : v;
    brouillon();
    app.querySelectorAll('.opt').forEach(function (b) { var s = b === bouton; b.classList.toggle('sel', s); b.setAttribute('aria-checked', s); });
    clearTimeout(timer); timer = setTimeout(avancer, 340);
  }
  function avancer() { clearTimeout(timer); if (st.i < Q.length - 1) { st.i++; brouillon(); render(); } else finir(); }
  function finir() {
    var t = document.getElementById('txt'); if (t) st.rep[Q[st.i].id] = t.value.trim();
    st.groupe = (st.groupe || '').trim(); lsDel(kBrouillon());
    if (phase === 'avant') lsSet(kAvant(), { rep: st.rep, groupe: st.groupe, date: Date.now() }); else st.avant = lsGet(kAvant());
    st.screen = 'resultat'; st.sid = uid(); render(); envoyer();
  }

  function envoyer() {
    st.envoi = { etat: 'envoi' }; majStatut();
    var payload = { submissionId: st.sid, theme: themeId, phase: phase, groupe: st.groupe, prenom: st.prenom.trim(),
                    items: Q.map(function (q) { return { id: q.id, court: q.court }; }), reponses: st.rep };
    if (!configure) { setTimeout(function () { st.envoi = { etat: 'test' }; majStatut(); }, 600); return; }
    var url = CFG.APPS_SCRIPT_URL, body = JSON.stringify(payload), h = { 'Content-Type': 'text/plain;charset=utf-8' };
    fetch(url, { method: 'POST', headers: h, body: body }).then(function (r) {
      return r.json().then(function (j) { return j.ok ? 'confirme' : 'echec'; }, function () { return 'envoye'; });
    }, function () {
      return fetch(url, { method: 'POST', mode: 'no-cors', headers: h, body: body }).then(function () { return 'envoye'; }, function () { return 'echec'; });
    }).then(function (e) { st.envoi = { etat: e }; majStatut(); });
  }

  /* ---------- événements ---------- */
  app.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.classList.contains('opt')) return choisir(t.dataset.v, t);
    if (t.id === 'go') return demarrer();
    if (t.id === 'pdf') { var libelle = t.innerHTML; t.disabled = true; t.textContent = 'Préparation…';
      window.PDFKit.fiche({ theme: theme, prenom: st.prenom, groupe: st.groupe, questions: Q, avant: st.avant ? st.avant.rep : null, apres: st.rep })
        .then(function (doc) { doc.save('fiche-' + themeId + '-' + U.norm(st.prenom).replace(/[^a-z0-9]+/g, '-') + '.pdf'); })
        .catch(function (err) { alert('Fiche PDF indisponible : ' + err.message); })
        .then(function () { t.disabled = false; t.innerHTML = libelle; });
      return; }
    var a = t.dataset.act;
    if (a === 'retour') { clearTimeout(timer); st.i = Math.max(0, st.i - 1); render(); }
    if (a === 'suivant') avancer();
    if (a === 'fin') finir();
    if (a === 'renvoyer') envoyer();
  });
  app.addEventListener('input', function (e) {
    if (e.target.id === 'prenom') { st.prenom = e.target.value; document.getElementById('go').disabled = st.prenom.trim().length < 2; }
    if (e.target.id === 'groupe') st.groupe = e.target.value;
    if (e.target.id === 'txt') { st.rep[Q[st.i].id] = e.target.value; brouillon(); }
  });
  app.addEventListener('keydown', function (e) {
    if (e.target.id === 'prenom' && e.key === 'Enter' && st.prenom.trim().length >= 2) demarrer();
  });
  document.addEventListener('keydown', function (e) {
    if (st.screen !== 'question' || /TEXTAREA|INPUT/.test((e.target.tagName || ''))) return;
    var q = Q[st.i], opts = app.querySelectorAll('.opt'), k = -1;
    if (/^[1-9]$/.test(e.key)) k = +e.key - 1; else if (/^[a-dA-D]$/.test(e.key) && q.type === 'qcm') k = e.key.toLowerCase().charCodeAt(0) - 97;
    if (k >= 0 && opts[k]) choisir(opts[k].dataset.v, opts[k]);
    else if (e.key === 'Enter' && st.rep[q.id] !== undefined && q.type !== 'texte') avancer();
  });

  /* ---------- démarrage ---------- */
  U.loadTheme(themeId).then(function (t) {
    theme = t; Q = U.questions(theme, phase);
    document.title = theme.titre + ' · ' + (phase === 'apres' ? 'après' : 'avant');
    var d = lsGet(kBrouillon());
    if (d && d.prenom && d.rep && Object.keys(d.rep).length) {             // reprise après un rechargement
      st.prenom = d.prenom; st.groupe = groupeUrl || d.groupe || ''; st.rep = d.rep; st.i = Math.min(d.i || 0, Q.length - 1);
      if (phase === 'apres') st.avant = lsGet(kAvant());
      st.screen = 'question'; lastPct = Math.round(st.i / Q.length * 100);
    }
    render();
  }).catch(function (e) { app.innerHTML = '<div class="page"><main class="stage"><section class="sec"><h2>Oups</h2><p class="muted">' + esc(e.message) + '</p></section></main></div>'; });
})();
