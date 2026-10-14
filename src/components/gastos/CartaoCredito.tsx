import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Folha } from '../Folha';
import { Apoio, Texto } from '../Texto';
import { Barra, Botao, BotaoRedondo, BotaoTexto, Campo, CampoValor, Cartao, Chip, Linha, Selo, TituloSecao, Vazio } from '../ui';
import { useAgora, useDados } from '@/hooks/dados';
import { MESES, mesCurto, nomeMes, somarMeses } from '@/lib/datas';
import { fmt, fmtInteiro, pct } from '@/lib/dinheiro';
import {
  dataFechamento,
  dataVencimento,
  faturaAberta,
  limiteUsado,
  mesVencimento,
  parceladasAtivas,
  valorFatura,
} from '@/lib/financas';
import { useStore, type Cartao as TCartao } from '@/store';
import { cores, margem } from '@/theme';
import { alerta } from '@/lib/alerta';

type Rascunho = { id?: string; nome: string; fechamento: string; vencimento: string; limite: number };

function dataLonga(d: Date) {
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function CartaoCredito() {
  const dados = useDados();
  const agora = useAgora();
  const salvarCartao = useStore((s) => s.salvarCartao);
  const removerCartao = useStore((s) => s.removerCartao);
  const [selecionado, setSelecionado] = useState<string | null>(dados.cartoes[0]?.id ?? null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);

  // Se o cartão escolhido foi excluído, mostra o primeiro.
  const cartao = dados.cartoes.find((c) => c.id === selecionado) ?? dados.cartoes[0];

  function salvar() {
    if (!rascunho?.nome.trim()) return;
    const dia = (t: string) => Math.min(31, Math.max(1, Number(t) || 1));
    const id = salvarCartao({
      id: rascunho.id,
      nome: rascunho.nome.trim(),
      diaFechamento: dia(rascunho.fechamento),
      diaVencimento: dia(rascunho.vencimento),
      limite: rascunho.limite,
    });
    setSelecionado(id);
    setRascunho(null);
  }

  function editar(c: TCartao) {
    setRascunho({ id: c.id, nome: c.nome, fechamento: String(c.diaFechamento), vencimento: String(c.diaVencimento), limite: c.limite });
  }

  const novo = () => setRascunho({ nome: '', fechamento: '3', vencimento: '10', limite: 0 });

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: margem, paddingTop: 16, gap: 8 }}
        accessibilityLabel="Escolher cartão"
      >
        {dados.cartoes.map((c) => (
          <Chip key={c.id} rotulo={c.nome} ativo={c.id === cartao?.id} onPress={() => (c.id === cartao?.id ? editar(c) : setSelecionado(c.id))} altura={40} />
        ))}
        <BotaoRedondo icone="mais" rotulo="Adicionar cartão" onPress={novo} tam={40} tracejado />
      </ScrollView>

      {!cartao ? (
        <View style={{ paddingHorizontal: margem }}>
          <Vazio texto="Cadastre seu cartão para saber em qual fatura cada compra cai e quanto do limite já está comprometido." acao={{ rotulo: 'Adicionar cartão', onPress: novo }} />
        </View>
      ) : (
        <ConteudoCartao cartao={cartao} agora={agora} onEditar={() => editar(cartao)} />
      )}

      <Folha
        visivel={!!rascunho}
        onFechar={() => setRascunho(null)}
        titulo={rascunho?.id ? 'Editar cartão' : 'Novo cartão'}
        rodape={
          rascunho ? (
            <>
              <Botao onPress={salvar} desabilitado={!rascunho.nome.trim()}>
                Salvar
              </Botao>
              {rascunho.id ? (
                <BotaoTexto
                  rotulo="Excluir cartão"
                  cor={cores.alerta}
                  onPress={() =>
                    alerta(`Excluir ${rascunho.nome}?`, 'As compras feitas nele continuam no histórico, como débito.', [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Excluir',
                        style: 'destructive',
                        onPress: () => {
                          removerCartao(rascunho.id!);
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
            <Campo rotulo="Nome" value={rascunho.nome} onChangeText={(nome) => setRascunho({ ...rascunho, nome })} placeholder="Ex.: Nubank" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Campo
                  rotulo="Fecha dia"
                  mono
                  keyboardType="number-pad"
                  maxLength={2}
                  value={rascunho.fechamento}
                  onChangeText={(t) => setRascunho({ ...rascunho, fechamento: t.replace(/\D/g, '') })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Campo
                  rotulo="Vence dia"
                  mono
                  keyboardType="number-pad"
                  maxLength={2}
                  value={rascunho.vencimento}
                  onChangeText={(t) => setRascunho({ ...rascunho, vencimento: t.replace(/\D/g, '') })}
                />
              </View>
            </View>
            <CampoValor rotulo="Limite" valor={rascunho.limite} onChange={(limite) => setRascunho({ ...rascunho, limite })} />
            <Apoio tam={14}>Compras feitas a partir do dia do fechamento entram na fatura seguinte.</Apoio>
          </>
        ) : null}
      </Folha>
    </View>
  );
}

function ConteudoCartao({ cartao, agora, onEditar }: { cartao: TCartao; agora: Date; onEditar: () => void }) {
  const gastos = useStore((s) => s.gastos);
  const aberta = faturaAberta(cartao, agora);
  const valorAberta = valorFatura(gastos, cartao, aberta);
  const usado = limiteUsado(gastos, cartao, agora);
  const parceladas = parceladasAtivas(gastos, cartao, agora);
  const proximas = [1, 2, 3].map((k) => {
    const f = somarMeses(aberta, k);
    return { mes: mesVencimento(f, cartao), valor: valorFatura(gastos, cartao, f) };
  });
  const maior = Math.max(valorAberta, ...proximas.map((p) => p.valor), 1);
  const estourou = cartao.limite > 0 && usado > cartao.limite;

  return (
    <View>
      <Cartao style={{ marginHorizontal: margem, marginTop: 14, padding: 18 }} onPress={onEditar} rotulo={`Fatura de ${nomeMes(mesVencimento(aberta, cartao))}. Toque para editar o cartão`}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Texto tam={14} cor={cores.textoApoio}>
            Fatura de {nomeMes(mesVencimento(aberta, cartao))}
          </Texto>
          <Selo>aberta</Selo>
        </View>
        <Texto tam={34} peso={600} mono em={-0.03} style={{ marginTop: 4 }} adjustsFontSizeToFit numberOfLines={1}>
          R$ {fmt(valorAberta)}
        </Texto>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Texto tam={12} cor={cores.textoApoio}>
              Fecha
            </Texto>
            <Texto tam={15}>{dataLonga(dataFechamento(aberta, cartao))}</Texto>
          </View>
          <View style={{ flex: 1 }}>
            <Texto tam={12} cor={cores.textoApoio}>
              Vence
            </Texto>
            <Texto tam={15}>{dataLonga(dataVencimento(aberta, cartao))}</Texto>
          </View>
        </View>
        {cartao.limite > 0 ? (
          <>
            <View style={{ marginTop: 14 }}>
              <Barra
                pct={pct(usado, cartao.limite)}
                altura={5}
                cor={estourou ? cores.alerta : cores.texto}
                trilho={estourou ? cores.alertaTrilho : cores.borda}
              />
            </View>
            <Apoio style={{ marginTop: 6 }} cor={estourou ? cores.alerta : cores.textoApoio}>
              Usando {pct(usado, cartao.limite)}% do limite de R$ {fmtInteiro(cartao.limite)}
            </Apoio>
          </>
        ) : null}
      </Cartao>

      <View style={{ marginHorizontal: margem, marginTop: 20 }}>
        <TituloSecao>Parceladas</TituloSecao>
        <View style={{ marginTop: 4 }}>
          {parceladas.length === 0 ? (
            <Vazio texto="Nenhuma compra parcelada em andamento." />
          ) : (
            parceladas.map((p, i) => (
              <Linha
                key={p.gasto.id}
                borda={i < parceladas.length - 1}
                titulo={p.gasto.descricao}
                sub={`parcela ${p.parcelaAtual} de ${p.gasto.parcelas} · termina em ${nomeMes(p.terminaEm)}`}
                valor={fmt(p.valorParcela)}
              />
            ))
          )}
        </View>
      </View>

      <View style={{ marginHorizontal: margem, marginTop: 14 }}>
        <TituloSecao>Próximas faturas, já comprometidas</TituloSecao>
        <View style={{ marginTop: 10, gap: 8 }}>
          {proximas.map((p) => (
            <View key={p.mes} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Texto tam={13} cor={cores.textoApoio} style={{ width: 34 }}>
                {mesCurto(p.mes)}
              </Texto>
              <View style={{ flex: 1 }}>
                <View style={{ height: 10, borderRadius: 3, backgroundColor: cores.bordaForte, width: `${Math.max(p.valor ? 2 : 0, (p.valor / maior) * 100)}%` }} />
              </View>
              <Texto tam={14} mono direita style={{ width: 80 }}>
                {fmt(p.valor)}
              </Texto>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
