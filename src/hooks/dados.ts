import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { calcularConquistas } from '@/lib/conquistas';
import { chaveMes } from '@/lib/datas';
import { resumoDoMes, type Dados } from '@/lib/financas';
import { mesInicioConta, useStore } from '@/store';

export function useDados(): Dados {
  return useStore(
    useShallow((s) => ({
      renda: s.renda,
      receitas: s.receitas,
      categorias: s.categorias,
      cartoes: s.cartoes,
      gastos: s.gastos,
      fixos: s.fixos,
      metas: s.metas,
      caixinha: s.caixinha,
      reserva: s.reserva,
      ajustes: s.ajustes,
    })),
  );
}

/** "Agora", atualizado quando a tela ganha foco ou o app volta para a frente. */
export function useAgora(): Date {
  const [agora, setAgora] = useAgoraForaDeTela();
  useFocusEffect(
    useCallback(() => {
      setAgora(new Date());
    }, [setAgora]),
  );
  return agora;
}

/** Versão para fora das telas (layout raiz): só atualiza quando o app volta para a frente. */
export function useAgoraForaDeTela() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setAgora(new Date()));
    return () => sub.remove();
  }, []);
  return [agora, setAgora] as const;
}

export function useResumo(mes?: string) {
  const dados = useDados();
  const agora = useAgora();
  const chave = mes ?? chaveMes(agora);
  const resumo = useMemo(() => resumoDoMes(dados, chave, agora), [dados, chave, agora]);
  return { resumo, dados, agora };
}

export function useConquistas() {
  return useConquistasEm(useAgora());
}

export function useConquistasEm(agora: Date) {
  const dados = useDados();
  const usuario = useStore((s) => s.usuario);
  const desistencias = useStore((s) => s.desistencias);
  const datas = useStore((s) => s.conquistasDatas);
  const lista = useMemo(
    () => calcularConquistas(dados, { agora, inicioConta: mesInicioConta({ usuario }), desistencias }),
    [dados, agora, usuario, desistencias],
  );
  return { lista, datas, agora };
}
