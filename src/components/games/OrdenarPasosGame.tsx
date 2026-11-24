import { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { FalloEnPartida, InteraccionPartida } from '../../types/firestore';
import type {
  GameCompletionResult,
  OrdenarPasosPayload,
  PasoOrdenar,
} from '../../types/studyMaterial';

interface OrdenarPasosGameProps {
  payload: OrdenarPasosPayload;
  onComplete: (result: GameCompletionResult) => void;
}

function shuffleNotInOrder(items: readonly PasoOrdenar[]): PasoOrdenar[] {
  const copy = [...items];
  if (copy.length < 2) return copy;

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  const isAlreadyOrdered = copy.every((step, idx) => step.id === items[idx].id);
  if (isAlreadyOrdered) {
    [copy[0], copy[copy.length - 1]] = [copy[copy.length - 1], copy[0]];
  }

  return copy;
}

export function OrdenarPasosGame({ payload, onComplete }: OrdenarPasosGameProps) {
  const secuencias = payload.secuencias;
  const [seqIndex, setSeqIndex] = useState(0);
  const [orderedSteps, setOrderedSteps] = useState<PasoOrdenar[]>(() =>
    secuencias[0] ? shuffleNotInOrder(secuencias[0].pasos_orden_correcto) : [],
  );
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [aciertos, setAciertos] = useState(0);
  const [fallos, setFallos] = useState<FalloEnPartida[]>([]);
  const [interacciones, setInteracciones] = useState<InteraccionPartida[]>([]);

  if (secuencias.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
        No hay secuencias disponibles en este reto.
      </div>
    );
  }

  const sequence = secuencias[seqIndex];
  const correctSteps = sequence.pasos_orden_correcto;

  function swapPositions(posA: number, posB: number) {
    setOrderedSteps((prev) => {
      const next = [...prev];
      [next[posA], next[posB]] = [next[posB], next[posA]];
      return next;
    });
  }

  function handleMove(pos: number, delta: -1 | 1) {
    if (checked) return;
    const target = pos + delta;
    if (target < 0 || target >= orderedSteps.length) return;
    swapPositions(pos, target);
    setSelectedPos(null);
  }

  function handleTapRow(pos: number) {
    if (checked) return;
    if (selectedPos === null) {
      setSelectedPos(pos);
      return;
    }
    if (selectedPos === pos) {
      setSelectedPos(null);
      return;
    }
    swapPositions(selectedPos, pos);
    setSelectedPos(null);
  }

  function handleCheck() {
    const isSequenceCorrect = orderedSteps.every(
      (step, pos) => correctSteps[pos]?.id === step.id,
    );
    setChecked(true);
    setSelectedPos(null);

    setInteracciones((prev) => [
      ...prev,
      {
        item: sequence.enunciado,
        respuesta_alumno: orderedSteps.map((s) => s.texto).join(' -> '),
        respuesta_correcta: correctSteps.map((s) => s.texto).join(' -> '),
        correcto: isSequenceCorrect,
        explicacion: sequence.explicacion_final,
      },
    ]);

    if (isSequenceCorrect) {
      setAciertos((prev) => prev + 1);
    } else {
      setFallos((prev) => [
        ...prev,
        {
          concepto: sequence.concepto_clave || sequence.enunciado,
          detalle: sequence.explicacion_final,
          respuesta_alumno: orderedSteps.map((s) => s.texto).join(' -> '),
          respuesta_correcta: correctSteps.map((s) => s.texto).join(' -> '),
        },
      ]);
    }
  }

  function handleNext() {
    if (seqIndex + 1 >= secuencias.length) {
      const puntuacion = Math.round((aciertos / secuencias.length) * 100);
      onComplete({
        puntuacion,
        aciertos,
        total: secuencias.length,
        fallos,
        interacciones,
      });
      return;
    }

    const nextIdx = seqIndex + 1;
    setSeqIndex(nextIdx);
    setOrderedSteps(shuffleNotInOrder(secuencias[nextIdx].pasos_orden_correcto));
    setSelectedPos(null);
    setChecked(false);
  }

  const allStepsCorrect =
    checked && orderedSteps.every((step, pos) => correctSteps[pos]?.id === step.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-600">
        <span>
          Secuencia {seqIndex + 1} de {secuencias.length}
        </span>
        {sequence.es_repaso_libreta && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            <Sparkles className="h-3.5 w-3.5" />
            Repaso Libreta
          </span>
        )}
      </div>

      <h3 className="text-lg font-bold text-slate-900">{sequence.enunciado}</h3>
      {!checked && (
        <p className="text-xs text-slate-500">
          Usa las flechas para subir/bajar un paso o toca dos tarjetas para intercambiarlas.
        </p>
      )}

      <div className="space-y-2.5">
        {orderedSteps.map((step, pos) => {
          const isStepCorrect = correctSteps[pos]?.id === step.id;
          const isSelected = selectedPos === pos;

          let cardClass = 'border-slate-300 bg-white';
          if (checked) {
            cardClass = isStepCorrect
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-rose-400 bg-rose-50';
          } else if (isSelected) {
            cardClass = 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200';
          }

          return (
            <div
              key={step.id}
              role="button"
              tabIndex={checked ? -1 : 0}
              onClick={() => handleTapRow(pos)}
              onKeyDown={(ev) => {
                if (!checked && (ev.key === 'Enter' || ev.key === ' ')) {
                  ev.preventDefault();
                  handleTapRow(pos);
                }
              }}
              className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3.5 transition-colors ${
                checked ? '' : 'cursor-pointer'
              } ${cardClass}`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                  {pos + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 sm:text-base">
                    {step.texto}
                  </p>
                  {checked && !isStepCorrect && (
                    <p className="mt-1 text-xs font-medium text-rose-700">
                      Aquí correspondía: {correctSteps[pos]?.texto}
                    </p>
                  )}
                </div>
              </div>

              {!checked ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Subir paso"
                    disabled={pos === 0}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleMove(pos, -1);
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-35"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Bajar paso"
                    disabled={pos === orderedSteps.length - 1}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleMove(pos, 1);
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-35"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              ) : isStepCorrect ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
              )}
            </div>
          );
        })}
      </div>

      {!checked ? (
        <button
          type="button"
          onClick={handleCheck}
          className="flex min-h-14 w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          Comprobar orden
        </button>
      ) : (
        <div className="space-y-3">
          <div
            className={`rounded-xl border p-4 text-sm ${
              allStepsCorrect
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            <p className="font-bold">
              {allStepsCorrect
                ? '¡Secuencia ordenada a la perfección!'
                : 'Revisa el orden correcto antes de continuar:'}
            </p>
            <p className="mt-1">{sequence.explicacion_final}</p>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            {seqIndex + 1 < secuencias.length ? 'Siguiente secuencia' : 'Ver resultado final'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
