import { useState } from 'react';
import { ArrowRight, CheckCircle2, Flame, HelpCircle, Sparkles, XCircle } from 'lucide-react';
import type { FalloEnPartida, InteraccionPartida } from '../../types/firestore';
import type { GameCompletionResult, TriviaRetoPayload } from '../../types/studyMaterial';

interface TriviaRetoGameProps {
  payload: TriviaRetoPayload;
  onComplete: (result: GameCompletionResult) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

export function TriviaRetoGame({ payload, onComplete }: TriviaRetoGameProps) {
  const questions = payload.preguntas;
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [fallos, setFallos] = useState<FalloEnPartida[]>([]);
  const [interacciones, setInteracciones] = useState<InteraccionPartida[]>([]);

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
        No hay preguntas disponibles en este reto.
      </div>
    );
  }

  const question = questions[index];
  const progressPct = Math.round((index / questions.length) * 100);
  const hasAnswered = selectedOption !== null;
  const isCorrect = selectedOption === question.indice_correcto;

  function handleSelectOption(optIndex: number) {
    if (hasAnswered) return;
    setSelectedOption(optIndex);

    const isHit = optIndex === question.indice_correcto;
    setInteracciones((prev) => [
      ...prev,
      {
        item: question.pregunta,
        respuesta_alumno: question.opciones[optIndex] ?? '',
        respuesta_correcta: question.opciones[question.indice_correcto] ?? '',
        correcto: isHit,
        explicacion: question.explicacion,
      },
    ]);

    if (isHit) {
      setAciertos((prev) => prev + 1);
      setStreak((prev) => prev + 1);
    } else {
      setStreak(0);
      setFallos((prev) => [
        ...prev,
        {
          concepto: question.concepto_clave || question.pregunta,
          detalle: question.explicacion,
          respuesta_alumno: question.opciones[optIndex],
          respuesta_correcta: question.opciones[question.indice_correcto],
        },
      ]);
    }
  }

  function handleNext() {
    if (index + 1 >= questions.length) {
      const puntuacion = Math.round((aciertos / questions.length) * 100);
      onComplete({
        puntuacion,
        aciertos,
        total: questions.length,
        fallos,
        interacciones,
      });
      return;
    }

    setIndex((prev) => prev + 1);
    setSelectedOption(null);
    setShowHint(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-600">
        <span>
          Pregunta {index + 1} de {questions.length}
        </span>
        <div className="flex items-center gap-2">
          {question.es_repaso_libreta && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              <Sparkles className="h-3.5 w-3.5" />
              Repaso Libreta
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-700">
            <Flame className="h-3.5 w-3.5" />
            Racha: {streak}
          </span>
        </div>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{question.pregunta}</h3>

      <div className="space-y-2.5">
        {question.opciones.map((option, optIndex) => {
          let buttonStyle =
            'border-slate-300 bg-white text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40';

          if (hasAnswered) {
            if (optIndex === question.indice_correcto) {
              buttonStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900';
            } else if (optIndex === selectedOption) {
              buttonStyle = 'border-rose-500 bg-rose-50 text-rose-900';
            } else {
              buttonStyle = 'border-slate-200 bg-slate-50 text-slate-500';
            }
          }

          return (
            <button
              key={`${question.id}_opt_${optIndex}`}
              type="button"
              disabled={hasAnswered}
              onClick={() => handleSelectOption(optIndex)}
              className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-medium transition-colors ${buttonStyle}`}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                  {OPTION_LETTERS[optIndex] ?? optIndex + 1}
                </span>
                <span>{option}</span>
              </span>
              {hasAnswered && optIndex === question.indice_correcto && (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              )}
              {hasAnswered &&
                optIndex === selectedOption &&
                optIndex !== question.indice_correcto && (
                  <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                )}
            </button>
          );
        })}
      </div>

      {!hasAnswered && question.pista && (
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => setShowHint((prev) => !prev)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <HelpCircle className="h-4 w-4 text-amber-600" />
            {showHint ? 'Ocultar pista' : 'Pedir una pista'}
          </button>
          {showHint && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
              {question.pista}
            </div>
          )}
        </div>
      )}

      {hasAnswered && (
        <div className="space-y-3 pt-1">
          <div
            className={`rounded-xl border p-4 text-sm ${
              isCorrect
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            <p className="font-bold">
              {isCorrect ? '¡Respuesta correcta!' : 'No era esa opción.'}
            </p>
            <p className="mt-1">{question.explicacion}</p>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            {index + 1 < questions.length ? 'Siguiente pregunta' : 'Ver resultado final'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
