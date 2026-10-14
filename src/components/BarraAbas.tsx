import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from './Icones';
import { Texto } from './Texto';
import { cores } from '@/theme';

const ABAS: Record<string, { rotulo: string; icone: NomeIcone }> = {
  index: { rotulo: 'Início', icone: 'inicio' },
  gastos: { rotulo: 'Gastos', icone: 'gastos' },
  metas: { rotulo: 'Metas', icone: 'metas' },
  perfil: { rotulo: 'Perfil', icone: 'perfil' },
};

/** Barra inferior do protótipo: 4 abas e o botão verde de registrar no meio. */
export function BarraAbas({ state, navigation }: BottomTabBarProps) {
  const ins = useSafeAreaInsets();
  const rotas = state.routes.filter((r) => r.name in ABAS);
  const itens = rotas.map((r) => {
    const indice = state.routes.indexOf(r);
    const ativo = state.index === indice;
    const { rotulo, icone } = ABAS[r.name];
    const cor = ativo ? cores.texto : cores.textoApoio;
    return (
      <Pressable
        key={r.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: ativo }}
        accessibilityLabel={rotulo}
        onPress={() => {
          const ev = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
          if (!ativo && !ev.defaultPrevented) navigation.navigate(r.name, r.params);
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 }}
      >
        <Icone nome={icone} cor={cor} />
        <Texto tam={12} peso={ativo ? 600 : 400} cor={cor}>
          {rotulo}
        </Texto>
      </Pressable>
    );
  });

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: cores.cartao,
        borderTopWidth: 1,
        borderTopColor: cores.borda,
        paddingTop: 6,
        paddingHorizontal: 8,
        paddingBottom: Math.max(ins.bottom, 12),
      }}
    >
      {itens.slice(0, 2)}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar gasto"
          onPress={() => router.push('/registrar')}
          style={({ pressed }) => ({
            width: 52,
            height: 52,
            borderRadius: 999,
            backgroundColor: cores.destaque,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icone nome="mais" cor={cores.branco} traco={2} />
        </Pressable>
      </View>
      {itens.slice(2)}
    </View>
  );
}
