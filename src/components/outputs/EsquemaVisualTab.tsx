import { AlertTriangle, BookOpen, GitBranch, Lightbulb, Printer, Sparkles } from 'lucide-react';
import type { EsquemaVisualData } from '../../types/studyMaterial';

interface EsquemaVisualTabProps {
  asignatura: string;
  tema: string;
  data: EsquemaVisualData;
}

export function EsquemaVisualTab({ asignatura, tema, data }: EsquemaVisualTabProps) {
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Esquema Visual · Dual Coding y Mnemotecnia
          </h3>
          <p className="text-xs text-slate-500">
            Optimizado para imprimir en A4 y estudiar de un vistazo antes de practicar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-indigo-700"
        >
          <Printer className="h-4 w-4" />
          Imprimir Esquema / Guardar PDF
        </button>
      </div>

      <article className="print-sheet space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="print-avoid-break rounded-2xl border-2 border-indigo-200 bg-indigo-50/70 p-5 print-preserve-color">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-indigo-700 uppercase">
            <span>{asignatura} · 1º ESO Canarias (Decreto 30/2023)</span>
            <span>Esquema Conceptual</span>
          </div>
          <h2 className="mt-1.5 text-2xl font-extrabold text-slate-900">
            {data.titulo_central || tema}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-700">{data.subtitulo_competencial}</p>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/90 px-3.5 py-2.5 text-xs text-slate-700 ring-1 ring-indigo-100">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <span>
              <strong>Conexión LOMLOE Canarias:</strong> {data.enfoque_canarias_lomloe}
            </span>
          </div>
        </header>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
            <GitBranch className="h-4 w-4 text-indigo-600" />
            Mapa de conceptos clave
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.ramas.map((rama, idx) => (
              <div
                key={`${rama.titulo}_${idx}`}
                className={`print-avoid-break print-preserve-color rounded-2xl border p-4 ${
                  rama.es_repaso_libreta
                    ? 'border-amber-300 bg-amber-50/50'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-xs ring-1 ring-slate-200"
                      aria-hidden="true"
                    >
                      {rama.icono_visual || '📌'}
                    </span>
                    <h4 className="text-base font-bold text-slate-900">{rama.titulo}</h4>
                  </div>
                  {rama.es_repaso_libreta && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                      <Sparkles className="h-3 w-3" />
                      Repaso Libreta
                    </span>
                  )}
                </div>

                <p className="mt-2.5 text-sm font-medium text-slate-700">{rama.resumen_clave}</p>

                <ul className="mt-3 space-y-1.5 text-sm text-slate-800">
                  {rama.subconceptos.map((sub, subIdx) => (
                    <li key={subIdx} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                      <span>{sub}</span>
                    </li>
                  ))}
                </ul>

                {rama.conexion_con_otros_temas && (
                  <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                    <strong>Conecta con:</strong> {rama.conexion_con_otros_temas}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {data.reglas_mnemotecnicas.length > 0 && (
          <section className="print-avoid-break">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Reglas mnemotécnicas y trucos visuales
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {data.reglas_mnemotecnicas.map((regla, idx) => (
                <div
                  key={idx}
                  className="print-preserve-color rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
                >
                  <p className="text-sm font-extrabold text-emerald-950">{regla.regla}</p>
                  <p className="mt-1 text-xs text-slate-700">{regla.significado}</p>
                  <p className="mt-2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200">
                    <strong>Ejemplo:</strong> {regla.ejemplo_aplicado}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.alertas_errores.length > 0 && (
          <section className="print-avoid-break">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Semáforo de errores frecuentes (qué evitar)
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="border-b border-slate-200 px-3.5 py-2.5 font-bold">
                      Error frecuente
                    </th>
                    <th className="border-b border-slate-200 px-3.5 py-2.5 font-bold">
                      Forma correcta
                    </th>
                    <th className="border-b border-slate-200 px-3.5 py-2.5 font-bold">
                      Truco para no caer
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {data.alertas_errores.map((alerta, idx) => (
                    <tr key={idx}>
                      <td className="px-3.5 py-2.5 font-medium text-rose-800">
                        {alerta.error_comun}
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-emerald-800">
                        {alerta.forma_correcta}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700">{alerta.truco_para_evitarlo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
