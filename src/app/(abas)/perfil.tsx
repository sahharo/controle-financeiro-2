import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { descreverDia } from '@/components/FormRenda';
import { Icone } from '@/components/Icones';
import { Apoio, Texto } from '@/components/Texto';
import { BotaoTexto, Cartao, Chave, ItemMenu, Tela } from '@/components/ui';
import { useConquistas } from '@/hooks/dados';
import { escolherExtrato, exportarDados } from '@/lib/arquivos';
import { fmtInteiro } from '@/lib/dinheiro';
import { pedirPermissaoLembretes } from '@/lib/lembretes';
import { conta, ErroApi } from '@/lib/api';
import { autenticarBiometria, biometriaDisponivel } from '@/lib/seguranca';
import { useStore } from '@/store';
import { aguardarEnvios } from '@/store/sincronizar';
import { cores, margem } from '@/theme';
import { alerta } from '@/lib/alerta';

export default function Perfil() {
  const usuario = useStore((s) => s.usuario);
  const renda = useStore((s) => s.renda);
  const categorias = useStore((s) => s.categorias);
  const cartoes = useStore((s) => s.cartoes);
  const preferencias = useStore((s) => s.preferencias);
  const setPreferencias = useStore((s) => s.setPreferencias);
  const { lista } = useConquistas();

  const iniciais = `${usuario?.nome[0] ?? ''}${usuario?.sobrenome[0] ?? ''}`.toUpperCase();
  const feitas = lista.filter((c) => c.conquistada).length;

  async function alternarLembretes(v: boolean) {
    if (v && !(await pedirPermissaoLembretes())) {
      alerta('Notificações desligadas', 'Permita as notificações do Sobra nos ajustes do celular para receber os lembretes.');
      return;
    }
    setPreferencias({ lembrarVencimentos: v });
  }

  async function alternarBiometria(v: boolean) {
    if (v) {
      if (!(await biometriaDisponivel())) {
        alerta('Biometria indisponível', 'Cadastre uma digital ou o reconhecimento facial nos ajustes do celular.');
        return;
      }
      if (!(await autenticarBiometria('Confirme para ativar'))) return;
    }
    setPreferencias({ biometriaAoAbrir: v });
  }

  async function importar() {
    try {
      const lancamentos = await escolherExtrato();
      if (!lancamentos) return;
      if (!lancamentos.length) {
        alerta('Nada para importar', 'Não encontramos gastos nesse arquivo. Use um extrato ou fatura em CSV ou OFX.');
        return;
      }
      const total = lancamentos.reduce((s, l) => s + l.valor, 0);
      alerta(
        `Encontramos ${lancamentos.length} ${lancamentos.length === 1 ? 'gasto' : 'gastos'}`,
        `Somam R$ ${fmtInteiro(total)}. Repetidos são ignorados e as categorias vêm pelo que o app já aprendeu.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Importar',
            onPress: () => {
              const n = useStore.getState().importarLancamentos(lancamentos);
              alerta('Pronto', `${n} ${n === 1 ? 'gasto importado' : 'gastos importados'}.`);
            },
          },
        ],
      );
    } catch {
      alerta('Não deu para ler o arquivo', 'Confira se é um CSV ou OFX exportado pelo banco.');
    }
  }

  async function exportar() {
    try {
      await exportarDados(useStore.getState());
    } catch {
      alerta('Não deu para exportar agora', 'Tente de novo em instantes.');
    }
  }

  function sair() {
    alerta('Sair da conta?', 'Seus dados continuam guardados na sua conta. É só entrar de novo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        onPress: async () => {
          await aguardarEnvios();
          await conta.sair().catch(() => {});
          useStore.getState().encerrarSessao();
        },
      },
    ]);
  }

  function excluir() {
    alerta(
      'Excluir conta e dados?',
      'Sua conta e tudo o que você registrou serão apagados para sempre, em todos os aparelhos. Se quiser guardar uma cópia, exporte seus dados antes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              await aguardarEnvios();
              await conta.excluir();
              useStore.getState().encerrarSessao();
            } catch (e) {
              alerta('Não deu para excluir agora', e instanceof ErroApi ? e.message : 'Tente de novo em instantes.');
            }
          },
        },
      ],
    );
  }

  return (
    <Tela padding={false} emAba>
      <View style={{ paddingHorizontal: margem, paddingTop: 24, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 999, backgroundColor: cores.borda, alignItems: 'center', justifyContent: 'center' }}>
          <Texto tam={17} peso={600}>
            {iniciais}
          </Texto>
        </View>
        <View style={{ flex: 1 }}>
          <Texto tam={19} peso={600}>
            {usuario ? `${usuario.nome} ${usuario.sobrenome}` : ''}
          </Texto>
          <Texto tam={14} cor={cores.textoApoio}>
            Plano gratuito
          </Texto>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          alerta('Sobra+ em breve', 'Voz sem limite, importação automática de extratos e previsão de 12 meses. Avisaremos quando estiver disponível.')
        }
        style={({ pressed }) => ({
          marginHorizontal: margem,
          marginTop: 16,
          padding: 16,
          paddingVertical: 14,
          borderRadius: 16,
          backgroundColor: cores.destaqueFundo,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View style={{ flex: 1 }}>
          <Texto tam={15} peso={600}>
            Sobra+
          </Texto>
          <Texto tam={13} cor={cores.textoSecundario}>
            Voz sem limite, importar extrato e previsão de 12 meses
          </Texto>
        </View>
        <Icone nome="direita" tam={16} cor={cores.destaqueTexto} traco={2} />
      </Pressable>

      <Cartao raio={18} style={{ marginHorizontal: margem, marginTop: 16, paddingHorizontal: 16 }}>
        <ItemMenu titulo="Conquistas" info={`${feitas} de ${lista.length}`} mono onPress={() => router.push('/conquistas')} />
        <ItemMenu
          titulo="Renda e dia do pagamento"
          info={renda.valor ? `${fmtInteiro(renda.valor)} · ${descreverDia(renda.diaPagamento)}` : 'cadastrar'}
          mono
          onPress={() => router.push('/renda')}
        />
        <ItemMenu
          titulo="Categorias e limites"
          info={`${categorias.length} ${categorias.length === 1 ? 'categoria' : 'categorias'}`}
          onPress={() => router.push('/gastos?aba=variaveis')}
        />
        <ItemMenu
          titulo="Cartões"
          info={cartoes.length ? cartoes.map((c) => c.nome).join(', ') : 'nenhum'}
          onPress={() => router.push('/gastos?aba=cartao')}
          borda={false}
        />
      </Cartao>

      <Cartao raio={18} style={{ marginHorizontal: margem, marginTop: 12, paddingHorizontal: 16 }}>
        <ItemMenu
          titulo="Lembrar vencimentos"
          direita={<Chave rotulo="Lembrar vencimentos" valor={preferencias.lembrarVencimentos} onChange={alternarLembretes} />}
        />
        <ItemMenu
          titulo="Pedir biometria ao abrir"
          borda={false}
          direita={<Chave rotulo="Pedir biometria ao abrir" valor={preferencias.biometriaAoAbrir} onChange={alternarBiometria} />}
        />
      </Cartao>

      <Cartao raio={18} style={{ marginHorizontal: margem, marginTop: 12, paddingHorizontal: 16 }}>
        <ItemMenu titulo="Importar extrato ou fatura" info="CSV, OFX" onPress={importar} />
        <ItemMenu titulo="Exportar meus dados" info="CSV" onPress={exportar} borda={false} />
      </Cartao>

      <View style={{ marginHorizontal: margem, marginTop: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
        <BotaoTexto rotulo="Sair" cor={cores.textoApoio} onPress={sair} />
        <BotaoTexto rotulo="Excluir conta e dados" cor={cores.alerta} onPress={excluir} />
      </View>
      <Apoio style={{ marginHorizontal: margem, marginTop: 4 }}>Seus dados ficam guardados na sua conta, com acesso pelo app e pelo site.</Apoio>
    </Tela>
  );
}
