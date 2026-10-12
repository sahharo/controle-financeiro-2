import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Folha } from '@/components/Folha';
import { FormRenda } from '@/components/FormRenda';
import { Apoio } from '@/components/Texto';
import { Botao, Campo, CampoValor, Linha, Tela, Titulo, TituloSecao, Vazio, Voltar } from '@/components/ui';
import { useAgora } from '@/hooks/dados';
import { chaveDeIso, chaveMes, nomeMes, quando } from '@/lib/datas';
import { fmt } from '@/lib/dinheiro';
import { useStore } from '@/store';

export default function EditarRenda() {
  const agora = useAgora();
  const atual = useStore((s) => s.renda);
  const receitas = useStore((s) => s.receitas);
  const setRenda = useStore((s) => s.setRenda);
  const salvarReceita = useStore((s) => s.salvarReceita);
  const removerReceita = useStore((s) => s.removerReceita);
  const [renda, setRascunho] = useState(atual);
  const [extra, setExtra] = useState<{ descricao: string; valor: number } | null>(null);

  const mes = chaveMes(agora);
  const doMes = receitas.filter((r) => chaveDeIso(r.data) === mes);

  return (
    <Tela
      contentStyle={{ paddingTop: 16 }}
      rodape={
        <Botao
          desabilitado={renda.valor <= 0}
          onPress={() => {
            setRenda(renda);
            router.back();
          }}
        >
          Salvar
        </Botao>
      }
    >
      <Voltar rotulo="Perfil" />
      <Titulo style={{ marginTop: 8 }}>Renda</Titulo>
      <Apoio tam={15} altura={1.45} style={{ marginTop: 6, marginBottom: 28 }}>
        Use o valor líquido, já com os descontos.
        {renda.variavel ? ' Como sua renda muda, atualize aqui quando o valor do mês mudar.' : ''}
      </Apoio>

      <FormRenda renda={renda} onChange={setRascunho} />

      <View style={{ marginTop: 28 }}>
        <TituloSecao acao={{ rotulo: '+ Adicionar', onPress: () => setExtra({ descricao: '', valor: 0 }) }}>
          Extras em {nomeMes(mes)}
        </TituloSecao>
        <Apoio style={{ marginTop: 2 }}>Freela, 13º, venda de algo. Entra só neste mês.</Apoio>
        <View style={{ marginTop: 4 }}>
          {doMes.length === 0 ? (
            <Vazio texto="Nenhuma entrada extra neste mês." />
          ) : (
            doMes.map((r, i) => (
              <Linha
                key={r.id}
                borda={i < doMes.length - 1}
                titulo={r.descricao}
                sub={quando(r.data, agora)}
                valor={`+${fmt(r.valor)}`}
                onLongPress={() =>
                  Alert.alert(`Remover ${r.descricao}?`, undefined, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Remover', style: 'destructive', onPress: () => removerReceita(r.id) },
                  ])
                }
              />
            ))
          )}
        </View>
      </View>

      <Folha
        visivel={!!extra}
        onFechar={() => setExtra(null)}
        titulo="Entrada extra"
        rodape={
          <Botao
            desabilitado={!extra?.valor || !extra.descricao.trim()}
            onPress={() => {
              if (extra) salvarReceita({ descricao: extra.descricao.trim(), valor: extra.valor, data: new Date().toISOString() });
              setExtra(null);
            }}
          >
            Adicionar
          </Botao>
        }
      >
        {extra ? (
          <>
            <Campo rotulo="De onde veio" value={extra.descricao} onChangeText={(descricao) => setExtra({ ...extra, descricao })} placeholder="Ex.: Freela do site" />
            <CampoValor rotulo="Valor" valor={extra.valor} onChange={(valor) => setExtra({ ...extra, valor })} />
          </>
        ) : null}
      </Folha>
    </Tela>
  );
}
