export function soDigitos(s: string): string {
  return s.replace(/\D/g, '');
}

export function mascaraCpf(s: string): string {
  const d = soDigitos(s).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export function mascaraCelular(s: string): string {
  const d = soDigitos(s).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function cpfValido(s: string): boolean {
  const d = soDigitos(s);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

/**
 * E-mail com usuário, @, domínio e final de letras (".com", ".com.br"...),
 * sem espaços nem pontos repetidos ou nas pontas.
 */
export function emailValido(s: string): boolean {
  const e = s.trim();
  if (e.length > 254 || /\.\./.test(e)) return false;
  return /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(e) && !/^\.|\.@|@\.|@-|-\./.test(e);
}

// DDDs que existem no Brasil (Anatel).
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92,
  93, 94, 95, 96, 97, 98, 99,
]);

/** Celular brasileiro: DDD que existe + 9 dígitos começando com 9, sem todos os números iguais. */
export function celularValido(s: string): boolean {
  const d = soDigitos(s);
  if (d.length !== 11 || !DDDS.has(Number(d.slice(0, 2))) || d[2] !== '9') return false;
  return !/^(\d)\1+$/.test(d.slice(3));
}

export interface RegraSenha {
  label: string;
  ok: boolean;
}

export function regrasSenha(senha: string): RegraSenha[] {
  return [
    { label: '8 caracteres ou mais', ok: senha.length >= 8 },
    { label: 'Uma letra maiúscula', ok: /[A-Z]/.test(senha) },
    { label: 'Um número', ok: /[0-9]/.test(senha) },
    { label: 'Um caractere especial', ok: /[^A-Za-z0-9]/.test(senha) },
  ];
}
