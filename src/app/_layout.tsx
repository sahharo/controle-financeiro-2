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
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAgoraForaDeTela, useConquistasEm } from '@/hooks/dados';
import { agendarLembretes } from '@/lib/lembretes';
import { buscarCdi } from '@/lib/rendimento';
import { useStore } from '@/store';
import { cores } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Tarefas de fundo enquanto a sessão está aberta. */
function Manutencao() {
  const fixos = useStore((s) => s.fixos);
  const lembrar = useStore((s) => s.preferencias.lembrarVencimentos);
  const taxas = useStore((s) => s.taxas);
  const [agora] = useAgoraForaDeTela();
  const { lista, datas } = useConquistasEm(agora);

  useEffect(() => {
    agendarLembretes(fixos, lembrar);
  }, [fixos, lembrar]);

  // CDI atualizado no máximo uma vez por dia; depois lança rendimentos dos meses fechados.
  useEffect(() => {
    const { setTaxas, aplicarRendimentos } = useStore.getState();
    const hoje = new Date().toISOString().slice(0, 10);
    if (taxas.atualizadoEm?.slice(0, 10) === hoje) {
      aplicarRendimentos(new Date());
      return;
    }
    buscarCdi().then((cdi) => {
      if (cdi) setTaxas({ cdiAnual: cdi, atualizadoEm: new Date().toISOString() });
      useStore.getState().aplicarRendimentos(new Date());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (pronto) SplashScreen.hideAsync().catch(() => {});
  }, [pronto]);
  if (!pronto) return null;

  const sessao = logado && (desbloqueado || !pedeBiometria);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
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
      </Stack>
    </SafeAreaProvider>
  );
}
