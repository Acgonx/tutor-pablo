import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Eye,
  FileCheck2,
  GraduationCap,
  Printer,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import type {
  EvaluacionYFichasBundle,
  GenerationPromptConfig,
  NivelDificultad,
  TipoDocumentoEvaluacion,
  TipoPreguntaExamen,
} from '../../types/studyMaterial';
import { MathText } from '../common/MathText';
import { VisualFigureRenderer } from '../common/VisualFigureRenderer';
import { GeminiPromptBox } from './GeminiPromptBox';

interface ExamenPdfTabProps {
  asignatura: string;
  tema: string;
  bundle: EvaluacionYFichasBundle;
  defaultDificultad: NivelDificultad;
  generatingDocType: TipoDocumentoEvaluacion | null;
  generateDocError: string | null;
  onGenerateDoc: (
    tipoDoc: TipoDocumentoEvaluacion,
    config: GenerationPromptConfig,
  ) => Promise<void>;
}

const DOC_TABS: ReadonlyArray<{
  tipo: TipoDocumentoEvaluacion;
  label: string;
  desc: string;
  defaultDificultad: NivelDificultad;
  defaultCantidad: number;
  isExam?: boolean;
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
];

const EVAL_TIPOLOGIAS = [
  'Pintar / representar fracciones (barras o círculos)',
  'Cálculo y operaciones (LaTeX)',
  'Problemas contextualizados de la vida real',
  'Geometría con figuras y medidas',
  'Recta numérica / Coordenadas',
  'Tablas de datos / análisis morfológico',
  'Preguntas conceptuales / teóricas',
] as const;

const EVAL_SUGGESTIONS = [
  'Incluye 2 ejercicios de colorear fracciones en círculos y barras, 2 operaciones y 1 problema.',
  'Pon figuras geométricas con sus medidas para calcular área y perímetro.',
  'Simulación de examen seria sin pistas evaluando todos los saberes clave del tema.',
] as const;

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
}: ExamenPdfTabProps) {
  const [selectedDoc, setSelectedDoc] = useState<TipoDocumentoEvaluacion>('ficha_refuerzo');
  const [mode, setMode] = useState<'alumno' | 'docente'>('alumno');
  const [openConfigFor, setOpenConfigFor] = useState<
    Partial<Record<TipoDocumentoEvaluacion, boolean>>
  >({});

  const activeMeta = DOC_TABS.find((t) => t.tipo === selectedDoc) ?? DOC_TABS[0];
  const data = bundle[selectedDoc];
  const showTeacherKey = mode === 'docente';
  const isExam = selectedDoc === 'simulacion_examen' || Boolean(data?.es_simulacion_examen);
  const isGeneratingThis = generatingDocType === selectedDoc;
  const isConfigOpen = !data || Boolean(openConfigFor[selectedDoc]);

  async function handleGenerateSubmit(config: GenerationPromptConfig) {
    await onGenerateDoc(selectedDoc, config);
    setOpenConfigFor((prev) => ({ ...prev, [selectedDoc]: false }));
  }

  return (
    <div className="space-y-4">
      <div className="no-print grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {DOC_TABS.map((tab) => {
          const isActive = selectedDoc === tab.tipo;
          const isReady = Boolean(bundle[tab.tipo]);
          return (
            <button
              key={tab.tipo}
              type="button"
              onClick={() => setSelectedDoc(tab.tipo)}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                isActive
                  ? tab.isExam
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
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
          key={`${selectedDoc}_prompt`}
          title={`Configurar ${activeMeta.label}`}
          subtitle="Elige exactamente cuántos ejercicios quieres, qué tipologías incluir y si lleva dibujos o figuras para pintar."
          countLabel="ejercicios o preguntas"
          defaultCantidad={activeMeta.defaultCantidad}
          tipologiaOptions={EVAL_TIPOLOGIAS}
          quickSuggestions={EVAL_SUGGESTIONS}
          defaultDificultad={
            selectedDoc === 'simulacion_examen'
              ? defaultDificultad
              : activeMeta.defaultDificultad
          }
          hasExistingContent={Boolean(data)}
          isGenerating={isGeneratingThis}
          errorMessage={generateDocError}
          onSubmit={handleGenerateSubmit}
          onCancel={
            data
              ? () => setOpenConfigFor((prev) => ({ ...prev, [selectedDoc]: false }))
              : undefined
          }
        />
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
                      <span className="text-xs font-bold text-slate-700">
                        ({pregunta.puntuacion} {pregunta.puntuacion === 1 ? 'pto' : 'ptos'})
                      </span>
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
