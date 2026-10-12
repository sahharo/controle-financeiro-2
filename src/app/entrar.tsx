import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { CampoSenha } from '@/components/CampoSenha';
import { Folha } from '@/components/Folha';
import { Icone, Logo } from '@/components/Icones';
import { Apoio, Texto } from '@/components/Texto';
import { Botao, Campo, Link, Tela } from '@/components/ui';
import { autenticarBiometria, biometriaDisponivel, conferirSenha, salvarSenha } from '@/lib/seguranca';
import { regrasSenha, soDigitos } from '@/lib/validacao';
import { useStore } from '@/store';
import { cores } from '@/theme';

export default function Entrar() {
  const usuario = useStore((s) => s.usuario);
  const logado = useStore((s) => s.logado);
  const entrar = useStore((s) => s.entrar);
  const [identificador, setIdentificador] = useState(usuario?.email ?? '');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [temBiometria, setTemBiometria] = useState(false);
  const [redefinir, setRedefinir] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');

  useEffect(() => {
    biometriaDisponivel().then((ok) => {
      setTemBiometria(ok);
      // App bloqueado (sessão aberta + biometria ao abrir): já pede a digital.
      if (ok && usuario && logado) entrarComBiometria();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function entrarComSenha() {
    setErro(null);
    if (!usuario) {
      setErro('Não há conta neste aparelho. Crie a sua para começar.');
      return;
    }
    const id = identificador.trim().toLowerCase();
    const confere = id === usuario.email.toLowerCase() || (soDigitos(id).length === 11 && soDigitos(id) === soDigitos(usuario.cpf));
    setCarregando(true);
    const ok = confere && (await conferirSenha(senha));
    setCarregando(false);
    if (ok) entrar();
    else setErro('E-mail, CPF ou senha não conferem.');
  }

  async function entrarComBiometria() {
    if (await autenticarBiometria('Entrar no Sobra')) useStore.getState().entrar();
  }

  async function esqueci() {
    if (!usuario) return;
    if (temBiometria && (await autenticarBiometria('Confirme que é você para criar uma nova senha'))) {
      setRedefinir(true);
      return;
    }
    Alert.alert(
      'Seus dados ficam só neste aparelho',
      'Sem a biometria não há como confirmar que é você. Você pode apagar os dados deste aparelho e criar uma conta nova.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar e recomeçar',
          style: 'destructive',
          onPress: () => {
            useStore.getState().excluirTudo();
            router.replace('/cadastro');
          },
        },
      ],
    );
  }

  async function salvarNovaSenha() {
    await salvarSenha(novaSenha);
    setRedefinir(false);
    entrar();
  }

  return (
    <Tela
      padding
      contentStyle={{ paddingHorizontal: 24, paddingTop: 20 }}
      rodape={
        <View style={{ gap: 12 }}>
          <Botao onPress={entrarComSenha} carregando={carregando}>
            Entrar
          </Botao>
          {usuario && temBiometria ? (
            <Botao variante="claro" onPress={entrarComBiometria} icone={<Icone nome="digital" tam={20} traco={1.7} />}>
              Entrar com biometria
            </Botao>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Apoio tam={14}>Ainda não tem conta?</Apoio>
            <Link rotulo="Criar conta" onPress={() => router.push('/cadastro')} />
          </View>
        </View>
      }
    >
      <View style={{ marginTop: 56, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Logo tam={32} />
        <Texto tam={26} peso={700} em={-0.03}>
          sobra
        </Texto>
      </View>

      <Texto tam={30} peso={700} em={-0.025} altura={1.15} style={{ marginTop: 40 }} accessibilityRole="header">
        {usuario ? 'Bom te ver de novo.' : 'Boas-vindas ao Sobra.'}
      </Texto>
      <Apoio tam={15} style={{ marginTop: 8 }}>
        Entre para ver quanto você pode gastar hoje.
      </Apoio>

      <View style={{ marginTop: 32, gap: 16 }}>
        <Campo
          rotulo="E-mail ou CPF"
          value={identificador}
          onChangeText={setIdentificador}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          keyboardType="email-address"
        />
        <CampoSenha valor={senha} onChange={setSenha} onSubmitEditing={entrarComSenha} returnKeyType="go" />
        {erro ? (
          <Texto tam={14} cor={cores.alerta}>
            {erro}
          </Texto>
        ) : null}
        {usuario ? (
          <View style={{ alignSelf: 'flex-end' }}>
            <Link rotulo="Esqueci minha senha" onPress={esqueci} />
          </View>
        ) : null}
      </View>

      <Folha
        visivel={redefinir}
        onFechar={() => setRedefinir(false)}
        titulo="Nova senha"
        sub="Use pelo menos 8 caracteres."
        rodape={
          <Botao onPress={salvarNovaSenha} desabilitado={!regrasSenha(novaSenha).every((r) => r.ok)}>
            Salvar e entrar
          </Botao>
        }
      >
        <CampoSenha rotulo="Nova senha" valor={novaSenha} onChange={setNovaSenha} novaSenha />
      </Folha>
    </Tela>
  );
}
