import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Folha } from '@/components/Folha';
import { Icone } from '@/components/Icones';
import { Apoio, Texto } from '@/components/Texto';
import { Botao, Campo, Cartao, Chip, Divisor, Linha, Link, Segmentado } from '@/components/ui';
import { useResumo } from '@/hooks/dados';
import { useVoz, vozDisponivel } from '@/hooks/voz';
import { capitalizar, inicioDoDia, mesmoDia, nomeMes, quando, somarDias } from '@/lib/datas';
import { fmt, mascaraValor, MENOS } from '@/lib/dinheiro';
import { faturaDaCompra, valorParcela } from '@/lib/financas';
import { interpretarFrase } from '@/lib/interpretar';
import { nomeCategoria, rotuloPagamento } from '@/lib/rotulos';
import { useStore, type FormaPagamento } from '@/store';
import { cores, familia, margem } from '@/theme';

const OUTRAS_FORMAS: FormaPagamento[] = [{ tipo: 'pix' }, { tipo: 'debito' }, { tipo: 'dinheiro' }];
const PARCELAS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24];

function mesmoPagamento(a: FormaPagamento | null, b: FormaPagamento) {
  if (!a || a.tipo !== b.tipo) return false;
  return a.tipo !== 'credito' || a.cartaoId === (b as { cartaoId: string }).cartaoId;
}

export default function Registrar() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const ins = useSafeAreaInsets();
  const categorias = useStore((s) => s.categorias);
  const cartoes = useStore((s) => s.cartoes);
  const aprendidas = useStore((s) => s.aprendidas);
  const gastos = useStore((s) => s.gastos);
  const salvarGasto = useStore((s) => s.salvarGasto);
  const removerGasto = useStore((s) => s.removerGasto);
  const { resumo, agora } = useResumo();

  const existente = id ? gastos.find((g) => g.id === id) : undefined;
  const ultimo = useMemo(() => [...gastos].sort((a, b) => b.data.localeCompare(a.data))[0], [gastos]);

  const [modo, setModo] = useState<'voz' | 'texto'>(existente || !vozDisponivel ? 'texto' : 'voz');
  const [frase, setFrase] = useState('');
  const [valor, setValor] = useState(existente?.valor ?? 0);
  const [descricao, setDescricao] = useState(existente?.descricao ?? '');
  const [categoriaId, setCategoriaId] = useState<string | null>(existente?.categoriaId ?? null);
  const [pagamento, setPagamento] = useState<FormaPagamento>(existente?.pagamento ?? ultimo?.pagamento ?? { tipo: 'debito' });
  const [data, setData] = useState(() => (existente ? new Date(existente.data) : new Date()));
  const [parcelas, setParcelas] = useState(existente?.parcelas ?? 1);
  const [folha, setFolha] = useState<null | 'categoria' | 'pagamento' | 'quando'>(null);

  function aplicar(texto: string) {
    setFrase(texto);
    const r = interpretarFrase(texto, { cartoes, categorias, aprendidas });
    if (r.valor != null) setValor(r.valor);
    if (r.descricao) setDescricao(r.descricao);
    if (r.categoriaId) setCategoriaId(r.categoriaId);
    if (r.pagamento) setPagamento(r.pagamento);
    if (r.parcelas > 1) setParcelas(r.parcelas);
  }

  const voz = useVoz(aplicar);
  const credito = pagamento.tipo === 'credito' ? cartoes.find((c) => c.id === pagamento.cartaoId) : undefined;
  const nParcelas = credito ? parcelas : 1;
  const valido = valor > 0 && !!categoriaId;

  // Quanto ainda dá para gastar hoje depois deste gasto.
  const pesoHoje = !existente && mesmoDia(data, agora) ? valorParcela(valor, nParcelas, 0) : 0;
  const restaHoje = resumo.podeHoje - pesoHoje;

  function salvar() {
    if (!valido) return;
    salvarGasto({
      id: existente?.id,
      descricao: descricao.trim() || nomeCategoria(categoriaId!, categorias),
      valor,
      categoriaId: categoriaId!,
      pagamento,
      data: data.toISOString(),
      parcelas: nParcelas,
    });
    router.back();
  }

  function excluir() {
    if (!existente) return;
    Alert.alert('Excluir este gasto?', `${existente.descricao} · R$ ${fmt(existente.valor)}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          removerGasto(existente.id);
          router.back();
        },
      },
    ]);
  }

  const quandoTexto = capitalizar(quando(data.toISOString(), agora, true));
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicioDoDia(agora), -i));

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo, paddingTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: margem }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={() => router.back()}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 }}
        >
          <Icone nome="fechar" />
        </Pressable>
        {existente ? (
          <Texto tam={16} peso={600}>
            Editar gasto
          </Texto>
        ) : (
          <Segmentado
            rotulo="Forma de registro"
            valor={modo}
            onChange={(m) => {
              if (m === 'texto') voz.parar();
              setModo(m);
            }}
            opcoes={[
              { valor: 'voz', rotulo: 'Voz' },
              { valor: 'texto', rotulo: 'Texto' },
            ]}
          />
        )}
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: margem, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
        {!existente && modo === 'voz' ? (
          <View style={{ marginTop: 28, minHeight: 64 }}>
            <Apoio>{voz.ouvindo ? 'Ouvindo…' : frase ? 'Você disse' : 'Toque no microfone e fale'}</Apoio>
            <Texto tam={22} altura={1.35} em={-0.01} style={{ marginTop: 6 }} cor={frase || voz.parcial ? cores.texto : cores.textoApoio}>
              {voz.ouvindo && voz.parcial
                ? `“${voz.parcial}”`
                : frase
                  ? `“${frase}”`
                  : '“gastei quarenta e cinco e noventa no ifood, no nubank”'}
            </Texto>
            {voz.erro ? (
              <Texto tam={14} cor={cores.alerta} style={{ marginTop: 8 }}>
                {voz.erro}
              </Texto>
            ) : null}
          </View>
        ) : null}

        {!existente && modo === 'texto' ? (
          <View style={{ marginTop: 24 }}>
            <Campo
              rotulo="Escreva do seu jeito"
              rotuloApoio
              placeholder="45,90 ifood no nubank"
              value={frase}
              onChangeText={setFrase}
              onSubmitEditing={() => aplicar(frase)}
              onBlur={() => frase && aplicar(frase)}
              returnKeyType="done"
              autoFocus
            />
          </View>
        ) : null}

        <Cartao style={{ marginTop: 24, paddingHorizontal: 16, paddingVertical: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, minHeight: 48 }}>
            <Texto tam={14} cor={cores.textoApoio}>
              Valor
            </Texto>
            <TextInput
              accessibilityLabel="Valor"
              keyboardType="number-pad"
              value={valor ? `R$ ${fmt(valor)}` : ''}
              placeholder="R$ 0,00"
              placeholderTextColor={cores.bordaForte}
              onChangeText={(t) => setValor(mascaraValor(t).centavos)}
              style={{ fontFamily: familia(600, true), fontSize: 22, color: cores.texto, textAlign: 'right', minWidth: 160, padding: 0 }}
            />
          </View>
          <Divisor />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, gap: 12 }}>
            <Texto tam={14} cor={cores.textoApoio}>
              Descrição
            </Texto>
            <TextInput
              accessibilityLabel="Descrição"
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex.: Mercado"
              placeholderTextColor={cores.bordaForte}
              style={{ flex: 1, fontFamily: familia(400), fontSize: 15, color: cores.texto, textAlign: 'right', padding: 0 }}
            />
          </View>
          <Divisor />
          <CampoToque rotulo="Categoria" onPress={() => setFolha('categoria')}>
            <Texto tam={15} cor={categoriaId ? cores.texto : cores.alerta}>
              {categoriaId ? nomeCategoria(categoriaId, categorias) : 'Escolher'}
            </Texto>
          </CampoToque>
          <Divisor />
          <CampoToque rotulo="Pagamento" onPress={() => setFolha('pagamento')}>
            <View style={{ alignItems: 'flex-end' }}>
              <Texto tam={15}>{rotuloPagamento(pagamento, cartoes, true)}</Texto>
              {credito ? <Texto tam={12} cor={cores.textoApoio}>Entra na fatura de {nomeMes(faturaDaCompra(credito, data))}</Texto> : null}
            </View>
          </CampoToque>
          <Divisor />
          <CampoToque rotulo="Quando" onPress={() => setFolha('quando')} seta={false}>
            <Texto tam={15}>{quandoTexto}</Texto>
          </CampoToque>
        </Cartao>

        {credito ? (
          <View style={{ marginTop: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Texto tam={14} cor={cores.textoApoio}>
                Parcelas
              </Texto>
              <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel="Parcelas">
                <Chip rotulo="À vista" ativo={parcelas === 1} onPress={() => setParcelas(1)} altura={40} />
                <Chip rotulo="Parcelado" ativo={parcelas > 1} onPress={() => setParcelas(parcelas > 1 ? parcelas : 2)} altura={40} />
              </View>
            </View>
            {parcelas > 1 ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {PARCELAS.map((n) => (
                    <Chip key={n} rotulo={`${n}x`} ativo={parcelas === n} onPress={() => setParcelas(n)} altura={40} />
                  ))}
                </ScrollView>
                {valor > 0 ? (
                  <Apoio>
                    {parcelas}x de R$ {fmt(valorParcela(valor, parcelas, 0))}
                  </Apoio>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        {!existente ? (
          <Apoio altura={1.45} style={{ marginTop: 14 }}>
            Toque em qualquer campo para corrigir. O app aprende: da próxima vez, “{descricao.toLowerCase() || 'ifood'}” já vem como{' '}
            {categoriaId ? nomeCategoria(categoriaId, categorias) : 'a categoria que você escolher'}.
          </Apoio>
        ) : (
          <View style={{ marginTop: 18, alignItems: 'flex-start' }}>
            <Link rotulo="Excluir gasto" cor={cores.alerta} onPress={excluir} />
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: margem, paddingTop: 8, paddingBottom: Math.max(ins.bottom, 16) + 12, alignItems: 'center', gap: 18 }}>
        {!existente ? (
          <Texto tam={14} cor={cores.textoApoio}>
            Hoje ainda dá para gastar{' '}
            <Texto tam={14} mono cor={restaHoje < 0 ? cores.alerta : cores.texto}>
              {restaHoje < 0 ? MENOS : ''}R$ {fmt(restaHoje)}
            </Texto>
          </Texto>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%' }}>
          {!existente && modo === 'voz' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={voz.ouvindo ? 'Parar de ouvir' : frase ? 'Gravar de novo' : 'Começar a gravar'}
              onPress={voz.ouvindo ? voz.parar : voz.ouvir}
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: voz.ouvindo ? cores.destaque : cores.borda,
                backgroundColor: voz.ouvindo ? cores.destaqueFundo : cores.cartao,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icone nome="microfone" cor={voz.ouvindo ? cores.destaqueTexto : cores.texto} />
            </Pressable>
          ) : null}
          <Botao variante="destaque" onPress={salvar} desabilitado={!valido} flex={1}>
            {existente ? 'Salvar alterações' : 'Salvar gasto'}
          </Botao>
        </View>
      </View>

      <Folha visivel={folha === 'categoria'} onFechar={() => setFolha(null)} titulo="Categoria">
        <View>
          {categorias.map((c, i) => (
            <Linha
              key={c.id}
              titulo={c.nome}
              borda={i < categorias.length - 1}
              direitaExtra={c.id === categoriaId ? <Icone nome="check" tam={18} cor={cores.destaque} traco={2.4} /> : undefined}
              onPress={() => {
                setCategoriaId(c.id);
                setFolha(null);
              }}
            />
          ))}
        </View>
        <Link rotulo="Criar e editar categorias em Gastos" onPress={() => { setFolha(null); router.push('/gastos'); }} />
      </Folha>

      <Folha visivel={folha === 'pagamento'} onFechar={() => setFolha(null)} titulo="Pagamento">
        <View>
          {[...cartoes.map((c) => ({ tipo: 'credito', cartaoId: c.id }) as FormaPagamento), ...OUTRAS_FORMAS].map((p, i, arr) => (
            <Linha
              key={p.tipo === 'credito' ? p.cartaoId : p.tipo}
              titulo={rotuloPagamento(p, cartoes, true)}
              sub={p.tipo === 'credito' ? `Fatura de ${nomeMes(faturaDaCompra(cartoes.find((c) => c.id === p.cartaoId)!, data))}` : undefined}
              borda={i < arr.length - 1}
              direitaExtra={mesmoPagamento(pagamento, p) ? <Icone nome="check" tam={18} cor={cores.destaque} traco={2.4} /> : undefined}
              onPress={() => {
                setPagamento(p);
                setFolha(null);
              }}
            />
          ))}
        </View>
      </Folha>

      <Folha visivel={folha === 'quando'} onFechar={() => setFolha(null)} titulo="Quando foi?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {dias.map((d) => (
            <Chip
              key={d.toISOString()}
              rotulo={capitalizar(quando(d.toISOString(), agora))}
              ativo={mesmoDia(d, data)}
              onPress={() => {
                const nova = new Date(d);
                const base = mesmoDia(d, agora) ? agora : data;
                nova.setHours(base.getHours(), base.getMinutes());
                setData(nova);
                setFolha(null);
              }}
              altura={40}
            />
          ))}
        </View>
      </Folha>
    </View>
  );
}

function CampoToque({
  rotulo,
  onPress,
  children,
  seta = true,
}: {
  rotulo: string;
  onPress: () => void;
  children: React.ReactNode;
  seta?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rotulo}. Toque para mudar`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        minHeight: 48,
        gap: 12,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Texto tam={14} cor={cores.textoApoio}>
        {rotulo}
      </Texto>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        {children}
        {seta ? <Icone nome="direita" tam={14} cor={cores.textoApoio} traco={2} /> : null}
      </View>
    </Pressable>
  );
}
