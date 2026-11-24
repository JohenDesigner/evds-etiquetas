// DESENHO: monta as folhas em MILÍMETROS como lista de peças.
// A mesma lista vira prévia (SVG) e PDF, então a prévia é igual ao impresso.
(function (g) {
  const PT = 72 / 25.4, M = 10; // M = margem da folha
  let medidor;
  function largura(s, mm, b) {
    if (!medidor) medidor = new g.jspdf.jsPDF({ unit: 'mm' });
    medidor.setFont('helvetica', b ? 'bold' : 'normal');
    medidor.setFontSize(mm * PT);
    return medidor.getTextWidth(s);
  }
  // Só caracteres que a fonte do PDF tem; o resto (emoji etc.) sai fora.
  const limpo = s => String(s).normalize('NFC').replace(/[^\x20-\x7E -ÿ–—‘’“”•…]/gu, '').trim();
  const contraste = h => {
    const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    return .2126 * v[0] + .7152 * v[1] + .0722 * v[2] > .36 ? '#111111' : '#FFFFFF';
  };
  function cortar(s, mm, b, w) {
    if (largura(s, mm, b) <= w) return s;
    while (s && largura(s + '…', mm, b) > w) s = s.slice(0, -1);
    return s.trim() + '…';
  }
  function quebrar(s, mm, b, w) {
    const out = [];
    let at = '';
    for (const p of s.split(/\s+/)) {
      const t = at ? at + ' ' + p : p;
      if (at && largura(t, mm, b) > w) { out.push(at); at = p; } else at = t;
    }
    if (at) out.push(at);
    return out;
  }
  // Tenta 1 linha, depois 2, diminuindo a letra até o mínimo; no limite corta com reticências.
  function encaixar(s, max, min, b, w, nl) {
    s = limpo(s);
    if (!s) return { mm: max, ls: [] };
    for (let k = 1; k <= nl; k++) {
      for (let mm = max; mm >= min - .001; mm -= .05) {
        // com espaço no texto, prefere 2 linhas grandes a 1 linha minúscula
        if (k === 1 && nl > 1 && mm < max * .8 && s.includes(' ')) break;
        const ls = quebrar(s, mm, b, w);
        if (ls.length <= k && ls.every(x => largura(x, mm, b) <= w)) return { mm, ls };
      }
    }
    const ls = quebrar(s, min, b, w), r = ls.slice(0, nl);
    if (ls.length > nl) r[nl - 1] = ls.slice(nl - 1).join(' ');
    return { mm: min, ls: r.map(x => cortar(x, min, b, w)) };
  }

  function etiqueta(c, cod, x, y, w, h) {
    const p = [], banda = h * .27, m = .7, larg = w - 2 * m;
    p.push({ t: 'rect', x, y, w, h, fill: '#FFFFFF' }, { t: 'rect', x, y, w, h: banda, fill: c.cor });
    const ck = encaixar(cod, banda * .74, 1.2, true, larg, 1);
    p.push({ t: 'text', x: x + w / 2, y: y + banda / 2 + ck.mm * .35, s: ck.ls[0] || '', mm: ck.mm, b: true, al: 'center', cor: contraste(c.cor) });
    const ic = h * .2;
    const desc = encaixar(c.desc, Math.min(h * .165, 2.6), 1.35, true, larg, 2);
    const loc = encaixar(c.local, Math.min(h * .13, 2.1), 1.2, false, larg, 1);
    const hTxt = desc.ls.length * desc.mm * 1.08 + loc.ls.length * loc.mm * 1.15;
    const resto = h - banda, comIcone = resto - hTxt >= ic + .7, total = (comIcone ? ic + .35 : 0) + hTxt;
    let cy = y + banda + Math.max(.2, (resto - total) / 2);
    if (comIcone) {
      p.push({ t: 'icon', n: g.Dados.TIPOS[c.tipo].icone, x: x + (w - ic) / 2, y: cy, d: ic, cor: '#1A1A1A' });
      cy += ic + .35;
    }
    for (const s of desc.ls) {
      p.push({ t: 'text', x: x + w / 2, y: cy + desc.mm * .78, s, mm: desc.mm, b: true, al: 'center', cor: '#111111' });
      cy += desc.mm * 1.08;
    }
    for (const s of loc.ls) {
      p.push({ t: 'text', x: x + w / 2, y: cy + loc.mm * .82, s, mm: loc.mm, al: 'center', cor: '#444444' });
      cy += loc.mm * 1.15;
    }
    p.push({ t: 'rect', x, y, w, h, stroke: '#9AA0A3', sw: .1 });
    return p;
  }
  function regua(p, x, y) {
    p.push({ t: 'line', x1: x, y1: y, x2: x + 50, y2: y, cor: '#111111', sw: .2 });
    for (let i = 0; i <= 50; i += 5) p.push({ t: 'line', x1: x + i, y1: y, x2: x + i, y2: y - (i % 10 ? 1.2 : 2.2), cor: '#111111', sw: .2 });
    p.push({ t: 'text', x: x + 53, y, s: 'Esta linha deve medir exatamente 50 mm. Imprima em "Tamanho real" ou 100% (não use "Ajustar à página").', mm: 2.4, cor: '#444444' });
  }

  function advertencia(x, y, w) {
    const A = g.Norma.ADVERTENCIA, p = [], textos = [];
    const mm = Math.max(1.9, w / 46), lh = mm * 1.32, pad = w * .04, hb = mm * 3.6;
    const xt = x + pad + mm * 1.9, wt = w - 2 * pad - mm * 1.9, esp = largura(' ', mm, false);
    let cy = y + hb + mm * 1.9;
    A.itens.forEach((partes, i) => {
      textos.push({ t: 'text', x: x + pad, y: cy, s: `${i + 1}.`, mm, b: true, cor: '#111111' });
      const pal = partes.flatMap(z => z.s.split(' ').map(s => ({ s, b: !!z.b })));
      const linhas = [];
      let ln = [], lw = 0;
      for (const z of pal) {
        const wz = largura(z.s, mm, z.b);
        if (ln.length && lw + esp + wz > wt) { linhas.push(ln); ln = []; lw = 0; }
        lw += (ln.length ? esp : 0) + wz;
        ln.push({ ...z, w: wz });
      }
      linhas.push(ln);
      linhas.forEach((L, k) => { // justificado, menos a última linha
        const soma = L.reduce((s, z) => s + z.w, 0);
        const e = k < linhas.length - 1 && L.length > 1 ? (wt - soma) / (L.length - 1) : esp;
        let cx = xt;
        for (const z of L) {
          textos.push({ t: 'text', x: cx, y: cy, s: z.s, mm, b: z.b, cor: '#111111' });
          cx += z.w + e;
        }
        cy += lh;
      });
      cy += mm * .7;
    });
    const h = cy + mm * 1.1 - y;
    p.push({ t: 'rect', x, y, w, h, fill: '#FFFFFF', stroke: '#111111', sw: .4 },
      { t: 'rect', x, y, w, h: hb, fill: '#FFDD00', stroke: '#111111', sw: .4 });
    for (const cx of [x + pad + hb * .4, x + w - pad - hb * .4]) {
      const a = hb * .36, yc = y + hb / 2;
      p.push({ t: 'poly', pts: [[cx, yc - a], [cx + a * 1.1, yc + a * .85], [cx - a * 1.1, yc + a * .85]], stroke: '#111111', sw: .35 },
        { t: 'text', x: cx, y: yc + a * .62, s: '!', mm: a * 1.25, b: true, al: 'center', cor: '#111111' });
    }
    p.push({ t: 'text', x: x + w / 2, y: y + hb / 2 + mm * .65, s: A.titulo, mm: mm * 1.8, b: true, al: 'center', cor: '#111111' });
    p.push(...textos, { t: 'text', x: x + w - pad, y: y + h - mm * .8, s: A.fonte, mm: mm * .8, al: 'right', cor: '#555555' });
    return { p, h };
  }

  // Controla as folhas: em qual página e em que altura (y) o desenho está.
  function folhas(W, H, topo) {
    const f = { W, H, pags: [], pg: null, y: 0, cabe: h => f.y + h <= H - M };
    f.nova = () => { f.pg = { w: W, h: H, p: [] }; f.pags.push(f.pg); f.y = M; if (topo) topo(f); };
    f.nova();
    return f;
  }
  const logo = (x, y, w) => ({ t: 'logo', x, y, w });
  const logoAlt = w => w * g.Logo.h / g.Logo.w;

  // Topo da folha de etiquetas: nome, régua de conferência e, se pedido, o logo.
  const topoEtiquetas = (q, comLogo) => f => {
    const wl = 26, livre = f.W - 2 * M - (comLogo ? wl + 4 : 0);
    f.pg.p.push({ t: 'text', x: M, y: M + 4, s: cortar(limpo('Etiquetas — ' + q.nome), 4, true, livre), mm: 4, b: true, cor: '#111111' });
    if (comLogo) f.pg.p.push(logo(f.W - M - wl, M - 1, wl));
    regua(f.pg.p, M, M + 10 + (comLogo ? 4 : 0));
    f.y = M + 17 + (comLogo ? 4 : 0);
  };
  function faixas(q, f) {
    const cod = g.Dados.numerar(q), util = f.W - 2 * M;
    q.linhas.forEach((l, i) => {
      // faixa que não cabe na largura da folha continua na faixa de baixo
      const fxs = [];
      let at = [], s = 0;
      for (const c of l.circuitos) {
        const w = c.mod * q.larg;
        if (at.length && s + w > util + .01) { fxs.push(at); at = []; s = 0; }
        at.push(c);
        s += w;
      }
      if (at.length) fxs.push(at);
      fxs.forEach((fx, k) => {
        if (!f.cabe(5 + q.alt + 1)) f.nova();
        f.pg.p.push({ t: 'text', x: M, y: f.y + 2, s: `Linha ${i + 1}` + (fxs.length > 1 ? ` (parte ${k + 1} de ${fxs.length})` : ''), mm: 2.4, cor: '#666666' });
        f.y += 4;
        let x = M;
        for (const c of fx) {
          f.pg.p.push(...etiqueta(c, cod[c.id], x, f.y, c.mod * q.larg, q.alt));
          x += c.mod * q.larg;
        }
        // marcas de corte
        for (const yy of [f.y, f.y + q.alt]) {
          f.pg.p.push({ t: 'line', x1: M - 3.5, y1: yy, x2: M - 1, y2: yy, cor: '#111111', sw: .15 },
            { t: 'line', x1: x + 1, y1: yy, x2: x + 3.5, y2: yy, cor: '#111111', sw: .15 });
        }
        f.y += q.alt + 5;
      });
    });
  }
  function tabela(q, f) {
    const cod = g.Dados.numerar(q), todos = q.linhas.flatMap(l => l.circuitos), w = q.largTabela, x = (f.W - w) / 2, B = 3; // B = folga até a linha de corte
    const e = w / 150, e2 = Math.max(.85, e), rh = 6.4 * e2, tx = 2.9 * e2, cols = [w * .14, w * .52, w * .17, w * .17];
    const wl = 27 * e, hl = logoAlt(wl), xt = x + wl + 4, wt = w - wl - 4;
    const tit = encaixar('Quadro de distribuição — identificação dos circuitos', 4.2 * e, 2.2, true, wt, 1);
    const partes = [['Local', q.nome], ['Responsável', q.responsavel], ['Contato', q.contato], ['Data', q.data.split('-').reverse().join('/')]]
      .filter(m => limpo(m[1])).map(m => `${m[0]}: ${limpo(m[1])}`).join(' • ');
    const meta = quebrar(partes, tx * .85, false, wt), hCab = Math.max(hl, 5.5 * e2 + meta.length * tx * 1.2) + 2 + rh;
    let topo;
    const abre = () => {
      topo = f.y;
      f.y += B;
      f.pg.p.push(logo(x, f.y, wl));
      let y = f.y + 4 * e2;
      f.pg.p.push({ t: 'text', x: xt, y, s: tit.ls[0], mm: tit.mm, b: true, cor: '#111111' });
      y += 1.2;
      for (const s of meta) { y += tx * 1.2; f.pg.p.push({ t: 'text', x: xt, y, s: cortar(s, tx * .85, false, wt), mm: tx * .85, cor: '#444444' }); }
      f.y += hCab - rh;
      let cx = x;
      f.pg.p.push({ t: 'rect', x, y: f.y, w, h: rh, fill: '#ECEEEF', stroke: '#8A9296', sw: .15 });
      ['CIRCUITO', 'DESCRIÇÃO', 'CORRENTE', 'SEÇÃO'].forEach((s, i) => {
        f.pg.p.push({ t: 'text', x: cx + cols[i] / 2, y: f.y + rh / 2 + tx * .26, s, mm: tx * .78, b: true, al: 'center', cor: '#111111' });
        cx += cols[i];
      });
      f.y += rh;
    };
    // contorno fino para cortar a peça inteira (logo + tabela)
    const fecha = () => { f.y += B; f.pg.p.push({ t: 'rect', x: x - B, y: topo, w: w + 2 * B, h: f.y - topo, stroke: '#9AA0A3', sw: .1 }); };
    const total = hCab + todos.length * rh + 2 * B;
    if (!f.cabe(total) && (total <= f.H - 2 * M || !f.cabe(hCab + 4 * rh + 2 * B))) f.nova();
    abre();
    for (const c of todos) {
      if (!f.cabe(rh + B)) { fecha(); f.nova(); abre(); }
      const y = f.y, base = y + rh / 2 + tx * .35, desc = [c.desc, c.local].map(limpo).filter(Boolean).join(' — ');
      const ck = encaixar(cod[c.id], tx, 1.5, true, cols[0] - 2, 1), d = encaixar(desc, tx, 1.7, false, cols[1] - 3, 1);
      f.pg.p.push({ t: 'rect', x, y, w: cols[0], h: rh, fill: c.cor },
        { t: 'text', x: x + cols[0] / 2, y: base, s: ck.ls[0] || '', mm: ck.mm, b: true, al: 'center', cor: contraste(c.cor) });
      if (d.ls[0]) f.pg.p.push({ t: 'text', x: x + cols[0] + 1.5, y: base, s: d.ls[0], mm: d.mm, cor: '#111111' });
      if (c.corrente) f.pg.p.push({ t: 'text', x: x + cols[0] + cols[1] + cols[2] / 2, y: base, s: c.corrente + ' A', mm: tx, al: 'center', cor: '#111111' });
      if (c.secao) f.pg.p.push({ t: 'text', x: x + w - cols[3] / 2, y: base, s: c.secao + ' mm²', mm: tx, al: 'center', cor: '#111111' });
      let cx = x;
      for (const cw of cols) { f.pg.p.push({ t: 'rect', x: cx, y, w: cw, h: rh, stroke: '#8A9296', sw: .15 }); cx += cw; }
      f.y += rh;
    }
    fecha();
    if (q.advertencia) {
      const wa = Math.max(90, Math.min(w, 130)), h = advertencia(0, 0, wa).h;
      if (f.cabe(6 + h)) f.y += 6; else f.nova();
      f.pg.p.push(...advertencia((f.W - wa) / 2, f.y, wa).p);
      f.y += h;
    }
  }
  function paginasEtiquetas(q) {
    const maior = Math.max(0, ...q.linhas.map(l => l.circuitos.reduce((s, c) => s + c.mod * q.larg, 0)));
    const f = maior > 210 - 2 * M ? folhas(297, 210, topoEtiquetas(q, true)) : folhas(210, 297, topoEtiquetas(q, true));
    faixas(q, f);
    return f.pags;
  }
  function paginasTabela(q) {
    const f = folhas(210, 297);
    tabela(q, f);
    return f.pags;
  }
  // Folha A4 em pé com tudo: etiquetas, tabela da porta e advertência. Se não couber, continua na página seguinte.
  function paginasA4(q) {
    let primeira = true;
    const f = folhas(210, 297, x => { if (primeira) topoEtiquetas(q, false)(x); primeira = false; });
    faixas(q, f);
    f.y += 1;
    tabela(q, f);
    return f.pags;
  }

  // Desenho do quadro montado (só para conferir na tela).
  function quadro(q) {
    const cod = g.Dados.numerar(q), lm = q.larg, al = q.alt, p = [];
    const L = Math.max(q.modLinha, ...q.linhas.map(l => l.circuitos.reduce((s, c) => s + c.mod, 0)));
    const W = L * lm + 30, passo = al + 62, H = q.linhas.length * passo + 14;
    p.push({ t: 'rect', x: .5, y: .5, w: W - 1, h: H - 1, fill: '#FDFDFC', stroke: '#B9BFC2', sw: .8, r: 4 });
    for (const [a, b] of [[7, 7], [W - 7, 7], [7, H - 7], [W - 7, H - 7]]) p.push({ t: 'circ', x: a, y: b, r: 2, fill: '#C9CED0' });
    q.linhas.forEach((l, i) => {
      const y = 16 + i * passo, yb = y + al + 1;
      let x = 15;
      p.push({ t: 'rect', x: 15, y: yb, w: L * lm, h: 45, fill: '#E3E6E7', stroke: '#9AA0A3', sw: .5 },
        { t: 'rect', x: 15, y: yb + 15, w: L * lm, h: 15, fill: '#C3C9CB' });
      for (const c of l.circuitos) {
        const w = c.mod * lm;
        p.push(...etiqueta(c, cod[c.id], x, y, w, al));
        p.push({ t: 'rect', x: x + .3, y: yb + .3, w: w - .6, h: 44.4, fill: '#F7F8F8', stroke: '#8A9296', sw: .4 });
        if (c.tipo !== 'reserva') {
          const a = Math.min(w - 6, c.mod > 1 ? w * .7 : 10);
          p.push({ t: 'rect', x: x + (w - a) / 2, y: yb + 15, w: a, h: 14, fill: c.tipo === 'dr' ? '#2874C8' : '#2B3236', r: 1.2 });
          const s = c.corrente ? (c.curva || '') + c.corrente + (c.curva ? '' : ' A') : '';
          if (s) p.push({ t: 'text', x: x + w / 2, y: yb + 10, s, mm: 4.6, b: true, al: 'center', cor: '#2B3236' });
          if (c.secao) p.push({ t: 'text', x: x + w / 2, y: yb + 38, s: c.secao + ' mm²', mm: 3.1, al: 'center', cor: '#5C666B' });
        }
        x += w;
      }
    });
    return { w: W, h: H, p };
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const formasLogo = ps => ps.map(f => `<path d="${f.d}" fill="${f.f}" fill-rule="${f.nz ? 'nonzero' : 'evenodd'}"${f.st ? ' stroke="#141515" stroke-width=".2"' : ''}/>`).join('');
  const logoSvg = () => `<svg viewBox="0 0 ${g.Logo.w} ${g.Logo.h}" role="img" aria-label="EVDS Serviços">${formasLogo(g.Logo.p)}</svg>`;
  function logoPdf(d, o) {
    const k = o.w / g.Logo.w;
    for (const f of g.Logo.p) {
      d.setFillColor(f.f);
      if (f.st) { d.setDrawColor('#141515'); d.setLineWidth(.2 * k); }
      for (const t of f.d.match(/[MLCZ][^MLCZ]*/g)) {
        const v = t.slice(1).trim().split(' ').map((z, i) => +z * k + (i % 2 ? o.y : o.x));
        if (t[0] === 'M') d.moveTo(...v); else if (t[0] === 'L') d.lineTo(...v); else if (t[0] === 'C') d.curveTo(...v); else d.close();
      }
      if (f.st) d.fillStrokeEvenOdd(); else if (f.nz) d.fill(); else d.fillEvenOdd();
    }
  }
  function svg(pg, rotulo) {
    const n = v => +v.toFixed(3);
    const at = o => `fill="${o.fill || 'none'}"` + (o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw}"` : '');
    const peca = o => {
      if (o.t === 'rect') return `<rect x="${n(o.x)}" y="${n(o.y)}" width="${n(o.w)}" height="${n(o.h)}"${o.r ? ` rx="${o.r}"` : ''} ${at(o)}/>`;
      if (o.t === 'line') return `<line x1="${n(o.x1)}" y1="${n(o.y1)}" x2="${n(o.x2)}" y2="${n(o.y2)}" stroke="${o.cor}" stroke-width="${o.sw}"/>`;
      if (o.t === 'circ') return `<circle cx="${n(o.x)}" cy="${n(o.y)}" r="${o.r}" ${at(o)}/>`;
      if (o.t === 'poly') return `<polygon points="${o.pts.map(a => n(a[0]) + ',' + n(a[1])).join(' ')}" ${at(o)} stroke-linejoin="round"/>`;
      if (o.t === 'icon') return g.Icones.svg(o.n, o.cor, `x="${n(o.x)}" y="${n(o.y)}" width="${n(o.d)}" height="${n(o.d)}"`);
      if (o.t === 'logo') return `<g transform="translate(${n(o.x)} ${n(o.y)}) scale(${o.w / g.Logo.w})">${formasLogo(g.Logo.p)}</g>`;
      const anc = o.al === 'center' ? 'middle' : o.al === 'right' ? 'end' : 'start';
      return `<text x="${n(o.x)}" y="${n(o.y)}" font-size="${n(o.mm)}"${o.b ? ' font-weight="700"' : ''} fill="${o.cor}" text-anchor="${anc}">${esc(o.s)}</text>`;
    };
    return `<svg viewBox="0 0 ${pg.w} ${pg.h}" role="img" aria-label="${esc(rotulo || 'Prévia')}" font-family="Helvetica, Arial, sans-serif">${pg.p.map(peca).join('')}</svg>`;
  }

  function pdf(pags, titulo) {
    const ori = pg => pg.w > pg.h ? 'landscape' : 'portrait';
    const d = new g.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: ori(pags[0]) });
    d.setProperties({ title: titulo });
    d.viewerPreferences({ PrintScaling: 'None' }); // pede ao leitor de PDF para não reduzir
    const caminho = pts => pts.slice(1).map((a, k) => [a[0] - pts[k][0], a[1] - pts[k][1]]);
    pags.forEach((pg, i) => {
      if (i) d.addPage('a4', ori(pg));
      d.setLineCap('round');
      d.setLineJoin('round');
      for (const o of pg.p) {
        const est = o.fill && o.stroke ? 'FD' : o.fill ? 'F' : 'S';
        if (o.fill) d.setFillColor(o.fill);
        if (o.stroke) { d.setDrawColor(o.stroke); d.setLineWidth(o.sw); }
        if (o.t === 'rect') d.rect(o.x, o.y, o.w, o.h, est);
        else if (o.t === 'line') { d.setDrawColor(o.cor); d.setLineWidth(o.sw); d.line(o.x1, o.y1, o.x2, o.y2); }
        else if (o.t === 'circ') d.circle(o.x, o.y, o.r, est);
        else if (o.t === 'poly') d.lines(caminho(o.pts), o.pts[0][0], o.pts[0][1], [1, 1], est, true);
        else if (o.t === 'logo') logoPdf(d, o);
        else if (o.t === 'icon') {
          const ic = g.Icones.I[o.n] || g.Icones.I.raio, k = o.d / 24;
          d.setDrawColor(o.cor);
          d.setFillColor(o.cor);
          d.setLineWidth(1.9 * k);
          for (const p of ic.p || []) d.lines(caminho(p), o.x + p[0][0] * k, o.y + p[0][1] * k, [k, k], 'S', false);
          for (const c of ic.c || []) d.circle(o.x + c[0] * k, o.y + c[1] * k, c[2] * k, 'S');
          for (const c of ic.f || []) d.circle(o.x + c[0] * k, o.y + c[1] * k, c[2] * k, 'F');
        } else if (o.t === 'text' && o.s) {
          d.setFont('helvetica', o.b ? 'bold' : 'normal');
          d.setFontSize(o.mm * PT);
          d.setTextColor(o.cor);
          d.text(o.s, o.x, o.y, { align: o.al || 'left' });
        }
      }
    });
    return d;
  }
  g.Desenho = { paginasEtiquetas, paginasTabela, paginasA4, logoSvg, quadro, svg, pdf, etiqueta, esc, contraste, limpo };
})(globalThis);
