import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  SearchAlert,
  Shield,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { FalloEnPartida, InteraccionPartida } from '../../types/firestore';
import type { CazaErrorPayload, GameCompletionResult } from '../../types/studyMaterial';

interface CazaErrorGameProps {
  payload: CazaErrorPayload;
  onComplete: (result: GameCompletionResult) => void;
}

export function CazaErrorGame({ payload, onComplete }: CazaErrorGameProps) {
  const casos = payload.casos;
  const [index, setIndex] = useState(0);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [shields, setShields] = useState(3);
  const [aciertos, setAciertos] = useState(0);
  const [fallos, setFallos] = useState<FalloEnPartida[]>([]);
  const [interacciones, setInteracciones] = useState<InteraccionPartida[]>([]);

  if (casos.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
        No hay casos disponibles en este reto.
      </div>
    );
  }

  const caso = casos[index];
  const progressPct = Math.round((index / casos.length) * 100);
  const hasAnswered = chosenIndex !== null;
  const caughtTrap = chosenIndex === caso.indice_error;

  function handlePickStatement(optIndex: number) {
    if (hasAnswered) return;
    setChosenIndex(optIndex);

    const isHit = optIndex === caso.indice_error;
    const chosenText = caso.afirmaciones[optIndex] ?? '';
    const trapText = caso.afirmaciones[caso.indice_error] ?? '';

    setInteracciones((prev) => [
      ...prev,
      {
        item: caso.contexto,
        respuesta_alumno: chosenText,
        respuesta_correcta: `Trampa real: ${trapText}`,
        correcto: isHit,
        explicacion: caso.explicacion_correccion,
      },
    ]);

    if (isHit) {
      setAciertos((prev) => prev + 1);
      setStreak((prev) => prev + 1);
    } else {
      setStreak(0);
      setShields((prev) => Math.max(0, prev - 1));
      setFallos((prev) => [
        ...prev,
        {
          concepto: caso.concepto_clave || caso.contexto,
          detalle: caso.explicacion_correccion,
          respuesta_alumno: chosenText,
          respuesta_correcta: trapText,
        },
      ]);
    }
  }

  function handleNext() {
    if (index + 1 >= casos.length) {
      const puntuacion = Math.round((aciertos / casos.length) * 100);
      onComplete({
        puntuacion,
        aciertos,
        total: casos.length,
        fallos,
        interacciones,
      });
      return;
    }

    setIndex((prev) => prev + 1);
    setChosenIndex(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <SearchAlert className="h-4 w-4 text-indigo-600" />
          Caso {index + 1} de {casos.length}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {caso.es_repaso_libreta && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              <Sparkles className="h-3.5 w-3.5" />
              Repaso
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-700">
            <Flame className="h-3.5 w-3.5" />
            Racha: {streak}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
            <Shield className="h-3.5 w-3.5" />
            Escudos: {shields}/3
          </span>
        </div>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
        <p className="text-xs font-bold tracking-wide text-indigo-700 uppercase">
          Misión de detective: toca la única afirmación con trampa o error
        </p>
        <h3 className="mt-1 text-lg font-bold text-slate-900">{caso.contexto}</h3>
      </div>

      <div className="space-y-2.5">
        {caso.afirmaciones.map((statement, optIndex) => {
          let style =
            'border-slate-300 bg-white text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40';

          if (hasAnswered) {
            if (optIndex === caso.indice_error) {
              style = caughtTrap
                ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                : 'border-amber-500 bg-amber-50 text-amber-950';
            } else if (optIndex === chosenIndex) {
              style = 'border-rose-500 bg-rose-50 text-rose-950';
            } else {
              style = 'border-slate-200 bg-slate-50 text-slate-500';
            }
          }

          return (
            <button
              key={`${caso.id}_st_${optIndex}`}
              type="button"
              disabled={hasAnswered}
              onClick={() => handlePickStatement(optIndex)}
              className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-medium transition-colors ${style}`}
            >
              <span className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-700">
                  {optIndex + 1}
                </span>
                <span>{statement}</span>
              </span>

              {hasAnswered && optIndex === caso.indice_error && (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              )}
              {hasAnswered &&
                optIndex === chosenIndex &&
                optIndex !== caso.indice_error && (
                  <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                )}
            </button>
          );
        })}
      </div>

      {hasAnswered && (
        <div className="space-y-3 pt-1">
          <div
            className={`rounded-xl border p-4 text-sm ${
              caughtTrap
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                : 'border-rose-200 bg-rose-50 text-rose-950'
            }`}
          >
            <p className="font-bold">
              {caughtTrap
                ? '¡Trampa cazada! Ojo de detective.'
                : '¡Esa era correcta! La trampa estaba en la opción marcada en amarillo.'}
            </p>
            <p className="mt-1">{caso.explicacion_correccion}</p>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            {index + 1 < casos.length ? 'Siguiente caso' : 'Ver informe final'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
