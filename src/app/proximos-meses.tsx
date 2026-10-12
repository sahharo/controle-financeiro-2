import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Apoio, Texto } from '@/components/Texto';
import { Botao, Cartao, Tela, Titulo, TituloSecao, Voltar } from '@/components/ui';
import { useResumo } from '@/hooks/dados';
import { chaveMes, mesCurto, nomeMes, somarMeses } from '@/lib/datas';
import { fmt, fmtR, fmtInteiro, MENOS, pct } from '@/lib/dinheiro';
import { comprometidoDoMes, dividirPrejuizo, prejuizoPendente, resumoDoMes } from '@/lib/financas';
import { mesInicioConta, useStore } from '@/store';
import { cores } from '@/theme';

export default function ProximosMeses() {
  const { resumo, dados, agora } = useResumo();
  const usuario = useStore((s) => s.usuario);
  const resolvidos = useStore((s) => s.prejuizosResolvidos);
  const resolverPrejuizo = useStore((s) => s.resolverPrejuizo);
  const [opcao, setOpcao] = useState<1 | 3>(3);

  const atual = chaveMes(agora);
  const prejuizo = prejuizoPendente(dados, agora, mesInicioConta({ usuario }), resolvidos);

  // Como fica o "pode gastar hoje" em cada opção.
  const simulado = useMemo(() => {
    if (!prejuizo) return null;
    const com = (n: number) => {
      const ajustes = { ...dados.ajustes };
      for (const [m, v] of Object.entries(dividirPrejuizo(prejuizo.valor, atual, n))) ajustes[m] = (ajustes[m] ?? 0) + v;
      return resumoDoMes({ ...dados, ajustes }, atual, agora).orcamentoHoje;
    };
    return { tudo: com(1), tres: com(3) };
  }, [prejuizo, dados, atual, agora]);

  const proximos = [1, 2, 3, 4].map((k) => {
    const m = somarMeses(atual, k);
    const extra = prejuizo && opcao === 3 && k < 3 ? dividirPrejuizo(prejuizo.valor, atual, 3)[m] ?? 0 : 0;
    const valor = comprometidoDoMes(dados, m) + extra;
    return { mes: m, valor, pct: pct(valor, dados.renda.valor) };
  });

  function confirmar() {
    if (!prejuizo) return;
    resolverPrejuizo(prejuizo.mes, prejuizo.valor, opcao, atual);
    router.back();
  }

  return (
    <Tela
      contentStyle={{ paddingTop: 16 }}
      rodape={
        prejuizo ? (
          <Botao onPress={confirmar}>{opcao === 3 ? 'Confirmar divisão em 3x' : `Tirar tudo de ${nomeMes(atual)}`}</Botao>
        ) : undefined
      }
    >
      <Voltar rotulo="Início" />
      <Titulo style={{ marginTop: 8 }}>Próximos meses</Titulo>

      {prejuizo && simulado ? (
        <Cartao style={{ marginTop: 18, padding: 18 }}>
          <Texto tam={14} peso={500} cor={cores.alerta}>
            {nomeMes(prejuizo.mes, true)} fechou no vermelho
          </Texto>
          <Texto tam={28} peso={600} mono em={-0.03} style={{ marginTop: 2 }}>
            {MENOS}R$ {fmt(prejuizo.valor)}
          </Texto>
          <Apoio tam={14} altura={1.45} style={{ marginTop: 6 }}>
            Esse valor precisa sair de algum mês. Veja como cada opção mexe no seu dia a dia:
          </Apoio>
          <View accessibilityRole="radiogroup" accessibilityLabel="Como cobrir o prejuízo" style={{ marginTop: 14, gap: 8 }}>
            <Opcao ativa={opcao === 1} onPress={() => setOpcao(1)} titulo={`Tirar tudo de ${nomeMes(atual)}`}>
              Sobra por dia cai de {fmt(resumo.orcamentoHoje)} para{' '}
              <Texto tam={13} mono>
                {fmt(simulado.tudo)}
              </Texto>
            </Opcao>
            <Opcao ativa={opcao === 3} onPress={() => setOpcao(3)} titulo="Dividir em 3 meses">
              R$ {fmt(Math.ceil(prejuizo.valor / 3))} por mês até {nomeMes(somarMeses(atual, 2))}. Sobra por dia cai para{' '}
              <Texto tam={13} mono>
                {fmt(simulado.tres)}
              </Texto>
            </Opcao>
          </View>
          <Apoio altura={1.45} style={{ marginTop: 12 }}>
            Dividir alivia agora, mas os próximos meses começam menores. Se acontecer de novo, vale rever os limites.
          </Apoio>
        </Cartao>
      ) : (
        <Cartao style={{ marginTop: 18, padding: 18, gap: 4 }}>
          <Texto tam={14} cor={cores.textoApoio}>
            Fim de {nomeMes(atual)}: sobra prevista
          </Texto>
          <Texto tam={28} peso={600} mono em={-0.03} cor={resumo.previsaoSobra < 0 ? cores.alerta : cores.texto}>
            {fmtR(resumo.previsaoSobra)}
          </Texto>
          <Apoio tam={14} altura={1.45} style={{ marginTop: 4 }}>
            Renda de R$ {fmtInteiro(resumo.ganho)} menos fixos (R$ {fmtInteiro(resumo.fixos)})
            {resumo.ajuste ? `, prejuízo anterior (R$ ${fmtInteiro(resumo.ajuste)})` : ''}
            {resumo.guardado ? `, o que você guardou (R$ ${fmtInteiro(resumo.guardado)})` : ''} e
            {resumo.limites > resumo.variavel ? ` os limites das categorias (R$ ${fmtInteiro(resumo.limites)}).` : ` o que já gastou (R$ ${fmtInteiro(resumo.variavel)}).`}
          </Apoio>
        </Cartao>
      )}

      <View style={{ marginTop: 22 }}>
        <TituloSecao>Quanto da renda já tem dono</TituloSecao>
        <Apoio style={{ marginTop: 2 }}>Fixos + parcelas do cartão{prejuizo ? ' + o prejuízo dividido' : ''}</Apoio>
        <View style={{ marginTop: 14, gap: 12 }}>
          {proximos.map((p) => (
            <View key={p.mes} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`${nomeMes(p.mes)}: ${p.pct}% da renda`}>
              <Texto tam={13} cor={cores.textoApoio} style={{ width: 34 }}>
                {mesCurto(p.mes)}
              </Texto>
              <View style={{ flex: 1, height: 10, borderRadius: 3, backgroundColor: cores.borda, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, p.pct)}%`, height: '100%', backgroundColor: p.pct > 100 ? cores.alerta : cores.texto }} />
              </View>
              <Texto tam={14} mono direita style={{ width: 44 }}>
                {p.pct}%
              </Texto>
            </View>
          ))}
        </View>
      </View>
    </Tela>
  );
}

function Opcao({ ativa, onPress, titulo, children }: { ativa: boolean; onPress: () => void; titulo: string; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: ativa }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 14,
        borderWidth: ativa ? 1.5 : 1,
        borderColor: ativa ? cores.texto : cores.borda,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          borderWidth: ativa ? 5 : 1.5,
          borderColor: ativa ? cores.texto : cores.bordaForte,
          marginTop: 2,
        }}
      />
      <View style={{ flex: 1 }}>
        <Texto tam={15}>{titulo}</Texto>
        <Apoio style={{ marginTop: 2 }}>{children}</Apoio>
      </View>
    </Pressable>
  );
}
