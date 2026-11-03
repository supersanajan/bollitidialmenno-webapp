/* Bolliti Almenno – web app. Tutte le statistiche sono calcolate da window.BOLLITI. */
(function () {
  'use strict';
  var DB = window.BOLLITI;
  var app = document.getElementById('app');
  var LOGO = (document.getElementById('logo-src') || {}).src || '';

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function f1(n) { return n.toFixed(1).replace('.', ','); }
  function signed(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }
  var MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  var MESI_L = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var GG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  function pd(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function dShort(s) { var d = pd(s); return GG[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()]; }
  function dLong(s) { var d = pd(s); return d.getDate() + ' ' + MESI_L[d.getMonth()]; }
  function today() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  var P = {};
  DB.players.forEach(function (p) { P[p.id] = p; });
  (DB.staff || []).forEach(function (p) { if (!P[p.id]) P[p.id] = p; });
  function nick(id) { return (P[id] && P[id].nickname) || id; }
  function short(name) { return (DB.meta.short && DB.meta.short[name]) || name; }
  function periodName(i) { return i < 4 ? 'Q' + (i + 1) : 'S'; }
  function role_or_out(p) { return p.out || p.role === 'aiuto'; }
  // in pubblico si mostrano solo capitano, vicecapitano e aiuto allenatore (lo sceriffo vive nei banchetti)
  var ROLE = { capitano: 'Capitano', vice: 'Vicecapitano', aiuto: 'Aiuto allenatore' };

  var ICON = {
    ig: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>',
    back: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    arrow: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    out: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px"><path d="M7 17L17 7M9 7h8v8"/></svg>',
    beer: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M15 8h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M9 8v8M12 8v8"/></svg>',
    star: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z"/></svg>',
    clip: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5"/></svg>'
  };

  /* ---------- statistiche ---------- */
  var S = (function () {
    var G = DB.games.slice().sort(function (a, b) { return a.round - b.round; });
    var ps = {};
    DB.players.forEach(function (p) { ps[p.id] = { id: p.id, gp: 0, pts: 0, p2: 0, p3: 0, ft: 0, pf: 0, best: 0, log: [], ftA: 0, fta: 0, ftG: [] }; });
    G.forEach(function (g) {
      g.stats.forEach(function (s) {
        var r = ps[s.p];
        if (!r || s.dnp) return;
        r.gp++; r.pts += s.pts; r.p2 += s.p2; r.p3 += s.p3; r.ft += s.ft; r.pf += s.pf;
        r.best = Math.max(r.best, s.pts);
        r.log.push({ g: g, s: s });
        var a = g.app && g.app.players ? g.app.players.filter(function (x) { return x.p === s.p; })[0] : null;
        if (a && typeof a.fta === 'number') { r.ftA += s.ft; r.fta += a.fta; r.ftG.push(g); }
      });
    });
    var appN = G.filter(function (g) { return g.app && g.app.players && g.app.players.length; }).length;
    Object.keys(ps).forEach(function (k) { ps[k].ppg = ps[k].gp ? ps[k].pts / ps[k].gp : 0; });
    var n = G.length, W = G.filter(function (g) { return g.result === 'W'; }).length;
    var q = [0, 1, 2, 3].map(function (i) {
      return { f: sum(G.map(function (g) { return g.quarters.bolliti[i] || 0; })), a: sum(G.map(function (g) { return g.quarters.opponent[i] || 0; })) };
    });
    function side(h) {
      var x = G.filter(function (g) { return g.home === h; });
      return { w: x.filter(function (g) { return g.result === 'W'; }).length, l: x.filter(function (g) { return g.result === 'L'; }).length,
        f: sum(x.map(function (g) { return g.score.bolliti; })), a: sum(x.map(function (g) { return g.score.opponent; })) };
    }
    var maxLead = { v: -999 };
    G.forEach(function (g) {
      var b = 0, o = 0;
      g.quarters.bolliti.forEach(function (x, i) {
        b += x; o += g.quarters.opponent[i];
        if (b - o > maxLead.v) maxLead = { v: b - o, g: g, i: i, b: b, o: o };
      });
    });
    function topOf(key) {
      var best = { v: 0, list: [] };
      G.forEach(function (g) { g.stats.forEach(function (s) {
        if (s[key] > best.v) best = { v: s[key], list: [{ p: s.p, g: g }] };
        else if (s[key] === best.v && s[key] > 0) best.list.push({ p: s.p, g: g });
      }); });
      return best;
    }
    var topTeam = G.reduce(function (m, g) { return !m || g.score.bolliti > m.score.bolliti ? g : m; }, null);
    var ot = G.filter(function (g) { return g.quarters.bolliti.length > 4; });
    return { appN: appN,
      G: G, ps: ps, n: n, W: W, L: n - W,
      pf: sum(G.map(function (g) { return g.score.bolliti; })), pa: sum(G.map(function (g) { return g.score.opponent; })),
      q: q, ot: ot, home: side(true), away: side(false),
      p3: sum(G.map(function (g) { return sum(g.stats.map(function (s) { return s.p3; })); })),
      ftm: sum(G.map(function (g) { return sum(g.stats.map(function (s) { return s.ft; })); })),
      maxLead: maxLead, bestPts: topOf('pts'), bestFt: topOf('ft'), topTeam: topTeam
    };
  })();

  function ranked(key, min) {
    return Object.keys(S.ps).map(function (k) { return S.ps[k]; })
      .filter(function (r) { return r.gp >= (min || 1) && r[key] > 0; })
      .sort(function (a, b) { return b[key] - a[key] || b.pts - a.pts; });
  }
  function nextGame() {
    var played = {}; S.G.forEach(function (g) { played[g.round] = true; });
    var t = today();
    for (var i = 0; i < DB.schedule.length; i++) {
      var s = DB.schedule[i];
      if (!played[s.round] && pd(s.date) >= t) return s;
    }
    return null;
  }
  function whenLabel(s) {
    var diff = Math.round((pd(s.date) - today()) / 864e5);
    if (diff === 0) return 'OGGI · ' + s.time;
    if (diff === 1) return 'DOMANI · ' + s.time;
    return dShort(s.date).toUpperCase() + ' · ' + s.time;
  }
  function photo(src, ig, alt) {
    var chip = igOk(ig) ? '<a class="igchip" href="' + esc(igClean(ig)) + '" target="_blank" rel="noopener">' + ICON.ig + '<span>Post su Instagram</span></a>' : '';
    if (src) return '<div class="photo"><img src="' + esc(src) + '" alt="' + esc(alt || 'Foto') + '" loading="lazy">' + chip + '</div>';
    return '<div class="photo rombi-dark">' + (LOGO ? '<img class="ph" src="' + LOGO + '" alt="">' : '') + chip + '</div>';
  }
  /* Post Instagram incorporato: si carica solo al tocco (niente script di Meta prima del consenso) */
  var IGKEY = 'bolliti-ig-auto';
  function igAuto() { try { return localStorage.getItem(IGKEY) === '1'; } catch (e) { return false; } }
  function igSetAuto(on) { try { if (on) localStorage.setItem(IGKEY, '1'); else localStorage.removeItem(IGKEY); } catch (e) {} }
  function igOk(url) { return /^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?/.test(url || ''); }
  function igClean(url) { var m = String(url).match(/^https:\/\/(www\.)?instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/); return 'https://www.instagram.com/' + m[2] + '/' + m[3] + '/'; }
  function igEmbed(url, title) {
    if (!igOk(url)) return '';
    var u = igClean(url);
    return '<section class="card igbox" data-ig="' + esc(u) + '"><span class="lbl">' + esc(title) + '</span>' +
      '<p class="small" style="color:var(--muted)">Il post originale dei Bolliti, con foto e caption. Si apre solo se lo chiedi, perché Instagram usa i suoi cookie. Con “Mostra sempre” la scelta resta salvata su questo telefono.</p>' +
      '<button class="btn" type="button" data-igload>Mostra il post</button>' +
      '<button class="btn ghost" type="button" data-igalways>Mostra sempre i post Instagram</button>' +
      '<a class="link" href="' + esc(u) + '" target="_blank" rel="noopener">Oppure aprilo su Instagram ' + ICON.out + '</a></section>';
  }
  function igLoad(box) {
    var u = box.getAttribute('data-ig');
    if (!igOk(u)) return;
    box.innerHTML = '<blockquote class="instagram-media" data-instgrm-permalink="' + esc(u) + '?utm_source=ig_embed" data-instgrm-version="14" style="background:#fff;border:0;border-radius:14px;margin:0;max-width:100%;min-width:0;width:100%">' +
      '<a href="' + esc(u) + '" target="_blank" rel="noopener" style="display:block;padding:16px;color:#0D0D0C;font-weight:600">Vedi il post su Instagram</a></blockquote>' +
      (igAuto() ? '<button class="linkbtn" type="button" data-ignever>Non caricare più i post in automatico</button>' : '');
    box.classList.add('loaded');
    if (window.instgrm && window.instgrm.Embeds) { window.instgrm.Embeds.process(); return; }
    if (!document.getElementById('ig-embed-js')) {
      var sc = document.createElement('script');
      sc.id = 'ig-embed-js'; sc.async = true; sc.src = 'https://www.instagram.com/embed.js';
      sc.onload = function () { if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process(); };
      document.body.appendChild(sc);
    }
  }
  function igLink(url, label) {
    return '<a class="link" href="' + esc(url || DB.meta.instagram) + '" target="_blank" rel="noopener">' + esc(label) + ' ' + ICON.out + '</a>';
  }
  function resChip(g) { return '<span class="res ' + g.result + '" aria-label="' + (g.result === 'W' ? 'Vinta' : 'Persa') + '">' + (g.result === 'W' ? 'V' : 'P') + '</span>'; }
  function quartersTable(g) {
    var n = g.quarters.bolliti.length;
    var head = '<div class="qr qh"><span>Parziali</span>' + g.quarters.bolliti.map(function (_, i) { return '<span>' + periodName(i) + '</span>'; }).join('') + '</div>';
    var rowB = '<div class="qr"><span>Bolliti</span>' + g.quarters.bolliti.map(function (x, i) { return '<span' + (x > g.quarters.opponent[i] ? ' class="gold"' : '') + '>' + x + '</span>'; }).join('') + '</div>';
    var rowO = '<div class="qr opp-row"><span>' + esc(short(g.opponent)) + '</span>' + g.quarters.opponent.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>';
    return '<div class="quarters" style="--n:' + n + '">' + head + rowB + rowO + '</div>';
  }
  function scoreBlock(g, big) {
    var b = '<div class="team"><span class="name">BOLLITI</span><span class="pts gold">' + g.score.bolliti + '</span></div>';
    var o = '<div class="team"><span class="name">' + esc(short(g.opponent).toUpperCase()) + '</span><span class="pts">' + g.score.opponent + '</span></div>';
    var mid = '<span class="mid">' + dShort(g.date) + '<br>' + (g.home ? 'casa' : 'trasferta') + '</span>';
    return '<div class="score' + (big ? ' big' : '') + '">' + (g.home ? b + mid + o : b + mid + o) + '</div>';
  }
  function credit() { return ''; }
  function voted() { return DB.banchetti.filter(function (b) { return b.vote != null; }); }
  function pending() { return DB.banchetti.filter(function (b) { return b.vote == null; }); }
  var MENU_ORDER = [['antipasto', 'Antipasto'], ['pizza', 'Pizza'], ['primo', 'Primo'], ['altro', 'Altro'], ['contorno', 'Contorno'], ['dolce', 'Dolce'], ['bevande', 'Da bere']];
  function menuItems(b, withDrinks) {
    var out = [];
    MENU_ORDER.forEach(function (m) { if (b.menu && b.menu[m[0]] && (withDrinks || m[0] !== 'bevande')) out.push([m[1], b.menu[m[0]].join(', ')]); });
    return out;
  }
  var ST = DB.standings || null;
  function stRow(name) { if (!ST) return null; var k = short(name); return ST.rows.filter(function (r) { return short(r.team) === k; })[0] || null; }
  var ME = ST ? ST.rows.filter(function (r) { return r.us; })[0] : null;
  function ord(n) { return n + '°'; }
  var TYPE = { technical: 'Fallo tecnico', unsportsmanlike: 'Fallo antisportivo', ejection: 'Espulsione' };
  function owesLabel(e) { var r = (DB.discipline.rules || {})[e.type] || e.owes || ''; return /banchetto/.test(r) ? 'banchetto' : 'cassa'; }
  function debtCount() { var c = { banchetto: 0, cassa: 0 }; debts().forEach(function (e) { c[owesLabel(e)]++; }); return c; }
  function debts() { return DB.discipline.events.filter(function (e) { return e.status !== 'saldata'; }); }

  /* ---------- pagine ---------- */
  function home() {
    var nx = nextGame(), last = S.G[S.G.length - 1];
    var h = '';

    if (nx) {
      h += '<section class="next rombi"><div class="row-between"><span class="d" style="font-size:16px;letter-spacing:.08em">PROSSIMA · ' + nx.round + 'ª GIORNATA</span>' + (nx.derby ? '<span class="pill dark">DERBY</span>' : '') + '</div>' +
        '<div><div class="d" style="font-size:22px;font-weight:800;letter-spacing:.04em">BOLLITI vs</div><h1 class="d opp">' + esc(nx.opponent.toUpperCase()) + '</h1></div>' +
        '<div style="display:flex;gap:8px"><div class="box"><span>Quando</span><span class="d">' + esc(whenLabel(nx)) + '</span></div><div class="box"><span>Dove</span><span class="d">' + (nx.home ? 'IN CASA' : 'TRASFERTA') + '</span></div></div>' +
        '<span style="font-size:14px;font-weight:500">' + esc(nx.venue) + '</span>' +
        (stRow(nx.opponent) ? '<span style="font-size:14px;font-weight:600">' + esc(short(nx.opponent)) + ': ' + ord(stRow(nx.opponent).pos) + ' in classifica, ' + stRow(nx.opponent).w + ' vinte e ' + stRow(nx.opponent).l + (stRow(nx.opponent).l === 1 ? ' persa' : ' perse') + '</span>' : '') + '</section>';
    }

    if (last) {
      var top3 = last.stats.slice().sort(function (a, b) { return b.pts - a.pts; }).slice(0, 3);
      h += '<section class="card flush">' + photo(last.recap && last.recap.team_photo, last.recap && last.recap.instagram_post, 'Foto di squadra') + '<div class="body">' +
        '<div class="row-between"><span class="lbl">Ultima · ' + last.round + 'ª giornata</span><span class="pill line">' + (last.result === 'W' ? 'V' : 'P') + (last.overtime ? ' · D.T.S.' : '') + '</span></div>' +
        scoreBlock(last) +
        (last.recap ? '<p style="font-size:16px;line-height:1.45;color:var(--fg-2)">' + esc(last.recap.headline) + '</p>' : '') +
        '<div class="stack" style="gap:8px"><span class="lbl">I migliori</span><div class="grid3">' +
        top3.map(function (s) { return '<a class="tile" href="#giocatore-' + s.p + '" style="text-decoration:none;color:var(--fg)"><span class="d">' + s.pts + '</span><span>' + esc(nick(s.p)) + ' · #' + s.n + '</span></a>'; }).join('') +
        '</div></div><a class="btn" href="#partita-' + last.round + '">Leggi la partita ' + ICON.arrow + '</a></div></section>';
    }

    var form = S.G.slice(-5);
    h += '<section class="card"><div class="row-between" style="align-items:flex-end"><div><div class="lbl">Bilancio</div><div class="d" style="font-size:68px">' + S.W + '–' + S.L + '</div></div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px"><span class="small" style="font-size:12px">Forma, dalla più vecchia</span><div style="display:flex;gap:6px">' + form.map(resChip).join('') + '</div></div></div>' +
      '<div class="grid3"><div class="tile"><span class="d">' + f1(S.pf / S.n) + '</span><span>punti fatti</span></div><div class="tile"><span class="d">' + f1(S.pa / S.n) + '</span><span>punti subiti</span></div><div class="tile"><span class="d">' + f1(S.p3 / S.n) + '</span><span>triple a partita</span></div></div>' +
      (ME ? '<a class="li" href="#classifica" style="border-top:1px solid var(--line);border-bottom:0;padding-top:14px"><span class="d gold" style="font-size:40px;width:auto">' + ord(ME.pos) + '</span><span class="grow"><span class="name">in classifica · ' + ME.pts + ' punti</span><span class="small" style="font-size:12px">Aggiornata al ' + dLong(ST.updated) + '</span></span>' + ICON.arrow + '</a>' : '') +
      '<span class="small" style="font-size:12px">Medie su ' + S.n + ' partite</span></section>';

    var sc = ranked('ppg');
    if (sc.length) {
      var L = sc[0];
      h += '<section class="card"><div class="row-between"><span class="lbl">Marcatori · media punti</span><a class="link" href="#statistiche">Tutti</a></div>' +
        '<a class="leader" href="#giocatore-' + L.id + '"><span class="jersey">' + P[L.id].number + '</span><div class="min0" style="flex:1"><div class="d" style="font-size:32px">' + esc(nick(L.id).toUpperCase()) + '</div><div class="small" style="color:var(--muted);margin-top:4px">' + L.pts + ' punti · ' + L.p3 + ' triple · ' + L.gp + ' partite</div></div><span class="d gold" style="font-size:46px">' + f1(L.ppg) + '</span></a>' +
        '<div class="list">' + sc.slice(1, 4).map(function (r) {
          return '<a class="li" href="#giocatore-' + r.id + '"><span class="num">#' + P[r.id].number + '</span><span class="grow"><span class="name">' + esc(nick(r.id)) + '</span><span class="small" style="font-size:12px">' + 'in ' + r.gp + (r.gp === 1 ? ' partita' : ' partite') + '</span></span><span class="val">' + f1(r.ppg) + '</span></a>';
        }).join('') + '</div></section>';
    }

    var vb = voted(), lb = vb[vb.length - 1], pend = pending();
    if (lb) {
      h += '<section class="card rombi-dark"><div class="row-between"><span class="lbl">Ultimo banchetto</span><a class="link" href="#banchetti">Classifica</a></div>' +
        '<div style="display:flex;align-items:center;gap:14px"><div style="flex:1;min-width:0"><div class="small" style="color:var(--muted)">Chef estratto dallo sceriffo</div><div class="d" style="font-size:44px">' + esc(nick(lb.chef).toUpperCase()) + '</div><div class="small" style="margin-top:4px">Giudice: ' + esc(nick(lb.judge)) + '</div></div>' +
        '<div class="vote sm"><span class="d">' + f1(lb.vote) + '</span><span class="d">' + esc(lb.vote_label || 'VOTO') + '</span></div></div>' +
        '<div class="chips">' + menuItems(lb).slice(0, 4).map(function (m) { return '<span class="chip">' + esc(m[1]) + '</span>'; }).join('') + '</div>' +
        (pend.length ? '<div class="small">In attesa del giudizio: ' + pend.map(function (b) { return esc(nick(b.chef)); }).join(', ') + '</div>' : '') +
        (function () { var c = debtCount(); return '<a class="li" href="#banchetti" style="border-top:1px solid var(--line);border-bottom:0;padding-top:14px"><span class="gold">' + ICON.beer + '</span><span class="grow"><span class="name">Debiti in sospeso</span><span class="small" style="font-size:12px">' + c.banchetto + (c.banchetto === 1 ? ' banchetto' : ' banchetti') + ' · ' + c.cassa + (c.cassa === 1 ? ' cassa di birra' : ' casse di birra') + '</span></span><span class="d" style="font-size:32px">' + (c.banchetto + c.cassa) + '</span></a>'; })() + '</section>';
    }
    return h;
  }

  var vista = 'calendario';
  function viewSwitch() {
    return '<nav class="seg" aria-label="Vista"><a href="#partite"' + (vista === 'calendario' ? ' aria-current="page"' : '') + '>CALENDARIO</a><a href="#classifica"' + (vista === 'classifica' ? ' aria-current="page"' : '') + '>CLASSIFICA</a></nav>';
  }
  function classifica() {
    var h = '<header class="pagehead"><span class="lbl">DR3 · Girone C · ' + esc(DB.meta.season) + '</span><h1>PARTITE</h1></header>' + recordCard() + viewSwitch();
    if (!ST) return h + '<section class="card"><p class="empty">Classifica non ancora disponibile.</p></section>';
    var above = ST.rows.filter(function (r) { return r.pts > ME.pts; }).map(function (r) { return r.pts; });
    var nextUp = above.length ? Math.min.apply(null, above) : null;
    var atk = ST.rows.slice().sort(function (a, b) { return b.pf - a.pf; }).indexOf(ME) + 1;
    var def = ST.rows.slice().sort(function (a, b) { return a.pa - b.pa; }).indexOf(ME) + 1;
    h += '<section class="card"><div style="display:flex;align-items:flex-end;gap:14px"><span class="d gold" style="font-size:80px;line-height:.85">' + ord(ME.pos) + '</span><div style="display:flex;flex-direction:column;gap:2px;padding-bottom:4px"><span class="d" style="font-size:26px">' + ME.pts + ' PUNTI</span><span class="small" style="color:var(--muted)">' +
      (nextUp != null ? 'Il gruppo davanti è a ' + nextUp + ', la vetta a ' + ST.rows[0].pts + '.' : 'Primi in classifica.') + '</span></div></div>' +
      '<div class="grid3"><div class="tile"><span class="d">' + ord(atk) + '</span><span>attacco del girone</span></div><div class="tile"><span class="d">' + ord(def) + '</span><span>difesa del girone</span></div><div class="tile"><span class="d">' + signed(ME.pf - ME.pa) + '</span><span>differenza punti</span></div></div></section>';
    h += '<section class="card" style="padding:14px 10px;gap:0"><div class="box-wrap"><div class="st head"><span>#</span><span>Squadra</span><span>PT</span><span>V–P</span><span>+/−</span></div>' +
      ST.rows.map(function (r) {
        return '<div class="st' + (r.us ? ' us' : '') + '"><span class="d">' + r.pos + '</span><span class="team">' + esc(r.team) + '</span><span class="d">' + r.pts + '</span><span>' + r.w + '–' + r.l + '</span><span>' + signed(r.pf - r.pa) + '</span></div>';
      }).join('') + '</div></section>' +
      '<p class="small" style="font-size:12px;line-height:1.5">Aggiornata al ' + dLong(ST.updated) + ', dopo la ' + ST.after_round + 'ª giornata. Fonte: FIP. 2 punti a vittoria; a parità di punti vale l’ordine ufficiale FIP.</p>';
    return h;
  }
  function recordCard() {
    var pct = Math.round(S.n / DB.schedule.length * 1000) / 10;
    return '<section class="card" style="padding:16px;gap:12px"><div class="grid2">' +
      '<div class="wl win"><span class="d">' + S.W + '</span><span class="d">' + (S.W === 1 ? 'VINTA' : 'VINTE') + '</span></div>' +
      '<div class="wl"><span class="d">' + S.L + '</span><span class="d">' + (S.L === 1 ? 'PERSA' : 'PERSE') + '</span></div></div>' +
      '<div class="stack" style="gap:6px"><div class="track-thin"><span style="width:' + pct + '%"></span></div>' +
      '<span class="small">' + S.n + ' partite giocate su ' + DB.schedule.length + (ME ? ' · ' + ord(ME.pos) + ' in classifica' : '') + '</span></div></section>';
  }
  function partite() {
    var nx = nextGame();
    var played = {}; S.G.forEach(function (g) { played[g.round] = g; });
    var h = '<header class="pagehead"><span class="lbl">DR3 · Girone C · ' + esc(DB.meta.season) + '</span><h1>PARTITE</h1></header>' + recordCard() + viewSwitch() + '<div class="list cal" style="gap:4px;margin:0 -8px">';
    DB.schedule.forEach(function (s, idx) {
      if (s.round === 1) h += '<div class="lbl gsplit"><span>Andata</span><span>ott – gen</span></div>';
      if (s.round === 14) h += '<div class="lbl gsplit"><span>Ritorno</span><span>gen – apr</span></div>';
      var g = played[s.round];
      var where = s.home ? 'Casa · Almenno S.S.' : 'Trasferta';
      var when = '<span class="when"><span class="d">' + s.round + 'ª</span><span>' + dShort(s.date) + '</span></span>';
      var who = '<span class="who"><span class="d">' + esc(s.opponent.toUpperCase()) + '</span><span>' + where + (s.derby ? ' · derby' : '') + '</span></span>';
      if (g) {
        h += '<a class="game" href="#partita-' + s.round + '">' + when + who + '<span class="right"><span class="d">' + g.score.bolliti + '–' + g.score.opponent + (g.overtime ? '<small style="font-size:13px"> dts</small>' : '') + '</span>' + resChip(g) + '</span></a>';
      } else if (nx && nx.round === s.round) {
        h += '<a class="game is-next" href="#">' + when + '<span class="who"><span class="d">' + esc(s.opponent.toUpperCase()) + '</span><span>' + where + ' · prossima</span></span><span class="right"><span class="d">' + esc(s.time) + '</span></span></a>';
      } else {
        h += '<div class="game future">' + when + who + '<span class="right"><span class="d">' + esc(s.time) + '</span></span></div>';
      }
    });
    return h + '</div>';
  }

  function partita(round) {
    var g = null; S.G.forEach(function (x) { if (x.round === round) g = x; });
    var head = '<div class="back"><a class="iconbtn" href="#partite" aria-label="Torna alle partite">' + ICON.back + '</a><span class="lbl" style="flex:1">' + round + 'ª giornata' + (g ? ' · ' + (g.home ? 'casa' : 'trasferta') : '') + '</span></div>';
    if (!g) {
      var s = DB.schedule.filter(function (x) { return x.round === round; })[0];
      return head + '<section class="card"><p class="d" style="font-size:30px">Non ancora giocata</p>' + (s ? '<p class="muted">' + esc(s.opponent) + ' · ' + dShort(s.date) + ' · ' + esc(s.time) + '</p>' : '') + '</section>';
    }
    var h = head + '<section class="stack" style="gap:8px">' + scoreBlock(g, true) +
      '<span class="small">' + esc(DB.schedule.filter(function (x) { return x.round === round; })[0].venue) + (g.overtime ? ' · dopo un supplementare' : '') + '</span></section>';
    h += '<div class="card flush">' + photo(g.recap && g.recap.team_photo, g.recap && g.recap.instagram_post, 'Foto di squadra') + '</div>';
    if (g.recap) h += '<p class="d" style="font-size:30px;font-weight:800;line-height:1.1;text-wrap:balance">' + esc(g.recap.headline) + '</p>';

    // andamento
    var b = 0, o = 0, cols = g.quarters.bolliti.map(function (x, i) {
      b += x; o += g.quarters.opponent[i];
      var d = b - o, hgt = Math.min(Math.abs(d) * 5, 54);
      return '<div class="period"><div class="up">' + (d > 0 ? '<div class="bar" style="height:' + hgt + 'px"></div>' : '') + '</div><div class="axis"></div><div class="down">' + (d < 0 ? '<div class="bar" style="height:' + hgt + 'px"></div>' : '') + '</div>' +
        '<span class="d' + (d > 0 ? ' gold' : '') + '">' + signed(d) + '</span><span>' + periodName(i) + ' · ' + b + '–' + o + '</span></div>';
    });
    h += '<section class="card"><span class="lbl">Andamento · scarto a fine periodo</span><div class="periods" style="--n:' + cols.length + '">' + cols.join('') + '</div>' + quartersTable(g) + '</section>';

    if (g.recap && g.recap.moments && g.recap.moments.length) {
      h += '<section class="card" style="gap:4px"><span class="lbl" style="margin-bottom:10px">Momenti chiave</span>' +
        g.recap.moments.map(function (m) { return '<div class="moment"><span class="mk"><span class="d">' + esc(m.q || '•') + '</span><i></i></span><p>' + esc(m.text || m) + '</p></div>'; }).join('') +
        igLink(g.recap.instagram_post, igOk(g.recap.instagram_post) ? 'Il resoconto completo su Instagram' : 'I resoconti su Instagram') + '</section>';
    }

    var rows = g.stats.filter(function (s) { return !s.dnp; }).sort(function (a, b2) { return b2.pts - a.pts || a.n - b2.n; });
    var tot = { p2: 0, p3: 0, ft: 0, pf: 0 };
    rows.forEach(function (s) { tot.p2 += s.p2; tot.p3 += s.p3; tot.ft += s.ft; tot.pf += s.pf; });
    var fouled = rows.filter(function (s) { return s.pf >= 5; }).map(function (s) { return nick(s.p); });
    h += '<section class="card" style="gap:0;padding:20px 16px"><div class="row-between" style="margin-bottom:6px"><span class="lbl">Tabellino</span><span class="small" style="font-size:12px"><span class="dot">●</span> quintetto</span></div><div class="box-wrap">' +
      '<div class="tb head"><span>Giocatore</span><span>PT</span><span>2P</span><span>3P</span><span>TL</span><span>F</span></div>' +
      rows.map(function (s) {
        return '<div class="tb"><span class="who"><span class="n">' + s.n + '</span><a class="nm" href="#giocatore-' + s.p + '">' + esc(nick(s.p)) + '</a>' + (s.s ? '<span class="dot" aria-label="quintetto">●</span>' : '') + '</span>' +
          '<span class="pts">' + s.pts + '</span><span>' + s.p2 + '</span><span>' + s.p3 + '</span><span>' + s.ft + '</span><span class="' + (s.pf >= 5 ? 'foul-out' : 'muted') + '">' + s.pf + '</span></div>';
      }).join('') +
      '<div class="tb total"><span>Totale</span><span class="pts gold">' + g.score.bolliti + '</span><span>' + tot.p2 + '</span><span>' + tot.p3 + '</span><span>' + tot.ft + '</span><span>' + tot.pf + '</span></div></div>' +
      '<span class="small" style="font-size:12px;margin-top:6px">Canestri segnati dal referto.' + (fouled.length ? ' Usciti per 5 falli: ' + esc(fouled.join(' e ')) + '.' : '') + '</span></section>';

    if (g.app) {
      var ftm = sum(g.stats.map(function (x) { return x.ft; })), fta = sum(g.app.players.map(function (x) { return x.fta || 0; }));
      h += '<section class="card"><span class="lbl">Dall’app della partita</span>' +
        (g.app.flow ? '<div class="grid3"><div class="tile"><span class="d">' + g.app.flow.lead_changes + '</span><span>cambi di vantaggio</span></div><div class="tile"><span class="d">' + g.app.flow.ties + '</span><span>parità</span></div><div class="tile"><span class="d">+' + g.app.flow.largest_lead_bolliti + '</span><span>vantaggio max</span></div></div>'
          : (fta ? '<div class="grid2"><div class="tile"><span class="d">' + ftm + '/' + fta + '</span><span>tiri liberi</span></div><div class="tile"><span class="d">' + Math.round(ftm / fta * 100) + '%</span><span>ai liberi</span></div></div>' : '')) +
        '<div class="list">' + g.app.players.filter(function (x) { return x.min !== '00:00'; }).sort(function (a, b2) { return b2.pm - a.pm; }).slice(0, 3).map(function (x) {
          return '<div class="li"><span class="grow"><span class="name">' + esc(nick(x.p)) + '</span><span class="small" style="font-size:12px">' + x.min + ' minuti</span></span><span class="val gold">' + signed(x.pm) + '</span></div>';
        }).join('') + '</div><span class="small" style="font-size:12px">Migliori plus/minus della partita.</span></section>';
    }
    if (g.recap && g.recap.opponent_3pt_made) {
      h += '<section class="card" style="flex-direction:row;align-items:center"><span class="d" style="font-size:54px">' + g.recap.opponent_3pt_made + '</span><span style="font-size:15px;line-height:1.4;color:var(--fg-2)">triple segnate da ' + esc(short(g.opponent)) + '.</span></section>';
    }
    return h;
  }

  function bolliti() {
    var coach = (DB.staff || []).filter(function (s) { return s.role === 'allenatore'; })[0];
    var h = '<header class="pagehead"><span class="lbl">Rosa ' + esc(DB.meta.season) + ' · ' + esc(DB.meta.hashtag) + '</span><h1>ROSTER</h1><span class="muted" style="font-size:14px">' + DB.players.length + ' maglie, un soprannome a testa. Media punti per partita giocata.</span></header>';
    if (coach) h += '<section class="card" style="flex-direction:row;align-items:center;padding:14px 16px"><span class="iconbtn" style="background:var(--surface-2);border-radius:50%;width:52px;height:52px;color:var(--gold)">' + ICON.clip + '</span><div style="flex:1"><div class="d" style="font-size:26px">' + esc(coach.nickname.toUpperCase()) + '</div><div class="small">Allenatore · gli “Aiolfi’s Boys”</div></div></section>';
    h += '<div class="roster">' + DB.players.slice().sort(function (a, b) { return a.number - b.number; }).map(function (p) {
      var r = S.ps[p.id], off = !!p.out;
      return '<a class="pcard' + (off ? ' off' : '') + '" href="#giocatore-' + p.id + '"><span class="top-band ' + (off ? 'rombi-grey' : 'rombi') + '"><span class="d">' + p.number + '</span></span>' +
        '<span class="info"><span class="d">' + esc(p.nickname.toUpperCase()) + '</span>' +
        (ROLE[p.role] && p.role !== 'aiuto' ? '<span class="prole">' + ROLE[p.role] + '</span>' : '') +
        (off ? '<span class="pout">Non disponibile</span>' : '') +
        (r.gp ? '<span class="stat"><span class="statlbl">Media punti</span><span class="stat-row"><span class="d">' + f1(r.ppg) + '</span><span>in ' + r.gp + (r.gp === 1 ? ' partita' : ' partite') + '</span></span></span>'
              : (role_or_out(p) ? '' : '<span class="pnone">Nessuna partita giocata</span>')) +
        '</span></a>';
    }).join('') + '</div>';
    return h;
  }

  function giocatore(id) {
    var p = P[id], r = S.ps[id];
    var head = '<div class="back"><a class="iconbtn" href="#roster" aria-label="Torna al roster">' + ICON.back + '</a><span class="lbl">Scheda giocatore</span></div>';
    if (!p || !r) return head + '<section class="card"><p class="empty">Giocatore non trovato.</p></section>';
    var h = head + '<section class="hero-num ' + (p.out ? 'off rombi-grey' : 'rombi') + '"><span class="d n">' + p.number + '</span><div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:0">' +
      '<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">' + (ROLE[p.role] ? '<span class="pill dark">' + ROLE[p.role].toUpperCase() + '</span>' : '') + (p.out ? '<span class="pill dark">NON DISPONIBILE</span>' : '') + '</span>' +
      '<span class="d nm">' + esc(p.nickname.toUpperCase()) + '</span></div></section>';
    h += '<div class="pphoto rombi-dark">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="Foto di ' + esc(p.nickname) + '">' : (LOGO ? '<img class="ph" src="' + LOGO + '" alt="">' : '') + '<span>Foto in arrivo</span>') + '</div>';
    if (!r.gp) return h + '<section class="card"><p class="muted">Nessuna partita giocata in questa stagione.</p></section>';
    h += '<div class="grid3"><div class="tile"><span class="d gold">' + f1(r.ppg) + '</span><span>media punti a partita</span></div><div class="tile"><span class="d">' + r.pts + '</span><span>punti totali</span></div><div class="tile"><span class="d">' + r.best + '</span><span>record personale</span></div>' +
      '<div class="tile"><span class="d">' + r.p3 + '</span><span>triple</span></div><div class="tile"><span class="d">' + r.ft + '</span><span>liberi segnati</span></div><div class="tile"><span class="d">' + r.gp + '</span><span>partite giocate</span></div></div>';
    if (r.fta) h += '<section class="card"><span class="lbl">Ai liberi</span><p class="d" style="font-size:30px;font-weight:800;line-height:1.1">' + r.ftA + ' su ' + r.fta + ' · ' + Math.round(100 * r.ftA / r.fta) + '%</p><span class="small">Tiri tentati disponibili solo per: ' + r.ftG.map(function (g) { return esc(short(g.opponent)); }).join(', ') + '.</span></section>';
    h += '<section class="card"><span class="lbl">Partita per partita</span><div class="list">' + r.log.slice().reverse().map(function (x) {
      return '<a class="li" href="#partita-' + x.g.round + '">' + resChip(x.g) + '<span class="grow"><span class="name">' + esc(short(x.g.opponent)) + '</span><span class="small" style="font-size:12px">' + x.g.round + 'ª · ' + dShort(x.g.date) + [x.s.p2 ? x.s.p2 + ' da 2' : '', x.s.p3 ? x.s.p3 + ' da 3' : '', x.s.ft ? x.s.ft + (x.s.ft === 1 ? ' libero' : ' liberi') : '', x.s.s ? 'quintetto' : ''].filter(Boolean).map(function (t) { return ' · ' + t; }).join('') + '</span></span><span class="val">' + x.s.pts + '</span></a>';
    }).join('') + '</div></section>';
    return h;
  }

  var cat = 'punti';
  function stagione() {
    var cats = {
      punti: { label: 'PUNTI', key: 'ppg', fmt: f1, note: function (r) { return r.pts + ' punti in ' + r.gp + (r.gp === 1 ? ' partita' : ' partite') + ''; }, cap: '' },
      triple: { label: 'TRIPLE', key: 'p3', fmt: String, note: function (r) { return 'in ' + r.gp + (r.gp === 1 ? ' partita' : ' partite') + ''; }, cap: '' },
      liberi: { label: 'LIBERI', key: 'ft', fmt: String, note: function (r) { return 'in ' + r.gp + (r.gp === 1 ? ' partita' : ' partite'); }, cap: '' }
    };
    var c = cats[cat], rows = ranked(c.key).slice(0, 8), max = rows.length ? rows[0][c.key] : 1;
    var h = '<header class="pagehead"><span class="lbl">Dopo ' + S.n + ' giornate su ' + DB.schedule.length + '</span><h1>STATISTICHE</h1></header>';
    h += '<section class="card" style="padding:16px"><div class="seg on-dark" role="tablist" aria-label="Classifica">' + Object.keys(cats).map(function (k) {
      return '<button role="tab" data-cat="' + k + '" aria-selected="' + (k === cat) + '">' + cats[k].label + '</button>';
    }).join('') + '</div>' + (c.cap ? '<span class="small" style="padding:0 4px">' + c.cap + '</span>' : '') + '<div class="list">' + rows.map(function (r, i) {
      return '<a class="lb" href="#giocatore-' + r.id + '"><span class="pos">' + (i + 1) + '</span><span class="mid"><span class="row-between"><span style="font-size:15px;font-weight:600">' + esc(nick(r.id)) + ' <span class="small">#' + P[r.id].number + '</span></span><span class="small" style="font-size:12px">' + c.note(r) + '</span></span><span class="track"><span class="fill" style="display:block;width:' + Math.round(r[c.key] / max * 100) + '%"></span></span></span><span class="val">' + c.fmt(r[c.key]) + '</span></a>';
    }).join('') + '</div></section>';

    var diffs = S.q.map(function (x) { return x.f - x.a; });
    var bi = diffs.indexOf(Math.max.apply(null, diffs)), wi = diffs.indexOf(Math.min.apply(null, diffs));
    h += '<section class="card"><span class="lbl">Quarto per quarto</span><p class="d" style="font-size:26px;font-weight:800;line-height:1.1">Il quarto migliore è il ' + periodName(bi) + ' (' + signed(diffs[bi]) + '), il più difficile il ' + periodName(wi) + ' (' + signed(diffs[wi]) + ').</p><div class="grid4">' +
      S.q.map(function (x, i) {
        var hi = i === bi;
        return '<div class="tile" style="' + (hi ? 'background:var(--gold);color:var(--ink)' : '') + '"><span style="font-size:12px;' + (hi ? 'font-weight:600' : 'color:var(--dim)') + '">' + periodName(i) + '</span><span class="d" style="font-size:32px;' + (!hi && diffs[i] > 0 ? 'color:var(--gold)' : '') + '">' + signed(diffs[i]) + '</span><span style="' + (hi ? 'color:var(--ink);font-weight:600' : '') + '">' + x.f + '–' + x.a + '</span></div>';
      }).join('') + '</div><span class="small" style="font-size:12px">Punti fatti–subiti nel quarto, somma delle ' + S.n + ' partite.' +
      (S.ot.length ? ' Supplementari: ' + S.ot.map(function (g) { return g.quarters.bolliti.slice(4).join('+') + '–' + g.quarters.opponent.slice(4).join('+'); }).join(', ') + '.' : '') + '</span></section>';

    h += '<div class="grid2"><div class="card" style="padding:16px;gap:4px"><span class="lbl">In casa</span><span class="d" style="font-size:48px">' + S.home.w + '–' + S.home.l + '</span><span class="small" style="color:var(--muted)">' + S.home.f + ' fatti · ' + S.home.a + ' subiti</span></div>' +
      '<div class="card" style="padding:16px;gap:4px"><span class="lbl">In trasferta</span><span class="d" style="font-size:48px">' + S.away.w + '–' + S.away.l + '</span><span class="small" style="color:var(--muted)">' + S.away.f + ' fatti · ' + S.away.a + ' subiti</span></div></div>';

    var when = ['dopo il primo quarto', 'all’intervallo', 'dopo tre quarti', 'a fine partita'];
    var recs = [];
    if (S.maxLead.v > 0) recs.push(['+' + S.maxLead.v, 'Massimo vantaggio', S.maxLead.b + '–' + S.maxLead.o + ' ' + (when[S.maxLead.i] || 'nel supplementare') + ' contro ' + short(S.maxLead.g.opponent)]);
    if (S.topTeam) recs.push([String(S.topTeam.score.bolliti), 'Più punti segnati', 'Contro ' + short(S.topTeam.opponent) + (S.topTeam.overtime ? ', dopo un supplementare' : '')]);
    if (S.bestPts.v) recs.push([String(S.bestPts.v), 'Miglior prestazione', S.bestPts.list.map(function (x) { return nick(x.p) + ' contro ' + short(x.g.opponent); }).join(' · ')]);
    if (S.bestFt.v) recs.push([String(S.bestFt.v), 'Liberi in una partita', S.bestFt.list.map(function (x) { return nick(x.p) + ' contro ' + short(x.g.opponent); }).join(' · ')]);
    h += '<section class="card" style="gap:4px"><span class="lbl" style="margin-bottom:8px">Record di stagione</span><div class="list">' + recs.map(function (r) {
      return '<div class="li"><span class="d gold" style="width:72px;font-size:34px">' + esc(r[0]) + '</span><span class="grow"><span class="name" style="font-size:15px">' + esc(r[1]) + '</span><span class="small">' + esc(r[2]) + '</span></span></div>';
    }).join('') + '</div></section>';

    h += '<div class="grid2"><div class="tile" style="background:var(--surface);border-radius:20px;padding:16px"><span class="d" style="font-size:44px">' + S.p3 + '</span><span>triple segnate · ' + f1(S.p3 / S.n) + ' a partita</span></div>' +
      '<div class="tile" style="background:var(--surface);border-radius:20px;padding:16px"><span class="d" style="font-size:44px">' + S.ftm + '</span><span>liberi segnati · ' + f1(S.ftm / S.n) + ' a partita</span></div></div>';
    return h;
  }

  var bsel = null;
  function gallery(b) {
    var all = (b.photo ? [b.photo] : []).concat(b.gallery || []);
    if (all.length < 2) return '';
    return '<div class="stack" style="gap:8px"><span class="lbl">Il banchetto in foto · ' + all.length + '</span><div class="gallery" role="list">' +
      all.map(function (src, i) { return '<button class="gthumb" type="button" role="listitem" data-zoom="' + esc(src) + '" aria-label="Apri la foto ' + (i + 1) + ' di ' + all.length + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>'; }).join('') + '</div></div>';
  }
  function banchetti() {
    var vb = voted(), pend = pending(), rules = DB.meta.banchetti_rules || {};
    var lb = (bsel && vb.filter(function (b) { return b.id === bsel; })[0]) || vb[vb.length - 1];
    var isLast = lb === vb[vb.length - 1];
    var h = '<header class="pagehead"><h1>BANCHETTI</h1></header>';
    if (lb) {
      h += '<section class="card flush">' + photo(lb.photo, lb.instagram_post, 'Foto del banchetto di ' + nick(lb.chef)) + '<div class="body">' +
        '<div style="display:flex;align-items:center;gap:14px"><div style="flex:1;min-width:0"><div class="lbl">Ultimo' + (lb.date ? ' · ' + dLong(lb.date) : lb.posted ? ' · ' + dLong(lb.posted) : '') + '</div><div class="d" style="font-size:46px">' + esc(nick(lb.chef).toUpperCase()) + '</div><div class="small" style="margin-top:2px">#' + P[lb.chef].number + ' · giudice ' + esc(nick(lb.judge)) + '</div></div>' +
        '<div class="vote"><span class="d">' + f1(lb.vote) + '</span><span class="d">' + esc(lb.vote_label || 'VOTO') + '</span></div></div>' +
        '<div class="chips">' + (lb.tags || []).map(function (t) { return '<span class="chip line">' + esc(t === 'home made' ? 'Fatto in casa' : t.charAt(0).toUpperCase() + t.slice(1)) + '</span>'; }).join('') + '</div>' +
        '<div class="list">' + menuItems(lb, true).map(function (m) { return '<div class="menu-row"><span>' + m[0] + '</span><span>' + esc(m[1]) + '</span></div>'; }).join('') + '</div>' +
        (lb.judge_highlight ? '<div class="note">' + ICON.star + '<span>Il meglio per il giudice: ' + esc(lb.judge_highlight) + '.' + (lb.judge_minus ? ' Malus: ' + esc(lb.judge_minus) + '.' : '') + '</span></div>' : '') +
        gallery(lb) +
        igLink(lb.instagram_post, igOk(lb.instagram_post) ? 'Il giudizio completo su Instagram' : 'I banchetti su Instagram') + '</div></section>';
    }

    var sorted = vb.slice().sort(function (a, b) { return b.vote - a.vote; });
    var avg = vb.length ? sum(vb.map(function (b) { return b.vote; })) / vb.length : 0;
    var allTie = sorted.length > 1 && sorted[0].vote === sorted[sorted.length - 1].vote;
    var lemon = vb.filter(function (b) { return JSON.stringify(b.menu || {}).toLowerCase().indexOf('limone') > -1; }).length;
    var homemade = vb.filter(function (b) { return (b.tags || []).indexOf('home made') > -1 || JSON.stringify(b.menu || {}).indexOf('fatt') > -1; }).length;
    h += '<section class="card" style="gap:6px"><div class="row-between" style="margin-bottom:6px"><span class="lbl">Classifica chef</span><span class="small" style="font-size:12px">' + vb.length + ' banchetti · media ' + f1(avg) + '</span></div>' +
      (allTie ? '<p class="d" style="font-size:24px;font-weight:800;line-height:1.1;margin-bottom:6px">' + (sorted.length === 3 ? 'Tre' : sorted.length) + ' mostri a pari merito: il livello quest’anno è altissimo.</p>' : '') +
      '<div class="list">' + sorted.map(function (b, i) {
        var pos = 1; for (var k = 0; k < i; k++) if (sorted[k].vote > b.vote) pos++;
        var dish = menuItems(b).filter(function (m) { return m[0] === 'Primo' || m[0] === 'Dolce'; }).map(function (m) { return m[1]; }).join(' · ');
        return '<button class="li chefrow' + (b === lb ? ' on' : '') + '" type="button" data-banch="' + b.id + '" aria-pressed="' + (b === lb) + '"><span class="rank">' + pos + '</span><span class="grow"><span class="name">' + esc(nick(b.chef)) + '</span><span class="small" style="font-size:12px">' + esc(dish) + '</span><span class="small" style="font-size:12px;font-weight:600;color:var(--gold)">' + (b === lb ? 'In vetrina qui sopra' : 'Vedi il banchetto') + ((b.gallery || []).length ? ' · ' + ((b.gallery || []).length + 1) + ' foto' : '') + '</span></span><span class="val gold" style="font-size:30px">' + f1(b.vote) + '</span></button>';
      }).join('') +
      pend.map(function (b) { return '<div class="li"><span class="rank wait">?</span><span class="grow"><span class="name muted">' + esc(nick(b.chef)) + (b.date ? ' · ' + dShort(b.date).toLowerCase() : '') + '</span><span class="small" style="font-size:12px">Banchetto fatto, in attesa del giudizio di ' + esc(nick(b.judge)) + '</span></span></div>'; }).join('') +
      '</div>' + (vb.length ? '<div class="grid2" style="margin-top:10px"><div class="tile"><span class="d" style="font-size:30px">' + lemon + ' su ' + vb.length + '</span><span>con torta al limone</span></div><div class="tile"><span class="d" style="font-size:30px">' + homemade + ' su ' + vb.length + '</span><span>con qualcosa fatto in casa</span></div></div>' : '') + '</section>';

    var ds = debts();
    h += '<section class="card rombi-dark"><span class="lbl">Il codice dei Bolliti</span><div class="grid2">' + ['technical', 'unsportsmanlike', 'ejection'].filter(function (k) { return (DB.discipline.rules || {})[k]; }).map(function (k) {
        return '<div class="tile"><span class="small">' + TYPE[k] + '</span><span class="d" style="font-size:24px;color:var(--fg);line-height:1.05">= ' + esc(DB.discipline.rules[k].toUpperCase()) + (/banchetto/.test(DB.discipline.rules[k]) ? ' EXTRA' : '') + '</span></div>';
      }).join('') + '<div class="tile"><span class="small">Chi decide</span><span class="d" style="font-size:24px;color:var(--fg);line-height:1.05">LO SCERIFFO</span></div></div>' +
      '<span class="lbl" style="margin-top:4px">Debiti in sospeso</span>' +
      (ds.length ? ds.map(function (e) {
        return '<div style="display:flex;align-items:center;gap:12px;background:var(--surface-2);border-radius:14px;padding:12px 14px"><span class="gold">' + (owesLabel(e) === 'banchetto' ? ICON.star : ICON.beer) + '</span><span class="grow" style="flex:1;display:flex;flex-direction:column"><span style="font-size:16px;font-weight:600">' + esc(nick(e.p)) + ' · ' + (owesLabel(e) === 'banchetto' ? '1 banchetto' : '1 cassa di birra') + '</span><span class="small" style="font-size:12px">' + (TYPE[e.type] || 'Fallo') + ' alla ' + e.round + 'ª giornata</span></span><span class="pill gold">DA SALDARE</span></div>';
      }).join('') : '<p class="empty">Nessun debito: tutti in regola.</p>') + '</section>';

    // "Il banchetto tipo" (persone e budget) resta privato: non si mostra sul sito pubblico.
    return h;
  }

  /* ---------- foto a schermo intero ---------- */
  var zoomEl = null, zoomFrom = null;
  function openZoom(btn) {
    var list = Array.prototype.map.call(btn.parentNode.querySelectorAll('[data-zoom]'), function (x) { return x.getAttribute('data-zoom'); });
    var i = list.indexOf(btn.getAttribute('data-zoom'));
    zoomFrom = btn;
    if (!zoomEl) {
      zoomEl = document.createElement('div');
      zoomEl.className = 'zoom';
      zoomEl.setAttribute('role', 'dialog');
      zoomEl.setAttribute('aria-modal', 'true');
      zoomEl.setAttribute('aria-label', 'Foto del banchetto');
      document.body.appendChild(zoomEl);
      zoomEl.addEventListener('click', function (e) {
        var a = e.target.closest('[data-zstep]');
        if (a) { show(zoomEl._i + parseInt(a.getAttribute('data-zstep'), 10)); return; }
        if (e.target.closest('[data-zclose]') || e.target === zoomEl) closeZoom();
      });
      document.addEventListener('keydown', function (e) {
        if (!zoomEl || zoomEl.hidden) return;
        if (e.key === 'Escape') closeZoom();
        if (e.key === 'ArrowRight') show(zoomEl._i + 1);
        if (e.key === 'ArrowLeft') show(zoomEl._i - 1);
      });
    }
    zoomEl._list = list;
    function show(n) {
      var L = zoomEl._list; n = (n + L.length) % L.length; zoomEl._i = n;
      zoomEl.innerHTML = '<img src="' + esc(L[n]) + '" alt="Foto ' + (n + 1) + ' di ' + L.length + '">' +
        '<button class="zbtn zclose" type="button" data-zclose aria-label="Chiudi">✕</button>' +
        (L.length > 1 ? '<button class="zbtn zprev" type="button" data-zstep="-1" aria-label="Foto precedente">‹</button><button class="zbtn znext" type="button" data-zstep="1" aria-label="Foto successiva">›</button><span class="zcount">' + (n + 1) + ' / ' + L.length + '</span>' : '');
      var c = zoomEl.querySelector('[data-zclose]'); if (c) c.focus();
    }
    zoomEl._show = show;
    zoomEl.hidden = false;
    document.body.style.overflow = 'hidden';
    show(i < 0 ? 0 : i);
  }
  function closeZoom() {
    if (!zoomEl) return;
    zoomEl.hidden = true; zoomEl.innerHTML = '';
    document.body.style.overflow = '';
    if (zoomFrom && zoomFrom.focus) zoomFrom.focus();
  }

  /* ---------- router ---------- */
  function section(h) {
    if (!h) return 'home';
    if (h.indexOf('partita-') === 0 || h === 'classifica') return 'partite';
    if (h.indexOf('giocatore-') === 0 || h === 'bolliti') return 'roster';
    if (h === 'stagione') return 'statistiche';
    return h;
  }
  function render(keepScroll) {
    var h = decodeURIComponent((location.hash || '').slice(1));
    var html;
    if (!h) html = home();
    else if (h === 'partite') { vista = 'calendario'; html = partite(); }
    else if (h === 'classifica') { vista = 'classifica'; html = classifica(); }
    else if (h.indexOf('partita-') === 0) html = partita(parseInt(h.slice(8), 10));
    else if (h === 'roster' || h === 'bolliti') html = bolliti();
    else if (h.indexOf('giocatore-') === 0) html = giocatore(h.slice(10));
    else if (h === 'statistiche' || h === 'stagione') html = stagione();
    else if (h === 'banchetti') html = banchetti();
    else html = home();
    app.innerHTML = html;
    var page = !h ? 'home' : h.indexOf('partita-') === 0 ? 'partita' : h.indexOf('giocatore-') === 0 ? 'giocatore' : (h === 'bolliti' ? 'roster' : h === 'stagione' ? 'statistiche' : h);
    app.setAttribute('data-page', page);
    var sec = section(h);
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      if (t.getAttribute('data-tab') === sec) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    var titles = { home: 'Bolliti Almenno', partite: 'Partite · Bolliti', roster: 'Roster · Bolliti', statistiche: 'Statistiche · Bolliti', banchetti: 'Banchetti · Bolliti' };
    document.title = titles[sec] || 'Bolliti Almenno';
    if (!keepScroll) window.scrollTo(0, 0);
  }
  app.addEventListener('click', function (e) {
    var ig = e.target.closest('[data-igload]');
    if (ig) { igLoad(ig.closest('.igbox')); return; }
    if (e.target.closest('[data-igalways]')) { igSetAuto(true); Array.prototype.forEach.call(document.querySelectorAll('.igbox:not(.loaded)'), igLoad); return; }
    if (e.target.closest('[data-ignever]')) { igSetAuto(false); render(true); return; }
    var bz = e.target.closest('[data-zoom]');
    if (bz) { openZoom(bz); return; }
    var bb = e.target.closest('[data-banch]');
    if (bb) { bsel = parseInt(bb.getAttribute('data-banch'), 10); render(true); var top = document.querySelector('#app .card'); if (top && top.scrollIntoView) top.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    var b = e.target.closest('[data-cat]');
    if (!b) return;
    if (b.hasAttribute('data-cat')) cat = b.getAttribute('data-cat');
    render(true);
  });
  window.addEventListener('hashchange', function () { bsel = null; closeZoom(); render(false); });
  render(false);
})();
