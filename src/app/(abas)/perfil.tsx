import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { descreverDia } from '@/components/FormRenda';
import { Icone } from '@/components/Icones';
import { Apoio, Texto } from '@/components/Texto';
import { BotaoTexto, Cartao, Chave, ItemMenu, Tela } from '@/components/ui';
import { useConquistas } from '@/hooks/dados';
import { escolherExtrato, exportarDados } from '@/lib/arquivos';
import { fmtInteiro } from '@/lib/dinheiro';
import { pedirPermissaoLembretes } from '@/lib/lembretes';
import { apagarSenha, autenticarBiometria, biometriaDisponivel } from '@/lib/seguranca';
import { useStore } from '@/store';
import { cores, margem } from '@/theme';

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
      Alert.alert('Notificações desligadas', 'Permita as notificações do Sobra nos ajustes do celular para receber os lembretes.');
      return;
    }
    setPreferencias({ lembrarVencimentos: v });
  }

  async function alternarBiometria(v: boolean) {
    if (v) {
      if (!(await biometriaDisponivel())) {
        Alert.alert('Biometria indisponível', 'Cadastre uma digital ou o reconhecimento facial nos ajustes do celular.');
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
        Alert.alert('Nada para importar', 'Não encontramos gastos nesse arquivo. Use um extrato ou fatura em CSV ou OFX.');
        return;
      }
      const total = lancamentos.reduce((s, l) => s + l.valor, 0);
      Alert.alert(
        `Encontramos ${lancamentos.length} ${lancamentos.length === 1 ? 'gasto' : 'gastos'}`,
        `Somam R$ ${fmtInteiro(total)}. Repetidos são ignorados e as categorias vêm pelo que o app já aprendeu.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Importar',
            onPress: () => {
              const n = useStore.getState().importarLancamentos(lancamentos);
              Alert.alert('Pronto', `${n} ${n === 1 ? 'gasto importado' : 'gastos importados'}.`);
            },
          },
        ],
      );
    } catch {
      Alert.alert('Não deu para ler o arquivo', 'Confira se é um CSV ou OFX exportado pelo banco.');
    }
  }

  async function exportar() {
    try {
      await exportarDados(useStore.getState());
    } catch {
      Alert.alert('Não deu para exportar agora', 'Tente de novo em instantes.');
    }
  }

  function sair() {
    Alert.alert('Sair da conta?', 'Seus dados continuam guardados neste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: () => useStore.getState().sair() },
    ]);
  }

  function excluir() {
    Alert.alert(
      'Excluir conta e dados?',
      'Tudo o que você registrou neste aparelho será apagado para sempre. Se quiser guardar uma cópia, exporte seus dados antes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir tudo',
          style: 'destructive',
          onPress: async () => {
            await apagarSenha();
            useStore.getState().excluirTudo();
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
          Alert.alert('Sobra+ em breve', 'Voz sem limite, importação automática de extratos e previsão de 12 meses. Avisaremos quando estiver disponível.')
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
      <Apoio style={{ marginHorizontal: margem, marginTop: 4 }}>Seus dados ficam guardados só neste aparelho.</Apoio>
    </Tela>
  );
}
