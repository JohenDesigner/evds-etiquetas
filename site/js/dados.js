// DADOS: tipos de circuito, quadro de exemplo, limpeza e gravação no aparelho (localStorage).
(function (g) {
  const CORES = ['#C8202F', '#C9640A', '#2E9E4F', '#7D3C98', '#2874B2', '#14857A', '#B8467F', '#5B4B8A', '#8A5A2B', '#4A5560'];
  // codigo fixo = não entra na numeração 1, 2, 3...
  const TIPOS = {
    geral:     { nome: 'Geral',           desc: 'Disjuntor geral', icone: 'power',  cor: '#C8202F', mod: 2, codigo: 'GERAL' },
    dr:        { nome: 'DR',              desc: 'DR 30 mA',        icone: 'dr',     cor: '#C8202F', mod: 2, codigo: 'DR' },
    dps:       { nome: 'DPS',             desc: 'DPS',             icone: 'raio',   cor: '#4A5560', mod: 1, codigo: 'DPS' },
    luz:       { nome: 'Iluminação',      desc: 'Iluminação',      icone: 'luz',    cor: '#C9640A', mod: 1 },
    tomada:    { nome: 'Tomadas',         desc: 'Tomadas',         icone: 'tomada', cor: '#2E9E4F', mod: 1 },
    chuveiro:  { nome: 'Chuveiro',        desc: 'Chuveiro',        icone: 'chuveiro', cor: '#2874B2', mod: 2 },
    torneira:  { nome: 'Torneira elét.',  desc: 'Torneira elétrica', icone: 'torneira', cor: '#2874B2', mod: 2 },
    ar:        { nome: 'Ar-condicionado', desc: 'Ar-condicionado', icone: 'ar',     cor: '#2874B2', mod: 2 },
    micro:     { nome: 'Micro-ondas',     desc: 'Micro-ondas',     icone: 'micro',  cor: '#7D3C98', mod: 1 },
    forno:     { nome: 'Forno / cooktop', desc: 'Forno',           icone: 'forno',  cor: '#7D3C98', mod: 2 },
    geladeira: { nome: 'Geladeira',       desc: 'Geladeira',       icone: 'geladeira', cor: '#14857A', mod: 1 },
    lavar:     { nome: 'Máq. de lavar',   desc: 'Máq. de lavar',   icone: 'lavar',  cor: '#14857A', mod: 1 },
    louca:     { nome: 'Lava-louças',     desc: 'Lava-louças',     icone: 'lavar',  cor: '#14857A', mod: 1 },
    bomba:     { nome: 'Bomba / motor',   desc: 'Bomba',           icone: 'motor',  cor: '#8A5A2B', mod: 2 },
    portao:    { nome: 'Portão',          desc: 'Portão',          icone: 'portao', cor: '#8A5A2B', mod: 1 },
    carro:     { nome: 'Carro elétrico',  desc: 'Carregador veicular', icone: 'carro', cor: '#B8467F', mod: 2 },
    rede:      { nome: 'TV / internet',   desc: 'TV e internet',   icone: 'tela',   cor: '#5B4B8A', mod: 1 },
    reserva:   { nome: 'Reserva',         desc: 'Reserva',         icone: 'reserva', cor: '#4A5560', mod: 1, codigo: 'RES' },
    outro:     { nome: 'Outro',           desc: '',                icone: 'raio',   cor: '#B8467F', mod: 1 }
  };
  const SECOES = ['1,5', '2,5', '4', '6', '10', '16', '25', '35', '50'];
  const CORRENTES = ['2', '4', '6', '10', '16', '20', '25', '32', '40', '50', '63', '70', '80', '100', '125'];
  const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const idOk = v => typeof v === 'string' && /^[a-z0-9]{6,20}$/.test(v);
  const hoje = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const txt = (v, max) => (v == null ? '' : String(v)).replace(/[\u0000-\u001f]/g, ' ').slice(0, max);
  const num = (v, min, max, padrao) => {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
  };

  function limparCircuito(c) {
    c = c && typeof c === 'object' ? c : {};
    const tipo = Object.hasOwn(TIPOS, c.tipo) ? c.tipo : 'outro';
    return {
      id: idOk(c.id) ? c.id : id(), tipo,
      codigo: txt(c.codigo, 8), desc: txt(c.desc, 40), local: txt(c.local, 40),
      mod: Math.round(num(c.mod, 1, 6, 1)),
      curva: ['B', 'C', 'D'].includes(c.curva) ? c.curva : '',
      corrente: CORRENTES.includes(String(c.corrente)) ? String(c.corrente) : '',
      secao: SECOES.includes(String(c.secao)) ? String(c.secao) : '',
      cor: /^#[0-9a-f]{6}$/i.test(c.cor) ? c.cor : TIPOS[tipo].cor
    };
  }
  function circuito(tipo, extra) {
    if (!Object.hasOwn(TIPOS, tipo)) tipo = 'outro';
    const t = TIPOS[tipo], semCurva = ['dr', 'dps', 'reserva'].includes(tipo);
    return limparCircuito(Object.assign({ id: id(), tipo, desc: t.desc, mod: t.mod, curva: semCurva ? '' : 'C', cor: t.cor }, extra));
  }
  // Tudo que entra (inclusive arquivo de cópia importado) passa por aqui.
  function limpar(q) {
    q = q && typeof q === 'object' ? q : {};
    return {
      id: idOk(q.id) ? q.id : id(),
      nome: txt(q.nome, 60) || 'Novo quadro', responsavel: txt(q.responsavel, 60), contato: txt(q.contato, 60),
      data: /^\d{4}-\d{2}-\d{2}$/.test(q.data) ? q.data : hoje(),
      larg: num(q.larg, 15, 30, 17.5), alt: num(q.alt, 8, 30, 12),
      modLinha: Math.round(num(q.modLinha, 2, 36, 12)), largTabela: num(q.largTabela, 90, 190, 150),
      advertencia: q.advertencia !== false, mudou: num(q.mudou, 0, 9e15, Date.now()),
      linhas: (Array.isArray(q.linhas) && q.linhas.length ? q.linhas : [{}]).slice(0, 12).map(l => ({
        id: l && idOk(l.id) ? l.id : id(),
        circuitos: (l && Array.isArray(l.circuitos) ? l.circuitos : []).slice(0, 60).map(limparCircuito)
      }))
    };
  }
  function exemplo() {
    const c = circuito;
    return limpar({
      nome: 'Exemplo — Casa térrea', responsavel: 'EVDS Serviços',
      linhas: [
        { circuitos: [
          c('geral', { local: 'Trifásico', mod: 3, corrente: '63', secao: '16' }),
          c('dr', { local: 'Geral', corrente: '63', mod: 4 }),
          c('luz', { local: 'Sala, Cozinha', corrente: '10', secao: '1,5' }),
          c('luz', { local: 'Quartos', corrente: '10', secao: '1,5' }),
          c('tomada', { local: 'Sala, Quartos', corrente: '20', secao: '2,5' })
        ] },
        { circuitos: [
          c('tomada', { local: 'Cozinha', corrente: '20', secao: '2,5' }),
          c('chuveiro', { local: 'Banheiro', corrente: '32', secao: '6' }),
          c('ar', { local: 'Suíte', corrente: '16', secao: '2,5' }),
          c('micro', { local: 'Cozinha', corrente: '20', secao: '2,5' }),
          c('lavar', { local: 'Área de serviço', corrente: '20', secao: '2,5' })
        ] }
      ]
    });
  }
  function numerar(q) {
    const m = {};
    let n = 0;
    for (const l of q.linhas) for (const c of l.circuitos) m[c.id] = c.codigo.trim() || TIPOS[c.tipo].codigo || String(++n);
    return m;
  }
  const CHAVE = 'etiqueta-quadro-v1';
  function carregar() {
    try { const v = JSON.parse(localStorage.getItem(CHAVE)); return Array.isArray(v) ? v.map(limpar) : []; } catch (e) { return []; }
  }
  function gravar(lista) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); return true; } catch (e) { return false; }
  }
  g.Dados = { CORES, TIPOS, SECOES, CORRENTES, id, hoje, circuito, limpar, limparCircuito, exemplo, numerar, carregar, gravar };
})(globalThis);
