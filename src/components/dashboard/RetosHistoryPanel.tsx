import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  TabletSmartphone,
  Trash2,
} from 'lucide-react';
import { ASIGNATURAS_1ESO_CANARIAS } from '../../data/curriculumCanarias';
import { isFirebaseConfigured } from '../../lib/firebase';
import type { RetoPabloHydrated, TipoJuego } from '../../types/firestore';
import { downloadStandaloneHtml } from '../../utils/exportStandaloneHtml';

interface RetosHistoryPanelProps {
  items: RetoPabloHydrated[];
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onDelete: (id: string) => Promise<void>;
}

const TIPO_LABEL: Record<TipoJuego, string> = {
  flashcards: 'Flashcards',
  clasificar: 'Clasificar',
  trivia_reto: 'Trivia Reto',
  ordenar_pasos: 'Ordenar Pasos',
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida';
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RetosHistoryPanel({
  items,
  isLoading,
  errorMessage,
  onRefresh,
  onDelete,
}: RetosHistoryPanelProps) {
  const [filterAsignatura, setFilterAsignatura] = useState<string>('todas');
  const [filterCompletado, setFilterCompletado] = useState<'todos' | 'completado' | 'pendiente'>(
    'todos',
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    const matchAsig =
      filterAsignatura === 'todas' || item.asignatura === filterAsignatura;
    const matchEstado =
      filterCompletado === 'todos' ||
      (filterCompletado === 'completado' && item.completado) ||
      (filterCompletado === 'pendiente' && !item.completado);
    return matchAsig && matchEstado;
  });

  async function handleCopyLink(id: string) {
    const url = `${window.location.origin}/reto/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Silencio si clipboard no tiene permisos; el botón Abrir sigue disponible.
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase">
            <TabletSmartphone className="h-4 w-4" />
            Colección Firestore · retos_pablo
          </div>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
            Retos publicados para el iPad de Pablo
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Copia cualquier enlace <code className="rounded bg-slate-100 px-1">/reto/:id</code>{' '}
            para enviarlo a Pablo o consulta su puntuación y fallos al terminar.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={!isFirebaseConfigured || isLoading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={filterAsignatura}
          onChange={(ev) => setFilterAsignatura(ev.target.value)}
          aria-label="Filtrar retos por asignatura"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          <option value="todas">Todas las asignaturas</option>
          {ASIGNATURAS_1ESO_CANARIAS.map((asig) => (
            <option key={asig.id} value={asig.nombre}>
              {asig.nombre}
            </option>
          ))}
        </select>

        <select
          value={filterCompletado}
          onChange={(ev) =>
            setFilterCompletado(ev.target.value as 'todos' | 'completado' | 'pendiente')
          }
          aria-label="Filtrar retos por estado"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendientes de jugar</option>
          <option value="completado">Completados</option>
        </select>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando retos desde Firestore...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Todavía no hay retos publicados. Genera material y pulsa «Crear enlace /reto/:id para
            iPad» en la pestaña Mini-Apps.
          </div>
        ) : (
          filteredItems.map((reto) => {
            const retoPath = `/reto/${reto.id}`;
            const isExpanded = expandedId === reto.id;
            const hasFailures = reto.fallos_en_partida.length > 0;

            return (
              <article
                key={reto.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-bold text-indigo-700">
                        {reto.asignatura}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                        {TIPO_LABEL[reto.tipo_juego]}
                      </span>
                      {reto.completado ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Completado · {reto.puntuacion ?? 0}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
                          <Clock className="h-3.5 w-3.5" />
                          Pendiente en iPad
                        </span>
                      )}
                      <span className="text-slate-400">{formatDateTime(reto.created_at)}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{reto.titulo}</h3>
                    <p className="font-mono text-xs text-slate-500">{retoPath}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyLink(reto.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      {copiedId === reto.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar enlace
                        </>
                      )}
                    </button>

                    <a
                      href={retoPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                    >
                      Abrir
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() =>
                        downloadStandaloneHtml({
                          asignatura: reto.asignatura,
                          titulo: reto.titulo,
                          payload: reto.payload,
                        })
                      }
                      title="Descargar archivo .html autónomo"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      .html
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === reto.id}
                      onClick={() => void handleDelete(reto.id)}
                      aria-label="Eliminar reto"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {hasFailures && (
                  <div className="mt-3 border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : reto.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          Ocultar {reto.fallos_en_partida.length} fallo(s) en partida
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          Ver {reto.fallos_en_partida.length} fallo(s) registrados en partida
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <ul className="mt-2 space-y-1.5 text-xs">
                        {reto.fallos_en_partida.map((fallo, idx) => (
                          <li
                            key={idx}
                            className="rounded-lg border border-rose-200 bg-rose-50/70 p-2.5 text-rose-950"
                          >
                            <p className="font-bold">{fallo.concepto}</p>
                            <p className="mt-0.5 text-slate-700">{fallo.detalle}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
