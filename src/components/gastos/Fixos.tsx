import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Folha } from '../Folha';
import { Apoio, Texto } from '../Texto';
import { Botao, BotaoRedondo, BotaoTexto, Campo, CampoValor, Cartao, Chip, Linha, Marcador, Rotulo, Selo, Vazio } from '../ui';
import { useAgora, useDados } from '@/hooks/dados';
import { chaveMes, MESES } from '@/lib/datas';
import { fmt, fmtInteiro, pct } from '@/lib/dinheiro';
import { estimativaFixo, fixosMensais } from '@/lib/financas';
import { useStore, type Fixo, type TipoFixo } from '@/store';
import { cores, margem } from '@/theme';

type Rascunho = Omit<Fixo, 'id' | 'pagamentos'> & { id?: string; diaTexto: string };

const NOVO: Rascunho = { nome: '', tipo: 'fixo', valor: 0, dia: 10, diaTexto: '10', lembrete: true };

const TIPOS: { valor: TipoFixo; rotulo: string; ajuda: string }[] = [
  { valor: 'fixo', rotulo: 'Valor fixo', ajuda: 'Mesmo valor todo mês: aluguel, academia, internet.' },
  { valor: 'estimado', rotulo: 'Estimado', ajuda: 'Muda um pouco a cada mês: luz, água, gás. O app usa a média dos últimos 3 meses.' },
  { valor: 'anual', rotulo: 'Anual', ajuda: 'Pago uma vez por ano: IPVA, IPTU, seguro. Entra dividido por 12 no mês.' },
];

export function Fixos() {
  const dados = useDados();
  const agora = useAgora();
  const salvarFixo = useStore((s) => s.salvarFixo);
  const removerFixo = useStore((s) => s.removerFixo);
  const marcarPago = useStore((s) => s.marcarPago);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [pagando, setPagando] = useState<{ fixo: Fixo; valor: number } | null>(null);

  const mes = chaveMes(agora);
  const total = fixosMensais(dados.fixos, mes);
  const grupos: { titulo: string; tipo: TipoFixo }[] = [
    { titulo: 'Valor fixo', tipo: 'fixo' },
    { titulo: 'Estimado', tipo: 'estimado' },
    { titulo: 'Anuais, divididos por 12', tipo: 'anual' },
  ];

  function salvar() {
    if (!rascunho || !rascunho.nome.trim() || rascunho.valor <= 0) return;
    const { diaTexto, ...f } = rascunho;
    salvarFixo({ ...f, nome: f.nome.trim(), dia: Math.min(31, Math.max(1, Number(diaTexto) || 1)) });
    setRascunho(null);
  }

  function abrir(f: Fixo) {
    setRascunho({ ...f, diaTexto: String(f.dia) });
  }

  function alternarPago(f: Fixo) {
    if (f.pagamentos[mes] != null) {
      marcarPago(f.id, mes, null);
      return;
    }
    if (f.tipo === 'estimado') setPagando({ fixo: f, valor: estimativaFixo(f, mes) });
    else marcarPago(f.id, mes, f.valor);
  }

  return (
    <View>
      <View style={{ paddingHorizontal: margem, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flexShrink: 1 }}>
          <Texto tam={26} peso={600} mono em={-0.03}>
            R$ {fmtInteiro(total)}
            <Texto tam={15} peso={500} mono cor={cores.textoApoio}>
              /mês
            </Texto>
          </Texto>
          <Apoio tam={14}>
            {dados.renda.valor > 0 ? `${pct(total, dados.renda.valor)}% da sua renda já tem dono` : 'Cadastre sua renda para comparar'}
          </Apoio>
        </View>
        <BotaoRedondo icone="mais" rotulo="Adicionar gasto fixo" onPress={() => setRascunho({ ...NOVO })} />
      </View>

      <View style={{ marginHorizontal: margem, marginTop: 18, gap: 16 }}>
        {dados.fixos.length === 0 ? (
          <Vazio texto="Nenhum gasto fixo ainda. Comece pelo aluguel ou pela conta mais alta." acao={{ rotulo: 'Adicionar', onPress: () => setRascunho({ ...NOVO }) }} />
        ) : null}
        {grupos.map(({ titulo, tipo }) => {
          const lista = dados.fixos.filter((f) => f.tipo === tipo).sort((a, b) => a.dia - b.dia);
          if (!lista.length) return null;
          return (
            <View key={tipo}>
              <Rotulo>{titulo}</Rotulo>
              <Cartao raio={18} style={{ paddingHorizontal: 16 }}>
                {lista.map((f, i) => {
                  const pago = f.pagamentos[mes] != null;
                  let sub = `dia ${f.dia}`;
                  let valor = fmt(f.valor);
                  if (tipo === 'estimado') {
                    sub += ' · média dos últimos 3 meses';
                    valor = pago ? fmt(f.pagamentos[mes]) : `~${fmt(estimativaFixo(f, mes))}`;
                  } else if (tipo === 'anual') {
                    sub = `R$ ${fmtInteiro(f.valor)} em ${MESES[f.mesAnual ?? 0]}`;
                    valor = fmt(Math.round(f.valor / 12));
                  } else if (f.lembrete && !pago) sub += ' · lembrete na véspera';
                  return (
                    <Linha
                      key={f.id}
                      borda={i < lista.length - 1}
                      titulo={f.nome}
                      sub={sub}
                      valor={valor}
                      valorCor={tipo === 'estimado' && !pago ? cores.textoApoio : undefined}
                      direitaExtra={pago && tipo !== 'anual' ? <Selo>pago</Selo> : undefined}
                      onPress={() => abrir(f)}
                      onLongPress={tipo !== 'anual' ? () => alternarPago(f) : undefined}
                      rotulo={`${f.nome}, ${valor}${pago ? ', pago' : ''}. Toque para editar`}
                    />
                  );
                })}
              </Cartao>
            </View>
          );
        })}
        {dados.fixos.length ? <Apoio>Toque para editar. Toque e segure para marcar como pago.</Apoio> : null}
      </View>

      <Folha
        visivel={!!rascunho}
        onFechar={() => setRascunho(null)}
        titulo={rascunho?.id ? 'Editar gasto fixo' : 'Novo gasto fixo'}
        rodape={
          rascunho ? (
            <>
              <Botao onPress={salvar} desabilitado={!rascunho.nome.trim() || rascunho.valor <= 0}>
                Salvar
              </Botao>
              {rascunho.id && rascunho.tipo !== 'anual' ? (
                <Botao
                  variante="claro"
                  onPress={() => {
                    const f = dados.fixos.find((x) => x.id === rascunho.id);
                    if (f) alternarPago(f);
                    setRascunho(null);
                  }}
                >
                  {dados.fixos.find((x) => x.id === rascunho.id)?.pagamentos[mes] != null ? 'Desmarcar pagamento' : 'Marcar como pago'}
                </Botao>
              ) : null}
              {rascunho.id ? (
                <BotaoTexto
                  rotulo="Excluir"
                  cor={cores.alerta}
                  onPress={() =>
                    Alert.alert(`Excluir ${rascunho.nome}?`, undefined, [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Excluir',
                        style: 'destructive',
                        onPress: () => {
                          removerFixo(rascunho.id!);
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
            <Campo rotulo="Nome" value={rascunho.nome} onChangeText={(nome) => setRascunho({ ...rascunho, nome })} placeholder="Ex.: Aluguel" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TIPOS.map((t) => (
                <Chip key={t.valor} rotulo={t.rotulo} ativo={rascunho.tipo === t.valor} onPress={() => setRascunho({ ...rascunho, tipo: t.valor, mesAnual: rascunho.mesAnual ?? 0 })} altura={40} />
              ))}
            </View>
            <Apoio tam={14}>{TIPOS.find((t) => t.valor === rascunho.tipo)?.ajuda}</Apoio>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <CampoValor
                  rotulo={rascunho.tipo === 'anual' ? 'Valor no ano' : rascunho.tipo === 'estimado' ? 'Valor médio' : 'Valor'}
                  valor={rascunho.valor}
                  onChange={(valor) => setRascunho({ ...rascunho, valor })}
                />
              </View>
              <View style={{ width: 110 }}>
                <Campo
                  rotulo="Vence dia"
                  mono
                  keyboardType="number-pad"
                  maxLength={2}
                  value={rascunho.diaTexto}
                  onChangeText={(t) => setRascunho({ ...rascunho, diaTexto: t.replace(/\D/g, '') })}
                />
              </View>
            </View>
            {rascunho.tipo === 'anual' ? (
              <View style={{ gap: 8 }}>
                <Texto tam={13} peso={500}>
                  Mês do pagamento
                </Texto>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {MESES.map((m, i) => (
                    <Chip key={m} rotulo={m.slice(0, 3)} ativo={(rascunho.mesAnual ?? 0) === i} onPress={() => setRascunho({ ...rascunho, mesAnual: i })} altura={40} />
                  ))}
                </View>
              </View>
            ) : null}
            <Marcador valor={rascunho.lembrete} onChange={(lembrete) => setRascunho({ ...rascunho, lembrete })}>
              Lembrar na véspera do vencimento
            </Marcador>
          </>
        ) : null}
      </Folha>

      <Folha
        visivel={!!pagando}
        onFechar={() => setPagando(null)}
        titulo={`Quanto veio ${pagando?.fixo.nome ? `a ${pagando.fixo.nome.toLowerCase()}` : ''}?`}
        sub="O valor real entra na média dos próximos meses."
        rodape={
          <Botao
            onPress={() => {
              if (pagando) marcarPago(pagando.fixo.id, mes, pagando.valor);
              setPagando(null);
            }}
            desabilitado={!pagando?.valor}
          >
            Marcar como pago
          </Botao>
        }
      >
        <CampoValor rotulo="Valor pago" valor={pagando?.valor ?? 0} onChange={(valor) => pagando && setPagando({ ...pagando, valor })} />
      </Folha>
    </View>
  );
}
