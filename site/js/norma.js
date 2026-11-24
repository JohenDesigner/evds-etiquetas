// NORMA: texto da etiqueta de advertência e conferências.
// As conferências são AVISOS de ajuda; não substituem o projeto nem o profissional.
(function (g) {
  const ADVERTENCIA = {
    titulo: 'ADVERTÊNCIA',
    itens: [
      [{ s: 'Quando um disjuntor ou fusível atua, desligando algum circuito ou a instalação inteira, a causa pode ser uma sobrecarga ou um curto-circuito. Desligamentos frequentes são sinal de sobrecarga. Por isso, NUNCA troque seus disjuntores ou fusíveis por outros de maior corrente (maior amperagem) simplesmente. Como regra, a troca de um disjuntor ou fusível por outro de maior corrente requer, antes, a troca dos fios e cabos elétricos, por outros de maior seção (bitola).' }],
      [
        { s: 'Da mesma forma, NUNCA desative ou remova a chave automática de proteção contra choques elétricos (dispositivo DR), mesmo em caso de desligamentos sem causa aparente. Se os desligamentos forem frequentes e, principalmente, se as tentativas de religar a chave não tiverem êxito, isso significa, muito provavelmente, que a instalação elétrica apresenta anomalias internas, que só podem ser identificadas e corrigidas por profissionais qualificados.' },
        { s: 'A DESATIVAÇÃO OU REMOÇÃO DA CHAVE SIGNIFICA A ELIMINAÇÃO DE MEDIDA PROTETORA CONTRA CHOQUES ELÉTRICOS E RISCO DE VIDA PARA OS USUÁRIOS DA INSTALAÇÃO.', b: true }
      ]
    ],
    fonte: 'ABNT NBR 5410 · item 6.5.4.10'
  };
  // Capacidade (A): cobre, PVC 70 °C, método B1, 30 °C, sem agrupamento. [2 condutores carregados, 3 condutores carregados]
  const IZ = {
    '1,5': [17.5, 15.5], '2,5': [24, 21], '4': [32, 28], '6': [41, 36], '10': [57, 50],
    '16': [76, 68], '25': [101, 89], '35': [125, 110], '50': [151, 134]
  };
  const n = s => parseFloat(String(s).replace(',', '.'));
  const soma = l => l.circuitos.reduce((s, c) => s + c.mod, 0);

  function conferir(q) {
    const cod = g.Dados.numerar(q), avisos = [], todos = q.linhas.flatMap(l => l.circuitos);
    const add = (nivel, texto) => avisos.push({ nivel, texto });
    if (!todos.length) return avisos;
    q.linhas.forEach((l, i) => {
      if (soma(l) > q.modLinha) add('erro', `Linha ${i + 1}: ${soma(l)} módulos, mas a linha do quadro tem ${q.modLinha}.`);
    });
    for (const c of todos) {
      const nome = `Circuito ${cod[c.id]}${c.desc ? ' (' + c.desc + ')' : ''}`;
      if (c.secao && c.corrente && !['dr', 'dps', 'reserva'].includes(c.tipo)) {
        const iz = IZ[c.secao][c.mod >= 3 ? 1 : 0];
        if (n(c.corrente) > iz) add('erro', `${nome}: disjuntor de ${c.corrente} A é maior que a capacidade de referência do cabo de ${c.secao} mm² (${String(iz).replace('.', ',')} A).`);
      }
      if (c.secao && c.tipo === 'tomada' && n(c.secao) < 2.5) add('erro', `${nome}: tomadas pedem cabo de pelo menos 2,5 mm².`);
      if (!c.desc.trim()) add('aviso', `${nome}: sem descrição.`);
      if (!['dps', 'reserva'].includes(c.tipo) && !c.corrente) add('aviso', `${nome}: falta a corrente.`);
      if (!['dr', 'dps', 'reserva'].includes(c.tipo) && !c.secao) add('aviso', `${nome}: falta a seção do cabo.`);
    }
    const vistos = {};
    for (const c of todos) if (!g.Dados.TIPOS[c.tipo].codigo || c.codigo.trim()) vistos[cod[c.id]] = (vistos[cod[c.id]] || 0) + 1;
    for (const k of Object.keys(vistos)) if (vistos[k] > 1) add('erro', `O código "${k}" está repetido em ${vistos[k]} circuitos.`);
    if (!todos.some(c => c.tipo === 'dr')) add('aviso', 'Não há DR neste quadro. A NBR 5410 exige DR de até 30 mA em áreas molhadas, externas e tomadas de cozinha e serviço, entre outras.');
    const circ = todos.filter(c => !['geral', 'dr', 'dps', 'reserva'].includes(c.tipo)).length;
    const livres = q.linhas.reduce((s, l) => s + Math.max(0, q.modLinha - l.circuitos.reduce((x, c) => x + (c.tipo === 'reserva' ? 0 : c.mod), 0)), 0);
    const pede = circ <= 6 ? 2 : circ <= 12 ? 3 : circ <= 30 ? 4 : Math.ceil(circ * 0.15);
    if (circ && livres < pede) add('aviso', `Espaço de reserva: com ${circ} circuito(s), a norma pede espaço para mais ${pede}; sobraram ${livres} módulo(s).`);
    return avisos;
  }
  g.Norma = { ADVERTENCIA, IZ, conferir };
})(globalThis);
