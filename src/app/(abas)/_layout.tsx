import { Tabs } from 'expo-router/js-tabs';

import { BarraAbas } from '@/components/BarraAbas';
import { cores } from '@/theme';

export default function LayoutAbas() {
  return (
    <Tabs
      tabBar={(props) => <BarraAbas {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: cores.fundo } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="gastos" />
      <Tabs.Screen name="metas" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
