import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Icone } from './Icones';
import { Texto } from './Texto';
import { nomeMes } from '@/lib/datas';
import { cores } from '@/theme';

type Posicao = { top: number; right: number };

/** Botão do mês com um menu pequeno que abre logo abaixo dele. */
export function MenuMes({
  mes,
  atual,
  meses,
  onEscolher,
}: {
  mes: string;
  atual: string;
  meses: string[];
  onEscolher: (m: string) => void;
}) {
  const botao = useRef<View>(null);
  const { width } = useWindowDimensions();
  const [pos, setPos] = useState<Posicao | null>(null);

  function abrir() {
    botao.current?.measureInWindow((x, y, w, h) => {
      setPos({ top: y + h + 6, right: Math.max(8, width - (x + w)) });
    });
  }
  const fechar = () => setPos(null);

  // Mais recentes primeiro, como em qualquer seletor de mês.
  const lista = [...meses].reverse();

  return (
    <>
      <Pressable
        ref={botao}
        accessibilityRole="button"
        accessibilityLabel={`Mês: ${nomeMes(mes)}. Trocar mês`}
        accessibilityState={{ expanded: !!pos }}
        onPress={abrir}
        style={({ pressed }) => ({
          height: 36,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: pos ? cores.bordaForte : cores.borda,
          backgroundColor: pressed || pos ? cores.cartao : 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        })}
        hitSlop={4}
      >
        <Texto tam={14} peso={500}>
          {nomeMes(mes, true)}
        </Texto>
        <View style={{ transform: [{ rotate: pos ? '180deg' : '0deg' }] }}>
          <Icone nome="baixo" tam={13} traco={2} />
        </View>
      </Pressable>

      <Modal visible={!!pos} transparent animationType="fade" onRequestClose={fechar} statusBarTranslucent>
        <Pressable accessibilityLabel="Fechar" onPress={fechar} style={{ flex: 1 }}>
          {pos ? (
            <View
              accessibilityRole="menu"
              onStartShouldSetResponder={() => true}
              style={{
                position: 'absolute',
                top: pos.top,
                right: pos.right,
                width: 184,
                maxHeight: 300,
                backgroundColor: cores.cartao,
                borderWidth: 1,
                borderColor: cores.borda,
                borderRadius: 14,
                paddingVertical: 4,
                shadowColor: '#1C1C1A',
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {lista.map((m) => {
                  const marcado = m === mes;
                  const extra = m === atual ? 'atual' : m > atual ? 'previsão' : m.slice(0, 4) !== atual.slice(0, 4) ? m.slice(0, 4) : '';
                  return (
                    <Pressable
                      key={m}
                      accessibilityRole="menuitem"
                      accessibilityState={{ selected: marcado }}
                      onPress={() => {
                        onEscolher(m);
                        fechar();
                      }}
                      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
                        height: 38,
                        marginHorizontal: 4,
                        paddingHorizontal: 10,
                        borderRadius: 9,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: pressed || hovered ? cores.fundo : 'transparent',
                      })}
                    >
                      <Texto tam={14} peso={marcado ? 600 : 400} style={{ flex: 1 }}>
                        {nomeMes(m, true)}
                        {extra ? (
                          <Texto tam={12} cor={cores.textoApoio}>
                            {'  '}
                            {extra}
                          </Texto>
                        ) : null}
                      </Texto>
                      {marcado ? <Icone nome="check" tam={15} cor={cores.destaque} traco={2.4} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}
