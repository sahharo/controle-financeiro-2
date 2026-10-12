import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { chaveMes, diaDoMes, somarDias, somarMeses } from './datas';
import { fmt } from './dinheiro';
import { estimativaFixo } from './financas';
import type { Fixo } from '@/store/tipos';

const CANAL = 'vencimentos';

if (Platform.OS !== 'web')
  Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function pedirPermissaoLembretes(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Vencimentos',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Reagenda os lembretes: um aviso às 9h da véspera de cada vencimento
 * dos próximos dois meses, para fixos com lembrete ligado e ainda não pagos.
 */
export async function agendarLembretes(fixos: Fixo[], ativo: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!ativo) return;
    const comLembrete = fixos.filter((f) => f.lembrete);
    if (!comLembrete.length || !(await pedirPermissaoLembretes())) return;
    const agora = new Date();
    for (const f of comLembrete) {
      for (const mes of [chaveMes(agora), somarMeses(chaveMes(agora), 1)]) {
        if (f.tipo === 'anual' && f.mesAnual !== Number(mes.slice(5)) - 1) continue;
        if (f.pagamentos[mes] != null) continue;
        const aviso = somarDias(diaDoMes(mes, f.dia), -1);
        aviso.setHours(9, 0, 0, 0);
        if (aviso <= agora) continue;
        const valor = f.tipo === 'estimado' ? estimativaFixo(f, mes) : f.valor;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${f.nome} vence amanhã`,
            body: `${f.tipo === 'estimado' ? 'Cerca de ' : ''}R$ ${fmt(valor)}. Toque para marcar como pago.`,
            data: { rota: '/gastos?aba=fixos' },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: aviso, channelId: CANAL },
        });
      }
    }
  } catch {
    // Lembretes são um extra: falhar aqui não pode travar o app.
  }
}
