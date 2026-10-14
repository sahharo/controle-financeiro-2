import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Folha } from '@/components/Folha';
import { Icone } from '@/components/Icones';
import { Apoio, Texto } from '@/components/Texto';
import { Barra, Botao, BotaoTexto, Campo, CampoValor, Cartao, Tela, Titulo, TituloSecao } from '@/components/ui';
import { useAgora, useDados } from '@/hooks/dados';
import { chaveDeIso, chaveMes, nomeMes, somarMeses } from '@/lib/datas';
import { fmt, fmtInteiro, fmtSinal, pct } from '@/lib/dinheiro';
import { custoDeVida, guardadoNaMeta, mesesParaMeta, mesesSemDeposito, saldoMovimentos } from '@/lib/financas';
import { saldoCaixinha } from '@/lib/rendimento';
import { useStore, type Meta } from '@/store';
import { cores, margem } from '@/theme';
import { alerta } from '@/lib/alerta';

type Rascunho = { id?: string; nome: string; alvo: number; aporteMensal: number };

export default function Metas() {
  const dados = useDados();
  const agora = useAgora();
  const salvarMeta = useStore((s) => s.salvarMeta);
  const removerMeta = useStore((s) => s.removerMeta);
  const depositarMeta = useStore((s) => s.depositarMeta);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [depositando, setDepositando] = useState<{ meta: Meta; valor: number } | null>(null);

  const mesAnterior = somarMeses(chaveMes(agora), -1);
  const rendeuAnterior = dados.caixinha.movimentos
    .filter((m) => m.tipo === 'rendimento' && chaveDeIso(m.data) === mesAnterior)
    .reduce((s, m) => s + m.valor, 0);
  const custo = custoDeVida(dados, chaveMes(agora));
  const reserva = saldoMovimentos(dados.reserva.movimentos);
  const mesesReserva = custo > 0 ? reserva / custo : 0;

  function salvar() {
    if (!rascunho || !rascunho.nome.trim() || rascunho.alvo <= 0) return;
    salvarMeta({ ...rascunho, nome: rascunho.nome.trim() });
    setRascunho(null);
  }

  return (
    <Tela padding={false} emAba>
      <View style={{ paddingHorizontal: margem, paddingTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Titulo>Metas</Titulo>
        <BotaoTexto rotulo="+ Nova meta" onPress={() => setRascunho({ nome: '', alvo: 0, aporteMensal: 0 })} />
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/simulador')}
        style={({ pressed }) => ({
          marginHorizontal: margem,
          marginTop: 16,
          height: 56,
          borderRadius: 16,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: cores.bordaForte,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Icone nome="buscar" tam={20} cor={cores.textoApoio} />
        <Texto tam={15} cor={cores.textoApoio}>
          Pensando em comprar algo? Simule aqui
        </Texto>
      </Pressable>

      <View style={{ marginHorizontal: margem, marginTop: 22, gap: 10 }}>
        {dados.metas.length === 0 ? (
          <Cartao style={{ padding: 16, gap: 6 }} onPress={() => setRascunho({ nome: '', alvo: 0, aporteMensal: 0 })} rotulo="Criar meta">
            <Texto tam={16} peso={600}>
              Sua primeira meta
            </Texto>
            <Apoio tam={14} altura={1.4}>
              Uma viagem, um notebook, a entrada de um carro. Diga quanto custa e quanto dá para guardar por mês.
            </Apoio>
          </Cartao>
        ) : null}
        {dados.metas.map((m) => {
          const guardado = guardadoNaMeta(m);
          const p = pct(guardado, m.alvo);
          const meses = mesesParaMeta(m);
          const parado = mesesSemDeposito(m, agora);
          const concluida = guardado >= m.alvo;
          let rodape: string;
          let alerta = false;
          if (concluida) rodape = 'Meta alcançada';
          else if (parado >= 2) {
            rodape = `Sem depósito há ${parado} meses`;
            alerta = true;
          } else if (meses != null) rodape = `R$ ${fmtInteiro(m.aporteMensal)} por mês · chega lá em ${nomeMes(somarMeses(chaveMes(agora), meses))}`;
          else rodape = 'Defina quanto guardar por mês';
          return (
            <Cartao key={m.id} style={{ padding: 16 }} onPress={() => setDepositando({ meta: m, valor: m.aporteMensal })} rotulo={`${m.nome}, ${p}%. Toque para guardar`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Texto tam={16} peso={600} style={{ flexShrink: 1 }}>
                  {m.nome}
                </Texto>
                <Texto tam={14} mono cor={cores.textoApoio}>
                  {p}%
                </Texto>
              </View>
              <Texto tam={15} mono style={{ marginTop: 6 }}>
                {fmtInteiro(guardado)}{' '}
                <Texto tam={15} mono cor={cores.textoApoio}>
                  de {fmtInteiro(m.alvo)}
                </Texto>
              </Texto>
              <View style={{ marginTop: 10 }}>
                <Barra pct={p} altura={5} />
              </View>
              <Apoio style={{ marginTop: 8 }} cor={alerta ? cores.alerta : cores.textoApoio}>
                {rodape}
              </Apoio>
            </Cartao>
          );
        })}
      </View>

      <View style={{ marginHorizontal: margem, marginTop: 24 }}>
        <TituloSecao>Guardado</TituloSecao>
      </View>
      <View style={{ marginHorizontal: margem, marginTop: 10, flexDirection: 'row', gap: 10 }}>
        <Cartao style={{ flex: 1, padding: 16, gap: 4 }} onPress={() => router.push('/caixinha')} rotulo="Caixinha">
          <Texto tam={14} cor={cores.textoApoio}>
            Caixinha
          </Texto>
          <Texto tam={20} peso={600} mono em={-0.02} adjustsFontSizeToFit numberOfLines={1}>
            {fmt(saldoCaixinha(dados.caixinha))}
          </Texto>
          <Texto tam={13} cor={rendeuAnterior > 0 ? cores.destaqueTexto : cores.textoApoio}>
            {rendeuAnterior > 0 ? `${fmtSinal(rendeuAnterior)} em ${nomeMes(mesAnterior)}` : `Rende ${dados.caixinha.percentualCdi}% do CDI`}
          </Texto>
        </Cartao>
        <Cartao style={{ flex: 1, padding: 16, gap: 4 }} onPress={() => router.push('/reserva')} rotulo="Reserva de emergência">
          <Texto tam={14} cor={cores.textoApoio}>
            Reserva
          </Texto>
          <Texto tam={20} peso={600} mono em={-0.02} adjustsFontSizeToFit numberOfLines={1}>
            {fmt(reserva)}
          </Texto>
          <Apoio>
            {custo > 0 ? `${mesesReserva.toFixed(1).replace('.', ',')} de ${dados.reserva.mesesAlvo} meses` : 'Para imprevistos'}
          </Apoio>
        </Cartao>
      </View>

      <Folha
        visivel={!!rascunho}
        onFechar={() => setRascunho(null)}
        titulo={rascunho?.id ? 'Editar meta' : 'Nova meta'}
        rodape={
          rascunho ? (
            <>
              <Botao variante="destaque" onPress={salvar} desabilitado={!rascunho.nome.trim() || rascunho.alvo <= 0}>
                Salvar meta
              </Botao>
              {rascunho.id ? (
                <BotaoTexto
                  rotulo="Excluir meta"
                  cor={cores.alerta}
                  onPress={() =>
                    alerta(`Excluir ${rascunho.nome}?`, 'O histórico de depósitos dessa meta será apagado.', [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Excluir',
                        style: 'destructive',
                        onPress: () => {
                          removerMeta(rascunho.id!);
                          setRascunho(null);
                        },
                      },
                    ])
                  }
                />
              ) : null}
            </>
          ) : null
        }
      >
        {rascunho ? (
          <>
            <Campo rotulo="O que você quer" value={rascunho.nome} onChangeText={(nome) => setRascunho({ ...rascunho, nome })} placeholder="Ex.: Viagem para Floripa" />
            <CampoValor rotulo="Quanto custa" valor={rascunho.alvo} onChange={(alvo) => setRascunho({ ...rascunho, alvo })} />
            <CampoValor rotulo="Quanto guardar por mês" valor={rascunho.aporteMensal} onChange={(aporteMensal) => setRascunho({ ...rascunho, aporteMensal })} />
            {rascunho.alvo > 0 && rascunho.aporteMensal > 0 ? (
              <Apoio tam={14}>
                Chega lá em {nomeMes(somarMeses(chaveMes(agora), Math.ceil(rascunho.alvo / rascunho.aporteMensal)))} de{' '}
                {somarMeses(chaveMes(agora), Math.ceil(rascunho.alvo / rascunho.aporteMensal)).slice(0, 4)}.
              </Apoio>
            ) : null}
          </>
        ) : null}
      </Folha>

      <Folha
        visivel={!!depositando}
        onFechar={() => setDepositando(null)}
        titulo={depositando?.meta.nome ?? ''}
        sub={depositando ? `Guardado: R$ ${fmt(guardadoNaMeta(depositando.meta))} de R$ ${fmt(depositando.meta.alvo)}` : undefined}
        rodape={
          depositando ? (
            <>
              <Botao
                variante="destaque"
                desabilitado={depositando.valor <= 0}
                onPress={() => {
                  depositarMeta(depositando.meta.id, depositando.valor);
                  setDepositando(null);
                }}
              >
                Guardar
              </Botao>
              <BotaoTexto
                rotulo="Editar meta"
                cor={cores.textoApoio}
                onPress={() => {
                  const { id, nome, alvo, aporteMensal } = depositando.meta;
                  setDepositando(null);
                  setRascunho({ id, nome, alvo, aporteMensal });
                }}
              />
            </>
          ) : null
        }
      >
        <CampoValor rotulo="Quanto você guardou agora" valor={depositando?.valor ?? 0} onChange={(valor) => depositando && setDepositando({ ...depositando, valor })} />
        <Apoio tam={14}>O valor sai da sobra deste mês.</Apoio>
      </Folha>
    </Tela>
  );
}
