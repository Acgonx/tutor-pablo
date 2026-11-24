import { useState } from 'react';
import {
  CheckCircle2,
  CloudCheck,
  Loader2,
  Printer,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react';
import type { TipoJuego } from '../../types/firestore';
import type { GameCompletionResult, GamePayload } from '../../types/studyMaterial';
import { CazaErrorGame } from './CazaErrorGame';
import { ClasificarGame } from './ClasificarGame';
import { FlashcardsGame } from './FlashcardsGame';
import { OrdenarPasosGame } from './OrdenarPasosGame';
import { TriviaRetoGame } from './TriviaRetoGame';

const GAME_LABELS: Record<TipoJuego, string> = {
  flashcards: 'Flashcards · Active Recall',
  clasificar: 'Clasificar · Tap to Place',
  trivia_reto: 'Trivia Reto',
  caza_error: '¡Caza al Error! · Detective',
  ordenar_pasos: 'Ordenar Pasos',
};

interface GameRendererProps {
  asignatura: string;
  titulo: string;
  payload: GamePayload;
  mode: 'preview' | 'student';
  onComplete?: (result: GameCompletionResult) => Promise<void> | void;
  savingStatus?: 'idle' | 'saving' | 'saved' | 'error';
  savingError?: string | null;
}

export function GameRenderer({
  asignatura,
  titulo,
  payload,
  mode,
  onComplete,
  savingStatus = 'idle',
  savingError = null,
}: GameRendererProps) {
  const [playKey, setPlayKey] = useState(0);
  const [result, setResult] = useState<GameCompletionResult | null>(null);
  const [completedDateLabel, setCompletedDateLabel] = useState('');

  function handleGameComplete(gameResult: GameCompletionResult) {
    setCompletedDateLabel(new Date().toLocaleDateString('es-ES'));
    setResult(gameResult);
    if (onComplete) {
      void onComplete(gameResult);
    }
  }

  function handleRestart() {
    setResult(null);
    setCompletedDateLabel('');
    setPlayKey((prev) => prev + 1);
  }

  return (
    <div className="space-y-4">
      <div className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-800">
            {asignatura}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-700">
            {GAME_LABELS[payload.tipo_juego]}
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">{titulo || payload.titulo}</h2>
        {payload.instrucciones && (
          <p className="mt-1 text-sm text-slate-600">{payload.instrucciones}</p>
        )}
      </div>

      {!result ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {payload.tipo_juego === 'flashcards' && (
            <FlashcardsGame
              key={`fc_${playKey}`}
              payload={payload}
              onComplete={handleGameComplete}
            />
          )}
          {payload.tipo_juego === 'clasificar' && (
            <ClasificarGame
              key={`cl_${playKey}`}
              payload={payload}
              onComplete={handleGameComplete}
            />
          )}
          {payload.tipo_juego === 'trivia_reto' && (
            <TriviaRetoGame
              key={`tr_${playKey}`}
              payload={payload}
              onComplete={handleGameComplete}
            />
          )}
          {payload.tipo_juego === 'caza_error' && (
            <CazaErrorGame
              key={`ce_${playKey}`}
              payload={payload}
              onComplete={handleGameComplete}
            />
          )}
          {payload.tipo_juego === 'ordenar_pasos' && (
            <OrdenarPasosGame
              key={`or_${playKey}`}
              payload={payload}
              onComplete={handleGameComplete}
            />
          )}
        </div>
      ) : (
        <div className="print-sheet space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="print-only border-b border-slate-300 pb-3">
            <p className="text-xs font-bold text-slate-500 uppercase">
              Informe de Interacciones · {asignatura} · {GAME_LABELS[payload.tipo_juego]}
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              {titulo || payload.titulo}
            </h2>
            <p className="text-xs text-slate-600">
              Alumno: Pablo · Fecha: {completedDateLabel}
            </p>
          </div>

          <div className="text-center">
            <div className="no-print mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <Trophy className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold tracking-wide text-slate-500 uppercase">
              ¡Reto terminado!
            </p>
            <p
              className={`mt-1 text-5xl font-extrabold ${
                result.puntuacion >= 80
                  ? 'text-emerald-600'
                  : result.puntuacion >= 50
                    ? 'text-amber-600'
                    : 'text-rose-600'
              }`}
            >
              {result.puntuacion}%
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Has conseguido {result.aciertos} de {result.total} aciertos
            </p>
          </div>

          {mode === 'student' && (
            <div className="no-print rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
              {savingStatus === 'saving' && (
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  Guardando tu puntuación e interacciones en Firestore...
                </div>
              )}
              {savingStatus === 'saved' && (
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <CloudCheck className="h-4 w-4" />
                  Resultado e interacciones guardados correctamente.
                </div>
              )}
              {savingStatus === 'error' && (
                <p className="font-medium text-rose-700">
                  {savingError || 'No se pudo guardar el resultado en la nube.'}
                </p>
              )}
            </div>
          )}

          {result.interacciones.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold text-slate-900">
                Detalle completo de respuestas ({result.interacciones.length})
              </h3>
              <div className="space-y-2">
                {result.interacciones.map((inter, idx) => (
                  <div
                    key={idx}
                    className={`print-avoid-break print-preserve-color rounded-xl border p-3 text-xs ${
                      inter.correcto
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                        : 'border-rose-200 bg-rose-50/70 text-rose-950'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {inter.correcto ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      )}
                      <div className="space-y-0.5">
                        <p className="font-bold">
                          {idx + 1}. {inter.item}
                        </p>
                        <p>
                          <strong>Respuesta de Pablo:</strong> {inter.respuesta_alumno}
                        </p>
                        {!inter.correcto && inter.respuesta_correcta && (
                          <p className="font-semibold text-emerald-800">
                            <strong>Correcta:</strong> {inter.respuesta_correcta}
                          </p>
                        )}
                        {inter.explicacion && (
                          <p className="text-slate-700">{inter.explicacion}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="no-print grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-800 hover:bg-slate-50"
            >
              <Printer className="h-5 w-5" />
              Imprimir informe PDF
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <RotateCcw className="h-5 w-5" />
              Volver a jugar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
