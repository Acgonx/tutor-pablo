import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  HelpCircle,
  Layers,
  Printer,
  Sparkles,
  Target,
} from 'lucide-react';
import type { ExplicacionAndamiajeData } from '../../types/studyMaterial';

interface AndamiajeTabProps {
  data: ExplicacionAndamiajeData;
}

export function AndamiajeTab({ data }: AndamiajeTabProps) {
  const [openSolutions, setOpenSolutions] = useState<Record<number, boolean>>({});
  const [openHints, setOpenHints] = useState<Record<number, boolean>>({});
  const [openFinalSolution, setOpenFinalSolution] = useState(false);

  function toggleSolution(num: number) {
    setOpenSolutions((prev) => ({ ...prev, [num]: !prev[num] }));
  }

  function toggleHint(num: number) {
    setOpenHints((prev) => ({ ...prev, [num]: !prev[num] }));
  }

  function setAllSolutions(open: boolean) {
    const next: Record<number, boolean> = {};
    for (const bloque of data.bloques) {
      next[bloque.numero] = open;
    }
    setOpenSolutions(next);
    setOpenFinalSolution(open);
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Explicación con Andamiaje · Impresión
          </h3>
          <p className="text-xs text-slate-500">
            Imprime la guía con las soluciones abiertas u ocultas según prefieras.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-indigo-700"
        >
          <Printer className="h-4 w-4" />
          Imprimir Andamiaje / Guardar PDF
        </button>
      </div>

      <div className="print-sheet space-y-5">
      <div className="print-avoid-break flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase">
            <Layers className="h-4 w-4" />
            Andamiaje progresivo + Active Recall
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{data.introduccion}</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAllSolutions(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Mostrar todas
          </button>
          <button
            type="button"
            onClick={() => setAllSolutions(false)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Ocultar todas
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {data.bloques.map((bloque, idx) => {
          const isSolutionOpen = Boolean(openSolutions[bloque.numero]);
          const isHintOpen = Boolean(openHints[bloque.numero]);

          return (
            <section
              key={`${bloque.numero}_${idx}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                    {bloque.numero || idx + 1}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{bloque.titulo}</h3>
                </div>
                {bloque.refuerza_error_libreta && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    <Sparkles className="h-3.5 w-3.5" />
                    Refuerza Libreta de Errores
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {bloque.explicacion_breve}
              </p>

              <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-950">
                <strong className="font-bold">Anclaje visual (Dual Coding):</strong>{' '}
                {bloque.anclaje_visual_dual_coding}
              </div>

              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                <p className="text-xs font-bold tracking-wide text-indigo-700 uppercase">
                  Pregunta de verificación (intenta responder antes de abrir)
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {bloque.pregunta_verificacion}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {bloque.pista && (
                    <button
                      type="button"
                      onClick={() => toggleHint(bloque.numero)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      {isHintOpen ? 'Ocultar pista' : 'Ver pista'}
                    </button>
                  )}

                  <button
                    type="button"
                    aria-expanded={isSolutionOpen}
                    onClick={() => toggleSolution(bloque.numero)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    {isSolutionOpen ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Ocultar solución
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Mostrar solución y explicación
                      </>
                    )}
                  </button>
                </div>

                {isHintOpen && bloque.pista && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3 text-xs text-amber-950">
                    <strong>Pista:</strong> {bloque.pista}
                  </div>
                )}

                {isSolutionOpen && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-950">
                    <p className="text-xs font-bold text-emerald-800 uppercase">Solución</p>
                    <p className="mt-1 leading-relaxed">{bloque.solucion_oculta}</p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase">
          <Target className="h-4 w-4" />
          Reto integrador competencial (LOMLOE Canarias)
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-800">
          {data.reto_integrador_final.situacion_problema}
        </p>
        <p className="mt-2 text-sm font-bold text-slate-900">
          {data.reto_integrador_final.pregunta_guia}
        </p>

        <button
          type="button"
          aria-expanded={openFinalSolution}
          onClick={() => setOpenFinalSolution((prev) => !prev)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
        >
          {openFinalSolution ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Ocultar respuesta modelo
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Mostrar respuesta modelo
            </>
          )}
        </button>

        {openFinalSolution && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            {data.reto_integrador_final.respuesta_modelo}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
