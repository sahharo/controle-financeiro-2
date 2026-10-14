import { useState } from 'react';
import { View } from 'react-native';

import { Campo, Chip } from './ui';

export const BANCOS = [
  'Nubank',
  'Itaú',
  'Bradesco',
  'Santander',
  'Banco do Brasil',
  'Caixa',
  'Inter',
  'C6',
  'Mercado Pago',
  'PicPay',
  'BTG',
  'XP',
];

/** Bancos mais comuns em botões e "Outro" para digitar o nome de qualquer outro. */
export function EscolherBanco({ nome, onChange }: { nome: string; onChange: (nome: string) => void }) {
  // Ao editar um cartão de banco fora da lista, já abre no "Outro".
  const [outro, setOutro] = useState(() => nome !== '' && !BANCOS.includes(nome));
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {BANCOS.map((b) => (
          <Chip
            key={b}
            rotulo={b}
            ativo={!outro && nome === b}
            onPress={() => {
              setOutro(false);
              onChange(b);
            }}
            altura={40}
          />
        ))}
        <Chip
          rotulo="Outro"
          ativo={outro}
          onPress={() => {
            setOutro(true);
            if (BANCOS.includes(nome)) onChange('');
          }}
          altura={40}
        />
      </View>
      {outro ? (
        <Campo rotulo="Nome do banco ou do cartão" placeholder="Ex.: Sicredi" value={nome} onChangeText={onChange} autoFocus />
      ) : null}
    </View>
  );
}
