import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CampoSenha } from '@/components/CampoSenha';
import { Logo } from '@/components/Icones';
import { Apoio, Texto } from '@/components/Texto';
import { Botao, Tela } from '@/components/ui';
import { conta, ErroApi } from '@/lib/api';
import { regrasSenha } from '@/lib/validacao';
import { cores } from '@/theme';

/** Aberta pelo link do e-mail de "esqueci minha senha": /redefinir-senha?token=... */
export default function RedefinirSenha() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [pronto, setPronto] = useState(false);

  async function salvar() {
    if (!token) return;
    setErro(null);
    setCarregando(true);
    try {
      await conta.redefinir(token, senha);
      setPronto(true);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para salvar agora. Tente de novo.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Tela
      contentStyle={{ paddingHorizontal: 24, paddingTop: 20 }}
      rodape={
        pronto || !token ? (
          <Botao onPress={() => router.replace('/entrar')}>Ir para o login</Botao>
        ) : (
          <Botao onPress={salvar} carregando={carregando} desabilitado={!regrasSenha(senha).every((r) => r.ok)}>
            Salvar nova senha
          </Botao>
        )
      }
    >
      <View style={{ marginTop: 56, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Logo tam={32} />
        <Texto tam={26} peso={700} em={-0.03}>
          sobra
        </Texto>
      </View>
      <Texto tam={30} peso={700} em={-0.025} altura={1.15} style={{ marginTop: 40 }} accessibilityRole="header">
        {pronto ? 'Senha nova salva.' : !token ? 'Link incompleto.' : 'Crie uma senha nova.'}
      </Texto>
      <Apoio tam={15} style={{ marginTop: 8 }} altura={1.45}>
        {pronto
          ? 'Por segurança, saímos da sua conta em todos os aparelhos. Entre de novo com a senha nova.'
          : !token
            ? 'Abra o link exatamente como chegou no e-mail ou peça outro em "Esqueci minha senha".'
            : 'Ela vale para o app e para o site.'}
      </Apoio>
      {token && !pronto ? (
        <View style={{ marginTop: 32, gap: 12 }}>
          <CampoSenha rotulo="Nova senha" valor={senha} onChange={setSenha} novaSenha autoFocus />
          {erro ? (
            <Texto tam={14} cor={cores.alerta}>
              {erro}
            </Texto>
          ) : null}
        </View>
      ) : null}
    </Tela>
  );
}
