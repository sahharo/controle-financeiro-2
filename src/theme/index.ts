// Identidade "neutro quente": base neutra, um único verde-sálvia de destaque
// e terracota só para alertas (limite estourado, saldo negativo).
export const cores = {
  fundo: '#F7F6F3',
  cartao: '#FFFFFF',
  texto: '#1C1C1A',
  textoApoio: '#6E6D69',
  textoSecundario: '#4F4E4A',
  borda: '#E7E5E0',
  bordaForte: '#C9C6BF',
  trilho: '#EDEBE6',
  desabilitado: '#DDDAD3',
  destaque: '#5F7D6B',
  destaqueTexto: '#4A6355',
  destaqueFundo: '#EEF2EF',
  alerta: '#B5523B',
  alertaFundo: '#F7ECE8',
  alertaTrilho: '#F2DDD7',
  branco: '#FFFFFF',
} as const;

export const fontes = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  monoMedium: 'GeistMono_500Medium',
  monoSemibold: 'GeistMono_600SemiBold',
} as const;

export type Peso = 400 | 500 | 600 | 700;

export function familia(peso: Peso, mono = false): string {
  if (mono) return peso >= 600 ? fontes.monoSemibold : fontes.monoMedium;
  switch (peso) {
    case 700:
      return fontes.bold;
    case 600:
      return fontes.semibold;
    case 500:
      return fontes.medium;
    default:
      return fontes.regular;
  }
}

// Espaçamento lateral padrão das telas (20 px no protótipo).
export const margem = 20;
