import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// No site, a API está no mesmo endereço e a sessão vai num cookie HttpOnly.
// No celular, o token fica no chaveiro do aparelho e vai em "Authorization: Bearer".
const WEB = Platform.OS === 'web';
const CHAVE_TOKEN = 'sobra.token';

/**
 * Endereço da API:
 * - EXPO_PUBLIC_API_URL, se definido (ex.: https://sobra.onrender.com);
 * - no site publicado, o próprio endereço;
 * - em desenvolvimento, o computador que roda o Expo, na porta 3333.
 */
function enderecoApi(): string {
  const configurado = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (configurado) return configurado;
  if (WEB) return typeof window !== 'undefined' && window.location.port === '8081' ? 'http://localhost:3333' : '';
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:3333`;
}

export const API = enderecoApi();

export class ErroApi extends Error {
  constructor(
    public status: number,
    message: string,
    public codigo = 'erro',
  ) {
    super(message);
  }
}

let token: string | null = null;
let aoExpirar: (() => void) | null = null;

/** Chamado quando o servidor diz que a sessão acabou (401). */
export function quandoSessaoExpirar(fn: () => void) {
  aoExpirar = fn;
}

export async function carregarToken() {
  if (WEB) return;
  try {
    token = await SecureStore.getItemAsync(CHAVE_TOKEN);
  } catch {
    token = null;
  }
}

async function guardarToken(t: string | null) {
  token = t;
  if (WEB) return;
  try {
    if (t) await SecureStore.setItemAsync(CHAVE_TOKEN, t);
    else await SecureStore.deleteItemAsync(CHAVE_TOKEN);
  } catch {
    // Sem chaveiro (ex.: simulador sem senha): a sessão vale só enquanto o app está aberto.
  }
}

export async function chamar<T = unknown>(metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', caminho: string, corpo?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'x-requested-with': 'sobra', accept: 'application/json' };
  if (corpo !== undefined) headers['content-type'] = 'application/json';
  if (!WEB) headers['x-cliente'] = 'app';
  if (token) headers.authorization = `Bearer ${token}`;
  let r: Response;
  try {
    r = await fetch(`${API}${caminho}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      credentials: 'include',
    });
  } catch {
    throw new ErroApi(0, 'Sem conexão com o servidor. Confira a internet e tente de novo.', 'sem_conexao');
  }
  const texto = await r.text();
  const json = texto ? JSON.parse(texto) : null;
  if (!r.ok) {
    if (r.status === 401 && !caminho.startsWith('/api/conta/entrar')) aoExpirar?.();
    throw new ErroApi(r.status, json?.message ?? 'Algo deu errado. Tente de novo.', json?.error);
  }
  return json as T;
}

export interface UsuarioApi {
  nome: string;
  sobrenome: string;
  cpf: string;
  celular: string;
  email: string;
  criadoEm: string;
}

interface RespostaSessao {
  usuario: UsuarioApi;
  token?: string;
}

async function abrir(caminho: string, corpo: unknown) {
  const r = await chamar<RespostaSessao>('POST', caminho, corpo);
  if (r.token) await guardarToken(r.token);
  return r.usuario;
}

export const conta = {
  cadastrar: (d: { nome: string; sobrenome: string; cpf: string; celular: string; email: string; senha: string; aceite: boolean }) =>
    abrir('/api/conta/cadastro', d),
  entrar: (identificador: string, senha: string) => abrir('/api/conta/entrar', { identificador, senha }),
  async sair() {
    try {
      await chamar('POST', '/api/conta/sair');
    } finally {
      await guardarToken(null);
    }
  },
  esqueci: (email: string) => chamar('POST', '/api/conta/esqueci', { email }),
  redefinir: (tokenLink: string, senha: string) => chamar('POST', '/api/conta/redefinir', { token: tokenLink, senha }),
  async excluir() {
    await chamar('DELETE', '/api/conta');
    await guardarToken(null);
  },
  esquecerToken: () => guardarToken(null),
};
