import { useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileCode2,
  GraduationCap,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Printer,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { getTipologiasPorAsignatura } from '../../data/curriculumCanarias';
import type {
  EvaluacionYFichasBundle,
  ExamenPdfData,
  GenerationPromptConfig,
  NivelDificultad,
  PreguntaExamen,
  TipoDocumentoEvaluacion,
  TipoPreguntaExamen,
} from '../../types/studyMaterial';
import { MathText } from '../common/MathText';
import { VisualFigureRenderer } from '../common/VisualFigureRenderer';
import { GeminiPromptBox } from './GeminiPromptBox';

type EvalDocKey = TipoDocumentoEvaluacion | 'documento_libre';

interface ExamenPdfTabProps {
  asignatura: string;
  tema: string;
  bundle: EvaluacionYFichasBundle;
  defaultDificultad: NivelDificultad;
  generatingDocType: TipoDocumentoEvaluacion | 'documento_libre' | null;
  generateDocError: string | null;
  onGenerateDoc: (
    tipoDoc: TipoDocumentoEvaluacion,
    config: GenerationPromptConfig,
  ) => Promise<void>;
  onGenerateFreeDoc?: (config: GenerationPromptConfig) => Promise<void>;
  onUpdateDoc?: (
    tipoDoc: TipoDocumentoEvaluacion,
    next: ExamenPdfData,
  ) => Promise<void>;
  onGenerateImage?: (enunciado: string, isStudentBlank?: boolean) => Promise<string>;
}

const DOC_TABS: ReadonlyArray<{
  tipo: EvalDocKey;
  label: string;
  desc: string;
  defaultDificultad: NivelDificultad;
  defaultCantidad: number;
  isExam?: boolean;
  isFreeDoc?: boolean;
}> = [
  {
    tipo: 'ficha_refuerzo',
    label: 'Ficha 1 · Refuerzo',
    desc: 'Consolidación base',
    defaultDificultad: 'refuerzo',
    defaultCantidad: 5,
  },
  {
    tipo: 'ficha_estandar',
    label: 'Ficha 2 · Estándar',
    desc: 'Práctica graduada',
    defaultDificultad: 'estandar',
    defaultCantidad: 6,
  },
  {
    tipo: 'ficha_ampliacion',
    label: 'Ficha 3 · Ampliación',
    desc: 'Reto competencial',
    defaultDificultad: 'ampliacion',
    defaultCantidad: 6,
  },
  {
    tipo: 'simulacion_examen',
    label: 'Simulación de Examen',
    desc: 'Prueba oficial 1º ESO',
    defaultDificultad: 'estandar',
    defaultCantidad: 6,
    isExam: true,
  },
  {
    tipo: 'documento_libre',
    label: 'Documento Libre Gemini',
    desc: 'HTML directo sin esquema fijo',
    defaultDificultad: 'estandar',
    defaultCantidad: 5,
    isFreeDoc: true,
  },
];

const TIPO_PREGUNTA_LABEL: Record<TipoPreguntaExamen, string> = {
  corta: 'Respuesta corta',
  desarrollo: 'Desarrollo',
  practica: 'Aplicación práctica',
  competencial: 'Situación competencial',
};

export function ExamenPdfTab({
  asignatura,
  tema,
  bundle,
  defaultDificultad,
  generatingDocType,
  generateDocError,
  onGenerateDoc,
  onGenerateFreeDoc,
  onUpdateDoc,
  onGenerateImage,
}: ExamenPdfTabProps) {
  const [selectedDoc, setSelectedDoc] = useState<EvalDocKey>('ficha_refuerzo');
  const [mode, setMode] = useState<'alumno' | 'docente'>('alumno');
  const [openConfigFor, setOpenConfigFor] = useState<
    Partial<Record<EvalDocKey, boolean>>
  >({});
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [questionDraft, setQuestionDraft] = useState<PreguntaExamen | null>(null);
  const [illustratingIdx, setIllustratingIdx] = useState<number | null>(null);
  const [inlineActionError, setInlineActionError] = useState<string | null>(null);

  const activeMeta = DOC_TABS.find((t) => t.tipo === selectedDoc) ?? DOC_TABS[0];
  const isFreeSelected = selectedDoc === 'documento_libre';
  const data = isFreeSelected ? undefined : bundle[selectedDoc];
  const freeDocData = bundle.documento_libre;
  const hasActiveContent = isFreeSelected ? Boolean(freeDocData) : Boolean(data);
  const showTeacherKey = mode === 'docente';
  const isExam = selectedDoc === 'simulacion_examen' || Boolean(data?.es_simulacion_examen);
  const isGeneratingThis = generatingDocType === selectedDoc;
  const isConfigOpen = !hasActiveContent || Boolean(openConfigFor[selectedDoc]);
  const subjectPresets = getTipologiasPorAsignatura(asignatura);
  const evalSuggestions = [
    ...subjectPresets.evaluacionSugerencias,
    'Simulación de examen seria sin pistas evaluando todos los saberes clave del tema.',
  ];

  async function handleGenerateSubmit(config: GenerationPromptConfig) {
    setInlineActionError(null);
    if (selectedDoc === 'documento_libre') {
      if (onGenerateFreeDoc) {
        await onGenerateFreeDoc(config);
      }
    } else {
      await onGenerateDoc(selectedDoc, config);
    }
    setOpenConfigFor((prev) => ({ ...prev, [selectedDoc]: false }));
    setEditingQuestionIdx(null);
    setQuestionDraft(null);
  }

  function startEditQuestion(idx: number, q: PreguntaExamen) {
    setInlineActionError(null);
    setEditingQuestionIdx(idx);
    setQuestionDraft(JSON.parse(JSON.stringify(q)) as PreguntaExamen);
  }

  async function saveEditedQuestion(idx: number) {
    if (!data || !questionDraft || !onUpdateDoc || isFreeSelected) return;
    const nextPreguntas = data.preguntas.map((q, i) => (i === idx ? questionDraft : q));
    const total = Number(
      nextPreguntas.reduce((acc, q) => acc + (Number(q.puntuacion) || 0), 0).toFixed(2),
    );
    await onUpdateDoc(selectedDoc, {
      ...data,
      preguntas: nextPreguntas,
      puntuacion_total: total,
    });
    setEditingQuestionIdx(null);
    setQuestionDraft(null);
  }

  async function deleteQuestion(idx: number) {
    if (!data || !onUpdateDoc || isFreeSelected) return;
    const nextPreguntas = data.preguntas
      .filter((_, i) => i !== idx)
      .map((q, i) => ({ ...q, numero: i + 1 }));
    const total = Number(
      nextPreguntas.reduce((acc, q) => acc + (Number(q.puntuacion) || 0), 0).toFixed(2),
    );
    await onUpdateDoc(selectedDoc, {
      ...data,
      preguntas: nextPreguntas,
      puntuacion_total: total,
    });
    setEditingQuestionIdx(null);
  }

  async function addEmptyQuestion() {
    if (!data || !onUpdateDoc || isFreeSelected) return;
    const nextNum = data.preguntas.length + 1;
    const newQ: PreguntaExamen = {
      numero: nextNum,
      tipo: 'practica',
      enunciado: 'Nueva pregunta personalizada...',
      puntuacion: 1,
      lineas_espacio: 3,
      evalua_error_libreta: false,
      criterio_lomloe: '',
      solucion_docente: '',
      nota_correccion: '',
    };
    const nextPreguntas = [...data.preguntas, newQ];
    const total = Number(
      nextPreguntas.reduce((acc, q) => acc + (Number(q.puntuacion) || 0), 0).toFixed(2),
    );
    await onUpdateDoc(selectedDoc, {
      ...data,
      preguntas: nextPreguntas,
      puntuacion_total: total,
    });
    startEditQuestion(nextPreguntas.length - 1, newQ);
  }

  async function handleIllustrateQuestion(idx: number, q: PreguntaExamen) {
    if (!data || !onGenerateImage || !onUpdateDoc || isFreeSelected) return;
    setInlineActionError(null);
    setIllustratingIdx(idx);
    try {
      const url = await onGenerateImage(q.enunciado, !showTeacherKey);
      const nextPreguntas = data.preguntas.map((item, i) =>
        i === idx ? { ...item, imagen_ia_url: url } : item,
      );
      await onUpdateDoc(selectedDoc, { ...data, preguntas: nextPreguntas });
    } catch (error) {
      setInlineActionError(
        error instanceof Error ? error.message : 'No se pudo generar la ilustración IA.',
      );
    } finally {
      setIllustratingIdx(null);
    }
  }

  async function handleRemoveQuestionImage(idx: number) {
    if (!data || !onUpdateDoc || isFreeSelected) return;
    const nextPreguntas = data.preguntas.map((item, i) =>
      i === idx ? { ...item, imagen_ia_url: undefined } : item,
    );
    await onUpdateDoc(selectedDoc, { ...data, preguntas: nextPreguntas });
  }

  return (
    <div className="space-y-4">
      <div className="no-print grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {DOC_TABS.map((tab) => {
          const isActive = selectedDoc === tab.tipo;
          const isReady = Boolean(bundle[tab.tipo]);
          return (
            <button
              key={tab.tipo}
              type="button"
              onClick={() => {
                setSelectedDoc(tab.tipo);
                setEditingQuestionIdx(null);
                setQuestionDraft(null);
              }}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                isActive
                  ? tab.isExam
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : tab.isFreeDoc
                      ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                      : 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{tab.label}</p>
                {tab.isExam ? (
                  <Award
                    className={`h-4 w-4 ${isActive ? 'text-amber-300' : 'text-amber-600'}`}
                  />
                ) : tab.isFreeDoc ? (
                  <FileCode2
                    className={`h-4 w-4 ${isActive ? 'text-emerald-200' : 'text-emerald-600'}`}
                  />
                ) : isReady ? (
                  <CheckCircle2
                    className={`h-4 w-4 ${isActive ? 'text-emerald-200' : 'text-emerald-600'}`}
                  />
                ) : null}
              </div>
              <p
                className={`mt-0.5 text-xs ${
                  isActive ? 'text-slate-200' : 'text-slate-500'
                }`}
              >
                {isReady ? `${tab.desc} · Lista` : `${tab.desc} · Sin generar`}
              </p>
            </button>
          );
        })}
      </div>

      {isConfigOpen && (
        <GeminiPromptBox
          key={`${asignatura}_${selectedDoc}_prompt`}
          title={`Configurar ${activeMeta.label}`}
          subtitle={
            isFreeSelected
              ? 'Gemini maquetará directamente una ficha HTML imprimible con dibujos SVG libres sin ataduras de esquema.'
              : 'Elige exactamente cuántos ejercicios quieres, qué tipologías incluir y si lleva dibujos, capas o tablas mudas.'
          }
          countLabel="ejercicios o preguntas"
          defaultCantidad={activeMeta.defaultCantidad}
          tipologiaOptions={subjectPresets.evaluacionTipologias}
          quickSuggestions={evalSuggestions}
          defaultDificultad={
            selectedDoc === 'simulacion_examen'
              ? defaultDificultad
              : activeMeta.defaultDificultad
          }
          hasExistingContent={hasActiveContent}
          isGenerating={isGeneratingThis}
          errorMessage={generateDocError}
          onSubmit={handleGenerateSubmit}
          onCancel={
            hasActiveContent
              ? () => setOpenConfigFor((prev) => ({ ...prev, [selectedDoc]: false }))
              : undefined
          }
        />
      )}

      {inlineActionError && (
        <p className="no-print rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          {inlineActionError}
        </p>
      )}

      {isFreeSelected && freeDocData && (
        <>
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode('alumno')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold sm:text-sm ${
                  mode === 'alumno'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Versión Alumno
              </button>
              <button
                type="button"
                onClick={() => setMode('docente')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold sm:text-sm ${
                  mode === 'docente'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                <Eye className="h-4 w-4" />
                Versión Docente
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setOpenConfigFor((prev) => ({
                    ...prev,
                    documento_libre: !prev.documento_libre,
                  }))
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Configurar / Regenerar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-800"
              >
                <Printer className="h-4 w-4" />
                Imprimir / Guardar PDF ({showTeacherKey ? 'Docente' : 'Alumno'})
              </button>
            </div>
          </div>

          <article className="print-sheet mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <header className="print-avoid-break mb-5 border-b-2 border-emerald-700 pb-3">
              <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                1º ESO Canarias · {asignatura} · Documento Libre Gemini
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                {freeDocData.titulo || tema}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Alumno: Pablo · {showTeacherKey ? 'SOLUCIONARIO DOCENTE' : 'VERSIÓN ALUMNO'}
              </p>
            </header>
            <div
              className="prose prose-sm max-w-none text-slate-900 [&_svg]:mx-auto [&_svg]:max-w-full [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2"
              dangerouslySetInnerHTML={{
                __html: (showTeacherKey ? freeDocData.html_docente : freeDocData.html_alumno)
                  .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ''),
              }}
            />
          </article>
        </>
      )}

      {!data ? null : (
        <>
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div
              className="inline-flex rounded-xl bg-slate-100 p-1"
              role="group"
              aria-label="Seleccionar versión del documento"
            >
              <button
                type="button"
                onClick={() => setMode('alumno')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors sm:text-sm ${
                  mode === 'alumno'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Versión Alumno
              </button>
              <button
                type="button"
                onClick={() => setMode('docente')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors sm:text-sm ${
                  mode === 'docente'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="h-4 w-4" />
                Versión Docente con solucionario
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setOpenConfigFor((prev) => ({
                    ...prev,
                    [selectedDoc]: !prev[selectedDoc],
                  }))
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Configurar / Regenerar
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-indigo-700"
              >
                <Printer className="h-4 w-4" />
                Imprimir / Guardar PDF ({showTeacherKey ? 'Docente' : 'Alumno'})
              </button>
            </div>
          </div>

          <article className="print-sheet mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <header
              className={`print-avoid-break border-b-2 pb-4 ${
                isExam ? 'border-slate-900' : 'border-indigo-700'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    1º ESO · Canarias (Decreto 30/2023) · {asignatura}
                    {data.nivel_etiqueta ? ` · ${data.nivel_etiqueta}` : ''}
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                    <MathText text={data.titulo || `${isExam ? 'Examen' : 'Ficha'}: ${tema}`} />
                  </h2>
                  {data.subtitulo && (
                    <p className="mt-0.5 text-sm text-slate-600">
                      <MathText text={data.subtitulo} />
                    </p>
                  )}
                </div>

                <div
                  className={`rounded-xl border px-4 py-2 text-right text-xs ${
                    isExam
                      ? 'border-slate-800 bg-slate-50 print-preserve-color'
                      : 'border-slate-300'
                  }`}
                >
                  <p className="font-bold text-slate-900">
                    {showTeacherKey
                      ? 'SOLUCIONARIO DOCENTE'
                      : isExam
                        ? 'SIMULACIÓN OFICIAL DE EXAMEN'
                        : 'FICHA DE TRABAJO ALUMNO'}
                  </p>
                  <p className="text-slate-600">Tiempo estimado: {data.duracion_estimada}</p>
                  <p className="mt-1 font-bold text-slate-900">
                    Nota: _____ / {data.puntuacion_total}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 text-sm text-slate-800 sm:grid-cols-3">
                <div>
                  <span className="font-bold">Alumno:</span> Pablo
                </div>
                <div>
                  <span className="font-bold">Curso:</span> 1º de ESO
                </div>
                <div>
                  <span className="font-bold">Fecha:</span> ____ / ____ / 202__
                </div>
              </div>
            </header>

            <div className="print-avoid-break mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 print-preserve-color">
              <strong>{isExam ? 'Normas de examen:' : 'Instrucciones:'}</strong>{' '}
              <MathText text={data.instrucciones_alumno} />
            </div>

            <ol className="mt-6 space-y-6">
              {data.preguntas.map((pregunta, idx) => {
                const blankLinesCount = Math.max(
                  2,
                  Math.min(8, pregunta.lineas_espacio || 3),
                );
                const isEditingThis = editingQuestionIdx === idx && questionDraft !== null;

                if (isEditingThis) {
                  return (
                    <li
                      key={`${selectedDoc}_edit_${idx}`}
                      className="no-print space-y-3 rounded-xl border-2 border-amber-300 bg-amber-50/40 p-4 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900">
                          Editando pregunta #{pregunta.numero || idx + 1}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestionIdx(null);
                              setQuestionDraft(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-bold text-slate-700"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveEditedQuestion(idx)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-700"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Guardar
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div>
                          <label className="font-bold text-slate-700">Tipo</label>
                          <select
                            value={questionDraft.tipo}
                            onChange={(ev) =>
                              setQuestionDraft({
                                ...questionDraft,
                                tipo: ev.target.value as TipoPreguntaExamen,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                          >
                            <option value="corta">Respuesta corta</option>
                            <option value="desarrollo">Desarrollo</option>
                            <option value="practica">Aplicación práctica</option>
                            <option value="competencial">Situación competencial</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700">Puntuación</label>
                          <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            value={questionDraft.puntuacion}
                            onChange={(ev) =>
                              setQuestionDraft({
                                ...questionDraft,
                                puntuacion: Number(ev.target.value) || 0,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700">Líneas en blanco</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={questionDraft.lineas_espacio}
                            onChange={(ev) =>
                              setQuestionDraft({
                                ...questionDraft,
                                lineas_espacio: Number(ev.target.value) || 3,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700">
                          Enunciado (admite LaTeX $...$)
                        </label>
                        <textarea
                          rows={3}
                          value={questionDraft.enunciado}
                          onChange={(ev) =>
                            setQuestionDraft({ ...questionDraft, enunciado: ev.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label className="font-bold text-slate-700">Solución docente</label>
                          <textarea
                            rows={2}
                            value={questionDraft.solucion_docente}
                            onChange={(ev) =>
                              setQuestionDraft({
                                ...questionDraft,
                                solucion_docente: ev.target.value,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700">
                            Criterio corrección / LOMLOE
                          </label>
                          <textarea
                            rows={2}
                            value={questionDraft.nota_correccion}
                            onChange={(ev) =>
                              setQuestionDraft({
                                ...questionDraft,
                                nota_correccion: ev.target.value,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                          />
                        </div>
                      </div>

                      {questionDraft.recurso_visual && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
                          <span>
                            Figura adjunta: <strong>{questionDraft.recurso_visual.tipo}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setQuestionDraft({
                                ...questionDraft,
                                recurso_visual: undefined,
                              })
                            }
                            className="font-bold text-rose-600 hover:underline"
                          >
                            Quitar figura
                          </button>
                        </div>
                      )}
                    </li>
                  );
                }

                return (
                  <li
                    key={`${selectedDoc}_${pregunta.numero}_${idx}`}
                    className="print-avoid-break rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-bold text-white print-preserve-color">
                          {pregunta.numero || idx + 1}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {TIPO_PREGUNTA_LABEL[pregunta.tipo] ?? pregunta.tipo}
                        </span>
                        {showTeacherKey && pregunta.evalua_error_libreta && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 print-preserve-color">
                            <Sparkles className="h-3 w-3" />
                            Refuerza error clave
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {onUpdateDoc && (
                          <div className="no-print flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditQuestion(idx, pregunta)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                              title="Editar pregunta in situ"
                            >
                              <Pencil className="h-3 w-3" />
                              Editar
                            </button>
                            {onGenerateImage && (
                              <button
                                type="button"
                                disabled={illustratingIdx === idx}
                                onClick={() => void handleIllustrateQuestion(idx, pregunta)}
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                                title="Generar ilustración realista/educativa con Gemini Imagen"
                              >
                                {illustratingIdx === idx ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ImagePlus className="h-3 w-3" />
                                )}
                                Ilustrar IA
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void deleteQuestion(idx)}
                              aria-label="Eliminar pregunta"
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-700">
                          ({pregunta.puntuacion} {pregunta.puntuacion === 1 ? 'pto' : 'ptos'})
                        </span>
                      </div>
                    </div>

                    <p className="mt-2.5 text-sm leading-relaxed font-medium text-slate-900">
                      <MathText text={pregunta.enunciado} />
                    </p>

                    {pregunta.recurso_visual && (
                      <VisualFigureRenderer
                        spec={pregunta.recurso_visual}
                        showSolution={showTeacherKey}
                      />
                    )}

                    {pregunta.imagen_ia_url && (
                      <figure className="my-3 rounded-xl border border-slate-200 bg-white p-2.5 text-center">
                        <img
                          src={pregunta.imagen_ia_url}
                          alt={`Ilustración pregunta ${pregunta.numero || idx + 1}`}
                          className="mx-auto max-h-60 rounded-lg object-contain"
                        />
                        {onUpdateDoc && (
                          <button
                            type="button"
                            onClick={() => void handleRemoveQuestionImage(idx)}
                            className="no-print mt-1.5 text-[11px] font-semibold text-rose-600 hover:underline"
                          >
                            Quitar ilustración IA
                          </button>
                        )}
                      </figure>
                    )}

                    {!showTeacherKey ? (
                      <div className="mt-3 space-y-1" aria-hidden="true">
                        {Array.from({ length: blankLinesCount }).map((_, lineIdx) => (
                          <div key={lineIdx} className="print-answer-line" />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 print-preserve-color">
                        <p>
                          <strong className="font-bold text-emerald-900">Solución:</strong>{' '}
                          <MathText text={pregunta.solucion_docente} />
                        </p>
                        <p>
                          <strong className="font-bold text-emerald-900">
                            Criterio de corrección:
                          </strong>{' '}
                          <MathText text={pregunta.nota_correccion} />
                        </p>
                        <p className="text-slate-700">
                          <strong className="font-bold">Criterio LOMLOE (Canarias):</strong>{' '}
                          <MathText text={pregunta.criterio_lomloe} />
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            {onUpdateDoc && (
              <div className="no-print mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => void addEmptyQuestion()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  <Plus className="h-4 w-4" />
                  Añadir pregunta manualmente
                </button>
              </div>
            )}

            {showTeacherKey && data.rubrica_docente && (
              <footer className="print-avoid-break mt-6 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs text-indigo-950 print-preserve-color">
                <div className="mb-1 flex items-center gap-1.5 font-bold text-indigo-900">
                  <FileCheck2 className="h-4 w-4" />
                  Rúbrica y criterios de calificación (Decreto 30/2023)
                </div>
                <p className="leading-relaxed">
                  <MathText text={data.rubrica_docente} />
                </p>
              </footer>
            )}
          </article>
        </>
      )}
    </div>
  );
}
