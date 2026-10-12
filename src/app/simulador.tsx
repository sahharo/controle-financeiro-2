import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Apoio, Texto } from '@/components/Texto';
import { Botao, Campo, CampoValor, Cartao, Tela, Voltar } from '@/components/ui';
import { useResumo } from '@/hooks/dados';
import { nomeMes } from '@/lib/datas';
import { fmt, fmtInteiro } from '@/lib/dinheiro';
import { fraseHoras, HORAS_MES, horasDeTrabalho, planoGuardar, planoParcelar, valorHora } from '@/lib/financas';
import { useStore } from '@/store';
import { cores } from '@/theme';

export default function Simulador() {
  const { resumo, dados, agora } = useResumo();
  const salvarMeta = useStore((s) => s.salvarMeta);
  const registrarDesistencia = useStore((s) => s.registrarDesistencia);
  const [item, setItem] = useState('');
  const [preco, setPreco] = useState(0);

  const renda = dados.renda.valor;
  const horas = horasDeTrabalho(preco, renda);
  const guardar = planoGuardar(preco, resumo.previsaoSobra, agora);
  const parcelar = planoParcelar(preco, agora);
  const pronto = preco > 0 && renda > 0;

  function virarMeta() {
    salvarMeta({ nome: item.trim() || 'Compra planejada', alvo: preco, aporteMensal: guardar.porMes });
    router.back();
  }

  function agoraNao() {
    if (pronto) registrarDesistencia({ item: item.trim(), horas, data: new Date().toISOString() });
    router.back();
  }

  return (
    <Tela
      contentStyle={{ paddingTop: 16 }}
      rodape={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Botao variante="claro" flex={1} onPress={agoraNao}>
            Agora não
          </Botao>
          <Botao variante="destaque" flex={1.4} onPress={virarMeta} desabilitado={!pronto}>
            Virar meta
          </Botao>
        </View>
      }
    >
      <Voltar rotulo="Metas" />

      <View style={{ marginTop: 12, gap: 14 }}>
        <Campo rotulo="O que você quer comprar" rotuloApoio value={item} onChangeText={setItem} placeholder="Ex.: Fone com cancelamento de ruído" style={{ fontSize: 17 }} />
        <CampoValor rotulo="Preço" rotuloApoio valor={preco} onChange={setPreco} style={{ fontSize: 17 }} />
      </View>

      {renda <= 0 ? (
        <Apoio tam={14} style={{ marginTop: 22 }}>
          Cadastre sua renda no Perfil para ver quanto essa compra custa em horas de trabalho.
        </Apoio>
      ) : pronto ? (
        <>
          <View style={{ marginTop: 28, paddingTop: 22, borderTopWidth: 1, borderTopColor: cores.borda }}>
            <Texto tam={15} cor={cores.textoApoio}>
              Isso custa
            </Texto>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
              <Texto tam={64} peso={600} mono em={-0.04}>
                {horas}
              </Texto>
              <Texto tam={22} peso={600} em={-0.01}>
                {horas === 1 ? 'hora de trabalho' : 'horas de trabalho'}
              </Texto>
            </View>
            <Texto tam={15} style={{ marginTop: 8 }}>
              {fraseHoras(horas)}
            </Texto>
            <Apoio style={{ marginTop: 4 }}>
              Seu valor-hora: R$ {fmt(valorHora(renda))} (R$ {fmtInteiro(renda)} ÷ {HORAS_MES} h por mês)
            </Apoio>
          </View>

          <View style={{ marginTop: 22, gap: 8 }}>
            <Cartao raio={16} style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
              <View style={{ flex: 1 }}>
                <Texto tam={15} peso={500}>
                  Guardar e comprar à vista
                </Texto>
                <Apoio style={{ marginTop: 2 }}>
                  R$ {fmtInteiro(guardar.porMes)} por mês, compra em {nomeMes(guardar.compraEm)}
                </Apoio>
              </View>
              <Texto tam={13} mono cor={cores.textoApoio}>
                {guardar.meses} {guardar.meses === 1 ? 'mês' : 'meses'}
              </Texto>
            </Cartao>
            {parcelar.parcelas > 1 ? (
              <Cartao raio={16} style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
                <View style={{ flex: 1 }}>
                  <Texto tam={15} peso={500}>
                    Parcelar em {parcelar.parcelas}x de {fmt(parcelar.valorParcela)}
                  </Texto>
                  <Apoio style={{ marginTop: 2 }}>
                    Sua sobra diária cai R$ {fmt(parcelar.impactoDiario)} até {nomeMes(parcelar.ate)}
                  </Apoio>
                </View>
                <Texto tam={13} mono cor={cores.textoApoio}>
                  {parcelar.parcelas} meses
                </Texto>
              </Cartao>
            ) : null}
          </View>
        </>
      ) : null}
    </Tela>
  );
}
