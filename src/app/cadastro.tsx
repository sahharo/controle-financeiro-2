import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { CampoSenha } from '@/components/CampoSenha';
import { Apoio, Texto } from '@/components/Texto';
import { Botao, Campo, Link, Marcador, Tela, Voltar } from '@/components/ui';
import { URL_PRIVACIDADE, URL_TERMOS } from '@/lib/config';
import { conta, ErroApi } from '@/lib/api';
import {
  celularValido,
  cpfValido,
  emailValido,
  mascaraCelular,
  mascaraCpf,
  regrasSenha,
} from '@/lib/validacao';
import { useStore } from '@/store';
import { cores } from '@/theme';

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [cpf, setCpf] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [aceite, setAceite] = useState(false);
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tocar = (campo: string) => () => setTocados((t) => ({ ...t, [campo]: true }));
  const erros = {
    cpf: cpf && !cpfValido(cpf) ? 'CPF inválido' : null,
    celular: celular && !celularValido(celular) ? 'Celular incompleto' : null,
    email: email && !emailValido(email) ? 'E-mail inválido' : null,
  };
  const valido =
    nome.trim() &&
    sobrenome.trim() &&
    cpfValido(cpf) &&
    celularValido(celular) &&
    emailValido(email) &&
    regrasSenha(senha).every((r) => r.ok) &&
    aceite;

  async function criar() {
    setErro(null);
    setCarregando(true);
    try {
      const u = await conta.cadastrar({ nome, sobrenome, cpf, celular, email, senha, aceite });
      useStore.getState().abrirSessao(u);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para criar a conta agora. Tente de novo.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Tela
      contentStyle={{ paddingHorizontal: 24, paddingTop: 12 }}
      rodape={
        <View style={{ gap: 10 }}>
          {erro ? (
            <Texto tam={14} cor={cores.alerta} centro>
              {erro}
            </Texto>
          ) : null}
          <Botao onPress={criar} desabilitado={!valido} carregando={carregando}>
            Criar conta
          </Botao>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
            <Apoio tam={14}>Já tem conta?</Apoio>
            <Link rotulo="Entrar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/entrar'))} />
          </View>
        </View>
      }
    >
      <Voltar rotulo="Entrar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/entrar'))} />
      <Texto tam={28} peso={700} em={-0.025} style={{ marginTop: 6 }} accessibilityRole="header">
        Criar sua conta
      </Texto>
      <Apoio tam={14} style={{ marginTop: 4 }}>
        Seus dados ficam criptografados e nunca são vendidos.
      </Apoio>

      <View style={{ marginTop: 18, gap: 11 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Campo rotulo="Nome" value={nome} onChangeText={setNome} autoComplete="given-name" textContentType="givenName" altura={46} raio={12} />
          </View>
          <View style={{ flex: 1 }}>
            <Campo
              rotulo="Sobrenome"
              value={sobrenome}
              onChangeText={setSobrenome}
              autoComplete="family-name"
              textContentType="familyName"
              altura={46}
              raio={12}
            />
          </View>
        </View>
        <Campo
          rotulo="CPF"
          mono
          value={cpf}
          onChangeText={(t) => setCpf(mascaraCpf(t))}
          onBlur={tocar('cpf')}
          erro={tocados.cpf ? erros.cpf : null}
          keyboardType="number-pad"
          placeholder="000.000.000-00"
          altura={46}
          raio={12}
        />
        <Campo
          rotulo="Celular"
          mono
          value={celular}
          onChangeText={(t) => setCelular(mascaraCelular(t))}
          onBlur={tocar('celular')}
          erro={tocados.celular ? erros.celular : null}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="(11) 90000-0000"
          altura={46}
          raio={12}
        />
        <Campo
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          onBlur={tocar('email')}
          erro={tocados.email ? erros.email : null}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          altura={46}
          raio={12}
        />
        <CampoSenha valor={senha} onChange={setSenha} novaSenha altura={46} raio={12} />
        <Marcador valor={aceite} onChange={setAceite}>
          <Texto tam={13} cor={cores.textoSecundario} altura={1.4}>
            Li e aceito os{' '}
            <Texto tam={13} cor={cores.destaqueTexto} onPress={() => WebBrowser.openBrowserAsync(URL_TERMOS)}>
              Termos de uso
            </Texto>{' '}
            e a{' '}
            <Texto tam={13} cor={cores.destaqueTexto} onPress={() => WebBrowser.openBrowserAsync(URL_PRIVACIDADE)}>
              Política de privacidade
            </Texto>
          </Texto>
        </Marcador>
      </View>
    </Tela>
  );
}
