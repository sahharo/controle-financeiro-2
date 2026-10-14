import { useStore, type Estado } from '..';
import { diferencas } from '../sincronizar';

function estado(): Estado {
  return useStore.getState();
}

describe('diferencas', () => {
  beforeEach(() => {
    useStore.getState().abrirSessao({
      nome: 'Marina',
      sobrenome: 'Costa',
      cpf: '529.982.247-25',
      celular: '(11) 91234-5678',
      email: 'marina@email.com',
      criadoEm: '2026-10-01T12:00:00.000Z',
    });
  });

  it('manda só o gasto novo e o que a categoria aprendeu', () => {
    const antes = estado();
    useStore.getState().salvarGasto({
      descricao: 'iFood',
      valor: 4590,
      categoriaId: 'ali',
      pagamento: { tipo: 'pix' },
      data: '2026-10-12T20:14:00.000Z',
      parcelas: 1,
    });
    const ops = diferencas(antes, estado());
    expect([...ops.salvar.keys()]).toEqual(['gastos']);
    expect(ops.salvar.get('gastos')![0]).toMatchObject({ descricao: 'iFood', valor: 4590 });
    expect(ops.perfil).toEqual({ aprendidas: { ifood: 'ali' } });
    expect(ops.apagar).toEqual([]);
  });

  it('remover categoria regrava os gastos dela e apaga a categoria', () => {
    useStore.getState().salvarCategoria({ id: 'laz', nome: 'Lazer', limite: 20000 });
    useStore.getState().salvarGasto({ id: 'g1', descricao: 'Cinema', valor: 6400, categoriaId: 'laz', pagamento: { tipo: 'pix' }, data: '2026-10-12T20:14:00.000Z', parcelas: 1 });
    useStore.getState().salvarGasto({ id: 'g2', descricao: 'Mercado', valor: 100, categoriaId: 'mer', pagamento: { tipo: 'pix' }, data: '2026-10-12T20:14:00.000Z', parcelas: 1 });
    const antes = estado();
    useStore.getState().removerCategoria('laz');
    const ops = diferencas(antes, estado());
    expect(ops.apagar).toEqual([{ colecao: 'categorias', id: 'laz' }]);
    // Só o gasto que mudou de categoria vai de novo; o outro não.
    expect(ops.salvar.get('gastos')!.map((g) => g.id)).toEqual(['g1']);
    expect(ops.salvar.get('categorias')!.map((c) => c.nome)).toEqual(['Outros']);
  });

  it('movimentos da caixinha levam a conta, e configurações vão no perfil', () => {
    const antes = estado();
    useStore.getState().movimentarCaixinha('guardar', 30000);
    useStore.getState().setPercentualCdi(110);
    useStore.getState().setReserva({ mesesAlvo: 12 });
    const ops = diferencas(antes, estado());
    expect(ops.salvar.get('movimentos')).toEqual([expect.objectContaining({ conta: 'caixinha', tipo: 'guardar', valor: 30000 })]);
    expect(ops.perfil).toEqual({ caixinha: { percentualCdi: 110 }, reserva: { mesesAlvo: 12, aporteMensal: 0 } });
  });

  it('sem mudança, nada a enviar', () => {
    const s = estado();
    const ops = diferencas(s, s);
    expect(ops.salvar.size + ops.apagar.length + Object.keys(ops.perfil).length).toBe(0);
  });
});
