import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, RotateCcw, Sparkles } from 'lucide-react';
import type { FalloEnPartida, InteraccionPartida } from '../../types/firestore';
import type { GameCompletionResult, NeonHtmlPayload } from '../../types/studyMaterial';

interface NeonHtmlGameProps {
  payload: NeonHtmlPayload;
  onComplete: (result: GameCompletionResult) => void;
}

interface NeonMessagePayload {
  source?: string;
  completed?: boolean;
  puntuacion?: unknown;
  aciertos?: unknown;
  total?: unknown;
  fallos?: unknown;
  interacciones?: unknown;
}

function normalizeFallos(raw: unknown): FalloEnPartida[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      concepto: typeof item.concepto === 'string' ? item.concepto : 'Concepto de la partida',
      detalle: typeof item.detalle === 'string' ? item.detalle : '',
      respuesta_alumno:
        typeof item.respuesta_alumno === 'string' ? item.respuesta_alumno : undefined,
      respuesta_correcta:
        typeof item.respuesta_correcta === 'string' ? item.respuesta_correcta : undefined,
    }));
}

function normalizeInteracciones(raw: unknown): InteraccionPartida[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      item: typeof item.item === 'string' ? item.item : 'Reto',
      respuesta_alumno:
        typeof item.respuesta_alumno === 'string' ? item.respuesta_alumno : '—',
      respuesta_correcta:
        typeof item.respuesta_correcta === 'string' ? item.respuesta_correcta : undefined,
      correcto: Boolean(item.correcto),
      explicacion: typeof item.explicacion === 'string' ? item.explicacion : undefined,
    }));
}

export function NeonHtmlGame({ payload, onComplete }: NeonHtmlGameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const reportedRef = useRef(false);

  useEffect(() => {
    reportedRef.current = false;
  }, [iframeKey, payload.html_completo]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as NeonMessagePayload | null;
      if (!data || data.source !== 'tutor-pablo-neon' || !data.completed) return;
      if (reportedRef.current) return;

      reportedRef.current = true;
      const total =
        typeof data.total === 'number' && data.total > 0 ? Math.round(data.total) : 1;
      const aciertos =
        typeof data.aciertos === 'number'
          ? Math.max(0, Math.min(total, Math.round(data.aciertos)))
          : 0;
      const puntuacion =
        typeof data.puntuacion === 'number'
          ? Math.max(0, Math.min(100, Math.round(data.puntuacion)))
          : Math.round((aciertos / total) * 100);

      onComplete({
        puntuacion,
        aciertos,
        total,
        fallos: normalizeFallos(data.fallos),
        interacciones: normalizeInteracciones(data.interacciones),
      });
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete]);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-slate-900/95 p-3 sm:p-4'
          : 'overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/80 p-2.5 shadow-sm'
      }
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 font-bold text-indigo-800">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            HTML5 INTERACTIVO · WOW
          </span>
          {payload.estilo_mecanica && (
            <span className="font-semibold text-slate-600">
              {payload.estilo_mecanica}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reiniciar juego
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 font-bold text-white hover:bg-indigo-700"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                Salir
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                Pantalla completa
              </>
            )}
          </button>
        </div>
      </div>

      <iframe
        key={iframeKey}
        ref={iframeRef}
        title={payload.titulo}
        srcDoc={payload.html_completo}
        sandbox="allow-scripts"
        className={`w-full rounded-xl border border-indigo-200 bg-white ${
          isFullscreen ? 'flex-1' : 'h-[620px] sm:h-[680px]'
        }`}
      />
    </div>
  );
}
