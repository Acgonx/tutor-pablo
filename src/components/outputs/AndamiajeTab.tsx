import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  HelpCircle,
  Layers,
  Pencil,
  Printer,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import type {
  ExplicacionAndamiajeData,
  GenerationPromptConfig,
  NivelDificultad,
} from '../../types/studyMaterial';
import { MathText } from '../common/MathText';
import { VisualFigureRenderer } from '../common/VisualFigureRenderer';
import { GeminiPromptBox } from './GeminiPromptBox';

interface AndamiajeTabProps {
  data?: ExplicacionAndamiajeData;
  defaultDificultad?: NivelDificultad;
  isGenerating?: boolean;
  errorMessage?: string | null;
  onGenerate?: (config: GenerationPromptConfig) => Promise<void>;
  onUpdateData?: (next: ExplicacionAndamiajeData) => Promise<void>;
}

const ANDAMIAJE_TIPOLOGIAS = [
  'Paso a paso desde cero',
  'Ejemplos resueltos en LaTeX',
  'Con figuras geométricas o barras visuales',
  'Preguntas rápidas de comprobación (Active Recall)',
  'Situación-problema competencial final',
] as const;

const ANDAMIAJE_SUGGESTIONS = [
  'Explica el paso a paso con ejemplos visuales muy claros antes de cada pregunta.',
  'Insiste en el razonamiento de por qué se hace cada paso.',
] as const;

export function AndamiajeTab({
  data,
  defaultDificultad = 'estandar',
  isGenerating = false,
  errorMessage = null,
  onGenerate,
  onUpdateData,
}: AndamiajeTabProps) {
  const [showConfig, setShowConfig] = useState(!data);
  const [openSolutions, setOpenSolutions] = useState<Record<number, boolean>>({});
  const [openHints, setOpenHints] = useState<Record<number, boolean>>({});
  const [openFinalSolution, setOpenFinalSolution] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ExplicacionAndamiajeData | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  async function handleSubmit(config: GenerationPromptConfig) {
    if (!onGenerate) return;
    await onGenerate(config);
    setShowConfig(false);
    setIsEditing(false);
    setDraft(null);
    setOpenSolutions({});
    setOpenHints({});
    setOpenFinalSolution(false);
  }

  function startEditing() {
    if (!data) return;
    setDraft(JSON.parse(JSON.stringify(data)) as ExplicacionAndamiajeData);
    setIsEditing(true);
  }

  async function saveDraft() {
    if (!draft || !onUpdateData) return;
    setIsSavingEdit(true);
    try {
      await onUpdateData(draft);
      setIsEditing(false);
      setDraft(null);
    } finally {
      setIsSavingEdit(false);
    }
  }

  function toggleSolution(num: number) {
    setOpenSolutions((prev) => ({ ...prev, [num]: !prev[num] }));
  }

  function toggleHint(num: number) {
    setOpenHints((prev) => ({ ...prev, [num]: !prev[num] }));
  }

  function setAllSolutions(open: boolean) {
    if (!data) return;
    const next: Record<number, boolean> = {};
    for (const bloque of data.bloques) {
      next[bloque.numero] = open;
    }
    setOpenSolutions(next);
    setOpenFinalSolution(open);
  }

  return (
    <div className="space-y-5">
      {onGenerate && (showConfig || !data) && (
        <GeminiPromptBox
          title="Generar Explicación con Andamiaje"
          subtitle="Configura cuántos bloques progresivos quieres, su enfoque y si incluyes figuras visuales y LaTeX."
          countLabel="bloques explicativos"
          defaultCantidad={5}
          tipologiaOptions={ANDAMIAJE_TIPOLOGIAS}
          quickSuggestions={ANDAMIAJE_SUGGESTIONS}
          defaultDificultad={defaultDificultad}
          hasExistingContent={Boolean(data)}
          isGenerating={isGenerating}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
          onCancel={data ? () => setShowConfig(false) : undefined}
        />
      )}

      {!data ? null : (
        <>
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Explicación con Andamiaje · Impresión
              </h3>
              <p className="text-xs text-slate-500">
                Imprime la guía con las soluciones abiertas u ocultas según prefieras.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onUpdateData && data && (
                <button
                  type="button"
                  onClick={() => (isEditing ? setIsEditing(false) : startEditing())}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold ${
                    isEditing
                      ? 'border-amber-400 bg-amber-50 text-amber-900'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Pencil className="h-4 w-4" />
                  {isEditing ? 'Cancelar edición' : 'Editar in situ'}
                </button>
              )}
              {onGenerate && (
                <button
                  type="button"
                  onClick={() => setShowConfig((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Configurar / Regenerar
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-indigo-700"
              >
                <Printer className="h-4 w-4" />
                Imprimir Andamiaje / Guardar PDF
              </button>
            </div>
          </div>

          {isEditing && draft && (
            <div className="no-print space-y-4 rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-extrabold text-slate-900">
                  Editando Explicación con Andamiaje in situ
                </h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setDraft(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={() => void saveDraft()}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Introducción</label>
                <textarea
                  rows={2}
                  value={draft.introduccion}
                  onChange={(ev) => setDraft({ ...draft, introduccion: ev.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                />
              </div>

              {draft.bloques.map((b, bIdx) => (
                <div
                  key={bIdx}
                  className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5 text-xs"
                >
                  <input
                    type="text"
                    value={b.titulo}
                    onChange={(ev) => {
                      const next = [...draft.bloques];
                      next[bIdx] = { ...b, titulo: ev.target.value };
                      setDraft({ ...draft, bloques: next });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-bold"
                  />
                  <textarea
                    rows={2}
                    value={b.explicacion_breve}
                    onChange={(ev) => {
                      const next = [...draft.bloques];
                      next[bIdx] = { ...b, explicacion_breve: ev.target.value };
                      setDraft({ ...draft, bloques: next });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                    placeholder="Explicación breve..."
                  />
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input
                      type="text"
                      value={b.pregunta_verificacion}
                      onChange={(ev) => {
                        const next = [...draft.bloques];
                        next[bIdx] = { ...b, pregunta_verificacion: ev.target.value };
                        setDraft({ ...draft, bloques: next });
                      }}
                      placeholder="Pregunta..."
                      className="rounded-lg border border-slate-300 px-2.5 py-1.5"
                    />
                    <input
                      type="text"
                      value={b.solucion_oculta}
                      onChange={(ev) => {
                        const next = [...draft.bloques];
                        next[bIdx] = { ...b, solucion_oculta: ev.target.value };
                        setDraft({ ...draft, bloques: next });
                      }}
                      placeholder="Solución oculta..."
                      className="rounded-lg border border-slate-300 px-2.5 py-1.5"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="print-sheet space-y-5">
            <div className="print-avoid-break flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase">
                  <Layers className="h-4 w-4" />
                  Andamiaje progresivo + Active Recall
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  <MathText text={data.introduccion} />
                </p>
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
                    className="print-avoid-break rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white print-preserve-color">
                          {bloque.numero || idx + 1}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">
                          <MathText text={bloque.titulo} />
                        </h3>
                      </div>
                      {bloque.refuerza_error_libreta && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                          <Sparkles className="h-3.5 w-3.5" />
                          Refuerza Libreta
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                      <MathText text={bloque.explicacion_breve} />
                    </p>

                    {bloque.recurso_visual && (
                      <VisualFigureRenderer
                        spec={bloque.recurso_visual}
                        showSolution={isSolutionOpen}
                      />
                    )}

                    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-950 print-preserve-color">
                      <strong className="font-bold">Anclaje visual (Dual Coding):</strong>{' '}
                      <MathText text={bloque.anclaje_visual_dual_coding} />
                    </div>

                    <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 print-preserve-color">
                      <p className="text-xs font-bold tracking-wide text-indigo-700 uppercase">
                        Pregunta de verificación (intenta responder antes de abrir)
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        <MathText text={bloque.pregunta_verificacion} />
                      </p>

                      <div className="no-print mt-3 flex flex-wrap gap-2">
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
                          <strong>Pista:</strong> <MathText text={bloque.pista} />
                        </div>
                      )}

                      {isSolutionOpen && (
                        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-950">
                          <p className="text-xs font-bold text-emerald-800 uppercase">Solución</p>
                          <p className="mt-1 leading-relaxed">
                            <MathText text={bloque.solucion_oculta} />
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>

            <section className="print-avoid-break rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase">
                <Target className="h-4 w-4" />
                Reto integrador competencial (LOMLOE Canarias)
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-800">
                <MathText text={data.reto_integrador_final.situacion_problema} />
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                <MathText text={data.reto_integrador_final.pregunta_guia} />
              </p>

              <button
                type="button"
                aria-expanded={openFinalSolution}
                onClick={() => setOpenFinalSolution((prev) => !prev)}
                className="no-print mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
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
                  <MathText text={data.reto_integrador_final.respuesta_modelo} />
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
