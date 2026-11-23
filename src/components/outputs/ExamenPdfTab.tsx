import { useState } from 'react';
import { Eye, FileCheck2, GraduationCap, Printer, Sparkles } from 'lucide-react';
import type { ExamenPdfData, TipoPreguntaExamen } from '../../types/studyMaterial';

interface ExamenPdfTabProps {
  asignatura: string;
  tema: string;
  data: ExamenPdfData;
}

const TIPO_PREGUNTA_LABEL: Record<TipoPreguntaExamen, string> = {
  corta: 'Respuesta corta',
  desarrollo: 'Desarrollo',
  practica: 'Aplicación práctica',
  competencial: 'Situación competencial',
};

export function ExamenPdfTab({ asignatura, tema, data }: ExamenPdfTabProps) {
  const [mode, setMode] = useState<'alumno' | 'docente'>('alumno');
  const showTeacherKey = mode === 'docente';

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div
          className="inline-flex rounded-xl bg-slate-100 p-1"
          role="group"
          aria-label="Seleccionar versión de examen"
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

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-indigo-700"
        >
          <Printer className="h-4 w-4" />
          Imprimir / Guardar PDF ({showTeacherKey ? 'Docente' : 'Alumno'})
        </button>
      </div>

      <article className="print-sheet mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="print-avoid-break border-b-2 border-slate-800 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                1º ESO · Canarias (Decreto 30/2023) · {asignatura}
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                {data.titulo || `Ficha de evaluación: ${tema}`}
              </h2>
              {data.subtitulo && (
                <p className="mt-0.5 text-sm text-slate-600">{data.subtitulo}</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-300 px-4 py-2 text-right text-xs">
              <p className="font-bold text-slate-800">
                {showTeacherKey ? 'SOLUCIONARIO DOCENTE' : 'FICHA / EXAMEN ALUMNO'}
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
          <strong>Instrucciones:</strong> {data.instrucciones_alumno}
        </div>

        <ol className="mt-6 space-y-6">
          {data.preguntas.map((pregunta, idx) => {
            const blankLinesCount = Math.max(2, Math.min(8, pregunta.lineas_espacio || 3));

            return (
              <li
                key={`${pregunta.numero}_${idx}`}
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
                        Evalúa error de Libreta
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    ({pregunta.puntuacion} {pregunta.puntuacion === 1 ? 'pto' : 'ptos'})
                  </span>
                </div>

                <p className="mt-2.5 text-sm leading-relaxed font-medium text-slate-900">
                  {pregunta.enunciado}
                </p>

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
                      {pregunta.solucion_docente}
                    </p>
                    <p>
                      <strong className="font-bold text-emerald-900">Criterio de corrección:</strong>{' '}
                      {pregunta.nota_correccion}
                    </p>
                    <p className="text-slate-700">
                      <strong className="font-bold">Criterio LOMLOE (Canarias):</strong>{' '}
                      {pregunta.criterio_lomloe}
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
              Rúbrica rápida de evaluación (Docente / Familia)
            </div>
            <p className="leading-relaxed">{data.rubrica_docente}</p>
          </footer>
        )}
      </article>
    </div>
  );
}
