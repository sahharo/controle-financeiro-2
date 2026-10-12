import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Apoio, Texto } from '@/components/Texto';
import { BotaoTexto, Cartao, Linha, Tela, Titulo, TituloSecao, Vazio, Voltar } from '@/components/ui';
import { useConquistas } from '@/hooks/dados';
import { quandoConquistou, recente, type Conquista } from '@/lib/conquistas';
import { cores } from '@/theme';

function Anel({ progresso }: { progresso: number }) {
  const c = 2 * Math.PI * 16;
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36">
      <Circle cx={18} cy={18} r={16} fill="none" stroke={cores.borda} strokeWidth={3} />
      <Circle
        cx={18}
        cy={18}
        r={16}
        fill="none"
        stroke={cores.texto}
        strokeWidth={3}
        strokeDasharray={`${c * progresso} ${c}`}
        transform="rotate(-90 18 18)"
      />
    </Svg>
  );
}

function Selo({ tam = 36 }: { tam?: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 36 36">
      <Circle cx={18} cy={18} r={16} fill={cores.destaqueFundo} stroke={cores.destaque} strokeWidth={2} />
      <Path d="M12 18.5l4 4 8-9" fill="none" stroke={cores.texto} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SeloGrande() {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={29} fill={cores.destaqueFundo} stroke={cores.destaque} strokeWidth={2} />
      <Circle cx={32} cy={32} r={20} fill="none" stroke={cores.destaque} strokeWidth={2} strokeDasharray="3 4" />
      <Path d="M24 33l6 6 11-13" fill="none" stroke={cores.texto} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function Conquistas() {
  const { lista, datas, agora } = useConquistas();
  const [todas, setTodas] = useState(false);

  const feitas = lista
    .filter((c) => c.conquistada)
    .sort((a, b) => (datas[b.id] ?? '').localeCompare(datas[a.id] ?? ''));
  const nova = feitas[0] && recente(datas[feitas[0].id], agora) ? feitas[0] : undefined;
  const quase = lista
    .filter((c) => !c.conquistada && c.progresso > 0)
    .sort((a, b) => b.progresso - a.progresso);
  const faltam = lista.filter((c) => !c.conquistada && c.progresso === 0);
  const jaFeitas = feitas.filter((c) => c !== nova);

  const mostrarQuase = todas ? quase : quase.slice(0, 2);
  const mostrarFeitas = todas ? jaFeitas : jaFeitas.slice(0, 3);

  const linhaAberta = (c: Conquista, i: number, n: number) => (
    <Linha key={c.id} borda={i < n - 1} esquerda={<Anel progresso={c.progresso} />} titulo={c.titulo} sub={c.detalhe} />
  );

  return (
    <Tela contentStyle={{ paddingTop: 16 }}>
      <Voltar rotulo="Perfil" />
      <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Titulo>Conquistas</Titulo>
        <Texto tam={14} mono cor={cores.textoApoio}>
          {feitas.length} de {lista.length}
        </Texto>
      </View>

      {nova ? (
        <Cartao style={{ marginTop: 18, padding: 18, flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <SeloGrande />
          <View style={{ flex: 1 }}>
            <Texto tam={12} cor={cores.destaqueTexto} maiusculas em={0.07}>
              Nova · {quandoConquistou(datas[nova.id], agora)}
            </Texto>
            <Texto tam={17} peso={600} style={{ marginTop: 2 }}>
              {nova.titulo}
            </Texto>
            <Apoio style={{ marginTop: 2 }}>{nova.detalhe}</Apoio>
          </View>
        </Cartao>
      ) : null}

      <View style={{ marginTop: 24 }}>
        <TituloSecao>Quase lá</TituloSecao>
        {mostrarQuase.length ? (
          mostrarQuase.map((c, i) => linhaAberta(c, i, mostrarQuase.length))
        ) : (
          <Vazio texto="Registre gastos e crie metas para começar." />
        )}
      </View>

      <View style={{ marginTop: 20 }}>
        <TituloSecao>Já conquistadas</TituloSecao>
        {mostrarFeitas.length ? (
          mostrarFeitas.map((c, i) => (
            <Linha key={c.id} borda={i < mostrarFeitas.length - 1} esquerda={<Selo />} titulo={c.titulo} sub={c.detalhe} />
          ))
        ) : (
          <Vazio texto={nova ? 'A primeira está aí em cima.' : 'Nenhuma ainda. A primeira vem rápido.'} />
        )}
      </View>

      {todas && faltam.length ? (
        <View style={{ marginTop: 20 }}>
          <TituloSecao>Para depois</TituloSecao>
          {faltam.map((c, i) => linhaAberta(c, i, faltam.length))}
        </View>
      ) : null}

      <View style={{ marginTop: 'auto', alignItems: 'center', paddingTop: 12 }}>
        <BotaoTexto rotulo={todas ? 'Mostrar menos' : `Ver todas as ${lista.length}`} onPress={() => setTodas(!todas)} />
      </View>
    </Tela>
  );
}
