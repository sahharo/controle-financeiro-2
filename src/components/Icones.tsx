import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { cores } from '@/theme';

// Ícones de traço do protótipo (viewBox 24×24).
export type NomeIcone =
  | 'inicio'
  | 'gastos'
  | 'mais'
  | 'metas'
  | 'perfil'
  | 'direita'
  | 'esquerda'
  | 'baixo'
  | 'fechar'
  | 'microfone'
  | 'buscar'
  | 'info'
  | 'digital'
  | 'check'
  | 'circulo'
  | 'lixeira'
  | 'olho'
  | 'olhoFechado';

interface Props {
  nome: NomeIcone;
  tam?: number;
  cor?: string;
  traco?: number;
}

export function Icone({ nome, tam = 22, cor = cores.texto, traco = 1.8 }: Props) {
  const p = { stroke: cor, strokeWidth: traco, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      {nome === 'inicio' && (
        <>
          <Path d="M4 10.5 12 4l8 6.5V20H4z" {...p} />
          <Path d="M10 20v-5h4v5" {...p} />
        </>
      )}
      {nome === 'gastos' && (
        <>
          <Rect x={3} y={6} width={18} height={13} rx={2.5} {...p} />
          <Path d="M3 10h18" {...p} />
          <Path d="M15 15h3" {...p} />
        </>
      )}
      {nome === 'mais' && <Path d="M12 5v14M5 12h14" {...p} />}
      {nome === 'metas' && (
        <>
          <Path d="M5 21V4" {...p} />
          <Path d="M5 4h12l-2.5 4.5L17 13H5" {...p} />
        </>
      )}
      {nome === 'perfil' && (
        <>
          <Circle cx={12} cy={8.5} r={3.5} {...p} />
          <Path d="M5 20c1.4-3.6 4-5.5 7-5.5s5.6 1.9 7 5.5" {...p} />
        </>
      )}
      {nome === 'direita' && <Path d="M9 6l6 6-6 6" {...p} />}
      {nome === 'esquerda' && <Path d="M15 6l-6 6 6 6" {...p} />}
      {nome === 'baixo' && <Path d="M6 9l6 6 6-6" {...p} />}
      {nome === 'fechar' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {nome === 'microfone' && (
        <>
          <Rect x={9} y={3} width={6} height={11} rx={3} {...p} />
          <Path d="M5 11a7 7 0 0 0 14 0" {...p} />
          <Line x1={12} y1={18} x2={12} y2={21} {...p} />
        </>
      )}
      {nome === 'buscar' && (
        <>
          <Circle cx={11} cy={11} r={6.5} {...p} />
          <Path d="M16 16l4 4" {...p} />
        </>
      )}
      {nome === 'info' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 11v5M12 8h.01" {...p} />
        </>
      )}
      {nome === 'digital' && (
        <>
          <Path d="M7 4.5A9 9 0 0 1 20.5 12" {...p} />
          <Path d="M4 9a9 9 0 0 0 0 6" {...p} />
          <Path d="M8 12a4 4 0 0 1 8 0c0 3-1 5.5-2.5 7.5" {...p} />
          <Path d="M12 12c0 3.5-1.2 6.5-3.5 8.5" {...p} />
          <Path d="M6.5 18A9 9 0 0 1 4 15" {...p} />
        </>
      )}
      {nome === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />}
      {nome === 'circulo' && <Circle cx={12} cy={12} r={7} {...p} />}
      {nome === 'olho' && (
        <>
          <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" {...p} />
          <Circle cx={12} cy={12} r={3} {...p} />
        </>
      )}
      {nome === 'olhoFechado' && (
        <>
          <Path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.4 3.3" {...p} />
          <Path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.9 0 3.6-.6 5-1.5" {...p} />
          <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" {...p} />
          <Path d="M3 3l18 18" {...p} />
        </>
      )}
      {nome === 'lixeira' && (
        <>
          <Path d="M4 7h16" {...p} />
          <Path d="M9 7V4.5h6V7" {...p} />
          <Path d="M6.5 7l1 13h9l1-13" {...p} />
        </>
      )}
    </Svg>
  );
}

/** Marca "sobra": círculo com a fatia do que resta do mês. */
export function Logo({ tam = 24, cor = cores.texto, fatia = cores.destaque }: { tam?: number; cor?: string; fatia?: string }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={18} fill="none" stroke={cor} strokeWidth={4} />
      <Path d="M24 24 L24 6 A18 18 0 0 1 42 24 Z" fill={fatia} />
    </Svg>
  );
}
