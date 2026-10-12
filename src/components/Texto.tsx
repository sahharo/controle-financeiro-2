import { Text, type TextProps, type TextStyle } from 'react-native';

import { cores, familia, type Peso } from '@/theme';

export interface TextoProps extends TextProps {
  tam?: number;
  peso?: Peso;
  mono?: boolean;
  cor?: string;
  /** Espaçamento entre letras em "em", como no protótipo (ex.: -0.03). */
  em?: number;
  maiusculas?: boolean;
  centro?: boolean;
  direita?: boolean;
  altura?: number;
}

export function Texto({
  tam = 16,
  peso = 400,
  mono = false,
  cor = cores.texto,
  em,
  maiusculas,
  centro,
  direita,
  altura,
  style,
  ...props
}: TextoProps) {
  const s: TextStyle = {
    fontFamily: familia(peso, mono),
    fontSize: tam,
    color: cor,
    ...(em != null ? { letterSpacing: em * tam } : null),
    ...(maiusculas ? { textTransform: 'uppercase' } : null),
    ...(centro ? { textAlign: 'center' } : direita ? { textAlign: 'right' } : null),
    ...(altura ? { lineHeight: Math.round(tam * altura) } : null),
  };
  return <Text {...props} style={[s, style]} />;
}

/** Atalho para texto de apoio (legendas, datas, rótulos). */
export function Apoio(props: TextoProps) {
  return <Texto tam={13} cor={cores.textoApoio} {...props} />;
}
