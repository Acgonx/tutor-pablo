import { useState } from 'react';
import { Check, HelpCircle, RotateCw, Sparkles, X } from 'lucide-react';
import type { FalloEnPartida, InteraccionPartida } from '../../types/firestore';
import type { FlashcardsPayload, GameCompletionResult } from '../../types/studyMaterial';
import { MathText } from '../common/MathText';
import { VisualFigureRenderer } from '../common/VisualFigureRenderer';

interface FlashcardsGameProps {
  payload: FlashcardsPayload;
  onComplete: (result: GameCompletionResult) => void;
}

export function FlashcardsGame({ payload, onComplete }: FlashcardsGameProps) {
  const cards = payload.tarjetas;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [aciertos, setAciertos] = useState(0);
  const [fallos, setFallos] = useState<FalloEnPartida[]>([]);
  const [interacciones, setInteracciones] = useState<InteraccionPartida[]>([]);

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
        No hay tarjetas disponibles en este reto.
      </div>
    );
  }

  const card = cards[index];
  const progressPct = Math.round((index / cards.length) * 100);

  function handleGrade(knewIt: boolean) {
    const nextAciertos = knewIt ? aciertos + 1 : aciertos;
    const nextFallos = knewIt
      ? fallos
      : [
          ...fallos,
          {
            concepto: card.concepto_clave || card.frente,
            detalle: card.reverso,
          },
        ];

    const nextInteracciones: InteraccionPartida[] = [
      ...interacciones,
      {
        item: card.frente,
        respuesta_alumno: knewIt ? 'Marcada como sabida' : 'Marcada para repasar',
        respuesta_correcta: card.reverso,
        correcto: knewIt,
      },
    ];

    if (index + 1 >= cards.length) {
      const puntuacion = Math.round((nextAciertos / cards.length) * 100);
      onComplete({
        puntuacion,
        aciertos: nextAciertos,
        total: cards.length,
        fallos: nextFallos,
        interacciones: nextInteracciones,
      });
      return;
    }

    setAciertos(nextAciertos);
    setFallos(nextFallos);
    setInteracciones(nextInteracciones);
    setIndex((prev) => prev + 1);
    setFlipped(false);
    setShowHint(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-600">
        <span>
          Tarjeta {index + 1} de {cards.length}
        </span>
        <div className="flex items-center gap-2">
          {card.es_repaso_libreta && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              <Sparkles className="h-3.5 w-3.5" />
              Repaso Libreta
            </span>
          )}
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            Aciertos: {aciertos}
          </span>
        </div>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((prev) => !prev)}
        className={`flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border-2 p-6 text-center shadow-sm transition-colors ${
          flipped
            ? 'border-emerald-300 bg-gradient-to-b from-white to-emerald-50'
            : 'border-indigo-200 bg-gradient-to-b from-white to-indigo-50/70'
        }`}
      >
        <span className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
          <RotateCw className="h-3.5 w-3.5" />
          {flipped ? 'Respuesta (toca para girar)' : 'Pregunta (toca para revelar)'}
        </span>
        <p className="text-lg font-bold text-slate-900 sm:text-xl">
          <MathText text={flipped ? card.reverso : card.frente} />
        </p>
        {card.recurso_visual && (
          <div className="mt-3 w-full max-w-md" onClick={(ev) => ev.stopPropagation()}>
            <VisualFigureRenderer spec={card.recurso_visual} showSolution={flipped} />
          </div>
        )}
        {flipped && card.concepto_clave && (
          <span className="mt-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            Concepto clave: <MathText text={card.concepto_clave} />
          </span>
        )}
      </button>

      {!flipped && card.pista && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowHint((prev) => !prev)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <HelpCircle className="h-4 w-4 text-amber-600" />
            {showHint ? 'Ocultar pista' : 'Necesito una pista'}
          </button>
          {showHint && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
              <MathText text={card.pista} />
            </div>
          )}
        </div>
      )}

      {flipped && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleGrade(false)}
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-rose-700 active:scale-[0.99]"
          >
            <X className="h-5 w-5" />
            Fallé · Repasar
          </button>
          <button
            type="button"
            onClick={() => handleGrade(true)}
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99]"
          >
            <Check className="h-5 w-5" />
            ¡La sabía!
          </button>
        </div>
      )}
    </div>
  );
}
