/* Génération des PDF (fiche individuelle, synthèse de groupe) avec jsPDF, chargé à la demande */
(function (w) {
  'use strict';
  var K = {};
  var C = { brand: [79, 70, 229], violet: [124, 58, 237], ink: [20, 27, 52], muted: [100, 109, 140], line: [227, 231, 243],
            good: [14, 159, 110], goodSoft: [222, 247, 236], goodInk: [6, 95, 70], warn: [217, 119, 6], warnSoft: [254, 243, 199], warnInk: [146, 64, 14],
            grey: [148, 163, 184], soft: [247, 248, 253], info: [224, 231, 255] };
  var W = 210, H = 297, M = 16;

  /* La police standard du PDF ne contient pas tous les caractères typographiques */
  var T = function (s) {
    return String(s == null ? '' : s).replace(/«[\s\u00a0\u202f]*/g, '"').replace(/[\s\u00a0\u202f]*»/g, '"').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
      .replace(/œ/g, 'oe').replace(/Œ/g, 'Oe').replace(/→/g, '>').replace(/[\u00a0\u202f]/g, ' ').replace(/[✓✕]/g, '');
  };
  var f1 = function (x) { return x == null ? '-' : (Math.round(x * 10) / 10).toFixed(1).replace('.', ','); };
  var pret = function () { return w.jspdf ? Promise.resolve() : w.U.loadScript('assets/jspdf.umd.min.js'); };

  function outils(doc) {
    var o = {};
    o.txt = function (s, x, y, p) {
      p = p || {}; doc.setFont('helvetica', p.bold ? 'bold' : (p.italic ? 'italic' : 'normal')); doc.setFontSize(p.size || 10);
      doc.setTextColor.apply(doc, p.color || C.ink);
      doc.text(T(s), x, y, { align: p.align || 'left', maxWidth: p.max });
    };
    o.rect = function (x, y, w2, h, col, r) { doc.setFillColor.apply(doc, col); if (r) doc.roundedRect(x, y, w2, h, r, r, 'F'); else doc.rect(x, y, w2, h, 'F'); };
    o.dots = function (x, y, v, col) {
      for (var i = 1; i <= 4; i++) { doc.setFillColor.apply(doc, i <= Math.round(v || 0) ? col : C.line); doc.circle(x + (i - 1) * 5, y, 1.5, 'F'); }
    };
    o.bar = function (x, y, w2, h, pct, col) {
      o.rect(x, y, w2, h, C.line, h / 2); if (pct > 0) o.rect(x, y, Math.max(h, w2 * Math.min(1, pct)), h, col, h / 2);
    };
    o.pill = function (x, y, label, bg, fg) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      var wd = doc.getTextWidth(T(label)) + 6; o.rect(x, y - 3.6, wd, 5.4, bg, 2.7); o.txt(label, x + 3, y + 0.2, { size: 7.5, bold: true, color: fg }); return wd;
    };
    o.entete = function (sur, titre, sous) {
      o.rect(0, 0, W, 46, C.brand);
      try { doc.setGState(new doc.GState({ opacity: 0.12 })); o.rect(130, -30, 120, 120, C.violet, 60); doc.setGState(new doc.GState({ opacity: 1 })); } catch (e) {}
      o.txt(sur, M, 16, { size: 8.5, bold: true, color: [199, 210, 254] });
      o.txt(titre, M, 28, { size: 20, bold: true, color: [255, 255, 255], max: W - 2 * M });
      o.txt(sous, M, 38.5, { size: 10, color: [224, 231, 255] });
    };
    o.section = function (titre, y) {
      o.txt(titre, M, y, { size: 12, bold: true }); o.rect(M, y + 2.2, 14, 1, C.brand, 0.5); return y + 9;
    };
    o.pieds = function (texte) {
      var n = doc.getNumberOfPages();
      for (var p = 1; p <= n; p++) {
        doc.setPage(p); doc.setDrawColor.apply(doc, C.line); doc.setLineWidth(0.3); doc.line(M, H - 14, W - M, H - 14);
        o.txt(texte, M, H - 9, { size: 7.5, color: C.muted }); o.txt('Page ' + p + ' / ' + n, W - M, H - 9, { size: 7.5, color: C.muted, align: 'right' });
      }
    };
    return o;
  }
  var opt = function (q, id) { var o = (q.options || []).filter(function (x) { return String(x.id) === String(id); })[0]; return o ? o.texte : '-'; };

  /* ===================== Fiche individuelle ===================== */
  K.fiche = function (d) { return pret().then(function () { return fiche(d); }); };

  function fiche(d) {
    var doc = new w.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), o = outils(doc), U = w.U;
    var theme = d.theme, av = d.avant, ap = d.apres, sa = av ? U.scores(theme, av) : null, sb = U.scores(theme, ap);
    var conn = theme.questions.filter(function (q) { return q.dim === 'connaissances'; });
    var prat = theme.questions.filter(function (q) { return q.dim === 'pratiques'; });
    var meta = d.prenom + (d.groupe ? '  ·  Groupe : ' + d.groupe : '') + '  ·  ' + U.date();
    o.entete('FICHE PERSONNELLE  ·  AVANT / APRÈS', theme.titre, meta);

    var y = 60;
    y = o.section('Votre progression', y);
    var cw = (W - 2 * M - 8) / 3, cartes = [
      { k: 'CONNAISSANCES', v: sb.connaissances.ok + ' / ' + sb.connaissances.total, a: sa ? 'Avant : ' + sa.connaissances.ok + ' / ' + sa.connaissances.total : '', g: sa ? sb.connaissances.ok - sa.connaissances.ok : null },
      { k: 'CONFIANCE', v: f1(sb.confiance) + ' / 4', a: sa ? 'Avant : ' + f1(sa.confiance) + ' / 4' : '', g: sa ? Math.round((sb.confiance - sa.confiance) * 10) / 10 : null },
      { k: 'PRATIQUES VISÉES', v: f1(sb.pratiques) + ' / 4', a: sa ? 'Aujourd\'hui : ' + f1(sa.pratiques) + ' / 4' : '', g: null }
    ];
    cartes.forEach(function (c, i) {
      var x = M + i * (cw + 4); o.rect(x, y, cw, 30, C.soft, 4);
      o.txt(c.k, x + 5, y + 7, { size: 7, bold: true, color: C.muted });
      o.txt(c.v, x + 5, y + 18, { size: 18, bold: true, color: C.brand });
      if (c.a) o.txt(c.a, x + 5, y + 25, { size: 8, color: C.muted });
      if (c.g !== null && c.g > 0) o.pill(x + cw - 17, y + 7, '+' + String(c.g).replace('.', ','), C.goodSoft, C.goodInk);
    });
    y += 42;

    y = o.section(av ? 'Vos pratiques : aujourd\'hui et ce que vous visez' : 'Ce que vous visez dans deux semaines', y);
    if (av) { doc.setFillColor.apply(doc, C.grey); doc.circle(M + 99, y - 1, 1.5, 'F'); o.txt('aujourd\'hui', M + 102.5, y, { size: 7.5, color: C.muted });
      doc.setFillColor.apply(doc, C.brand); doc.circle(M + 133, y - 1, 1.5, 'F'); o.txt('je vise', M + 136.5, y, { size: 7.5, color: C.muted }); y += 7; }
    prat.forEach(function (q) {
      o.txt(q.court, M, y + 1, { size: 9.5, bold: true });
      if (av) o.dots(M + 98, y, av[q.id], C.grey);
      o.dots(M + 132, y, ap[q.id], C.brand);
      o.txt(U.etiquette(theme, 'intention', ap[q.id]), W - M, y + 1, { size: 8, color: C.muted, align: 'right' });
      y += 9;
    });
    y += 6;

    y = o.section('Les situations en détail', y);
    o.txt('Situation', M, y, { size: 7.5, bold: true, color: C.muted }); if (av) o.txt('AVANT', M + 92, y, { size: 7.5, bold: true, color: C.muted });
    o.txt('APRÈS', M + 120, y, { size: 7.5, bold: true, color: C.muted }); y += 3;
    conn.forEach(function (q) {
      var a = av ? av[q.id] === q.bonne : null, b = ap[q.id] === q.bonne;
      doc.setDrawColor.apply(doc, C.line); doc.setLineWidth(0.2); doc.line(M, y, W - M, y);
      o.txt(q.court, M, y + 6, { size: 9.5 });
      if (av) o.pill(M + 92, y + 5.5, a ? 'Juste' : 'À approfondir', a ? C.goodSoft : C.warnSoft, a ? C.goodInk : C.warnInk);
      o.pill(M + 120, y + 5.5, b ? 'Juste' : 'À approfondir', b ? C.goodSoft : C.warnSoft, b ? C.goodInk : C.warnInk);
      if (av && !a && b) o.pill(W - M - 22, y + 5.5, 'Progression', C.info, [55, 48, 163]);
      y += 9;
    });

    /* Page 2 : réponses expliquées + engagement */
    doc.addPage(); y = 24; y = o.section('Les réponses expliquées', y);
    var Q = d.questions;
    conn.forEach(function (q) {
      var qq = Q.filter(function (x) { return x.id === q.id; })[0] || q;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      var lignesExp = doc.splitTextToSize(T(q.explication), W - 2 * M - 10);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);                    // mesure avec la police réellement utilisée
      var bonne = doc.splitTextToSize('Bonne réponse : ' + T(opt(qq, q.bonne)), W - 2 * M - 10);
      var hBloc = 9 + bonne.length * 4.3 + lignesExp.length * 4.1 + 8;
      if (y + hBloc > H - 22) { doc.addPage(); y = 24; }
      o.rect(M, y, W - 2 * M, hBloc - 3, C.soft, 3);
      o.txt(q.court, M + 4, y + 6.5, { size: 10, bold: true });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, C.goodInk); doc.text(bonne, M + 4, y + 12.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, C.ink); doc.text(lignesExp, M + 4, y + 13.5 + bonne.length * 4.3);
      y += hBloc;
    });
    var eng = (ap.x3 || '').trim();
    if (eng) {
      var l = doc.splitTextToSize('"' + T(eng) + '"', W - 2 * M - 12), hh = 14 + l.length * 5;
      if (y + hh > H - 22) { doc.addPage(); y = 24; }
      y += 4; y = o.section('Mon premier pas concret', y); o.rect(M, y - 3, W - 2 * M, hh - 6, C.info, 3);
      doc.setFont('helvetica', 'italic'); doc.setFontSize(10.5); doc.setTextColor(55, 48, 163); doc.text(l, M + 6, y + 4);
    }
    o.pieds('Fiche générée le ' + U.date() + '  -  ' + theme.titre + '  -  ' + d.prenom);
    return doc;
  }

  /* ===================== Synthèse de groupe (traçabilité) ===================== */
  K.synthese = function (a) { return pret().then(function () { return synthese(a); }); };

  function synthese(a) {
    var doc = new w.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), o = outils(doc), U = w.U;
    o.entete('SYNTHÈSE DE GROUPE  ·  TRAÇABILITÉ DES RÉSULTATS', a.titre, (a.groupe ? 'Groupe : ' + a.groupe + '  ·  ' : '') + U.date());
    var y = 60, cw = (W - 2 * M - 12) / 4;
    y = o.section('En un coup d\'oeil', y);
    var k = [
      { k: 'PARTICIPANTS AVANT', v: String(a.nAvant) },
      { k: 'PARTICIPANTS APRÈS', v: String(a.nApres) },
      { k: 'CONNAISSANCES MOY.', v: a.kAvant == null ? f1(a.kApres) : f1(a.kAvant) + ' > ' + f1(a.kApres), s: 'sur ' + a.total },
      { k: 'CONFIANCE MOY.', v: a.cAvant == null ? f1(a.cApres) : f1(a.cAvant) + ' > ' + f1(a.cApres), s: 'sur 4' }
    ];
    k.forEach(function (c, i) {
      var x = M + i * (cw + 4); o.rect(x, y, cw, 27, C.soft, 4);
      o.txt(c.k, x + 4, y + 7, { size: 6.8, bold: true, color: C.muted });
      o.txt(c.v, x + 4, y + 17, { size: i < 2 ? 18 : 13, bold: true, color: C.brand });
      if (c.s) o.txt(c.s, x + 4, y + 23, { size: 7.5, color: C.muted });
    });
    y += 38;

    y = o.section('Bonnes réponses par situation (% du groupe)', y);
    o.rect(M, y - 2.5, 3, 3, C.grey, 0.8); o.txt('Avant', M + 5, y, { size: 7.5, color: C.muted }); o.rect(M + 22, y - 2.5, 3, 3, C.brand, 0.8); o.txt('Après', M + 27, y, { size: 7.5, color: C.muted }); y += 5;
    a.parQ.forEach(function (q) {
      o.txt(q.court, M, y + 3, { size: 9, bold: true });
      o.bar(M + 62, y, 78, 3.2, q.pctAvant == null ? 0 : q.pctAvant / 100, C.grey); o.txt(q.pctAvant == null ? '-' : Math.round(q.pctAvant) + ' %', W - M, y + 2.8, { size: 8, color: C.muted, align: 'right' });
      o.bar(M + 62, y + 4.6, 78, 3.2, q.pctApres == null ? 0 : q.pctApres / 100, C.brand); o.txt(q.pctApres == null ? '-' : Math.round(q.pctApres) + ' %', W - M, y + 7.4, { size: 8, bold: true, color: C.brand, align: 'right' });
      y += 12;
    });
    y += 4;
    y = o.section('Pratiques : situation de départ et intention (moyenne sur 4)', y);
    a.prat.forEach(function (q) {
      o.txt(q.court, M, y + 3, { size: 9, bold: true });
      o.bar(M + 62, y, 78, 3.2, q.avant == null ? 0 : (q.avant - 1) / 3, C.grey); o.txt(f1(q.avant), W - M, y + 2.8, { size: 8, color: C.muted, align: 'right' });
      o.bar(M + 62, y + 4.6, 78, 3.2, q.apres == null ? 0 : (q.apres - 1) / 3, C.brand); o.txt(f1(q.apres), W - M, y + 7.4, { size: 8, bold: true, color: C.brand, align: 'right' });
      y += 12;
    });

    /* Participants */
    doc.addPage(); y = 24; y = o.section('Détail par participant', y);
    var cols = [[M, 'Prénom', 'left'], [M + 62, 'Connaissances avant', 'center'], [M + 96, 'après', 'center'], [M + 118, 'Gain', 'center'], [M + 142, 'Confiance avant', 'center'], [W - M, 'après', 'right']];
    var entete = function () {
      o.rect(M, y - 4.5, W - 2 * M, 7, C.soft, 2);
      cols.forEach(function (c) { o.txt(c[1], c[2] === 'center' ? c[0] + 8 : c[0] + (c[2] === 'left' ? 2 : 0), y, { size: 7, bold: true, color: C.muted, align: c[2] === 'right' ? 'right' : (c[2] === 'center' ? 'center' : 'left') }); });
      y += 7;
    };
    entete();
    a.participants.forEach(function (p) {
      if (y > H - 24) { doc.addPage(); y = 24; entete(); }
      doc.setDrawColor.apply(doc, C.line); doc.setLineWidth(0.2); doc.line(M, y + 2.5, W - M, y + 2.5);
      o.txt(p.prenom, M + 2, y, { size: 9.5, bold: true });
      o.txt(p.kA == null ? '-' : p.kA + ' / ' + a.total, M + 70, y, { size: 9, align: 'center', color: C.muted });
      o.txt(p.kB == null ? '-' : p.kB + ' / ' + a.total, M + 104, y, { size: 9, align: 'center', bold: true, color: C.brand });
      if (p.kA != null && p.kB != null) { var g = p.kB - p.kA; o.pill(M + 121, y, (g > 0 ? '+' : '') + g, g > 0 ? C.goodSoft : C.soft, g > 0 ? C.goodInk : C.muted); }
      o.txt(p.cA == null ? '-' : f1(p.cA), M + 150, y, { size: 9, align: 'center', color: C.muted });
      o.txt(p.cB == null ? '-' : f1(p.cB), W - M, y, { size: 9, align: 'right', bold: true, color: C.brand });
      y += 8;
    });
    if (a.engagements && a.engagements.length) {
      y += 6; if (y > H - 50) { doc.addPage(); y = 24; }
      y = o.section('Engagements exprimés', y);
      a.engagements.forEach(function (e) {
        var l = doc.splitTextToSize('"' + T(e.texte) + '"', W - 2 * M - 10);
        if (y + l.length * 4.6 + 10 > H - 22) { doc.addPage(); y = 24; }
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(55, 48, 163); doc.text(l, M + 3, y);
        o.txt('- ' + e.prenom, M + 3, y + l.length * 4.6, { size: 7.5, color: C.muted });
        y += l.length * 4.6 + 8;
      });
    }
    o.pieds('Synthèse générée le ' + U.date() + '  -  ' + a.titre + '  -  document confidentiel');
    return doc;
  }

  w.PDFKit = K;
})(typeof window !== 'undefined' ? window : global);
