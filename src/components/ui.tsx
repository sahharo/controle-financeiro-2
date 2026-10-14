import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, Logo } from './Icones';
import { Apoio, Texto } from './Texto';
import { mascaraValor, type Centavos } from '@/lib/dinheiro';
import { cores, familia, margem } from '@/theme';

// ---------------------------------------------------------------------------
// Estrutura de tela

interface TelaProps {
  children: ReactNode;
  /** Rola o conteúdo. Desligue quando a tela tem rodapé fixo próprio. */
  rolar?: boolean;
  rodape?: ReactNode;
  /** Padding interno lateral (telas com barra de navegação usam margem por bloco). */
  padding?: boolean;
  /** Tela dentro das abas: a barra inferior já cuida da área segura de baixo. */
  emAba?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Tela({ children, rolar = true, rodape, padding = true, emAba = false, contentStyle }: TelaProps) {
  const ins = useSafeAreaInsets();
  const pad: ViewStyle = padding ? { paddingHorizontal: margem } : {};
  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo, paddingTop: ins.top }}>
      {rolar ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[pad, { paddingBottom: 24, flexGrow: 1 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
      )}
      {rodape ? (
        <View style={{ paddingHorizontal: margem, paddingTop: 12, paddingBottom: emAba ? 16 : Math.max(ins.bottom, 16) + 12 }}>
          {rodape}
        </View>
      ) : null}
    </View>
  );
}

export function Marca({ tam = 22, texto = 19 }: { tam?: number; texto?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Logo tam={tam} />
      <Texto tam={texto} peso={700} em={-0.03}>
        sobra
      </Texto>
    </View>
  );
}

export function Voltar({ rotulo, onPress }: { rotulo: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Voltar para ${rotulo}`}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, marginLeft: -6, alignSelf: 'flex-start' }}
      hitSlop={8}
    >
      <Icone nome="esquerda" tam={20} />
      <Texto tam={15}>{rotulo}</Texto>
    </Pressable>
  );
}

export function Titulo({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Texto tam={28} peso={700} em={-0.025} accessibilityRole="header">
        {children}
      </Texto>
    </View>
  );
}

export function TituloSecao({ children, acao }: { children: ReactNode; acao?: { rotulo: string; onPress: () => void } }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Texto tam={16} peso={600} accessibilityRole="header">
        {children}
      </Texto>
      {acao ? <Link rotulo={acao.rotulo} onPress={acao.onPress} /> : null}
    </View>
  );
}

export function Rotulo({ children }: { children: ReactNode }) {
  return (
    <Texto tam={12} peso={500} cor={cores.textoApoio} maiusculas em={0.07} style={{ marginBottom: 6 }}>
      {children}
    </Texto>
  );
}

// ---------------------------------------------------------------------------
// Superfícies

export function Cartao({
  children,
  style,
  raio = 20,
  onPress,
  rotulo,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  raio?: number;
  onPress?: () => void;
  rotulo?: string;
}) {
  const base: ViewStyle = {
    backgroundColor: cores.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio,
  };
  if (onPress)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        onPress={onPress}
        style={({ pressed }) => [base, pressed && { opacity: 0.7 }, style]}
      >
        {children}
      </Pressable>
    );
  return <View style={[base, style]}>{children}</View>;
}

export function Divisor() {
  return <View style={{ height: 1, backgroundColor: cores.borda }} />;
}

export function Barra({
  pct,
  altura = 6,
  cor = cores.destaque,
  trilho = cores.borda,
  raio = 999,
}: {
  pct: number;
  altura?: number;
  cor?: string;
  trilho?: string;
  raio?: number;
}) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(w) }}
      style={{ height: altura, borderRadius: raio, backgroundColor: trilho, overflow: 'hidden' }}
    >
      <View style={{ width: `${w}%`, height: '100%', backgroundColor: cor, borderRadius: raio }} />
    </View>
  );
}

export function Selo({ children, alerta }: { children: ReactNode; alerta?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: alerta ? cores.alertaFundo : cores.destaqueFundo,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      <Texto tam={12} cor={alerta ? cores.alerta : cores.destaqueTexto}>
        {children}
      </Texto>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ações

type VarianteBotao = 'escuro' | 'destaque' | 'claro';

export function Botao({
  children,
  onPress,
  variante = 'escuro',
  desabilitado,
  carregando,
  icone,
  style,
  flex,
}: {
  children: ReactNode;
  onPress?: () => void;
  variante?: VarianteBotao;
  desabilitado?: boolean;
  carregando?: boolean;
  icone?: ReactNode;
  style?: StyleProp<ViewStyle>;
  flex?: number;
}) {
  const fundo = desabilitado
    ? cores.desabilitado
    : variante === 'escuro'
      ? cores.texto
      : variante === 'destaque'
        ? cores.destaque
        : cores.cartao;
  const texto = desabilitado ? cores.textoApoio : variante === 'claro' ? cores.texto : cores.branco;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!desabilitado, busy: !!carregando }}
      disabled={desabilitado || carregando}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 56,
          borderRadius: 999,
          backgroundColor: fundo,
          borderWidth: variante === 'claro' ? 1 : 0,
          borderColor: cores.borda,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: 16,
          opacity: pressed ? 0.85 : 1,
        },
        flex != null && { flex },
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={texto} />
      ) : (
        <>
          {icone}
          <Texto tam={16} peso={variante === 'claro' ? 400 : 600} cor={texto}>
            {children}
          </Texto>
        </>
      )}
    </Pressable>
  );
}

export function Link({
  rotulo,
  onPress,
  cor = cores.destaqueTexto,
  tam = 14,
}: {
  rotulo: string;
  onPress: () => void;
  cor?: string;
  tam?: number;
}) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={10} style={{ paddingVertical: 4 }}>
      <Texto tam={tam} cor={cor}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

export function BotaoTexto({ rotulo, onPress, cor = cores.destaqueTexto }: { rotulo: string; onPress: () => void; cor?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ paddingVertical: 12 }} hitSlop={6}>
      <Texto tam={14} cor={cor}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

export function BotaoRedondo({
  icone,
  rotulo,
  onPress,
  tam = 44,
  tracejado,
}: {
  icone: Parameters<typeof Icone>[0]['nome'];
  rotulo: string;
  onPress: () => void;
  tam?: number;
  tracejado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={onPress}
      style={({ pressed }) => ({
        width: tam,
        height: tam,
        borderRadius: 999,
        borderWidth: 1,
        borderStyle: tracejado ? 'dashed' : 'solid',
        borderColor: tracejado ? cores.bordaForte : cores.borda,
        backgroundColor: tracejado ? 'transparent' : cores.cartao,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icone nome={icone} tam={tam > 44 ? 22 : 16} cor={tracejado ? cores.textoApoio : cores.texto} traco={2} />
    </Pressable>
  );
}

/** Pílula selecionável (escura quando ativa). */
export function Chip({
  rotulo,
  ativo,
  onPress,
  altura = 44,
}: {
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
  altura?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      style={{
        height: altura,
        paddingHorizontal: altura >= 44 ? 18 : 14,
        borderRadius: 999,
        borderWidth: ativo ? 1.5 : 1,
        borderColor: ativo ? cores.texto : cores.borda,
        backgroundColor: ativo ? cores.texto : cores.cartao,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Texto tam={altura >= 44 ? 15 : 14} cor={ativo ? cores.branco : cores.texto}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

/** Controle segmentado em trilho cinza (Voz/Texto, 3/6/12). */
export function Segmentado<T extends string | number>({
  opcoes,
  valor,
  onChange,
  rotulo,
  minLargura,
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
  minLargura?: number;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={rotulo}
      style={{ flexDirection: 'row', backgroundColor: cores.trilho, borderRadius: 999, padding: 3 }}
    >
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ selected: ativo }}
            onPress={() => onChange(o.valor)}
            style={{
              height: 38,
              minWidth: minLargura,
              paddingHorizontal: 18,
              borderRadius: 999,
              backgroundColor: ativo ? cores.cartao : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Texto tam={14} peso={ativo ? 500 : 400} cor={ativo ? cores.texto : cores.textoApoio}>
              {o.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chave({ valor, onChange, rotulo }: { valor: boolean; onChange: (v: boolean) => void; rotulo: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: valor }}
      onPress={() => onChange(!valor)}
      hitSlop={8}
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        backgroundColor: valor ? cores.destaque : cores.bordaForte,
        padding: 3,
        alignItems: valor ? 'flex-end' : 'flex-start',
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: cores.branco }} />
    </Pressable>
  );
}

export function Marcador({ valor, onChange, children }: { valor: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: valor }}
      onPress={() => onChange(!valor)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          borderWidth: valor ? 0 : 1.5,
          borderColor: cores.bordaForte,
          backgroundColor: valor ? cores.destaque : cores.cartao,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {valor ? <Icone nome="check" tam={14} cor={cores.branco} traco={2.6} /> : null}
      </View>
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <Texto tam={15}>{children}</Texto> : children}</View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Campos

interface CampoProps extends TextInputProps {
  rotulo: string;
  erro?: string | null;
  mono?: boolean;
  direita?: ReactNode;
  raio?: number;
  altura?: number;
  rotuloApoio?: boolean;
}

export function Campo({ rotulo, erro, mono, direita, raio = 14, altura = 50, rotuloApoio, style, ...props }: CampoProps) {
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Texto tam={13} peso={rotuloApoio ? 400 : 500} cor={rotuloApoio ? cores.textoApoio : cores.texto}>
        {rotulo}
      </Texto>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: cores.cartao,
          borderWidth: 1,
          borderColor: erro ? cores.alerta : foco ? cores.texto : cores.borda,
          borderRadius: raio,
          height: altura,
          paddingLeft: 14,
          paddingRight: direita ? 4 : 14,
        }}
      >
        <TextInput
          accessibilityLabel={rotulo}
          placeholderTextColor={cores.textoApoio}
          {...props}
          onFocus={(e) => {
            setFoco(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            props.onBlur?.(e);
          }}
          style={[{ outlineWidth: 0, flex: 1, minWidth: 0, height: '100%', fontSize: 16, color: cores.texto, fontFamily: familia(400, mono), padding: 0 }, style]}
        />
        {direita}
      </View>
      {erro ? (
        <Texto tam={13} cor={cores.alerta}>
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

/** Campo de dinheiro com máscara (dígitos entram pela direita). */
export function CampoValor({
  rotulo,
  valor,
  onChange,
  grande,
  ...props
}: Omit<CampoProps, 'value' | 'onChangeText' | 'onChange'> & {
  valor: Centavos;
  onChange: (c: Centavos) => void;
  grande?: boolean;
}) {
  const texto = valor ? mascaraValor(String(valor)).texto : '';
  if (grande)
    return (
      <View style={{ gap: 8 }}>
        <Texto tam={14} peso={500}>
          {rotulo}
        </Texto>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 8,
            borderBottomWidth: 2,
            borderBottomColor: cores.texto,
            paddingBottom: 8,
          }}
        >
          <Texto tam={22} mono cor={cores.textoApoio}>
            R$
          </Texto>
          <TextInput
            accessibilityLabel={rotulo}
            keyboardType="number-pad"
            value={texto}
            placeholder="0,00"
            placeholderTextColor={cores.bordaForte}
            onChangeText={(t) => onChange(mascaraValor(t).centavos)}
            style={{ outlineWidth: 0, flex: 1, minWidth: 0, fontSize: 40, fontFamily: familia(600, true), color: cores.texto, letterSpacing: -1.2, padding: 0 }}
            {...props}
          />
        </View>
      </View>
    );
  return (
    <Campo
      rotulo={rotulo}
      mono
      keyboardType="number-pad"
      placeholder="R$ 0,00"
      value={texto ? `R$ ${texto}` : ''}
      onChangeText={(t) => onChange(mascaraValor(t).centavos)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Listas

export function Linha({
  titulo,
  sub,
  subCor,
  valor,
  valorCor,
  borda = true,
  onPress,
  onLongPress,
  esquerda,
  direitaExtra,
  rotulo,
}: {
  titulo: string;
  sub?: string;
  subCor?: string;
  valor?: string;
  valorCor?: string;
  borda?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  esquerda?: ReactNode;
  direitaExtra?: ReactNode;
  rotulo?: string;
}) {
  const conteudo = (
    <>
      {esquerda}
      <View style={{ flex: 1 }}>
        <Texto tam={15}>{titulo}</Texto>
        {sub ? <Apoio cor={subCor ?? cores.textoApoio}>{sub}</Apoio> : null}
      </View>
      {direitaExtra}
      {valor != null ? (
        <Texto tam={15} mono cor={valorCor}>
          {valor}
        </Texto>
      ) : null}
    </>
  );
  const estilo: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: borda ? 1 : 0,
    borderBottomColor: cores.borda,
    minHeight: 44,
  };
  if (onPress || onLongPress)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        accessibilityHint={onLongPress ? 'Toque e segure para mais opções' : undefined}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [estilo, pressed && { opacity: 0.6 }]}
      >
        {conteudo}
      </Pressable>
    );
  return <View style={estilo}>{conteudo}</View>;
}

/** Linha de menu dentro de um cartão (rótulo à esquerda, info à direita). */
export function ItemMenu({
  titulo,
  info,
  onPress,
  borda = true,
  mono,
  direita,
  cor,
}: {
  titulo: string;
  info?: string;
  onPress?: () => void;
  borda?: boolean;
  mono?: boolean;
  direita?: ReactNode;
  cor?: string;
}) {
  const estilo: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 46,
    borderBottomWidth: borda ? 1 : 0,
    borderBottomColor: cores.borda,
    gap: 12,
  };
  const conteudo = (
    <>
      <Texto tam={15} cor={cor} style={{ flexShrink: 1 }}>
        {titulo}
      </Texto>
      {direita ??
        (info ? (
          <Texto tam={13} mono={mono} cor={cores.textoApoio}>
            {info}
          </Texto>
        ) : null)}
    </>
  );
  if (!onPress) return <View style={estilo}>{conteudo}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [estilo, pressed && { opacity: 0.6 }]}>
      {conteudo}
    </Pressable>
  );
}

export function Vazio({ texto, acao }: { texto: string; acao?: { rotulo: string; onPress: () => void } }) {
  return (
    <View style={{ paddingVertical: 18, gap: 4 }}>
      <Apoio tam={14} altura={1.45}>
        {texto}
      </Apoio>
      {acao ? <Link rotulo={acao.rotulo} onPress={acao.onPress} /> : null}
    </View>
  );
}

export const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center' },
  entre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
