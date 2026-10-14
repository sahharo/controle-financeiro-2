import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { GeistMono_600SemiBold } from '@expo-google-fonts/geist-mono/600SemiBold';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAgoraForaDeTela, useConquistasEm } from '@/hooks/dados';
import { agendarLembretes } from '@/lib/lembretes';
import { useStore } from '@/store';
import { iniciarSincronizacao } from '@/store/sincronizar';
import { cores } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Tarefas de fundo enquanto a sessão está aberta. */
function Manutencao() {
  const fixos = useStore((s) => s.fixos);
  const lembrar = useStore((s) => s.preferencias.lembrarVencimentos);
  const [agora] = useAgoraForaDeTela();
  const { lista, datas } = useConquistasEm(agora);

  useEffect(() => {
    agendarLembretes(fixos, lembrar);
  }, [fixos, lembrar]);

  // Lança o rendimento da caixinha dos meses já fechados (o CDI vem do servidor).
  const cdi = useStore((s) => s.taxas.cdiAnual);
  useEffect(() => {
    useStore.getState().aplicarRendimentos(agora);
  }, [cdi, agora]);

  useEffect(() => {
    const novas = lista.filter((c) => c.conquistada && !datas[c.id]).map((c) => c.id);
    if (novas.length) useStore.getState().marcarConquistas(novas);
  }, [lista, datas]);

  return Platform.OS === 'web' ? null : <AbrirNotificacao />;
}

/** Tocar no lembrete abre a tela indicada nele. */
function AbrirNotificacao() {
  const resposta = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const rota = resposta?.notification.request.content.data?.rota;
    if (typeof rota === 'string') router.push(rota as never);
  }, [resposta]);
  return null;
}

/** No computador, o app fica numa coluna central com a largura de um celular grande. */
function ColunaSite({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: cores.trilho, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 520, backgroundColor: cores.fundo, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

export default function Raiz() {
  const [fontes] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_500Medium,
    GeistMono_600SemiBold,
  });
  const hidratado = useStore((s) => s.hidratado);
  const logado = useStore((s) => s.logado);
  const desbloqueado = useStore((s) => s.desbloqueado);
  const pedeBiometria = useStore((s) => s.preferencias.biometriaAoAbrir);
  const onboarding = useStore((s) => s.onboardingConcluido);

  const pronto = fontes && hidratado;
  useEffect(() => {
    if (!pronto) return;
    SplashScreen.hideAsync().catch(() => {});
    void iniciarSincronizacao();
  }, [pronto]);
  if (!pronto) return null;

  // No site não há biometria: a trava vale só no celular.
  const sessao = logado && (desbloqueado || !pedeBiometria || Platform.OS === 'web');

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ColunaSite>
      {sessao && onboarding ? <Manutencao /> : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
        <Stack.Protected guard={!sessao}>
          <Stack.Screen name="entrar" />
          <Stack.Screen name="cadastro" />
        </Stack.Protected>
        <Stack.Protected guard={sessao && !onboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={sessao && onboarding}>
          <Stack.Screen name="(abas)" />
          <Stack.Screen name="registrar" options={{ presentation: 'modal' }} />
          <Stack.Screen name="proximos-meses" />
          <Stack.Screen name="simulador" />
          <Stack.Screen name="caixinha" />
          <Stack.Screen name="reserva" />
          <Stack.Screen name="conquistas" />
          <Stack.Screen name="renda" />
        </Stack.Protected>
        <Stack.Screen name="redefinir-senha" />
      </Stack>
      </ColunaSite>
    </SafeAreaProvider>
  );
}
