// APP: telas, cliques e botões. Usa Dados, Norma, Icones e Desenho.
(function () {
  const D = Dados, { esc, svg, contraste } = Desenho;
  const $ = s => document.querySelector(s);
  const tela = $('#tela'), folha = $('#folha'), recado = $('#recado'), arquivo = $('#arquivo');
  const copia = o => JSON.parse(JSON.stringify(o));
  let lista = D.carregar(), atual = null, aba = 'circuitos', relogio;

  const q = () => lista.find(x => x.id === atual);
  const modulos = l => l.circuitos.reduce((s, c) => s + c.mod, 0);
  const virg = n => String(n).replace('.', ',');
  const temCircuito = () => q().linhas.some(l => l.circuitos.length);

  function salvar() {
    if (q()) q().mudou = Date.now();
    if (!D.gravar(lista)) avisar('Não consegui gravar neste aparelho. Faça uma cópia de segurança agora.');
  }
  function avisar(texto, rotulo, acao) {
    clearTimeout(relogio);
    recado.innerHTML = `<span>${esc(texto)}</span>` + (rotulo ? `<button type="button">${esc(rotulo)}</button>` : '');
    if (rotulo) recado.querySelector('button').onclick = () => { recado.className = ''; acao(); };
    recado.className = 'vendo';
    relogio = setTimeout(() => { recado.className = ''; }, rotulo ? 7000 : 4500);
  }
  // Muda a lista e oferece "Desfazer".
  function comDesfazer(texto, fn) {
    const antes = copia(lista), onde = atual;
    fn();
    salvar();
    pintar();
    avisar(texto, 'Desfazer', () => { lista = antes; atual = onde; salvar(); pintar(); });
  }

  // ---------- TELA INICIAL ----------
  function telaInicio() {
    const itens = [...lista].sort((a, b) => b.mudou - a.mudou).map(o => {
      const cs = o.linhas.flatMap(l => l.circuitos);
      return `<article class="obra"><button class="abrir" data-acao="abrir" data-id="${o.id}"><b>${esc(o.nome)}</b>
        <small>${cs.length} ${cs.length === 1 ? 'etiqueta' : 'etiquetas'}, ${o.data.split('-').reverse().join('/')}</small>
        <span class="cores">${cs.slice(0, 16).map(c => `<i style="background:${c.cor}"></i>`).join('')}</span></button>
        <button class="fantasma" data-acao="menu-obra" data-id="${o.id}" aria-label="Opções de ${esc(o.nome)}">•••</button></article>`;
    }).join('');
    return `<header class="topo"><div class="dentro"><div class="linha"><div class="marca">${Desenho.logoSvg()}
        <div><h1>Etiquetas de quadro</h1><p>PDF A4 pronto para imprimir</p></div></div></div></div></header>
      <main>${itens ? `<div class="lista">${itens}</div>` : `<div class="vazio"><h2>Nenhum quadro ainda</h2>
        <p>Crie um quadro, coloque os circuitos e baixe o PDF na medida certa para imprimir.</p>
        <div class="acoes"><button class="btn" data-acao="exemplo">Abrir um exemplo pronto</button></div></div>`}
        <div class="acoes"><button class="btn" data-acao="exportar" ${lista.length ? '' : 'disabled'}>Salvar cópia de segurança</button>
        <button class="btn" data-acao="importar">Restaurar cópia</button></div></main>
      <div class="rodape"><div class="dentro"><button class="btn cheio" data-acao="novo">+ Novo quadro</button></div></div>`;
  }

  // ---------- TELA DO QUADRO ----------
  function cartao(c, cod) {
    const dado = [c.corrente && (c.curva + c.corrente + (c.curva ? '' : ' A')), c.secao && c.secao + ' mm²', c.mod + (c.mod > 1 ? ' módulos' : ' módulo')].filter(Boolean).join(', ');
    return `<button class="cartao" data-acao="editar" data-id="${c.id}"><span class="cab" style="background:${c.cor};color:${contraste(c.cor)}">${esc(cod)}${Icones.svg(D.TIPOS[c.tipo].icone)}</span>
      <span class="corpo"><b>${esc(c.desc || 'Sem descrição')}</b><small>${esc(c.local)}</small><small class="dado">${esc(dado)}</small></span></button>`;
  }
  function abaCircuitos(o) {
    const cod = D.numerar(o), av = Norma.conferir(o), erros = av.filter(a => a.nivel === 'erro').length;
    const linhas = o.linhas.map((l, i) => `<section class="trilho"><header><h2>Linha ${i + 1}</h2>
        <span class="${modulos(l) > o.modLinha ? 'passou' : ''}">${modulos(l)} de ${o.modLinha} módulos</span>
        ${o.linhas.length > 1 ? `<button class="fantasma" data-acao="apagar-linha" data-id="${l.id}">Apagar linha</button>` : ''}</header>
        <div class="cartoes">${l.circuitos.map(c => cartao(c, cod[c.id])).join('')}
        <button class="mais" data-acao="adicionar" data-id="${l.id}" aria-label="Adicionar circuito na linha ${i + 1}">+</button></div></section>`).join('');
    const conf = !temCircuito() ? '' : `<details class="confere" ${erros ? 'open' : ''}><summary>Conferência do quadro
        <span class="pino ${erros ? 'erro' : av.length ? '' : 'bom'}">${av.length ? av.length + (av.length === 1 ? ' ponto' : ' pontos') : 'tudo certo'}</span></summary>
        ${av.length ? `<ul>${av.map(a => `<li class="${a.nivel}">${esc(a.texto)}</li>`).join('')}</ul>` : ''}
        <p>Ajuda de referência (cabo de cobre, PVC, em eletroduto, 30 °C, sem agrupamento). Quem decide é o profissional responsável.</p></details>`;
    return linhas + `<div class="acoes" style="margin:0 0 18px"><button class="btn" data-acao="nova-linha" ${o.linhas.length >= 12 ? 'disabled' : ''}>+ Nova linha</button></div>` + conf;
  }
  const paginas = pags => pags.map((p, i) => `<div class="pagina">${svg(p, 'Folha ' + (i + 1))}</div>`).join('');
  const semNada = '<div class="vazio"><h2>Falta colocar os circuitos</h2><p>Adicione os circuitos na aba Circuitos e a prévia aparece aqui.</p></div>';
  function abaEtiquetas(o) {
    if (!temCircuito()) return semNada;
    return `<section><h2 style="margin-bottom:8px">Como fica no quadro</h2><div class="rolo">${svg(Desenho.quadro(o), 'Desenho do quadro')}</div></section>
      <section class="previa"><h2>Folha para imprimir (A4)</h2>${paginas(Desenho.paginasEtiquetas(o))}</section>`;
  }
  function abaPorta(o) {
    if (!temCircuito()) return semNada;
    return `<div class="ajuste"><label><input type="checkbox" data-campo="advertencia" ${o.advertencia ? 'checked' : ''}> Incluir a advertência</label>
      <label>Largura <input type="range" min="90" max="190" step="5" value="${o.largTabela}" data-campo="largTabela"><output>${o.largTabela} mm</output></label></div>
      <section class="previa" id="previa-porta">${paginas(Desenho.paginasTabela(o))}</section>`;
  }
  function abaA4(o) {
    if (!temCircuito()) return semNada;
    const av = Norma.conferir(o).length, pags = Desenho.paginasA4(o);
    return (av ? `<p class="nota">A conferência tem ${av} ${av === 1 ? 'ponto' : 'pontos'} para olhar antes de imprimir. <button data-acao="aba" data-id="circuitos">Ver pontos</button></p>` : '') +
      `<p class="dica">${pags.length === 1 ? 'Tudo em 1 folha A4.' : pags.length + ' folhas A4.'} Imprima em tamanho real (100%).</p>${paginas(pags)}`;
  }
  function telaQuadro(o) {
    const abas = [['circuitos', 'Circuitos'], ['etiquetas', 'Etiquetas'], ['porta', 'Porta'], ['a4', 'Folha A4']], vazio = !temCircuito();
    const rod = aba === 'circuitos'
      ? `<button class="btn cheio" data-acao="adicionar">+ Adicionar circuito</button><button class="btn verde" data-acao="aba" data-id="a4" ${vazio ? 'disabled' : ''}>Ver PDF A4</button>`
      : `<button class="btn" data-acao="imprimir" ${vazio ? 'disabled' : ''}>Imprimir</button><button class="btn verde" data-acao="baixar" ${vazio ? 'disabled' : ''}>Baixar PDF</button>`;
    return `<header class="topo"><div class="dentro"><div class="linha"><button class="fantasma" data-acao="inicio">‹ Meus quadros</button>
        <button class="fantasma" data-acao="config">Ajustes</button></div><h1>${esc(o.nome)}</h1><p>Módulo de ${virg(o.larg)} mm, etiqueta com ${virg(o.alt)} mm de altura</p>
        <div class="abas" role="tablist">${abas.map(([k, n]) => `<button role="tab" aria-selected="${aba === k}" data-acao="aba" data-id="${k}">${n}</button>`).join('')}</div></div></header>
      <main>${aba === 'circuitos' ? abaCircuitos(o) : aba === 'etiquetas' ? abaEtiquetas(o) : aba === 'porta' ? abaPorta(o) : abaA4(o)}</main>
      <div class="rodape"><div class="dentro">${rod}</div></div>`;
  }
  function pintar() {
    const o = q();
    tela.innerHTML = o ? telaQuadro(o) : telaInicio();
    document.title = o ? o.nome + ' | EVDS Etiquetas' : 'EVDS Etiquetas';
  }
  function ir(id, a = 'circuitos') {
    atual = id;
    aba = a;
    const h = id ? '#' + id : '#';
    if (location.hash !== h && (id || location.hash)) history.pushState(null, '', id ? h : location.pathname + location.search);
    pintar();
    scrollTo(0, 0);
  }
  addEventListener('popstate', () => { if (folha.open) folha.close(); atual = location.hash.slice(1) || null; aba = 'circuitos'; pintar(); });

  // ---------- JANELAS ----------
  function abrir(titulo, miolo, pe) {
    folha.innerHTML = `<header><h2 id="folha-titulo">${esc(titulo)}</h2><button class="fantasma" data-acao="fechar">Fechar</button></header><div class="miolo">${miolo}</div>${pe ? `<footer>${pe}</footer>` : ''}`;
    if (!folha.open) folha.showModal();
    folha.querySelector('.miolo').scrollTop = 0;
  }
  const op = (v, sel, rot) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(rot == null ? v : rot)}</option>`;
  const campo = (rot, html) => `<label class="campo"><span>${rot}</span>${html}</label>`;
  const texto = (n, v, max, extra = '') => `<input name="${n}" value="${esc(v)}" maxlength="${max}" autocomplete="off" ${extra}>`;

  function escolherTipo(idLinha) {
    abrir('O que esse disjuntor protege?', `<div class="tipos">${Object.entries(D.TIPOS).map(([k, t]) => `<button data-acao="tipo" data-id="${k}" data-linha="${idLinha}">${Icones.svg(t.icone, t.cor)}${esc(t.nome)}</button>`).join('')}</div>`);
  }
  function achar(id) {
    for (const l of q().linhas) { const i = l.circuitos.findIndex(c => c.id === id); if (i >= 0) return { l, i, c: l.circuitos[i] }; }
  }
  function amostra(c, cod) {
    const o = q(), w = c.mod * o.larg;
    return svg({ w, h: o.alt, p: Desenho.etiqueta(c, cod, 0, 0, w, o.alt) }, 'Prévia da etiqueta');
  }
  function editar(id) {
    const { c, l, i } = achar(id), n = q().linhas.length;
    abrir('Circuito ' + D.numerar(q())[id], `<form id="form-circ" data-id="${id}" class="miolo" style="padding:0;overflow:visible">
      <div class="amostra" id="amostra"></div>
      ${campo('Nome na etiqueta', texto('desc', c.desc, 40, 'placeholder="Ex.: Tomadas"'))}
      ${campo('Cômodo ou local', texto('local', c.local, 40, 'placeholder="Ex.: Sala, Quartos"'))}
      <div class="dupla">${campo('Corrente', `<select name="corrente">${op('', c.corrente, 'Escolher')}${D.CORRENTES.map(x => op(x, c.corrente, x + ' A')).join('')}</select>`)}
        ${campo('Cabo', `<select name="secao">${op('', c.secao, 'Escolher')}${D.SECOES.map(x => op(x, c.secao, x + ' mm²')).join('')}</select>`)}</div>
      <div class="dupla">${campo('Largura', `<select name="mod">${[1, 2, 3, 4, 5, 6].map(x => op(x, c.mod, x + (x > 1 ? ' módulos' : ' módulo'))).join('')}</select>`)}
        ${campo('Curva', `<select name="curva">${op('', c.curva, 'Nenhuma')}${['B', 'C', 'D'].map(x => op(x, c.curva)).join('')}</select>`)}</div>
      <div class="dupla">${campo('Desenho', `<select name="tipo">${Object.entries(D.TIPOS).map(([k, t]) => op(k, c.tipo, t.nome)).join('')}</select>`)}
        ${campo('Código', texto('codigo', c.codigo, 8, 'placeholder="Automático"'))}</div>
      <div class="campo"><span>Cor</span><div class="cores-op">${D.CORES.map(k => `<button type="button" data-acao="cor" data-id="${k}" style="background:${k}" aria-label="Cor ${k}" aria-pressed="${k === c.cor}"></button>`).join('')}</div></div>
      <div class="campo"><span>Posição</span><div class="mover">
        <button type="button" class="btn" data-acao="mover" data-id="-1" ${i ? '' : 'disabled'}>‹ Para a esquerda</button>
        <button type="button" class="btn" data-acao="mover" data-id="1" ${i < l.circuitos.length - 1 ? '' : 'disabled'}>Para a direita ›</button></div>
        ${n > 1 ? `<select name="linha">${q().linhas.map((x, k) => op(x.id, l.id, 'Linha ' + (k + 1))).join('')}</select>` : ''}</div></form>`,
      `<button class="btn perigo" data-acao="apagar" data-id="${id}">Apagar</button><button class="btn" data-acao="duplicar" data-id="${id}">Duplicar</button><button class="btn cheio" data-acao="fechar">Pronto</button>`);
    pintarAmostra(id);
  }
  function pintarAmostra(id) {
    const cod = D.numerar(q())[id];
    $('#amostra').innerHTML = amostra(achar(id).c, cod);
    $('#folha-titulo').textContent = 'Circuito ' + cod;
  }
  function config() {
    const o = q();
    abrir('Ajustes do quadro', `<form id="form-conf" class="miolo" style="padding:0;overflow:visible">
      ${campo('Nome ou endereço da obra', texto('nome', o.nome, 60))}
      ${campo('Eletricista responsável', texto('responsavel', o.responsavel, 60))}
      ${campo('Telefone <em>(opcional)</em>', texto('contato', o.contato, 60))}
      ${campo('Data', `<input type="date" name="data" value="${o.data}">`)}
      <div class="dupla">${campo('Largura do módulo (mm)', texto('larg', virg(o.larg), 5, 'inputmode="decimal"'))}
        ${campo('Altura da etiqueta (mm)', texto('alt', virg(o.alt), 5, 'inputmode="decimal"'))}</div>
      ${campo('Módulos por linha do quadro', texto('modLinha', o.modLinha, 2, 'inputmode="numeric"'))}
      <p style="color:var(--suave);font-size:.88rem">O disjuntor padrão DIN tem 17,5 mm por polo. Se o seu quadro usa 18 mm, mude aqui. Aceita de 15 a 30 mm de largura e de 8 a 30 mm de altura.</p></form>`,
      '<button class="btn cheio" data-acao="fechar">Pronto</button>');
  }

  // ---------- PDF ----------
  function montarPdf(qual) {
    const o = q(), pags = { etiquetas: Desenho.paginasEtiquetas, porta: Desenho.paginasTabela, a4: Desenho.paginasA4 }[qual](o);
    const base = o.nome.normalize('NFD').replace(/[^\w ]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'quadro';
    return { doc: Desenho.pdf(pags, o.nome), nome: `${qual === 'a4' ? 'quadro-a4' : qual}-${base}.pdf` };
  }
  function baixarBlob(blob, nome) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  async function enviarPdf(qual) {
    const { doc, nome } = montarPdf(qual), blob = doc.output('blob'), arq = new File([blob], nome, { type: 'application/pdf' });
    // no celular abre o menu de compartilhar (WhatsApp, arquivos...); no PC baixa direto
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [arq] })) {
      try { await navigator.share({ files: [arq], title: nome }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    baixarBlob(blob, nome);
    avisar('PDF baixado: ' + nome);
  }
  function imprimir(qual) {
    const { doc, nome } = montarPdf(qual);
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output('blob'));
    if (window.open(url, '_blank')) setTimeout(() => URL.revokeObjectURL(url), 300000);
    else { baixarBlob(doc.output('blob'), nome); avisar('O navegador bloqueou a janela, então baixei o PDF.'); }
  }

  // ---------- CLIQUES ----------
  const acoes = {
    inicio: () => ir(null),
    abrir: id => ir(id),
    novo: () => { const ult = [...lista].sort((a, b) => b.mudou - a.mudou)[0] || {}; const o = D.limpar({ nome: 'Novo quadro', responsavel: ult.responsavel || 'EVDS Serviços', contato: ult.contato, larg: ult.larg, alt: ult.alt, modLinha: ult.modLinha }); lista.push(o); salvar(); ir(o.id); config(); },
    exemplo: () => { const o = D.exemplo(); lista.push(o); salvar(); ir(o.id); },
    'menu-obra': id => abrir(lista.find(x => x.id === id).nome, `<button class="btn" data-acao="copiar-obra" data-id="${id}">Duplicar quadro</button><button class="btn perigo" data-acao="apagar-obra" data-id="${id}">Apagar quadro</button>`),
    'copiar-obra': id => {
      folha.close();
      const o = copia(lista.find(x => x.id === id));
      o.id = D.id(); o.nome = (o.nome + ' (cópia)').slice(0, 60); o.mudou = Date.now();
      o.linhas.forEach(l => { l.id = D.id(); l.circuitos.forEach(c => { c.id = D.id(); }); });
      lista.push(o); salvar(); pintar();
    },
    'apagar-obra': id => { folha.close(); comDesfazer('Quadro apagado.', () => { lista = lista.filter(x => x.id !== id); }); },
    exportar: () => { baixarBlob(new Blob([JSON.stringify({ app: 'etiqueta-quadro', quadros: lista }, null, 1)], { type: 'application/json' }), `copia-etiqueta-quadro-${D.hoje()}.json`); avisar('Cópia salva na pasta de downloads.'); },
    importar: () => arquivo.click(),
    config,
    aba: k => { aba = k; pintar(); scrollTo(0, 0); },
    adicionar: id => escolherTipo(id || (q().linhas.find(l => modulos(l) < q().modLinha) || q().linhas.at(-1)).id),
    tipo: (k, el) => { const c = D.circuito(k); q().linhas.find(l => l.id === el.dataset.linha).circuitos.push(c); salvar(); pintar(); editar(c.id); },
    editar,
    cor: (k, el) => { const id = $('#form-circ').dataset.id; achar(id).c.cor = k; folha.querySelectorAll('.cores-op button').forEach(b => b.setAttribute('aria-pressed', b === el)); salvar(); pintar(); pintarAmostra(id); },
    mover: d => { const id = $('#form-circ').dataset.id, { l, i, c } = achar(id); l.circuitos.splice(i, 1); l.circuitos.splice(i + +d, 0, c); salvar(); pintar(); editar(id); folha.querySelector('.mover').scrollIntoView({ block: 'center' }); },
    duplicar: id => { const { l, i, c } = achar(id), n = { ...copia(c), id: D.id(), codigo: '' }; l.circuitos.splice(i + 1, 0, n); salvar(); pintar(); editar(n.id); avisar('Circuito duplicado. Você está editando a cópia.'); },
    apagar: id => { folha.close(); comDesfazer('Circuito apagado.', () => { const { l, i } = achar(id); l.circuitos.splice(i, 1); }); },
    'nova-linha': () => { q().linhas.push({ id: D.id(), circuitos: [] }); salvar(); pintar(); },
    'apagar-linha': id => comDesfazer('Linha apagada.', () => { q().linhas = q().linhas.filter(l => l.id !== id); }),
    baixar: () => enviarPdf(aba),
    imprimir: () => imprimir(aba),
    fechar: () => folha.close()
  };
  document.addEventListener('click', e => {
    if (e.target === folha) { folha.close(); return; }
    const el = e.target.closest('[data-acao]');
    if (el && !el.disabled) acoes[el.dataset.acao](el.dataset.id, el);
  });
  document.addEventListener('submit', e => { e.preventDefault(); folha.close(); });
  folha.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); e.target.blur(); folha.close(); } });
  folha.addEventListener('close', () => { folha.innerHTML = ''; pintar(); });

  document.addEventListener('input', e => {
    const el = e.target;
    if (el.closest('#form-circ')) {
      const id = el.closest('form').dataset.id, { l, i, c } = achar(id);
      if (el.name === 'linha') {
        l.circuitos.splice(i, 1);
        q().linhas.find(x => x.id === el.value).circuitos.push(c);
        salvar(); pintar(); editar(id);
        return;
      }
      if (el.name === 'tipo' && c.cor === D.TIPOS[c.tipo].cor) c.cor = D.TIPOS[el.value].cor;
      c[el.name] = el.name === 'mod' ? +el.value : el.value;
      folha.querySelectorAll('.cores-op button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === c.cor));
      salvar(); pintarAmostra(id);
    } else if (el.closest('#form-conf')) {
      // números só passam a valer quando estão dentro do limite, para não mudar enquanto se digita
      const k = el.name, o = q();
      const teste = D.limpar({ ...o, [k]: el.value });
      if (['larg', 'alt', 'modLinha'].includes(k) && parseFloat(el.value.replace(',', '.')) !== teste[k]) return;
      o[k] = teste[k];
      salvar();
    } else if (el.dataset.campo) {
      const o = q();
      o[el.dataset.campo] = el.type === 'checkbox' ? el.checked : +el.value;
      if (el.type === 'range') el.nextElementSibling.textContent = el.value + ' mm';
      $('#previa-porta').innerHTML = paginas(Desenho.paginasTabela(o));
      salvar();
    }
  });
  // Saiu do campo com número fora do limite: mostra o valor que está valendo.
  document.addEventListener('change', e => {
    const k = e.target.name;
    if (e.target.closest('#form-conf') && ['larg', 'alt', 'modLinha'].includes(k)) {
      const digitado = parseFloat(e.target.value.replace(',', '.'));
      e.target.value = virg(q()[k]);
      if (digitado !== q()[k]) avisar('Medida fora do limite. Mantive ' + virg(q()[k]) + '.');
    }
  });
  arquivo.addEventListener('change', async () => {
    const f = arquivo.files[0];
    arquivo.value = '';
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (!j || j.app !== 'etiqueta-quadro' || !Array.isArray(j.quadros)) throw new Error('formato');
      const novos = j.quadros.map(D.limpar), ids = new Set(novos.map(x => x.id)), trocados = lista.filter(x => ids.has(x.id)).length;
      comDesfazer(`${novos.length} quadro(s) restaurado(s)` + (trocados ? `, ${trocados} substituído(s).` : '.'), () => { lista = [...lista.filter(x => !ids.has(x.id)), ...novos]; });
    } catch (e) { avisar('Esse arquivo não é uma cópia de segurança deste app.'); }
  });

  atual = location.hash.slice(1) || null;
  pintar();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js');
})();
