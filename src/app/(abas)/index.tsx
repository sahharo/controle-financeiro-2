import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Folha } from '@/components/Folha';
import { Icone } from '@/components/Icones';
import { Apoio, Texto } from '@/components/Texto';
import { Barra, Cartao, Linha, Marca, Tela, TituloSecao, Vazio } from '@/components/ui';
import { useResumo } from '@/hooks/dados';
import { chaveDeIso, chaveMes, diaSemanaCurto, nomeMes, quando, somarMeses } from '@/lib/datas';
import { fmt, fmtInteiro, fmtR, MENOS, pct } from '@/lib/dinheiro';
import { gastoPorCategoria, prejuizoPendente, proximosVencimentos } from '@/lib/financas';
import { nomeCategoria, rotuloPagamento } from '@/lib/rotulos';
import { mesInicioConta, useStore } from '@/store';
import { useUi } from '@/store/ui';
import { cores, margem } from '@/theme';

export default function Inicio() {
  const mesUi = useUi((s) => s.mes);
  const setMes = useUi((s) => s.setMes);
  const { resumo, dados, agora } = useResumo(mesUi ?? undefined);
  const usuario = useStore((s) => s.usuario);
  const resolvidos = useStore((s) => s.prejuizosResolvidos);
  const marcarPago = useStore((s) => s.marcarPago);
  const [escolherMes, setEscolherMes] = useState(false);

  const atual = chaveMes(agora);
  const mes = resumo.mes;
  const inicioConta = mesInicioConta({ usuario });
  const prejuizo = prejuizoPendente(dados, agora, inicioConta, resolvidos);
  const vencimentos = mes === atual ? proximosVencimentos(dados.fixos, agora) : [];

  const ultimos = useMemo(
    () =>
      dados.gastos
        .filter((g) => chaveDeIso(g.data) === mes)
        .sort((a, b) => b.data.localeCompare(a.data))
        .slice(0, 3),
    [dados.gastos, mes],
  );
  // Categoria estourada: o aviso aparece no gasto mais recente dela.
  const estouros = useMemo(() => {
    const por = gastoPorCategoria(dados.gastos, mes);
    const r: Record<string, number> = {};
    for (const c of dados.categorias) if (c.limite > 0 && (por[c.id] ?? 0) > c.limite) r[c.id] = (por[c.id] ?? 0) - c.limite;
    return r;
  }, [dados.gastos, dados.categorias, mes]);
  const avisados = new Set<string>();

  const meses: string[] = [];
  for (let m = inicioConta < atual ? inicioConta : atual; m <= somarMeses(atual, 2); m = somarMeses(m, 1)) meses.push(m);

  const usado = pct(resumo.gastoTotal, resumo.ganho);
  const negativo = resumo.podeHoje < 0;

  let titulo = 'Pode gastar hoje';
  let numero = resumo.podeHoje;
  let sub: string;
  if (mes < atual) {
    titulo = resumo.saldo >= 0 ? `Sobrou em ${nomeMes(mes)}` : `${nomeMes(mes, true)} fechou no vermelho`;
    numero = resumo.saldo;
    sub = `Ganhou R$ ${fmtInteiro(resumo.ganho)} e gastou R$ ${fmtInteiro(resumo.gastoTotal + resumo.guardado)}.`;
  } else if (mes > atual) {
    titulo = 'Vai dar para gastar por dia';
    numero = resumo.orcamentoHoje;
    sub = `Se nada mudar até ${nomeMes(mes)}.`;
  } else {
    const faltam = `Faltam ${resumo.diasRestantes} ${resumo.diasRestantes === 1 ? 'dia' : 'dias'}.`;
    if (resumo.orcamentoHoje <= 0)
      sub = `${faltam} O mês já passou do orçamento. Cada gasto agora sai do mês que vem.`;
    else if (negativo) sub = `${faltam} Hoje passou R$ ${fmt(-resumo.podeHoje)} do previsto.`;
    else if (resumo.diferencaOntem != null && Math.abs(resumo.diferencaOntem) >= 100)
      sub = `${faltam} Ontem você gastou R$ ${fmtInteiro(Math.abs(resumo.diferencaOntem))} ${resumo.diferencaOntem > 0 ? 'a menos' : 'a mais'} que o previsto.`;
    else sub = faltam;
  }

  function pagar(fixoId: string, nome: string, valor: number) {
    Alert.alert(`Marcar ${nome} como pago?`, `R$ ${fmt(valor)} em ${nomeMes(atual)}.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Marcar como pago', onPress: () => marcarPago(fixoId, atual, valor) },
    ]);
  }

  return (
    <Tela padding={false} emAba>
      <View style={{ paddingHorizontal: margem, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Marca />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mês: ${nomeMes(mes)}. Trocar mês`}
          onPress={() => setEscolherMes(true)}
          style={{
            height: 44,
            paddingHorizontal: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: cores.borda,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Texto tam={14} peso={500}>
            {nomeMes(mes, true)}
          </Texto>
          <Icone nome="baixo" tam={14} traco={2} />
        </Pressable>
      </View>

      {dados.renda.valor <= 0 ? (
        <Cartao style={{ marginHorizontal: margem, marginTop: 16, padding: 18, gap: 6 }} onPress={() => router.push('/renda')} rotulo="Cadastrar renda">
          <Texto tam={16} peso={600}>
            Falta sua renda
          </Texto>
          <Apoio tam={14}>Sem ela não dá para calcular quanto você pode gastar por dia. Toque para cadastrar.</Apoio>
        </Cartao>
      ) : null}

      <Cartao raio={22} style={{ marginHorizontal: margem, marginTop: 16, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18 }}>
        <Texto tam={15} cor={cores.textoApoio}>
          {titulo}
        </Texto>
        <Texto
          tam={50}
          peso={600}
          mono
          em={-0.035}
          cor={numero < 0 ? cores.alerta : cores.texto}
          style={{ marginTop: 2 }}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {numero < 0 ? MENOS : ''}R$ {fmt(numero)}
        </Texto>
        <Texto tam={14} cor={cores.textoApoio} style={{ marginTop: 2 }}>
          {sub}
        </Texto>
        <View style={{ marginTop: 18 }}>
          <Barra pct={usado} cor={usado > 100 ? cores.alerta : cores.destaque} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Apoio>
            Gastou R$ {fmtInteiro(resumo.gastoTotal)} de R$ {fmtInteiro(resumo.ganho)}
          </Apoio>
          <Apoio>{usado}%</Apoio>
        </View>
      </Cartao>

      {mes >= atual ? (
        prejuizo && mes === atual ? (
          <Faixa alerta onPress={() => router.push('/proximos-meses')}>
            {nomeMes(prejuizo.mes, true)} fechou no vermelho:{' '}
            <Texto tam={14} mono peso={600} cor={cores.alerta}>
              {MENOS}R$ {fmtInteiro(prejuizo.valor)}
            </Texto>
          </Faixa>
        ) : (
          <Faixa onPress={() => router.push('/proximos-meses')}>
            Fim do mês: sobra prevista de{' '}
            <Texto tam={14} mono peso={600} cor={resumo.previsaoSobra < 0 ? cores.alerta : cores.texto}>
              {fmtR(resumo.previsaoSobra, { inteiro: true })}
            </Texto>
          </Faixa>
        )
      ) : null}

      {mes === atual ? (
        <View style={{ marginHorizontal: margem, marginTop: 22 }}>
          <TituloSecao acao={{ rotulo: 'Fixos', onPress: () => router.push('/gastos?aba=fixos') }}>Vence esta semana</TituloSecao>
          <View style={{ marginTop: 6 }}>
            {vencimentos.length === 0 ? (
              <Vazio texto="Nada vence nos próximos 7 dias." />
            ) : (
              vencimentos.map((v, i) => (
                <Linha
                  key={v.fixo.id + v.data.toISOString()}
                  borda={i < vencimentos.length - 1}
                  rotulo={`${v.fixo.nome}, vence dia ${v.data.getDate()}. Toque para marcar como pago`}
                  onPress={() => pagar(v.fixo.id, v.fixo.nome, v.valor)}
                  esquerda={
                    <View style={{ width: 40, alignItems: 'center' }}>
                      <Texto tam={17} mono peso={600}>
                        {v.data.getDate()}
                      </Texto>
                      <Texto tam={11} cor={cores.textoApoio} maiusculas em={0.06}>
                        {diaSemanaCurto(v.data)}
                      </Texto>
                    </View>
                  }
                  titulo={v.fixo.nome}
                  sub={v.estimado ? 'Estimado pela média de 3 meses' : undefined}
                  valor={`${v.estimado ? '~' : ''}${fmt(v.valor)}`}
                  valorCor={v.estimado ? cores.textoApoio : undefined}
                />
              ))
            )}
          </View>
        </View>
      ) : null}

      <View style={{ marginHorizontal: margem, marginTop: 18 }}>
        <TituloSecao acao={{ rotulo: 'Ver todos', onPress: () => router.push('/gastos') }}>Últimos gastos</TituloSecao>
        <View style={{ marginTop: 6 }}>
          {ultimos.length === 0 ? (
            <Vazio
              texto={mes === atual ? 'Nenhum gasto registrado neste mês ainda.' : `Nenhum gasto em ${nomeMes(mes)}.`}
              acao={mes === atual ? { rotulo: 'Registrar o primeiro', onPress: () => router.push('/registrar') } : undefined}
            />
          ) : (
            ultimos.map((g, i) => {
              const estouro = estouros[g.categoriaId];
              const avisar = estouro != null && !avisados.has(g.categoriaId);
              if (avisar) avisados.add(g.categoriaId);
              const cat = nomeCategoria(g.categoriaId, dados.categorias);
              return (
                <Linha
                  key={g.id}
                  borda={i < ultimos.length - 1}
                  onPress={() => router.push(`/registrar?id=${g.id}`)}
                  rotulo={`${g.descricao}, ${fmt(g.valor)}. Toque para editar`}
                  titulo={g.descricao || cat}
                  sub={
                    avisar
                      ? `${cat} passou do limite em R$ ${fmtInteiro(estouro)}`
                      : `${cat} · ${rotuloPagamento(g.pagamento, dados.cartoes)} · ${quando(g.data, agora, true)}${g.parcelas > 1 ? ` · ${g.parcelas}x` : ''}`
                  }
                  subCor={avisar ? cores.alerta : undefined}
                  valor={`${MENOS}${fmt(g.valor)}`}
                />
              );
            })
          )}
        </View>
      </View>

      <Folha visivel={escolherMes} onFechar={() => setEscolherMes(false)} titulo="Escolher mês">
        <View style={{ gap: 0 }}>
          {meses.map((m, i) => (
            <Linha
              key={m}
              borda={i < meses.length - 1}
              titulo={`${nomeMes(m, true)} de ${m.slice(0, 4)}`}
              sub={m === atual ? 'mês atual' : m > atual ? 'previsão' : undefined}
              direitaExtra={m === mes ? <Icone nome="check" tam={18} cor={cores.destaque} traco={2.4} /> : undefined}
              onPress={() => {
                setMes(m === atual ? null : m);
                setEscolherMes(false);
              }}
            />
          ))}
        </View>
      </Folha>
    </Tela>
  );
}

function Faixa({ children, onPress, alerta }: { children: React.ReactNode; onPress: () => void; alerta?: boolean }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => ({
        marginHorizontal: margem,
        marginTop: 12,
        minHeight: 44,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: alerta ? cores.alertaFundo : cores.destaqueFundo,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Texto tam={14} style={{ flex: 1 }}>
        {children}
      </Texto>
      <Icone nome="direita" tam={16} cor={alerta ? cores.alerta : cores.destaqueTexto} traco={2} />
    </Pressable>
  );
}
