import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * Mesmo uso do Alert.alert, mas também funciona no site: lá o Alert do React Native
 * não aparece, então usamos o confirm/alert do navegador.
 */
export function alerta(titulo: string, mensagem?: string, botoes?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(titulo, mensagem, botoes);
    return;
  }
  const texto = mensagem ? `${titulo}\n\n${mensagem}` : titulo;
  const acoes = (botoes ?? []).filter((b) => b.style !== 'cancel');
  if (!acoes.length) {
    window.alert(texto);
    botoes?.[0]?.onPress?.();
    return;
  }
  // No navegador só há "OK/Cancelar": o OK faz a ação principal (a destrutiva, se houver).
  const principal = acoes.find((b) => b.style === 'destructive') ?? acoes[acoes.length - 1];
  if (window.confirm(texto)) principal.onPress?.();
  else botoes?.find((b) => b.style === 'cancel')?.onPress?.();
}
