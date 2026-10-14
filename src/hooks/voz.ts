import { requireOptionalNativeModule } from 'expo';
import type { ExpoSpeechRecognitionModule as Modulo } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';

// O reconhecimento de voz é nativo: no Expo Go ele não existe e o app cai
// para o modo texto. Em builds de desenvolvimento e de loja funciona normal.
const voz = requireOptionalNativeModule<typeof Modulo>('ExpoSpeechRecognition');

export const vozDisponivel = !!voz;

export function useVoz(onFinal: (texto: string) => void) {
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const finalRef = useRef(onFinal);
  useEffect(() => {
    finalRef.current = onFinal;
  });

  useEffect(() => {
    if (!voz) return;
    const subs = [
      voz.addListener('start', () => setOuvindo(true)),
      voz.addListener('end', () => setOuvindo(false)),
      voz.addListener('result', (e) => {
        const texto = e.results[0]?.transcript ?? '';
        setParcial(texto);
        if (e.isFinal && texto) finalRef.current(texto);
      }),
      voz.addListener('error', (e) => {
        setOuvindo(false);
        if (e.error === 'no-speech' || e.error === 'speech-timeout') setErro('Não ouvi nada. Toque no microfone e fale de novo.');
        else if (e.error !== 'aborted') setErro('Não deu para ouvir agora. Tente de novo ou use o modo texto.');
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      voz.abort();
    };
  }, []);

  const ouvir = useCallback(async () => {
    if (!voz) {
      setErro('Registro por voz disponível no app instalado. Use o modo texto.');
      return;
    }
    setErro(null);
    setParcial('');
    const perm = await voz.requestPermissionsAsync();
    if (!perm.granted) {
      setErro('Permita o microfone nos ajustes do celular para registrar falando.');
      return;
    }
    voz.start({ lang: 'pt-BR', interimResults: true, continuous: false, addsPunctuation: false });
  }, []);

  const parar = useCallback(() => voz?.stop(), []);

  return { ouvindo, parcial, erro, ouvir, parar, disponivel: vozDisponivel };
}
