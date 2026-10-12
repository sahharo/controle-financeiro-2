import { useState } from 'react';
import { Pressable, View, type TextInputProps } from 'react-native';

import { Icone } from './Icones';
import { Texto } from './Texto';
import { Campo } from './ui';
import { regrasSenha } from '@/lib/validacao';
import { cores } from '@/theme';

export function CampoSenha({
  rotulo = 'Senha',
  valor,
  onChange,
  novaSenha,
  altura,
  raio,
  ...props
}: {
  rotulo?: string;
  valor: string;
  onChange: (s: string) => void;
  novaSenha?: boolean;
  altura?: number;
  raio?: number;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'onChange'>) {
  const [ver, setVer] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Campo
        rotulo={rotulo}
        value={valor}
        onChangeText={onChange}
        secureTextEntry={!ver}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={novaSenha ? 'new-password' : 'current-password'}
        textContentType={novaSenha ? 'newPassword' : 'password'}
        altura={altura}
        raio={raio}
        direita={
          <Pressable
            accessibilityRole="button"
            onPress={() => setVer(!ver)}
            style={{ height: 44, paddingHorizontal: 10, justifyContent: 'center' }}
          >
            <Texto tam={13} cor={cores.destaqueTexto}>
              {ver ? 'Ocultar' : 'Mostrar'}
            </Texto>
          </Pressable>
        }
        {...props}
      />
      {novaSenha ? <RegrasSenha senha={valor} /> : null}
    </View>
  );
}

export function RegrasSenha({ senha }: { senha: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, marginTop: 4 }}>
      {regrasSenha(senha).map((r) => {
        const cor = r.ok ? cores.destaqueTexto : cores.textoApoio;
        return (
          <View key={r.label} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icone nome={r.ok ? 'check' : 'circulo'} tam={14} cor={cor} traco={r.ok ? 2.6 : 2} />
            <Texto tam={13} cor={cor}>
              {r.label}
            </Texto>
          </View>
        );
      })}
    </View>
  );
}
