import { useState } from 'react';
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FolderOpen,
  History,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { ASIGNATURAS_1ESO_CANARIAS } from '../../data/curriculumCanarias';
import { isFirebaseConfigured } from '../../lib/firebase';
import type { ArtefactoDoc, NivelDificultad } from '../../types/studyMaterial';

interface ArtefactosPanelProps {
  items: ArtefactoDoc[];
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onOpenArtefacto: (artefacto: ArtefactoDoc) => void;
  onDelete: (id: string) => Promise<void>;
}

const DIFICULTAD_META: Record<
  NivelDificultad,
  { label: string; badgeClass: string }
> = {
  refuerzo: {
    label: 'Refuerzo guiado',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  estandar: {
    label: 'Estándar 1º ESO',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  ampliacion: {
    label: 'Ampliación',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  reto_alto: {
    label: 'Reto alto',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
  },
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida';
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ArtefactosPanel({
  items,
  isLoading,
  errorMessage,
  onRefresh,
  onOpenArtefacto,
  onDelete,
}: ArtefactosPanelProps) {
  const [filterAsignatura, setFilterAsignatura] = useState('todas');
  const [filterDificultad, setFilterDificultad] = useState('todas');
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const normalizedSearch = searchText.trim().toLowerCase();

  const filtered = items.filter((item) => {
    const matchAsig =
      filterAsignatura === 'todas' || item.asignatura === filterAsignatura;
    const matchDif =
      filterDificultad === 'todas' || item.dificultad === filterDificultad;
    const matchText =
      !normalizedSearch ||
      item.tema.toLowerCase().includes(normalizedSearch) ||
      item.titulo.toLowerCase().includes(normalizedSearch) ||
      item.asignatura.toLowerCase().includes(normalizedSearch);
    return matchAsig && matchDif && matchText;
  });

  async function handleCopySessionUrl(artefacto: ArtefactoDoc) {
    if (!artefacto.sesion_pablo_id) return;
    const url = `${window.location.origin}/sesion/${artefacto.sesion_pablo_id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(artefacto.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Silencio si el navegador bloquea el portapapeles
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
            <Archive className="h-4 w-4" />
            Colección Firestore · artefactos
          </div>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
            Biblioteca de Artefactos (Reclamar e Iterar)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cada sesión generada (Esquema, Andamiaje, Examen y las 4 Mini-Apps) se guarda aquí
            con su contexto original para que puedas reabrirla, pedir cambios o subir la
            dificultad manteniendo la consistencia.
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

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchText}
            onChange={(ev) => setSearchText(ev.target.value)}
            placeholder="Buscar por tema o título..."
            className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          />
        </div>

        <select
          value={filterAsignatura}
          onChange={(ev) => setFilterAsignatura(ev.target.value)}
          aria-label="Filtrar artefactos por asignatura"
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
          value={filterDificultad}
          onChange={(ev) => setFilterDificultad(ev.target.value)}
          aria-label="Filtrar artefactos por dificultad"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          <option value="todas">Todas las dificultades</option>
          <option value="refuerzo">Refuerzo guiado</option>
          <option value="estandar">Estándar 1º ESO</option>
          <option value="ampliacion">Ampliación</option>
          <option value="reto_alto">Reto alto</option>
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
            Cargando biblioteca de artefactos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No hay artefactos guardados todavía con estos filtros. Genera un paquete en{' '}
            <strong>Generador de Estudio</strong> y se guardará automáticamente aquí.
          </div>
        ) : (
          filtered.map((item) => {
            const difMeta = DIFICULTAD_META[item.dificultad];
            const isExpanded = expandedId === item.id;
            const sesionPath = item.sesion_pablo_id
              ? `/sesion/${item.sesion_pablo_id}`
              : null;

            return (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-bold text-indigo-700">
                        {item.asignatura}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 font-bold ${difMeta.badgeClass}`}
                      >
                        {difMeta.label}
                      </span>
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                        v{item.version}
                      </span>
                      <span className="text-slate-400">
                        Actualizado: {formatDateTime(item.updated_at)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{item.titulo}</h3>
                    <p className="text-xs text-slate-500">
                      Tema: {item.tema} · Incluye Esquema, Andamiaje, Examen PDF y 4 Mini-Apps
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenArtefacto(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Abrir e iterar
                    </button>

                    {sesionPath && (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleCopySessionUrl(item)}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Enlace copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copiar /sesion
                            </>
                          )}
                        </button>
                        <a
                          href={sesionPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Abrir
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={() => void handleDelete(item.id)}
                      aria-label="Eliminar artefacto"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {item.historial_iteraciones.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-700"
                    >
                      <History className="h-3.5 w-3.5" />
                      Historial de iteraciones ({item.historial_iteraciones.length})
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <ol className="mt-2 space-y-1.5 text-xs">
                        {item.historial_iteraciones.map((entry) => (
                          <li
                            key={`${item.id}_v_${entry.version}`}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                              v{entry.version}
                            </span>
                            <span className="font-semibold text-indigo-700">
                              {DIFICULTAD_META[entry.dificultad]?.label ?? entry.dificultad}
                            </span>
                            <span className="text-slate-700">{entry.instruccion}</span>
                            <span className="ml-auto text-[11px] text-slate-400">
                              {formatDateTime(entry.fecha)}
                            </span>
                          </li>
                        ))}
                      </ol>
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
