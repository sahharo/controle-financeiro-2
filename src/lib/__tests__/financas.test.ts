import {
  comprometidoDoMes,
  faturaDaCompra,
  fixoNoMes,
  horasDeTrabalho,
  limiteUsado,
  parceladasAtivas,
  planoParcelar,
  prejuizoPendente,
  proximosVencimentos,
  resumoDoMes,
  valorFatura,
  valorParcela,
  type Dados,
} from '../financas';
import { fmt, fmtR, lerValor, mascaraValor } from '../dinheiro';
import type { Cartao, Fixo, Gasto } from '@/store/tipos';

const nubank: Cartao = { id: 'nu', nome: 'Nubank', diaFechamento: 3, diaVencimento: 10, limite: 400000 };

function gasto(p: Partial<Gasto> & { valor: number; data: string }): Gasto {
  return { id: Math.random().toString(), descricao: 'x', categoriaId: 'ali', pagamento: { tipo: 'pix' }, parcelas: 1, ...p };
}

function dados(p: Partial<Dados> = {}): Dados {
  return {
    renda: { valor: 620000, diaPagamento: { tipo: 'dia', dia: 5 }, variavel: false },
    receitas: [],
    categorias: [{ id: 'ali', nome: 'Alimentação', limite: 240000 }],
    cartoes: [nubank],
    gastos: [],
    fixos: [],
    metas: [],
    caixinha: { percentualCdi: 100, movimentos: [] },
    reserva: { mesesAlvo: 6, aporteMensal: 0, movimentos: [] },
    ajustes: {},
    ...p,
  };
}

describe('dinheiro', () => {
  it('formata em pt-BR', () => {
    expect(fmt(128460)).toBe('1.284,60');
    expect(fmtR(-32000)).toBe('−R$ 320,00');
    expect(fmtR(431000, { inteiro: true })).toBe('R$ 4.310');
  });
  it('lê valores digitados', () => {
    expect(lerValor('R$ 1.299,00')).toBe(129900);
    expect(lerValor('45.90')).toBe(4590);
    expect(lerValor('1.299')).toBe(129900);
    expect(lerValor('6200')).toBe(620000);
    expect(lerValor('abc')).toBeNull();
    expect(mascaraValor('620000')).toEqual({ texto: '6.200,00', centavos: 620000 });
  });
});

describe('parcelas', () => {
  it('distribui o resto nas primeiras parcelas', () => {
    const ps = Array.from({ length: 3 }, (_, k) => valorParcela(10000, 3, k));
    expect(ps).toEqual([3334, 3333, 3333]);
    expect(valorParcela(10000, 3, 3)).toBe(0);
  });
});

describe('resumo do mês', () => {
  const agora = new Date(2026, 9, 12, 20, 30); // 12/out, 20 dias restantes contando hoje

  it('calcula quanto pode gastar hoje descontando o gasto de hoje', () => {
    const d = dados({
      fixos: [{ id: 'f', nome: 'Aluguel', tipo: 'fixo', valor: 165000, dia: 10, lembrete: false, pagamentos: {} }],
      gastos: [
        gasto({ valor: 100000, data: new Date(2026, 9, 5).toISOString() }),
        gasto({ valor: 4590, data: new Date(2026, 9, 12, 20, 14).toISOString() }),
      ],
    });
    const r = resumoDoMes(d, '2026-10', agora);
    expect(r.diasRestantes).toBe(20);
    // (6200 - 1650 - 1000) / 20 = 177,50
    expect(r.orcamentoHoje).toBe(17750);
    expect(r.podeHoje).toBe(17750 - 4590);
    expect(r.gastoTotal).toBe(165000 + 104590);
    // limites (2.400) maiores que o gasto (1.045,90) → previsão usa os limites
    expect(r.previsaoSobra).toBe(620000 - 165000 - 240000);
  });

  it('compara o dia de ontem com o previsto', () => {
    const d = dados({ gastos: [gasto({ valor: 5000, data: new Date(2026, 9, 11, 12).toISOString() })] });
    const r = resumoDoMes(d, '2026-10', agora);
    // orçamento de ontem = 6200 / 21 = 295,24; gastou 50
    expect(r.diferencaOntem).toBe(29524 - 5000);
  });

  it('parcelado pesa uma parcela por mês', () => {
    const d = dados({ gastos: [gasto({ valor: 289900, parcelas: 10, data: new Date(2026, 8, 20).toISOString() })] });
    expect(resumoDoMes(d, '2026-10', agora).variavel).toBe(28990);
    expect(comprometidoDoMes(d, '2026-11')).toBe(28990);
  });

  it('anual entra dividido por 12 e estimado usa a média', () => {
    expect(fixoNoMes({ id: 'a', nome: 'IPVA', tipo: 'anual', valor: 156000, dia: 10, mesAnual: 0, lembrete: false, pagamentos: {} }, '2026-10')).toBe(13000);
    const luz = {
      id: 'l', nome: 'Luz', tipo: 'estimado' as const, valor: 15000, dia: 18, lembrete: false,
      pagamentos: { '2026-07': 17000, '2026-08': 19000, '2026-09': 18000 },
    };
    expect(fixoNoMes(luz, '2026-10')).toBe(18000);
  });

  it('detecta prejuízo do mês anterior', () => {
    const d = dados({ gastos: [gasto({ valor: 652000, data: new Date(2026, 8, 15).toISOString() })] });
    expect(prejuizoPendente(d, agora, '2026-08', {})).toEqual({ mes: '2026-09', valor: 32000 });
    expect(prejuizoPendente(d, agora, '2026-08', { '2026-09': true })).toBeNull();
    expect(prejuizoPendente(d, agora, '2026-10', {})).toBeNull();
  });

  it('lista vencimentos da semana que não foram pagos', () => {
    const fixos: Fixo[] = [
      { id: 'i', nome: 'Internet', tipo: 'fixo', valor: 11990, dia: 15, lembrete: true, pagamentos: {} },
      { id: 'a', nome: 'Aluguel', tipo: 'fixo', valor: 165000, dia: 10, lembrete: true, pagamentos: {} },
      { id: 'g', nome: 'Gás', tipo: 'fixo', valor: 9000, dia: 14, lembrete: true, pagamentos: { '2026-10': 9000 } },
    ];
    expect(proximosVencimentos(fixos, agora).map((v) => v.fixo.nome)).toEqual(['Internet']);
  });
});

describe('cartão', () => {
  const agora = new Date(2026, 9, 12);

  it('compra depois do fechamento vai para a próxima fatura', () => {
    expect(faturaDaCompra(nubank, agora)).toBe('2026-11');
    expect(faturaDaCompra(nubank, new Date(2026, 9, 2))).toBe('2026-10');
    const inter: Cartao = { id: 'in', nome: 'Inter', diaFechamento: 28, diaVencimento: 5, limite: 1 };
    expect(faturaDaCompra(inter, new Date(2026, 9, 12))).toBe('2026-11');
  });

  it('soma faturas, parcelas e uso do limite', () => {
    const gastos = [
      gasto({ valor: 45900, pagamento: { tipo: 'credito', cartaoId: 'nu' }, data: new Date(2026, 9, 10).toISOString() }),
      gasto({ descricao: 'Geladeira', valor: 289900, parcelas: 10, pagamento: { tipo: 'credito', cartaoId: 'nu' }, data: new Date(2026, 5, 20).toISOString() }),
    ];
    // Geladeira: 1ª parcela na fatura que fecha em julho → em novembro está na 5ª
    expect(valorFatura(gastos, nubank, '2026-11')).toBe(45900 + 28990);
    const p = parceladasAtivas(gastos, nubank, agora);
    expect(p).toHaveLength(1);
    expect(p[0].parcelaAtual).toBe(5);
    expect(p[0].terminaEm).toBe('2027-04');
    expect(limiteUsado(gastos, nubank, agora)).toBe(45900 + 28990 * 6);
  });
});

describe('simulador', () => {
  it('converte preço em horas de trabalho', () => {
    expect(horasDeTrabalho(129900, 620000)).toBe(37);
    expect(planoParcelar(129900, new Date(2026, 9, 12))).toEqual({
      parcelas: 10,
      valorParcela: 12990,
      impactoDiario: 433,
      ate: '2027-08',
    });
  });
});
