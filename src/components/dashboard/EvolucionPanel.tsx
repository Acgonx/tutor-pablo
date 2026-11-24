import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  TrendingUp,
} from 'lucide-react';
import type { LibretaErrorDoc, RetoPabloHydrated } from '../../types/firestore';
import type { ArtefactoDoc } from '../../types/studyMaterial';

interface EvolucionPanelProps {
  artefactos: ArtefactoDoc[];
  libreta: LibretaErrorDoc[];
  retos: RetoPabloHydrated[];
}

export function EvolucionPanel({
  artefactos,
  libreta,
  retos,
}: EvolucionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [mountNow] = useState(() => Date.now());

  const sevenDaysAgo = mountNow - 7 * 24 * 60 * 60 * 1000;

  const retosCompletados = retos.filter(
    (r) => r.completado && typeof r.puntuacion === 'number',
  );
  const retosSemana = retosCompletados.filter((r) => {
    const ms = new Date(r.created_at).getTime();
    return !Number.isNaN(ms) && ms >= sevenDaysAgo;
  });

  const mediaSemana =
    retosSemana.length > 0
      ? Math.round(
          retosSemana.reduce((acc, r) => acc + (r.puntuacion ?? 0), 0) /
            retosSemana.length,
        )
      : null;

  const erroresSuperados = libreta.filter((e) => e.estado === 'superado');
  const erroresActivos = libreta.filter((e) => e.estado !== 'superado');
  const artefactosSuperados = artefactos.filter((a) => a.estado === 'superado').length;

  // Desglose por asignatura
  const subjectMap = new Map<
    string,
    {
      retosCount: number;
      scoreSum: number;
      erroresSuperados: number;
      erroresActivos: number;
    }
  >();

  for (const reto of retosCompletados) {
    const entry = subjectMap.get(reto.asignatura) ?? {
      retosCount: 0,
      scoreSum: 0,
      erroresSuperados: 0,
      erroresActivos: 0,
    };
    entry.retosCount += 1;
    entry.scoreSum += reto.puntuacion ?? 0;
    subjectMap.set(reto.asignatura, entry);
  }

  for (const err of libreta) {
    const entry = subjectMap.get(err.asignatura) ?? {
      retosCount: 0,
      scoreSum: 0,
      erroresSuperados: 0,
      erroresActivos: 0,
    };
    if (err.estado === 'superado') entry.erroresSuperados += 1;
    else entry.erroresActivos += 1;
    subjectMap.set(err.asignatura, entry);
  }

  const subjectRows = Array.from(subjectMap.entries());

  if (artefactos.length === 0 && libreta.length === 0 && retos.length === 0) {
    return null;
  }

  return (
    <section className="no-print mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Evolución semanal de Pablo
            </h2>
            <p className="text-xs text-slate-500">
              Resumen de retos de los últimos 7 días y errores dominados
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
        >
          {expanded ? (
            <>
              Ocultar detalle
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Ver por asignatura
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
          <p className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 uppercase">
            <Flame className="h-3.5 w-3.5" />
            Retos (7 días)
          </p>
          <p className="mt-0.5 text-lg font-extrabold text-slate-900">
            {retosSemana.length}
            <span className="ml-1.5 text-xs font-semibold text-slate-500">
              {mediaSemana !== null ? `· ${mediaSemana}% media` : 'completados'}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
          <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 uppercase">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Errores superados
          </p>
          <p className="mt-0.5 text-lg font-extrabold text-slate-900">
            {erroresSuperados.length}
            <span className="ml-1.5 text-xs font-semibold text-slate-500">
              de {libreta.length}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
          <p className="text-[11px] font-bold text-amber-800 uppercase">
            Por reforzar
          </p>
          <p className="mt-0.5 text-lg font-extrabold text-slate-900">
            {erroresActivos.length}
            <span className="ml-1.5 text-xs font-semibold text-slate-500">
              activos en libreta
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5">
          <p className="flex items-center gap-1 text-[11px] font-bold text-sky-800 uppercase">
            <Award className="h-3.5 w-3.5" />
            Temas superados
          </p>
          <p className="mt-0.5 text-lg font-extrabold text-slate-900">
            {artefactosSuperados}
            <span className="ml-1.5 text-xs font-semibold text-slate-500">
              de {artefactos.length}
            </span>
          </p>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
              Rendimiento por asignatura
            </p>
            {subjectRows.length === 0 ? (
              <p className="text-xs text-slate-500">
                Aún no hay retos completados esta semana.
              </p>
            ) : (
              <div className="space-y-2">
                {subjectRows.map(([asig, stats]) => {
                  const avg =
                    stats.retosCount > 0
                      ? Math.round(stats.scoreSum / stats.retosCount)
                      : null;
                  return (
                    <div
                      key={asig}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 font-bold text-slate-800">
                        <span>{asig}</span>
                        <span>
                          {avg !== null ? `${avg}% (${stats.retosCount} retos)` : 'Sin retos aún'}
                        </span>
                      </div>
                      {avg !== null && (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${
                              avg >= 80
                                ? 'bg-emerald-500'
                                : avg >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}
                            style={{ width: `${avg}%` }}
                          />
                        </div>
                      )}
                      <p className="mt-1 text-[11px] text-slate-500">
                        Errores superados: {stats.erroresSuperados} · Activos:{' '}
                        {stats.erroresActivos}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
              Últimos errores superados
            </p>
            {erroresSuperados.length === 0 ? (
              <p className="text-xs text-slate-500">
                Cuando Pablo supere errores en la Libreta aparecerán aquí como logros.
              </p>
            ) : (
              <ul className="space-y-2">
                {erroresSuperados.slice(0, 4).map((err) => (
                  <li
                    key={err.id}
                    className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-950"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-bold">{err.concepto_fallado}</p>
                      <p className="text-[11px] text-emerald-800">
                        {err.asignatura} · {err.tema}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
