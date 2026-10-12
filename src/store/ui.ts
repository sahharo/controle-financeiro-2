import { create } from 'zustand';

import type { ChaveMes } from '@/lib/datas';

/** Estado de interface que não precisa ser salvo. */
export const useUi = create<{ mes: ChaveMes | null; setMes: (m: ChaveMes | null) => void }>((set) => ({
  mes: null,
  setMes: (mes) => set({ mes }),
}));
