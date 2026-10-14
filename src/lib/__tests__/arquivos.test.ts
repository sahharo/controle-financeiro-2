import { lerCsv, lerOfx } from '../importacao';
import { aliquotaIR, lancarRendimentos, rendimentoDoMes } from '../rendimento';
import { celularValido, cpfValido, emailValido, mascaraCelular, mascaraCpf } from '../validacao';
import type { Caixinha } from '@/store/tipos';

describe('importação', () => {
  it('lê OFX e ignora créditos', () => {
    const ofx = `<OFX><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261012100000[-3:BRT]<TRNAMT>-45.90<MEMO>IFOOD</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261005<TRNAMT>6200.00<MEMO>SALARIO</STMTTRN>
</BANKTRANLIST></OFX>`;
    const r = lerOfx(ofx);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ descricao: 'IFOOD', valor: 4590 });
    expect(new Date(r[0].data).getDate()).toBe(12);
  });

  it('lê CSV de fatura (todos positivos)', () => {
    const csv = 'date,title,amount\n2026-10-12,iFood,45.90\n2026-10-11,"Mercado, centro",212.40\n';
    expect(lerCsv(csv).map((l) => [l.descricao, l.valor])).toEqual([
      ['iFood', 4590],
      ['Mercado, centro', 21240],
    ]);
  });

  it('lê CSV de extrato com ponto e vírgula e só pega débitos', () => {
    const csv = 'Data;Descrição;Valor\n12/10/2026;Uber;-23,50\n05/10/2026;Salário;6.200,00\n';
    expect(lerCsv(csv).map((l) => [l.descricao, l.valor])).toEqual([['Uber', 2350]]);
  });
});

describe('caixinha', () => {
  it('IR regressivo', () => {
    expect(aliquotaIR(30)).toBe(0.225);
    expect(aliquotaIR(200)).toBe(0.2);
    expect(aliquotaIR(500)).toBe(0.175);
    expect(aliquotaIR(800)).toBe(0.15);
  });

  it('rende perto de 1% ao mês com CDI de ~14,9% e lança meses fechados', () => {
    const c: Caixinha = {
      percentualCdi: 100,
      movimentos: [{ id: '1', tipo: 'guardar', valor: 300000, data: new Date(2026, 7, 1).toISOString() }],
    };
    const setembro = rendimentoDoMes(c, '2026-09', 14.9);
    // bruto ≈ 3000 × 1,17% ; líquido de IR 22,5% ≈ 27
    expect(setembro).toBeGreaterThan(2500);
    expect(setembro).toBeLessThan(3000);
    const nova = lancarRendimentos(c, new Date(2026, 9, 12), 14.9);
    expect(nova.rendimentoAte).toBe('2026-09');
    expect(nova.movimentos.filter((m) => m.tipo === 'rendimento')).toHaveLength(2);
    expect(lancarRendimentos(nova, new Date(2026, 9, 20), 14.9)).toBe(nova);
  });
});

describe('validação', () => {
  it('CPF', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(mascaraCpf('52998224725')).toBe('529.982.247-25');
    expect(mascaraCelular('11912345678')).toBe('(11) 91234-5678');
  });

  it('celular: DDD que existe, 9 na frente e 11 números', () => {
    expect(celularValido('(11) 91234-5678')).toBe(true);
    expect(celularValido('(85) 98765-4321')).toBe(true);
    expect(celularValido('(11) 11111-1111')).toBe(false); // não começa com 9
    expect(celularValido('(11) 99999-9999')).toBe(false); // tudo igual
    expect(celularValido('(20) 91234-5678')).toBe(false); // DDD 20 não existe
    expect(celularValido('(11) 3456-7890')).toBe(false); // fixo, não é celular
    expect(celularValido('(11) 91234-567')).toBe(false); // incompleto
  });

  it('e-mail', () => {
    for (const ok of ['marina@gmail.com', 'marina.costa+sobra@empresa.com.br', ' a_b@x-y.io ']) expect(emailValido(ok)).toBe(true);
    for (const ruim of ['abc', 'abc@', 'marina@gmail', 'marina@gmail.c', 'mari na@gmail.com', 'marina@@gmail.com', 'marina..c@gmail.com', '.marina@gmail.com', 'marina@.gmail.com', 'marina@gmail.com.'])
      expect(emailValido(ruim)).toBe(false);
  });
});
