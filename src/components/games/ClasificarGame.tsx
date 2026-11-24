import { useState } from 'react';
import { CheckCircle2, Sparkles, Undo2, XCircle } from 'lucide-react';
import type { FalloEnPartida, InteraccionPartida } from '../../types/firestore';
import type { ClasificarPayload, GameCompletionResult } from '../../types/studyMaterial';
import { MathText } from '../common/MathText';

interface ClasificarGameProps {
  payload: ClasificarPayload;
  onComplete: (result: GameCompletionResult) => void;
}

export function ClasificarGame({ payload, onComplete }: ClasificarGameProps) {
  const { categorias, elementos } = payload;
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  if (categorias.length === 0 || elementos.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
        No hay categorías o elementos suficientes para este reto.
      </div>
    );
  }

  const unassigned = elementos.filter((el) => !placements[el.id]);
  const allPlaced = unassigned.length === 0;
  const categoryNameById = new Map(categorias.map((c) => [c.id, c.nombre]));

  function handlePlaceInCategory(categoryId: string) {
    if (checked || !selectedId) return;
    setPlacements((prev) => ({
      ...prev,
      [selectedId]: categoryId,
    }));
    setSelectedId(null);
  }

  function handleUnplace(elementId: string) {
    if (checked) return;
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[elementId];
      return next;
    });
    setSelectedId(elementId);
  }

  function handleFinish() {
    let aciertos = 0;
    const fallos: FalloEnPartida[] = [];
    const interacciones: InteraccionPartida[] = [];

    for (const el of elementos) {
      const chosenCatId = placements[el.id];
      const chosenName = categoryNameById.get(chosenCatId) ?? 'Sin clasificar';
      const correctName = categoryNameById.get(el.categoria_correcta_id) ?? '';
      const isOk = chosenCatId === el.categoria_correcta_id;

      interacciones.push({
        item: el.texto,
        respuesta_alumno: chosenName,
        respuesta_correcta: correctName,
        correcto: isOk,
        explicacion: el.explicacion,
      });

      if (isOk) {
        aciertos += 1;
      } else {
        fallos.push({
          concepto: el.texto,
          detalle: el.explicacion,
          respuesta_alumno: chosenName,
          respuesta_correcta: correctName,
        });
      }
    }

    const puntuacion = Math.round((aciertos / elementos.length) * 100);
    onComplete({
      puntuacion,
      aciertos,
      total: elementos.length,
      fallos,
      interacciones,
    });
  }

  const correctCount = checked
    ? elementos.filter((el) => placements[el.id] === el.categoria_correcta_id).length
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-600">
        <span>
          Colocados: {elementos.length - unassigned.length} de {elementos.length}
        </span>
        {!checked && (
          <span className="text-xs text-slate-500">
            Toca una tarjeta y luego toca su caja de destino
          </span>
        )}
      </div>

      {!checked && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-bold tracking-wide text-slate-500 uppercase">
            Tarjetas por clasificar
          </p>
          {unassigned.length === 0 ? (
            <p className="text-sm font-semibold text-emerald-700">
              ¡Todas las tarjetas colocadas! Pulsa «Comprobar clasificación» abajo.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {unassigned.map((el) => {
                const isSelected = selectedId === el.id;
                return (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : el.id)}
                    className={`flex min-h-12 items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-left text-sm font-semibold transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-300 bg-white text-slate-800 hover:border-indigo-400'
                    }`}
                  >
                    <span>
                      <MathText text={el.texto} />
                    </span>
                    {el.es_repaso_libreta && (
                      <Sparkles
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isSelected ? 'text-amber-200' : 'text-amber-500'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {categorias.map((cat) => {
          const placedItems = elementos.filter((el) => placements[el.id] === cat.id);
          const readyToReceive = Boolean(selectedId) && !checked;

          return (
            <div
              key={cat.id}
              role="button"
              tabIndex={0}
              onClick={() => handlePlaceInCategory(cat.id)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  handlePlaceInCategory(cat.id);
                }
              }}
              className={`min-h-40 rounded-2xl border-2 p-4 transition-colors ${
                readyToReceive
                  ? 'cursor-pointer border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-200'
                  : 'border-dashed border-slate-300 bg-white'
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    <MathText text={cat.nombre} />
                  </h4>
                  <p className="text-xs text-slate-600">
                    <MathText text={cat.descripcion} />
                  </p>
                </div>
                {readyToReceive && (
                  <span className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
                    Colocar aquí
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {placedItems.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    {readyToReceive ? 'Toca esta caja para colocar' : 'Sin elementos aún'}
                  </p>
                ) : (
                  placedItems.map((item) => {
                    const isCorrect = item.categoria_correcta_id === cat.id;

                    if (!checked) {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleUnplace(item.id);
                          }}
                          className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-100"
                        >
                          <span>
                            <MathText text={item.texto} />
                          </span>
                          <Undo2 className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-3 text-sm ${
                          isCorrect
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                            : 'border-rose-300 bg-rose-50 text-rose-900'
                        }`}
                      >
                        <div className="flex items-start gap-2 font-semibold">
                          {isCorrect ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                          )}
                          <span>
                            <MathText text={item.texto} />
                          </span>
                        </div>
                        <p className="mt-1 text-xs opacity-90">
                          <MathText text={item.explicacion} />
                        </p>
                        {!isCorrect && (
                          <p className="mt-1 text-xs font-bold">
                            Correcta: {categoryNameById.get(item.categoria_correcta_id)}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!checked ? (
        <button
          type="button"
          disabled={!allPlaced}
          onClick={() => setChecked(true)}
          className="flex min-h-14 w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Comprobar clasificación
        </button>
      ) : (
        <button
          type="button"
          onClick={handleFinish}
          className="flex min-h-14 w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          Ver resultado final ({correctCount}/{elementos.length} aciertos)
        </button>
      )}
    </div>
  );
}
