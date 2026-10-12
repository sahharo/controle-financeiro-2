import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { CartaoCredito } from '@/components/gastos/CartaoCredito';
import { Fixos } from '@/components/gastos/Fixos';
import { Variaveis } from '@/components/gastos/Variaveis';
import { Texto } from '@/components/Texto';
import { Tela, Titulo } from '@/components/ui';
import { cores, margem } from '@/theme';

const ABAS = [
  { id: 'variaveis', rotulo: 'Variáveis' },
  { id: 'fixos', rotulo: 'Fixos' },
  { id: 'cartao', rotulo: 'Cartão' },
] as const;

type Aba = (typeof ABAS)[number]['id'];

export default function Gastos() {
  const params = useLocalSearchParams<{ aba?: string }>();
  const aba: Aba = ABAS.some((a) => a.id === params.aba) ? (params.aba as Aba) : 'variaveis';

  return (
    <Tela padding={false} emAba>
      <View style={{ paddingHorizontal: margem, paddingTop: 24 }}>
        <Titulo>Gastos</Titulo>
        <View
          accessibilityRole="tablist"
          style={{ marginTop: 16, flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: cores.borda }}
        >
          {ABAS.map((a) => {
            const ativa = a.id === aba;
            return (
              <Pressable
                key={a.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: ativa }}
                onPress={() => router.setParams({ aba: a.id })}
                style={{
                  paddingTop: 10,
                  paddingBottom: 12,
                  borderBottomWidth: 2,
                  borderBottomColor: ativa ? cores.texto : 'transparent',
                  marginBottom: -1,
                }}
              >
                <Texto tam={15} peso={ativa ? 600 : 400} cor={ativa ? cores.texto : cores.textoApoio}>
                  {a.rotulo}
                </Texto>
              </Pressable>
            );
          })}
        </View>
      </View>
      {aba === 'variaveis' ? <Variaveis /> : aba === 'fixos' ? <Fixos /> : <CartaoCredito />}
    </Tela>
  );
}
