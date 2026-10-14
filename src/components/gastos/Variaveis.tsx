import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Folha } from '../Folha';
import { Apoio, Texto } from '../Texto';
import { Barra, Botao, BotaoTexto, Campo, CampoValor, Cartao, Linha, TituloSecao, Vazio } from '../ui';
import { useResumo } from '@/hooks/dados';
import { chaveDeIso, diferencaMeses, nomeMes, quando } from '@/lib/datas';
import { fmt, fmtInteiro, MENOS, pct } from '@/lib/dinheiro';
import { fixosMensais, gastoNoMes, gastoPorCategoria } from '@/lib/financas';
import { nomeCategoria, rotuloPagamento } from '@/lib/rotulos';
import { useStore, type Categoria } from '@/store';
import { cores, margem } from '@/theme';
import { alerta } from '@/lib/alerta';

export function Variaveis() {
  const { resumo, dados, agora } = useResumo();
  const salvarCategoria = useStore((s) => s.salvarCategoria);
  const removerCategoria = useStore((s) => s.removerCategoria);
  const setLimites = useStore((s) => s.setLimites);
  const [editando, setEditando] = useState<Partial<Categoria> | null>(null);
  const [limites, setLimitesRascunho] = useState<Record<string, number> | null>(null);

  const mes = resumo.mes;
  const por = useMemo(() => gastoPorCategoria(dados.gastos, mes), [dados.gastos, mes]);
  const doMes = useMemo(
    () => dados.gastos.filter((g) => gastoNoMes(g, mes) > 0).sort((a, b) => b.data.localeCompare(a.data)),
    [dados.gastos, mes],
  );
  const sobram = resumo.limites - resumo.variavel;
  const livre = dados.renda.valor - fixosMensais(dados.fixos, mes);

  function salvarEdicao() {
    if (!editando?.nome?.trim()) return;
    salvarCategoria({ id: editando.id, nome: editando.nome.trim(), limite: editando.limite ?? 0 });
    setEditando(null);
  }

  function excluirCategoria(c: Partial<Categoria>) {
    if (!c.id) return;
    alerta(`Excluir ${c.nome}?`, 'Os gastos dessa categoria vão para "Outros".', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          removerCategoria(c.id!);
          setEditando(null);
        },
      },
    ]);
  }

  const somaRascunho = limites ? Object.values(limites).reduce((a, b) => a + b, 0) : 0;

  return (
    <View>
      <View style={{ paddingHorizontal: margem, paddingTop: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flexShrink: 1 }}>
          <Texto tam={26} peso={600} mono em={-0.03}>
            R$ {fmtInteiro(resumo.variavel)}
          </Texto>
          <Apoio tam={14}>
            {resumo.limites > 0 ? `de R$ ${fmtInteiro(resumo.limites)} planejados para ${nomeMes(mes)}` : `gastos em ${nomeMes(mes)}`}
          </Apoio>
        </View>
        {resumo.limites > 0 ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Apoio direita>{sobram >= 0 ? 'sobram' : 'passou'}</Apoio>
            <Texto tam={15} mono cor={sobram >= 0 ? cores.texto : cores.alerta}>
              R$ {fmtInteiro(Math.abs(sobram))}
            </Texto>
          </View>
        ) : null}
      </View>

      <Cartao style={{ marginHorizontal: margem, marginTop: 18, paddingHorizontal: 16, paddingVertical: 6 }}>
        {dados.categorias.length === 0 ? (
          <Vazio texto="Nenhuma categoria ainda." acao={{ rotulo: 'Criar a primeira', onPress: () => setEditando({ nome: '', limite: 0 }) }} />
        ) : (
          dados.categorias.map((c, i) => {
            const gasto = por[c.id] ?? 0;
            const estourou = c.limite > 0 && gasto > c.limite;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`${c.nome}: ${fmtInteiro(gasto)} de ${fmtInteiro(c.limite)}. Toque para editar`}
                onPress={() => setEditando(c)}
                style={({ pressed }) => ({
                  paddingVertical: 13,
                  borderBottomWidth: i < dados.categorias.length - 1 ? 1 : 0,
                  borderBottomColor: cores.borda,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <Texto tam={15} peso={500} cor={estourou ? cores.alerta : cores.texto}>
                    {c.nome}
                  </Texto>
                  <Texto tam={14} mono cor={estourou ? cores.alerta : cores.texto}>
                    {fmtInteiro(gasto)}
                    <Texto tam={14} mono cor={cores.textoApoio}>
                      {c.limite > 0 ? ` / ${fmtInteiro(c.limite)}` : ' · sem limite'}
                    </Texto>
                  </Texto>
                </View>
                {c.limite > 0 ? (
                  <View style={{ marginTop: 8 }}>
                    <Barra
                      pct={pct(gasto, c.limite)}
                      altura={5}
                      cor={estourou ? cores.alerta : cores.texto}
                      trilho={estourou ? cores.alertaTrilho : cores.borda}
                    />
                  </View>
                ) : null}
                {estourou ? (
                  <Apoio style={{ marginTop: 6 }}>Passou R$ {fmtInteiro(gasto - c.limite)}. Vai sair da sobra do mês.</Apoio>
                ) : null}
              </Pressable>
            );
          })
        )}
      </Cartao>

      <View style={{ marginHorizontal: margem, marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
        <BotaoTexto rotulo="+ Nova categoria" onPress={() => setEditando({ nome: '', limite: 0 })} />
        {dados.categorias.length ? (
          <BotaoTexto
            rotulo="Ajustar limites"
            cor={cores.textoApoio}
            onPress={() => setLimitesRascunho(Object.fromEntries(dados.categorias.map((c) => [c.id, c.limite])))}
          />
        ) : null}
      </View>

      <View style={{ marginHorizontal: margem, marginTop: 12 }}>
        <TituloSecao>Gastos de {nomeMes(mes)}</TituloSecao>
        <View style={{ marginTop: 4 }}>
          {doMes.length === 0 ? (
            <Vazio texto="Nada por aqui ainda." acao={{ rotulo: 'Registrar gasto', onPress: () => router.push('/registrar') }} />
          ) : (
            doMes.map((g, i) => {
              const parcela = g.parcelas > 1 ? ` · parcela ${diferencaMeses(chaveDeIso(g.data), mes) + 1} de ${g.parcelas}` : '';
              return (
                <Linha
                  key={g.id}
                  borda={i < doMes.length - 1}
                  onPress={() => router.push(`/registrar?id=${g.id}`)}
                  rotulo={`${g.descricao}, ${fmt(gastoNoMes(g, mes))}. Toque para editar`}
                  titulo={g.descricao}
                  sub={`${nomeCategoria(g.categoriaId, dados.categorias)} · ${rotuloPagamento(g.pagamento, dados.cartoes)} · ${quando(g.data, agora)}${parcela}`}
                  valor={`${MENOS}${fmt(gastoNoMes(g, mes))}`}
                />
              );
            })
          )}
        </View>
      </View>

      <Folha
        visivel={!!editando}
        onFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar categoria' : 'Nova categoria'}
        rodape={
          <>
            <Botao onPress={salvarEdicao} desabilitado={!editando?.nome?.trim()}>
              Salvar
            </Botao>
            {editando?.id ? (
              <BotaoTexto rotulo="Excluir categoria" cor={cores.alerta} onPress={() => excluirCategoria(editando)} />
            ) : null}
          </>
        }
      >
        <Campo rotulo="Nome" value={editando?.nome ?? ''} onChangeText={(nome) => setEditando({ ...editando, nome })} autoFocus={!editando?.id} />
        <CampoValor rotulo="Limite por mês" valor={editando?.limite ?? 0} onChange={(limite) => setEditando({ ...editando, limite })} />
        {editando?.id ? (
          <Apoio tam={14}>
            Em {nomeMes(mes)}: R$ {fmt(por[editando.id] ?? 0)} gastos em {nomeCategoria(editando.id, dados.categorias)}.
          </Apoio>
        ) : null}
      </Folha>

      <Folha
        visivel={!!limites}
        onFechar={() => setLimitesRascunho(null)}
        titulo="Ajustar limites"
        sub={livre > 0 ? `Depois dos fixos, sobram R$ ${fmtInteiro(livre)} por mês.` : undefined}
        rodape={
          <>
            {livre > 0 ? (
              <Apoio tam={14} cor={somaRascunho > livre ? cores.alerta : cores.textoApoio}>
                Total dos limites: R$ {fmtInteiro(somaRascunho)}
                {somaRascunho > livre ? ` · passa R$ ${fmtInteiro(somaRascunho - livre)} do que sobra` : ` · ficam R$ ${fmtInteiro(livre - somaRascunho)} de folga`}
              </Apoio>
            ) : null}
            <Botao
              onPress={() => {
                if (limites) setLimites(limites);
                setLimitesRascunho(null);
              }}
            >
              Salvar limites
            </Botao>
          </>
        }
      >
        {dados.categorias.map((c) => (
          <CampoValor
            key={c.id}
            rotulo={c.nome}
            valor={limites?.[c.id] ?? 0}
            onChange={(v) => setLimitesRascunho({ ...limites, [c.id]: v })}
          />
        ))}
      </Folha>
    </View>
  );
}
