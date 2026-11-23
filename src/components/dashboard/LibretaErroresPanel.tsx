import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  BookMarked,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { ASIGNATURAS_1ESO_CANARIAS } from '../../data/curriculumCanarias';
import { isFirebaseConfigured } from '../../lib/firebase';
import type { EstadoError, LibretaErrorDoc, LibretaErrorInput } from '../../types/firestore';

interface LibretaErroresPanelProps {
  items: LibretaErrorDoc[];
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onChangeEstado: (id: string, estado: EstadoError) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateManual: (input: LibretaErrorInput) => Promise<void>;
}

const ESTADO_OPTIONS: ReadonlyArray<{
  value: EstadoError;
  label: string;
  badgeClass: string;
}> = [
  {
    value: 'pendiente',
    label: 'Pendiente',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  {
    value: 'en_repaso',
    label: 'En repaso',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    value: 'superado',
    label: 'Superado',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
];

function formatDateShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida';
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function LibretaErroresPanel({
  items,
  isLoading,
  errorMessage,
  onRefresh,
  onChangeEstado,
  onDelete,
  onCreateManual,
}: LibretaErroresPanelProps) {
  const [filterAsignatura, setFilterAsignatura] = useState<string>('todas');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newAsignatura, setNewAsignatura] = useState<string>(
    ASIGNATURAS_1ESO_CANARIAS[0]?.nombre ?? 'Matemáticas',
  );
  const [newTema, setNewTema] = useState('');
  const [newConcepto, setNewConcepto] = useState('');
  const [newExplicacion, setNewExplicacion] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    const matchAsig =
      filterAsignatura === 'todas' || item.asignatura === filterAsignatura;
    const matchEstado = filterEstado === 'todos' || item.estado === filterEstado;
    return matchAsig && matchEstado;
  });

  const countPendiente = items.filter((i) => i.estado === 'pendiente').length;
  const countRepaso = items.filter((i) => i.estado === 'en_repaso').length;
  const countSuperado = items.filter((i) => i.estado === 'superado').length;

  async function handleSubmitManual(ev: FormEvent) {
    ev.preventDefault();
    if (!newConcepto.trim()) return;
    setIsSavingNew(true);
    try {
      await onCreateManual({
        asignatura: newAsignatura,
        tema: newTema.trim() || 'General',
        concepto_fallado: newConcepto.trim(),
        explicacion_error: newExplicacion.trim(),
        estado: 'pendiente',
        veces_fallado: 1,
      });
      setNewTema('');
      setNewConcepto('');
      setNewExplicacion('');
      setShowAddForm(false);
    } finally {
      setIsSavingNew(false);
    }
  }

  async function handleEstadoUpdate(id: string, estado: EstadoError) {
    setBusyId(id);
    try {
      await onChangeEstado(id, estado);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteItem(id: string) {
    setBusyId(id);
    try {
      await onDelete(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase">
              <BookMarked className="h-4 w-4" />
              Colección Firestore · libreta_errores
            </div>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              Libreta de Errores (Repetición Espaciada)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Todos los conceptos en estado <strong>Pendiente</strong> o{' '}
              <strong>En repaso</strong> se inyectan automáticamente en los nuevos materiales
              de esa asignatura.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={!isFirebaseConfigured || isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              disabled={!isFirebaseConfigured}
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:bg-slate-300"
            >
              <Plus className="h-4 w-4" />
              Añadir error manual
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-xs font-bold text-rose-700 uppercase">Pendientes</p>
            <p className="mt-0.5 text-2xl font-extrabold text-rose-900">{countPendiente}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-bold text-amber-700 uppercase">En repaso</p>
            <p className="mt-0.5 text-2xl font-extrabold text-amber-900">{countRepaso}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-bold text-emerald-700 uppercase">Superados</p>
            <p className="mt-0.5 text-2xl font-extrabold text-emerald-900">{countSuperado}</p>
          </div>
        </div>

        {showAddForm && (
          <form
            onSubmit={(ev) => void handleSubmitManual(ev)}
            className="mt-5 space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4"
          >
            <p className="text-sm font-bold text-slate-900">Registrar error manualmente</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Asignatura</label>
                <select
                  value={newAsignatura}
                  onChange={(ev) => setNewAsignatura(ev.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {ASIGNATURAS_1ESO_CANARIAS.map((asig) => (
                    <option key={asig.id} value={asig.nombre}>
                      {asig.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Tema</label>
                <input
                  type="text"
                  value={newTema}
                  onChange={(ev) => setNewTema(ev.target.value)}
                  placeholder="Ej: Números enteros"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Concepto fallado *
              </label>
              <input
                type="text"
                required
                value={newConcepto}
                onChange={(ev) => setNewConcepto(ev.target.value)}
                placeholder="Ej: Regla de los signos al quitar paréntesis"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Explicación del error y solución correcta
              </label>
              <textarea
                rows={2}
                value={newExplicacion}
                onChange={(ev) => setNewExplicacion(ev.target.value)}
                placeholder="Ej: Al tener un menos delante del paréntesis cambia el signo de todos los términos."
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingNew}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSavingNew && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Guardar en Firestore
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <select
            value={filterAsignatura}
            onChange={(ev) => setFilterAsignatura(ev.target.value)}
            aria-label="Filtrar por asignatura"
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
            value={filterEstado}
            onChange={(ev) => setFilterEstado(ev.target.value)}
            aria-label="Filtrar por estado"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_repaso">En repaso</option>
            <option value="superado">Superado</option>
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
              Cargando libreta desde Firestore...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No hay errores registrados con estos filtros.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isBusy = busyId === item.id;
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
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
                          {item.tema}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-slate-700">
                          {item.veces_fallado} {item.veces_fallado === 1 ? 'fallo' : 'fallos'}
                        </span>
                        <span className="text-slate-400">
                          Última revisión: {formatDateShort(item.ultima_revision)}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">
                        {item.concepto_fallado}
                      </h3>
                      {item.explicacion_error && (
                        <p className="text-sm text-slate-600">{item.explicacion_error}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {ESTADO_OPTIONS.map((opt) => {
                        const active = item.estado === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleEstadoUpdate(item.id, opt.value)}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                              active
                                ? opt.badgeClass
                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        disabled={isBusy}
                        aria-label="Eliminar error"
                        onClick={() => void handleDeleteItem(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
