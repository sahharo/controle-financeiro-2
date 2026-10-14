import { useState } from 'react';
import { View } from 'react-native';

import { Texto } from './Texto';
import { CampoValor, Campo, Chip, Marcador } from './ui';
import type { DiaPagamento, Renda } from '@/store/tipos';

/**
 * Campo de dia do mês (1 a 31). Guarda o que está sendo digitado, então dá para apagar
 * e escrever outro número; só avisa quando o dia é válido. Saindo vazio, volta ao último dia.
 */
function CampoDia({ rotulo, valor, onChange }: { rotulo: string; valor: number; onChange: (dia: number) => void }) {
  const [texto, setTexto] = useState(String(valor));
  const n = Number(texto);
  const invalido = texto !== '' && (n < 1 || n > 31);
  return (
    <Campo
      rotulo={rotulo}
      mono
      keyboardType="number-pad"
      maxLength={2}
      value={texto}
      erro={invalido ? 'Use um dia de 1 a 31.' : null}
      onChangeText={(t) => {
        const digitos = t.replace(/\D/g, '');
        setTexto(digitos);
        const dia = Number(digitos);
        if (dia >= 1 && dia <= 31) onChange(dia);
      }}
      onBlur={() => {
        if (!(n >= 1 && n <= 31)) setTexto(String(valor));
      }}
    />
  );
}

type Opcao = 'dia5' | 'ultimo' | 'duas' | 'outro';

function opcaoDe(d: DiaPagamento): Opcao {
  if (d.tipo === 'ultimo_util') return 'ultimo';
  if (d.tipo === 'duas_partes') return 'duas';
  return d.dia === 5 ? 'dia5' : 'outro';
}

export function descreverDia(d: DiaPagamento): string {
  if (d.tipo === 'ultimo_util') return 'último dia útil';
  if (d.tipo === 'duas_partes') return `dias ${d.dias[0]} e ${d.dias[1]}`;
  return `dia ${d.dia}`;
}

export function FormRenda({ renda, onChange }: { renda: Renda; onChange: (r: Renda) => void }) {
  const opcao = opcaoDe(renda.diaPagamento);
  const set = (p: Partial<Renda>) => onChange({ ...renda, ...p });
  const setDia = (diaPagamento: DiaPagamento) => set({ diaPagamento });

  return (
    <View>
      <CampoValor grande rotulo="Renda mensal" valor={renda.valor} onChange={(valor) => set({ valor })} autoFocus={!renda.valor} />

      <View style={{ marginTop: 32, gap: 10 }} accessibilityRole="radiogroup">
        <Texto tam={14} peso={500}>
          Você recebe em que dia?
        </Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip rotulo="Dia 5" ativo={opcao === 'dia5'} onPress={() => setDia({ tipo: 'dia', dia: 5 })} />
          <Chip rotulo="Último dia útil" ativo={opcao === 'ultimo'} onPress={() => setDia({ tipo: 'ultimo_util' })} />
          <Chip rotulo="Em duas partes" ativo={opcao === 'duas'} onPress={() => setDia({ tipo: 'duas_partes', dias: [5, 20] })} />
          <Chip
            rotulo="Outro dia"
            ativo={opcao === 'outro'}
            onPress={() => setDia({ tipo: 'dia', dia: renda.diaPagamento.tipo === 'dia' && renda.diaPagamento.dia !== 5 ? renda.diaPagamento.dia : 10 })}
          />
        </View>
        {opcao === 'outro' && renda.diaPagamento.tipo === 'dia' ? (
          <View style={{ width: 140 }}>
            <CampoDia rotulo="Dia do mês" valor={renda.diaPagamento.dia} onChange={(dia) => setDia({ tipo: 'dia', dia })} />
          </View>
        ) : null}
        {renda.diaPagamento.tipo === 'duas_partes' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[0, 1].map((i) => {
              const dias = (renda.diaPagamento as { dias: [number, number] }).dias;
              return (
                <View key={i} style={{ flex: 1 }}>
                  <CampoDia
                    rotulo={i === 0 ? 'Primeira parte' : 'Segunda parte'}
                    valor={dias[i]}
                    onChange={(dia) => {
                      const novo: [number, number] = [...dias];
                      novo[i] = dia;
                      setDia({ tipo: 'duas_partes', dias: novo });
                    }}
                  />
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: 24 }}>
        <Marcador valor={renda.variavel} onChange={(variavel) => set({ variavel })}>
          Minha renda muda todo mês
        </Marcador>
      </View>
    </View>
  );
}
