import { useState } from 'react';
import { CheckCircle2, CloudCheck, Loader2, RotateCcw, Trophy } from 'lucide-react';
import type { TipoJuego } from '../../types/firestore';
import type { GameCompletionResult, GamePayload } from '../../types/studyMaterial';
import { ClasificarGame } from './ClasificarGame';
import { FlashcardsGame } from './FlashcardsGame';
import { OrdenarPasosGame } from './OrdenarPasosGame';
import { TriviaRetoGame } from './TriviaRetoGame';

const GAME_LABELS: Record<TipoJuego, string> = {
  flashcards: 'Flashcards · Active Recall',
  clasificar: 'Clasificar · Tap to Place',
  trivia_reto: 'Trivia Reto',
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

  function handleGameComplete(gameResult: GameCompletionResult) {
    setResult(gameResult);
    if (onComplete) {
      void onComplete(gameResult);
    }
  }

  function handleRestart() {
    setResult(null);
    setPlayKey((prev) => prev + 1);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
          {payload.tipo_juego === 'ordenar_pasos' && (
            <OrdenarPasosGame
              key={`or_${playKey}`}
              payload={payload}
              onComplete={handleGameComplete}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
              {savingStatus === 'saving' && (
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  Guardando tu puntuación y actualizando la libreta de repaso...
                </div>
              )}
              {savingStatus === 'saved' && (
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <CloudCheck className="h-4 w-4" />
                  Resultado guardado correctamente.
                  {result.fallos.length > 0
                    ? ' Los fallos se han añadido a tu libreta para repasarlos más adelante.'
                    : ''}
                </div>
              )}
              {savingStatus === 'error' && (
                <p className="font-medium text-rose-700">
                  {savingError || 'No se pudo guardar el resultado en la nube.'}
                </p>
              )}
            </div>
          )}

          {result.fallos.length > 0 ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <h3 className="text-sm font-bold text-rose-900">
                Conceptos que conviene repasar ({result.fallos.length}):
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-rose-900">
                {result.fallos.map((fallo, idx) => (
                  <li
                    key={`${fallo.concepto}_${idx}`}
                    className="rounded-lg bg-white/80 p-3 ring-1 ring-rose-200"
                  >
                    <p className="font-bold">{fallo.concepto}</p>
                    <p className="mt-0.5 text-slate-700">{fallo.detalle}</p>
                    {fallo.respuesta_correcta && (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">
                        Respuesta correcta: {fallo.respuesta_correcta}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ¡Pleno sin errores! Dominas este bloque.
            </div>
          )}

          <button
            type="button"
            onClick={handleRestart}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            <RotateCcw className="h-5 w-5" />
            Volver a jugar
          </button>
        </div>
      )}
    </div>
  );
}
