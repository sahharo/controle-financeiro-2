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
  const digitos = (t: string) => t.replace(/\D/g, '').length;
  // O erro aparece ao sair do campo ou, no CPF e no celular, assim que todos os números foram digitados.
  const mostrar = (campo: string, completo: boolean) => tocados[campo] || completo;
  const erros = {
    cpf: cpf && !cpfValido(cpf) && mostrar('cpf', digitos(cpf) === 11) ? 'CPF inválido. Confira os números.' : null,
    celular:
      celular && !celularValido(celular) && mostrar('celular', digitos(celular) === 11)
        ? digitos(celular) < 11
          ? 'Faltam números. Use DDD + 9 + número.'
          : 'Celular inválido. Use DDD + 9 + número, ex.: (11) 91234-5678.'
        : null,
    email: email && !emailValido(email) && mostrar('email', false) ? 'E-mail inválido. Ex.: nome@gmail.com' : null,
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
          erro={erros.cpf}
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
          erro={erros.celular}
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
          erro={erros.email}
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
