import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

// A senha é conferida no servidor. Aqui fica só a biometria, que destrava o app
// no próprio aparelho quando "Pedir biometria ao abrir" está ligado.

export async function biometriaDisponivel(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

export async function autenticarBiometria(motivo = 'Entrar no Sobra'): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: motivo,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar senha',
      disableDeviceFallback: false,
    });
    return r.success;
  } catch {
    return false;
  }
}
