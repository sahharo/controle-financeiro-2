import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone } from './Icones';
import { Apoio, Texto } from './Texto';
import { cores, margem } from '@/theme';

/** Painel que sobe de baixo, usado nos formulários curtos. */
export function Folha({
  visivel,
  onFechar,
  titulo,
  sub,
  children,
  rodape,
}: {
  visivel: boolean;
  onFechar: () => void;
  titulo: string;
  sub?: string;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onFechar}
          style={{ flex: 1, backgroundColor: 'rgba(28,28,26,0.35)' }}
        />
        <View
          style={{
            backgroundColor: cores.fundo,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '88%',
            paddingBottom: Math.max(ins.bottom, 16) + 8,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 999, backgroundColor: cores.bordaForte }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              paddingHorizontal: margem,
              paddingTop: 12,
              gap: 12,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Texto tam={20} peso={700} em={-0.02} accessibilityRole="header">
                {titulo}
              </Texto>
              {sub ? <Apoio tam={14}>{sub}</Apoio> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onFechar}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10, marginTop: -8 }}
            >
              <Icone nome="fechar" tam={20} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: margem, paddingTop: 14, paddingBottom: 8, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {rodape ? <View style={{ paddingHorizontal: margem, paddingTop: 8, gap: 10 }}>{rodape}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
