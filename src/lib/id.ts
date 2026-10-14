let contador = 0;

/** Identificador local, único o bastante para os registros do aparelho. */
export function novoId(): string {
  contador = (contador + 1) % 1_000_000;
  return `${Date.now().toString(36)}${contador.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
