import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// A senha nunca é guardada: só um hash com sal, no chaveiro do sistema
// (Keychain no iOS, Keystore no Android).
const CHAVE_SENHA = 'sobra.senha';

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashSenha(senha: string, sal: string): Promise<string> {
  let h = `${sal}:${senha}`;
  // Algumas rodadas para encarecer tentativa e erro caso o hash vaze.
  for (let i = 0; i < 64; i++) h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sal}${h}`);
  return h;
}

export async function salvarSenha(senha: string): Promise<void> {
  const sal = hex(Crypto.getRandomBytes(16));
  const hash = await hashSenha(senha, sal);
  await SecureStore.setItemAsync(CHAVE_SENHA, JSON.stringify({ sal, hash }));
}

export async function conferirSenha(senha: string): Promise<boolean> {
  const salvo = await SecureStore.getItemAsync(CHAVE_SENHA);
  if (!salvo) return false;
  const { sal, hash } = JSON.parse(salvo) as { sal: string; hash: string };
  return (await hashSenha(senha, sal)) === hash;
}

export async function apagarSenha(): Promise<void> {
  await SecureStore.deleteItemAsync(CHAVE_SENHA);
}

export async function biometriaDisponivel(): Promise<boolean> {
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
