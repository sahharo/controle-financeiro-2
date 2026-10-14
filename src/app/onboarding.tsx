import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EscolherBanco } from '@/components/EscolherBanco';
import { FormRenda } from '@/components/FormRenda';
import { Apoio, Texto } from '@/components/Texto';
import { Botao, Campo, CampoValor, Marcador, Tela } from '@/components/ui';
import { fmtR } from '@/lib/dinheiro';
import { useStore, type Renda } from '@/store';
import { cores } from '@/theme';

interface FixoRascunho {
  nome: string;
  valor: number;
  dia: string;
}


export default function Onboarding() {
  const nome = useStore((s) => s.usuario?.nome);
  const [passo, setPasso] = useState(0);
  const [renda, setRenda] = useState<Renda>({ valor: 0, diaPagamento: { tipo: 'dia', dia: 5 }, variavel: false });
  const [fixos, setFixos] = useState<FixoRascunho[]>([
    { nome: '', valor: 0, dia: '' },
    { nome: '', valor: 0, dia: '' },
    { nome: '', valor: 0, dia: '' },
  ]);
  const [semCartao, setSemCartao] = useState(false);
  const [cartao, setCartao] = useState({ nome: '', fechamento: '3', vencimento: '10', limite: 0 });

  function concluir(incluirTudo = true) {
    const validos = incluirTudo ? fixos.filter((f) => f.nome.trim() && f.valor > 0) : [];
    const dia = (t: string, padrao: number) => Math.min(31, Math.max(1, Number(t) || padrao));
    useStore.getState().concluirOnboarding({
      renda,
      fixos: validos.map((f) => ({ nome: f.nome.trim(), tipo: 'fixo', valor: f.valor, dia: dia(f.dia, 10), lembrete: true })),
      cartao:
        incluirTudo && !semCartao && cartao.nome.trim()
          ? {
              nome: cartao.nome.trim(),
              diaFechamento: dia(cartao.fechamento, 3),
              diaVencimento: dia(cartao.vencimento, 10),
              limite: cartao.limite,
            }
          : undefined,
    });
  }

  const titulos = [
    'Quanto entra na sua conta por mês?',
    'Quais são seus 3 maiores gastos fixos?',
    'Qual cartão você mais usa?',
  ];
  const textos = [
    'Use o valor líquido, já com os descontos. Freela, 13º e extras você adiciona depois.',
    'Aluguel, condomínio, escola, plano de saúde. O que sai todo mês com valor parecido.',
    'Com o dia de fechamento, o app sabe em qual fatura cada compra vai cair.',
  ];
  const rodapes = [
    'Depois: seus 3 maiores gastos fixos e o cartão que você mais usa. Com isso já dá para calcular quanto você pode gastar por dia.',
    'Você pode adicionar outros fixos, contas variáveis como luz e gastos anuais como IPVA depois.',
    'Pronto. Seus limites por categoria começam com uma sugestão e você ajusta quando quiser.',
  ];

  return (
    <Tela
      contentStyle={{ paddingHorizontal: 24, paddingTop: 20 }}
      rodape={
        <View style={{ gap: 14 }}>
          <Apoio altura={1.45}>{rodapes[passo]}</Apoio>
          <Botao
            desabilitado={passo === 0 && renda.valor <= 0}
            onPress={() => (passo < 2 ? setPasso(passo + 1) : concluir())}
          >
            {passo < 2 ? 'Continuar' : 'Começar'}
          </Botao>
          {passo > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => setPasso(passo - 1)} style={{ alignSelf: 'center', padding: 6 }}>
              <Apoio tam={14}>Voltar</Apoio>
            </Pressable>
          ) : null}
        </View>
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Passo ${passo + 1} de 3`}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 28, height: 4, borderRadius: 999, backgroundColor: i <= passo ? cores.texto : cores.borda }} />
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => concluir(passo > 0)} style={{ paddingVertical: 12 }} hitSlop={8}>
          <Apoio tam={14}>Pular</Apoio>
        </Pressable>
      </View>

      <View style={{ marginTop: 40, gap: 10 }}>
        <Texto tam={13} mono cor={cores.textoApoio}>
          {passo + 1} de 3 · {passo === 0 ? 'leva 2 minutos' : passo === 1 ? 'quase lá' : 'último passo'}
        </Texto>
        {passo === 0 && nome ? (
          <Texto tam={15} cor={cores.textoApoio}>
            Oi, {nome}.
          </Texto>
        ) : null}
        <Texto tam={30} peso={700} em={-0.025} altura={1.15} accessibilityRole="header">
          {titulos[passo]}
        </Texto>
        <Apoio tam={15} altura={1.45}>
          {textos[passo]}
        </Apoio>
      </View>

      <View style={{ marginTop: 32 }}>
        {passo === 0 ? <FormRenda renda={renda} onChange={setRenda} /> : null}

        {passo === 1 ? (
          <View style={{ gap: 18 }}>
            {fixos.map((f, i) => (
              <View key={i} style={{ gap: 8 }}>
                <Campo
                  rotulo={`Gasto fixo ${i + 1}`}
                  placeholder={['Ex.: Aluguel', 'Ex.: Plano de saúde', 'Ex.: Internet'][i]}
                  value={f.nome}
                  onChangeText={(nome) => setFixos(fixos.map((x, j) => (j === i ? { ...x, nome } : x)))}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <CampoValor
                      rotulo="Valor"
                      rotuloApoio
                      valor={f.valor}
                      onChange={(valor) => setFixos(fixos.map((x, j) => (j === i ? { ...x, valor } : x)))}
                    />
                  </View>
                  <View style={{ width: 110 }}>
                    <Campo
                      rotulo="Vence dia"
                      rotuloApoio
                      mono
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="10"
                      value={f.dia}
                      onChangeText={(dia) => setFixos(fixos.map((x, j) => (j === i ? { ...x, dia: dia.replace(/\D/g, '') } : x)))}
                    />
                  </View>
                </View>
              </View>
            ))}
            {renda.valor > 0 ? (
              <Apoio tam={14}>
                Somando: {fmtR(fixos.reduce((s, f) => s + f.valor, 0))} de {fmtR(renda.valor)}
              </Apoio>
            ) : null}
          </View>
        ) : null}

        {passo === 2 ? (
          <View style={{ gap: 16 }}>
            {!semCartao ? (
              <>
                <EscolherBanco nome={cartao.nome} onChange={(nome) => setCartao({ ...cartao, nome })} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Campo
                      rotulo="Fecha dia"
                      mono
                      keyboardType="number-pad"
                      maxLength={2}
                      value={cartao.fechamento}
                      onChangeText={(t) => setCartao({ ...cartao, fechamento: t.replace(/\D/g, '') })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Campo
                      rotulo="Vence dia"
                      mono
                      keyboardType="number-pad"
                      maxLength={2}
                      value={cartao.vencimento}
                      onChangeText={(t) => setCartao({ ...cartao, vencimento: t.replace(/\D/g, '') })}
                    />
                  </View>
                </View>
                <CampoValor rotulo="Limite" valor={cartao.limite} onChange={(limite) => setCartao({ ...cartao, limite })} />
              </>
            ) : null}
            <Marcador valor={semCartao} onChange={setSemCartao}>
              Não uso cartão de crédito
            </Marcador>
          </View>
        ) : null}
      </View>
    </Tela>
  );
}
