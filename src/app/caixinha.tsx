import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Folha } from '@/components/Folha';
import { Icone } from '@/components/Icones';
import { Apoio, Texto } from '@/components/Texto';
import { Botao, Campo, CampoValor, Cartao, Link, Linha, Tela, Titulo, TituloSecao, Vazio, Voltar } from '@/components/ui';
import { useAgora } from '@/hooks/dados';
import { chaveDeIso, chaveMes, nomeMes, quando, somarMeses } from '@/lib/datas';
import { fmt, fmtSinal, MENOS } from '@/lib/dinheiro';
import { rendimentoPrevisto, saldoCaixinha } from '@/lib/rendimento';
import { useStore } from '@/store';
import { cores } from '@/theme';

export default function Caixinha() {
  const agora = useAgora();
  const caixinha = useStore((s) => s.caixinha);
  const cdi = useStore((s) => s.taxas.cdiAnual);
  const movimentar = useStore((s) => s.movimentarCaixinha);
  const setPercentualCdi = useStore((s) => s.setPercentualCdi);
  const [acao, setAcao] = useState<null | { tipo: 'guardar' | 'resgatar'; valor: number; nota: string }>(null);
  const [editandoCdi, setEditandoCdi] = useState<string | null>(null);

  const saldo = saldoCaixinha(caixinha);
  const anterior = somarMeses(chaveMes(agora), -1);
  const rendeuAnterior = caixinha.movimentos
    .filter((m) => m.tipo === 'rendimento' && chaveDeIso(m.data) === anterior)
    .reduce((s, m) => s + m.valor, 0);
  const previsto = rendimentoPrevisto(caixinha, agora, cdi);
  const movimentos = useMemo(() => [...caixinha.movimentos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 12), [caixinha.movimentos]);

  function confirmar() {
    if (!acao || acao.valor <= 0) return;
    movimentar(acao.tipo, acao.valor, acao.nota.trim() || undefined);
    setAcao(null);
  }

  return (
    <Tela
      contentStyle={{ paddingTop: 16 }}
      rodape={
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ marginTop: 1 }}>
              <Icone nome="info" tam={16} cor={cores.textoApoio} />
            </View>
            <Apoio altura={1.45} style={{ flex: 1 }}>
              O dinheiro fica no seu banco. Aqui você registra o que guardou e acompanha quanto rende.
            </Apoio>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Botao variante="claro" flex={1} onPress={() => setAcao({ tipo: 'resgatar', valor: 0, nota: '' })} desabilitado={saldo <= 0}>
              Resgatar
            </Botao>
            <Botao variante="destaque" flex={1.4} onPress={() => setAcao({ tipo: 'guardar', valor: 0, nota: '' })}>
              Guardar
            </Botao>
          </View>
        </View>
      }
    >
      <Voltar rotulo="Metas" />
      <Titulo style={{ marginTop: 8 }}>Caixinha</Titulo>

      <View style={{ marginTop: 18 }}>
        <Texto tam={44} peso={600} mono em={-0.035} adjustsFontSizeToFit numberOfLines={1}>
          R$ {fmt(saldo)}
        </Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Apoio tam={14}>
            Rende {caixinha.percentualCdi}% do CDI ({cdi.toFixed(2).replace('.', ',')}% ao ano)
          </Apoio>
          <Link rotulo="Mudar" onPress={() => setEditandoCdi(String(caixinha.percentualCdi))} />
        </View>
      </View>

      <View style={{ marginTop: 18, flexDirection: 'row', gap: 10 }}>
        <Cartao raio={16} style={{ flex: 1, padding: 14 }}>
          <Apoio>Rendeu em {nomeMes(anterior)}</Apoio>
          <Texto tam={18} peso={600} mono style={{ marginTop: 4 }} cor={rendeuAnterior > 0 ? cores.destaqueTexto : cores.texto}>
            {fmtSinal(rendeuAnterior)}
          </Texto>
        </Cartao>
        <Cartao raio={16} style={{ flex: 1, padding: 14 }}>
          <Apoio>Previsto em {nomeMes(chaveMes(agora))}</Apoio>
          <Texto tam={18} peso={600} mono style={{ marginTop: 4 }}>
            ~{fmt(previsto)}
          </Texto>
        </Cartao>
      </View>
      <Apoio altura={1.45} style={{ marginTop: 10 }}>
        Valores líquidos, já descontado o IR (22,5% para dinheiro guardado há menos de 6 meses; cai com o tempo até 15%).
      </Apoio>

      <View style={{ marginTop: 22 }}>
        <TituloSecao>Movimentações</TituloSecao>
        <View style={{ marginTop: 4 }}>
          {movimentos.length === 0 ? (
            <Vazio texto="Nada guardado ainda. Qualquer valor já começa a render." />
          ) : (
            movimentos.map((m, i) => (
              <Linha
                key={m.id}
                borda={i < movimentos.length - 1}
                titulo={m.tipo === 'guardar' ? 'Guardou' : m.tipo === 'resgatar' ? 'Resgatou' : 'Rendimento'}
                sub={m.tipo === 'rendimento' ? nomeMes(chaveDeIso(m.data)) : `${quando(m.data, agora)}${m.nota ? ` · ${m.nota}` : ''}`}
                valor={m.tipo === 'resgatar' ? `${MENOS}${fmt(m.valor)}` : `+${fmt(m.valor)}`}
                valorCor={m.tipo === 'rendimento' ? cores.destaqueTexto : undefined}
              />
            ))
          )}
        </View>
      </View>

      <Folha
        visivel={!!acao}
        onFechar={() => setAcao(null)}
        titulo={acao?.tipo === 'resgatar' ? 'Resgatar da caixinha' : 'Guardar na caixinha'}
        sub={acao?.tipo === 'resgatar' ? `Disponível: R$ ${fmt(saldo)}` : 'O valor sai da sobra deste mês.'}
        rodape={
          <Botao
            variante={acao?.tipo === 'resgatar' ? 'escuro' : 'destaque'}
            onPress={confirmar}
            desabilitado={!acao?.valor || (acao.tipo === 'resgatar' && acao.valor > saldo)}
          >
            {acao?.tipo === 'resgatar' ? 'Resgatar' : 'Guardar'}
          </Botao>
        }
      >
        {acao ? (
          <>
            <CampoValor rotulo="Valor" valor={acao.valor} onChange={(valor) => setAcao({ ...acao, valor })} autoFocus />
            {acao.tipo === 'resgatar' ? (
              <Campo rotulo="Para quê? (opcional)" value={acao.nota} onChangeText={(nota) => setAcao({ ...acao, nota })} placeholder="Ex.: conserto do carro" />
            ) : null}
          </>
        ) : null}
      </Folha>

      <Folha
        visivel={editandoCdi != null}
        onFechar={() => setEditandoCdi(null)}
        titulo="Quanto do CDI rende?"
        sub="Está no app do seu banco. Muitas caixinhas rendem 100% do CDI."
        rodape={
          <Botao
            onPress={() => {
              const n = Number(editandoCdi?.replace(',', '.'));
              if (n > 0 && n <= 200) setPercentualCdi(n);
              setEditandoCdi(null);
            }}
          >
            Salvar
          </Botao>
        }
      >
        <Campo rotulo="% do CDI" mono keyboardType="decimal-pad" value={editandoCdi ?? ''} onChangeText={setEditandoCdi} maxLength={5} />
      </Folha>
    </Tela>
  );
}
