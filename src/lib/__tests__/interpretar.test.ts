import { extrairNumeros, interpretarFrase, valorDosNumeros } from '../interpretar';
import type { Cartao, Categoria } from '@/store/tipos';

const categorias: Categoria[] = [
  { id: 'ali', nome: 'Alimentação', limite: 80000 },
  { id: 'mer', nome: 'Mercado', limite: 90000 },
  { id: 'tra', nome: 'Transporte', limite: 30000 },
  { id: 'laz', nome: 'Lazer', limite: 20000 },
];
const cartoes: Cartao[] = [
  { id: 'nu', nome: 'Nubank', diaFechamento: 3, diaVencimento: 10, limite: 400000 },
  { id: 'in', nome: 'Inter', diaFechamento: 20, diaVencimento: 28, limite: 300000 },
];
const ctx = { categorias, cartoes, aprendidas: {} };

function valor(frase: string) {
  return valorDosNumeros(extrairNumeros(frase.split(' ')));
}

describe('números por extenso', () => {
  it.each([
    ['quarenta e cinco e noventa', 4590],
    ['quarenta e cinco reais e noventa centavos', 4590],
    ['cento e vinte reais', 12000],
    ['cem reais', 10000],
    ['mil e duzentos', 120000],
    ['dois mil trezentos e dez', 231000],
    ['doze e cinquenta', 1250],
    ['dezoito', 1800],
    ['trinta e oito e trinta', 3830],
    ['noventa centavos', 90],
  ])('%s → %i', (frase, esperado) => {
    expect(valor(frase)).toBe(esperado);
  });
});

describe('interpretarFrase', () => {
  it('entende a frase do protótipo', () => {
    const r = interpretarFrase('gastei quarenta e cinco e noventa no ifood, no nubank', ctx);
    expect(r).toEqual({
      valor: 4590,
      descricao: 'iFood',
      pagamento: { tipo: 'credito', cartaoId: 'nu' },
      parcelas: 1,
      categoriaId: 'ali',
    });
  });

  it('aceita valores em dígitos e parcelas', () => {
    const r = interpretarFrase('Geladeira R$ 2.899,00 no inter em 10x', ctx);
    expect(r.valor).toBe(289900);
    expect(r.parcelas).toBe(10);
    expect(r.pagamento).toEqual({ tipo: 'credito', cartaoId: 'in' });
    expect(r.descricao).toBe('Geladeira');
  });

  it('reconhece pix e débito', () => {
    expect(interpretarFrase('uber 23,50 no pix', ctx)).toMatchObject({
      valor: 2350,
      pagamento: { tipo: 'pix' },
      categoriaId: 'tra',
      descricao: 'Uber',
    });
    expect(interpretarFrase('paguei 212,40 no mercado no débito', ctx)).toMatchObject({
      valor: 21240,
      pagamento: { tipo: 'debito' },
      categoriaId: 'mer',
    });
  });

  it('usa a categoria que a pessoa já escolheu antes', () => {
    const r = interpretarFrase('padaria do zé 15 reais', { ...ctx, aprendidas: { 'padaria ze': 'mer' } });
    expect(r.descricao).toBe('Padaria ze');
    expect(r.categoriaId).toBe('mer');
  });

  it('parcelas por extenso', () => {
    expect(interpretarFrase('tênis trezentos e noventa e nove em três vezes', ctx)).toMatchObject({
      valor: 39900,
      parcelas: 3,
      descricao: 'Tenis',
    });
  });
});
