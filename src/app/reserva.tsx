import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Folha } from '@/components/Folha';
import { Apoio, Texto } from '@/components/Texto';
import { Botao, BotaoTexto, CampoValor, Cartao, Divisor, Segmentado, Tela, Titulo, Voltar } from '@/components/ui';
import { useAgora, useDados } from '@/hooks/dados';
import { chaveMes, mesAno, somarMeses } from '@/lib/datas';
import { fmt, fmtInteiro } from '@/lib/dinheiro';
import { custoDeVida, saldoMovimentos } from '@/lib/financas';
import { useStore } from '@/store';
import { cores } from '@/theme';

export default function Reserva() {
  const dados = useDados();
  const agora = useAgora();
  const setReserva = useStore((s) => s.setReserva);
  const movimentar = useStore((s) => s.movimentarReserva);
  const [acao, setAcao] = useState<null | { tipo: 'guardar' | 'resgatar'; valor: number }>(null);
  const [editandoAporte, setEditandoAporte] = useState<number | null>(null);

  const { mesesAlvo, aporteMensal } = dados.reserva;
  const custo = custoDeVida(dados, chaveMes(agora));
  const saldo = saldoMovimentos(dados.reserva.movimentos);
  const alvo = custo * mesesAlvo;
  const cobertos = custo > 0 ? saldo / custo : 0;
  const falta = Math.max(0, alvo - saldo);
  const mesesAteCompletar = aporteMensal > 0 ? Math.ceil(falta / aporteMensal) : null;
  const cobertosTxt = cobertos.toFixed(1).replace('.', ',');

  return (
    <Tela
      contentStyle={{ paddingTop: 16 }}
      rodape={
        <View style={{ gap: 4 }}>
          <Botao variante="destaque" onPress={() => setAcao({ tipo: 'guardar', valor: aporteMensal })}>
            Registrar depósito
          </Botao>
          {saldo > 0 ? (
            <View style={{ alignItems: 'center' }}>
              <BotaoTexto rotulo="Usei a reserva" cor={cores.textoApoio} onPress={() => setAcao({ tipo: 'resgatar', valor: 0 })} />
            </View>
          ) : null}
        </View>
      }
    >
      <Voltar rotulo="Metas" />
      <Titulo style={{ marginTop: 8 }}>Reserva de emergência</Titulo>
      <Apoio tam={15} altura={1.45} style={{ marginTop: 6 }}>
        Dinheiro para viver alguns meses se a renda parar. Não é para a viagem.
      </Apoio>

      <View style={{ marginTop: 26 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <Texto tam={52} peso={600} mono em={-0.04}>
            {cobertosTxt}
          </Texto>
          <Texto tam={18} peso={600}>
            de {mesesAlvo} meses cobertos
          </Texto>
        </View>
        <View
          accessibilityRole="image"
          accessibilityLabel={`${cobertosTxt} de ${mesesAlvo} meses cobertos`}
          style={{ marginTop: 16, flexDirection: 'row', gap: mesesAlvo > 6 ? 3 : 4 }}
        >
          {Array.from({ length: mesesAlvo }, (_, i) => {
            const cheio = Math.max(0, Math.min(1, cobertos - i));
            return (
              <View key={i} style={{ flex: 1, height: 28, borderRadius: 6, backgroundColor: cores.borda, overflow: 'hidden' }}>
                <View style={{ width: `${cheio * 100}%`, height: '100%', backgroundColor: cores.destaque }} />
              </View>
            );
          })}
        </View>
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Texto tam={13} mono cor={cores.textoApoio}>
            {fmtInteiro(saldo)}
          </Texto>
          <Texto tam={13} mono cor={cores.textoApoio}>
            {fmtInteiro(alvo)}
          </Texto>
        </View>
      </View>

      <Cartao raio={18} style={{ marginTop: 22, paddingHorizontal: 16 }}>
        <Item rotulo="Seu custo de vida" valor={`${fmtInteiro(custo)}/mês`} mono />
        <Divisor />
        <Item rotulo="Faltam" valor={fmt(falta)} mono />
        <Divisor />
        <Pressable accessibilityRole="button" accessibilityLabel="Mudar quanto guardar por mês" onPress={() => setEditandoAporte(aporteMensal)}>
          <Item
            rotulo={aporteMensal > 0 ? `Guardando ${fmtInteiro(aporteMensal)}/mês` : 'Quanto guardar por mês?'}
            valor={
              falta === 0
                ? 'completa'
                : mesesAteCompletar != null
                  ? `completa em ${mesAno(somarMeses(chaveMes(agora), mesesAteCompletar))}`
                  : 'definir'
            }
            cor={mesesAteCompletar == null && falta > 0 ? cores.destaqueTexto : undefined}
          />
        </Pressable>
      </Cartao>
      <Apoio style={{ marginTop: 8 }}>Custo de vida = gastos fixos + limites dos variáveis.</Apoio>

      <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Texto tam={14} style={{ flexShrink: 1 }}>
          Quantos meses de reserva?
        </Texto>
        <Segmentado
          rotulo="Meses de reserva"
          valor={mesesAlvo}
          onChange={(m) => setReserva({ mesesAlvo: m })}
          minLargura={48}
          opcoes={[
            { valor: 3 as const, rotulo: '3' },
            { valor: 6 as const, rotulo: '6' },
            { valor: 12 as const, rotulo: '12' },
          ]}
        />
      </View>

      <Folha
        visivel={!!acao}
        onFechar={() => setAcao(null)}
        titulo={acao?.tipo === 'resgatar' ? 'Usar a reserva' : 'Registrar depósito'}
        sub={acao?.tipo === 'resgatar' ? 'Imprevisto acontece. É para isso que ela existe.' : 'O valor sai da sobra deste mês.'}
        rodape={
          <Botao
            variante={acao?.tipo === 'resgatar' ? 'escuro' : 'destaque'}
            desabilitado={!acao?.valor || (acao.tipo === 'resgatar' && acao.valor > saldo)}
            onPress={() => {
              if (acao) movimentar(acao.tipo, acao.valor);
              setAcao(null);
            }}
          >
            {acao?.tipo === 'resgatar' ? 'Registrar saída' : 'Registrar depósito'}
          </Botao>
        }
      >
        {acao ? <CampoValor rotulo="Valor" valor={acao.valor} onChange={(valor) => setAcao({ ...acao, valor })} autoFocus /> : null}
      </Folha>

      <Folha
        visivel={editandoAporte != null}
        onFechar={() => setEditandoAporte(null)}
        titulo="Quanto guardar por mês?"
        sub="Usado para prever quando a reserva fica completa."
        rodape={
          <Botao
            onPress={() => {
              setReserva({ aporteMensal: editandoAporte ?? 0 });
              setEditandoAporte(null);
            }}
          >
            Salvar
          </Botao>
        }
      >
        <CampoValor rotulo="Por mês" valor={editandoAporte ?? 0} onChange={setEditandoAporte} />
      </Folha>
    </Tela>
  );
}

function Item({ rotulo, valor, mono, cor }: { rotulo: string; valor: string; mono?: boolean; cor?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, gap: 12 }}>
      <Texto tam={14} cor={cores.textoApoio}>
        {rotulo}
      </Texto>
      <Texto tam={15} mono={mono} cor={cor}>
        {valor}
      </Texto>
    </View>
  );
}
