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

  /* ---------- stockage local (sur l'appareil du stagiaire) ---------- */
  var kAvant = function () { return 'av:' + themeId + ':' + U.norm(st.prenom); };
  var kBrouillon = function () { return 'dr:' + themeId + ':' + phase; };
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function brouillon() { lsSet(kBrouillon(), { prenom: st.prenom, groupe: st.groupe, i: st.i, rep: st.rep }); }
  var uid = function () { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 's' + Date.now() + Math.random().toString(16).slice(2); };

  /* ---------- gabarits ---------- */
  var band = function (inner) { return '<header class="topband"><div class="topband-in">' + inner + '</div></header>'; };

  function vAccueil() {
    var ph = theme.phases[phase];
    return band('<div class="topline"><span class="badge">' + esc(ph.badge) + '</span></div>') +
      '<main class="stage"><section class="card enter">' +
      (configure ? '' : '<div class="banner test"><b>Mode test.</b> Le script Google n’est pas configuré : vous pouvez tout essayer, mais rien n’est envoyé.</div>') +
      '<p class="eyebrow">' + esc(theme.titre) + '</p>' +
      '<h1 style="margin-top:8px">' + esc(ph.titre) + '</h1><p class="lead">' + esc(ph.texte) + '</p>' +
      '<div class="chips"><span class="chip">⏱ ' + esc(theme.duree) + '</span><span class="chip">' + Q.length + ' questions</span><span class="chip">Sans note ni classement</span></div>' +
      '<label class="field" for="prenom">Votre prénom</label>' +
      '<input type="text" id="prenom" maxlength="40" autocomplete="given-name" placeholder="Par exemple : Camille" value="' + esc(st.prenom) + '">' +
      (groupeUrl ? '<p class="hint">Groupe : <b>' + esc(groupeUrl) + '</b></p>'
                 : '<label class="field" for="groupe">Groupe (facultatif)</label><input type="text" id="groupe" maxlength="40" value="' + esc(st.groupe) + '">') +
      '<button class="btn block" id="go" style="margin-top:26px" disabled>Commencer</button>' +
      '<p class="hint centre">Vos réponses individuelles restent entre vous et le formateur.</p>' +
      '</section></main>';
  }

  function vQuestion() {
    var q = Q[st.i], n = Q.length, val = st.rep[q.id], corps;
    if (q.type === 'texte') {
      corps = '<textarea id="txt" maxlength="300" placeholder="' + esc(q.placeholder) + '">' + esc(val || '') + '</textarea>';
    } else {
      corps = '<div class="opts" role="radiogroup" aria-label="Réponses">' + q.options.map(function (o, k) {
        var sel = String(val) === String(o.id);
        var lead = q.type === 'echelle' ? U.dots(k + 1, 4)
          : '<span class="lt">' + (q.type === 'vraifaux' ? ['✓', '✕', '?'][k] : String.fromCharCode(65 + k)) + '</span>';
        return '<button type="button" class="opt' + (sel ? ' sel' : '') + '" role="radio" aria-checked="' + sel + '" data-v="' + esc(o.id) + '">' +
          lead + '<span>' + esc(o.texte) + '</span></button>';
      }).join('') + '</div>';
    }
    var suivant = '';
    if (q.type === 'texte') suivant = '<button class="btn" data-act="fin">Terminer</button>';
    else if (val !== undefined) suivant = '<button class="link" data-act="suivant">Suivant →</button>';
    return band('<div class="topline"><span class="badge">' + esc(q.blocTitre) + '</span><span class="count">' + (st.i + 1) + ' / ' + n + '</span></div>' +
        '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + st.i + '"><i style="width:' + lastPct + '%"></i></div>') +
      '<main class="stage"><section class="card enter" id="carte">' +
      (q.blocIntro ? '<p class="bloc-intro">' + esc(q.blocIntro) + '</p>' : '') +
      (q.contexte ? '<blockquote class="contexte">' + esc(q.contexte) + '</blockquote>' : '') +
      '<h2 class="q">' + esc(q.texte) + '</h2>' + corps +
      '<div class="nav"><span>' + (st.i > 0 ? '<button class="link" data-act="retour">← Retour</button>' : '') + '</span>' + suivant + '</div>' +
      '</section></main>';
  }

  /* ---------- résultats ---------- */
  var scalesLabel = function (q, v) { return U.etiquette(theme, q.echelleApres && phase === 'apres' ? q.echelleApres : q.echelle, v); };
  function statutHtml() {
    var e = st.envoi.etat;
    if (e === 'test') return '<span class="statut">Mode test · réponses non envoyées</span>';
    if (e === 'envoi' || e === 'idle') return '<span class="statut">Envoi en cours…</span>';
    if (e === 'echec') return '<span class="statut err">Non transmis · <button data-act="renvoyer">Réessayer</button></span>';
    return '<span class="statut ok">✓ Réponses transmises</span>';
  }
  function majStatut() { var s = document.getElementById('statut'); if (s) s.innerHTML = statutHtml(); }

  var pratiquesQ = function () { return theme.questions.filter(function (q) { return q.dim === 'pratiques'; }); };
  var connQ = function () { return theme.questions.filter(function (q) { return q.dim === 'connaissances'; }); };

  function resAvant() {
    var sc = U.scores(theme, st.rep), pq = pratiquesQ(), conf = sc.confiance;
    var max = pq.reduce(function (a, q) { return st.rep[q.id] > st.rep[a.id] ? q : a; }, pq[0]);
    var min = pq.reduce(function (a, q) { return st.rep[q.id] < st.rep[a.id] ? q : a; }, pq[0]);
    var rows = pq.map(function (q) {
      return '<div class="rowd"><span class="lbl">' + esc(q.court) + '</span><span class="val">' + U.dots(st.rep[q.id], 4, 'big') + '<br>' + esc(scalesLabel(q, st.rep[q.id])) + '</span></div>';
    }).join('');
    var insights = (st.rep[max.id] !== st.rep[min.id]) ?
      '<div class="insights"><div class="insight fort"><b>Votre habitude la plus ancrée</b>' + esc(max.court) + '</div>' +
      '<div class="insight piste"><b>Votre terrain d’exploration</b>' + esc(min.court) + '</div></div>' : '';
    return band('<div class="topline"><span class="badge">' + esc(theme.phases.avant.badge) + '</span></div>') +
      '<main class="stage">' +
      '<section class="hero-res card enter"><p class="eyebrow">Merci ' + esc(st.prenom.trim()) + ' !</p><h1 style="margin-top:6px">' + esc(theme.phases.avant.merci) + '</h1>' +
      '<p class="lead">Une photo de départ, sans jugement : elle sert de repère pour mesurer ce qui va bouger.</p><div id="statut">' + statutHtml() + '</div></section>' +
      '<section class="card enter"><h2 class="titre-carte"><span class="pastille">🧭</span>Vos pratiques aujourd’hui</h2><p class="muted small">Ce que vous faites déjà, à votre rythme.</p>' + rows + insights + '</section>' +
      '<section class="card enter"><h2 class="titre-carte"><span class="pastille">💪</span>Votre confiance</h2>' +
      '<div class="compare"><div class="crow"><span class="tag">Départ</span><div class="meter"><i class="m-apres" data-w="' + Math.round((conf - 1) / 3 * 100) + '"></i></div><span class="num">' + U.f1(conf) + ' / 4</span></div></div>' +
      '<p class="muted small" style="margin-top:10px">En moyenne : « ' + esc(U.etiquette(theme, 'accord', conf)) + ' ».</p></section>' +
      '<section class="card enter"><h2 class="titre-carte"><span class="pastille">🔒</span>Vos connaissances</h2>' +
      '<div class="locked"><span class="cadenas">🔐</span><div><b>Résultat dévoilé après la séquence.</b><p class="muted small" style="margin-top:4px">' +
      connQ().length + ' questions vous ont fait réfléchir. Gardez en tête celles qui vous ont fait hésiter : les réponses expliquées vous attendent.</p></div></div></section>' +
      '<p class="footnote">Rendez-vous après la séquence : scannez le QR code « Après » avec <b>ce même appareil</b>, vos réponses y sont conservées.</p>' +
      '</main>';
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
    var big = '<div class="big-gain">' + (sa ? '<span class="from">' + ok0 + '</span><span class="arrow">→</span>' : '') +
      '<span class="to" id="cnt" data-from="' + (sa ? ok0 : 0) + '" data-to="' + ok + '">' + (sa ? ok0 : 0) + '</span>' +
      (sa && gain > 0 ? '<span class="plus">+' + gain + '</span>' : '') + '</div>' +
      '<p class="muted small centre">bonnes réponses sur ' + tot + (sa ? '' : ' · test « avant » non retrouvé sur cet appareil') + '</p>';

    var confA = sa ? sa.confiance : null, confB = sc.confiance;
    var confBloc = '<div class="compare">' +
      (sa ? '<div class="crow"><span class="tag">Avant</span><div class="meter"><i class="m-avant" data-w="' + Math.round((confA - 1) / 3 * 100) + '"></i></div><span class="num">' + U.f1(confA) + '</span></div>' : '') +
      '<div class="crow"><span class="tag">Après</span><div class="meter"><i class="m-apres" data-w="' + Math.round((confB - 1) / 3 * 100) + '"></i></div><span class="num">' + U.f1(confB) + '</span></div></div>' +
      '<p class="muted small" style="margin-top:10px">Échelle de 1 à 4 · ' + (sa ? 'avant : « ' + esc(U.etiquette(theme, 'accord', confA)) + ' », ' : '') + 'après : « ' + esc(U.etiquette(theme, 'accord', confB)) + ' ».</p>';

    var prat = pratiquesQ().map(function (q) {
      var a = av ? av[q.id] : null, b = st.rep[q.id];
      return '<div class="rowd"><span class="lbl">' + esc(q.court) + '</span><span class="val">' + (a ? U.dots(a, 4, 'grey big') + ' → ' : '') + U.dots(b, 4, 'big') + '<br>' + esc(U.etiquette(theme, 'intention', b)) + '</span></div>';
    }).join('');

    var detail = connQ().map(function (q) {
      var a = av ? av[q.id] : undefined, b = st.rep[q.id], s = statutQ(q, a, b);
      var qq = Q.filter(function (x) { return x.id === q.id; })[0] || q;
      return '<details class="item"><summary><span>' + esc(q.court) + '</span><span class="st ' + s.c + '">' + s.t + '</span></summary><div class="corps">' +
        (q.contexte ? '<p class="muted">' + esc(q.contexte) + '</p>' : '') + '<p><b>' + esc(q.texte) + '</b></p>' +
        (a !== undefined ? '<p>Avant : ' + esc(texteOption(qq, a)) + '</p>' : '') + '<p>Après : ' + esc(texteOption(qq, b)) + '</p>' +
        '<div class="bonne"><b>Bonne réponse :</b> ' + esc(texteOption(qq, q.bonne)) + '<p>' + esc(q.explication) + '</p></div></div></details>';
    }).join('');

    var eng = (st.rep.x3 || '').trim();
    return band('<div class="topline"><span class="badge">' + esc(theme.phases.apres.badge) + '</span></div>') +
      '<main class="stage">' +
      '<section class="hero-res card enter"><p class="eyebrow">Bravo ' + esc(st.prenom.trim()) + ' !</p><h1 style="margin-top:6px">' + esc(theme.phases.apres.merci) + '</h1>' +
      big + '<div id="statut">' + statutHtml() + '</div></section>' +
      '<section class="card enter"><h2 class="titre-carte"><span class="pastille">💪</span>Votre confiance</h2>' + confBloc + '</section>' +
      '<section class="card enter"><h2 class="titre-carte"><span class="pastille">🧭</span>Vos pratiques : ' + (av ? 'aujourd’hui → je vise' : 'ce que je vise') + '</h2>' +
      '<p class="muted small">Points gris : avant · points violets : ce que vous visez dans deux semaines.</p>' + prat + '</section>' +
      '<section class="card enter"><h2 class="titre-carte"><span class="pastille">💡</span>Les situations en détail</h2><p class="muted small">Touchez une situation pour voir la réponse expliquée.</p>' + detail + '</section>' +
      (eng ? '<section class="card enter"><h2 class="titre-carte"><span class="pastille">🎯</span>Mon premier pas</h2><div class="engagement">« ' + esc(eng) + ' »</div></section>' : '') +
      '<section class="card enter centre"><h2>Votre fiche personnelle</h2><p class="muted small" style="margin:6px 0 18px">Une fiche A4 avec votre progression et les réponses expliquées, à conserver.</p>' +
      '<button class="btn" id="pdf">⬇ Télécharger ma fiche (PDF)</button></section>' +
      '</main>';
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
    if (t.id === 'pdf') { t.disabled = true; t.textContent = 'Préparation…';
      window.PDFKit.fiche({ theme: theme, prenom: st.prenom, groupe: st.groupe, questions: Q, avant: st.avant ? st.avant.rep : null, apres: st.rep })
        .then(function (doc) { doc.save('fiche-' + themeId + '-' + U.norm(st.prenom).replace(/[^a-z0-9]+/g, '-') + '.pdf'); })
        .catch(function (err) { alert('Fiche PDF indisponible : ' + err.message); })
        .then(function () { t.disabled = false; t.textContent = '⬇ Télécharger ma fiche (PDF)'; });
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
  }).catch(function (e) { app.innerHTML = '<main class="stage" style="margin-top:40px"><section class="card"><h2>Oups</h2><p class="muted">' + esc(e.message) + '</p></section></main>'; });
})();
