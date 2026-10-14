import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { CampoSenha } from '@/components/CampoSenha';
import { Folha } from '@/components/Folha';
import { Icone, Logo } from '@/components/Icones';
import { Apoio, Texto } from '@/components/Texto';
import { Botao, Campo, Link, Tela } from '@/components/ui';
import { conta, ErroApi } from '@/lib/api';
import { autenticarBiometria, biometriaDisponivel } from '@/lib/seguranca';
import { emailValido } from '@/lib/validacao';
import { useStore } from '@/store';
import { recarregar } from '@/store/sincronizar';
import { cores } from '@/theme';

export default function Entrar() {
  const usuario = useStore((s) => s.usuario);
  // Sessão aberta mas app travado pela biometria ("Pedir biometria ao abrir").
  const bloqueado = useStore((s) => s.logado && !!s.usuario);
  const [identificador, setIdentificador] = useState(usuario?.email ?? '');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [temBiometria, setTemBiometria] = useState(false);
  const [esqueci, setEsqueci] = useState<{ email: string; enviado: boolean; carregando: boolean } | null>(null);

  useEffect(() => {
    biometriaDisponivel().then((ok) => {
      setTemBiometria(ok);
      if (ok && bloqueado) void desbloquear();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function entrarComSenha() {
    setErro(null);
    setCarregando(true);
    try {
      const u = await conta.entrar(identificador, senha);
      useStore.getState().abrirSessao(u);
      await recarregar();
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para entrar agora. Tente de novo.');
    } finally {
      setCarregando(false);
    }
  }

  async function desbloquear() {
    if (await autenticarBiometria('Entrar no Sobra')) useStore.getState().desbloquear();
  }

  async function pedirLink() {
    if (!esqueci) return;
    setEsqueci({ ...esqueci, carregando: true });
    try {
      await conta.esqueci(esqueci.email.trim());
      setEsqueci({ ...esqueci, enviado: true, carregando: false });
    } catch (e) {
      setEsqueci({ ...esqueci, carregando: false });
      setErro(e instanceof ErroApi ? e.message : 'Não deu para enviar agora.');
    }
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
          {bloqueado && temBiometria ? (
            <Botao variante="claro" onPress={desbloquear} icone={<Icone nome="digital" tam={20} traco={1.7} />}>
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
        <View style={{ alignSelf: 'flex-end' }}>
          <Link
            rotulo="Esqueci minha senha"
            onPress={() => setEsqueci({ email: identificador.includes('@') ? identificador : '', enviado: false, carregando: false })}
          />
        </View>
      </View>

      <Folha
        visivel={!!esqueci}
        onFechar={() => setEsqueci(null)}
        titulo={esqueci?.enviado ? 'Confira seu e-mail' : 'Esqueci minha senha'}
        sub={
          esqueci?.enviado
            ? 'Se houver uma conta com esse e-mail, mandamos um link para criar uma nova senha. Ele vale por 1 hora.'
            : 'Mandamos um link para o seu e-mail.'
        }
        rodape={
          esqueci?.enviado ? (
            <Botao onPress={() => setEsqueci(null)}>Voltar para o login</Botao>
          ) : (
            <Botao onPress={pedirLink} desabilitado={!esqueci || !emailValido(esqueci.email)} carregando={esqueci?.carregando}>
              Enviar link
            </Botao>
          )
        }
      >
        {esqueci && !esqueci.enviado ? (
          <Campo
            rotulo="E-mail"
            value={esqueci.email}
            onChangeText={(email) => setEsqueci({ ...esqueci, email })}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            autoFocus
          />
        ) : null}
      </Folha>
    </Tela>
  );
}
