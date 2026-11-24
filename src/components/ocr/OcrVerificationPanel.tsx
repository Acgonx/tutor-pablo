import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  ListChecks,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { isGeminiConfigured } from '../../lib/gemini';
import type { LibretaErrorDoc } from '../../types/firestore';
import type {
  DetectedErrorDraft,
  OcrVerificationData,
  OrigenErrorOcr,
  SeveridadError,
  UploadedImageItem,
} from '../../types/ocr';
import type { NivelDificultad } from '../../types/studyMaterial';

const DIFICULTAD_CHOICES: ReadonlyArray<{
  value: NivelDificultad;
  label: string;
}> = [
  { value: 'refuerzo', label: 'Refuerzo guiado' },
  { value: 'estandar', label: 'Estándar 1º ESO' },
  { value: 'ampliacion', label: 'Ampliación' },
  { value: 'reto_alto', label: 'Reto alto' },
];

const ORIGEN_OPTIONS: ReadonlyArray<{
  value: Exclude<OrigenErrorOcr, 'pendiente_confirmar'>;
  label: string;
  activeClass: string;
}> = [
  {
    value: 'error_pablo',
    label: 'Error real de Pablo',
    activeClass: 'border-rose-600 bg-rose-600 text-white',
  },
  {
    value: 'error_material',
    label: 'Del propio material / libro',
    activeClass: 'border-amber-600 bg-amber-600 text-white',
  },
  {
    value: 'descartado',
    label: 'Descartar',
    activeClass: 'border-slate-600 bg-slate-600 text-white',
  },
];

interface OcrVerificationPanelProps {
  verification: OcrVerificationData;
  images: UploadedImageItem[];
  dificultad: NivelDificultad;
  onDificultadChange: (value: NivelDificultad) => void;
  availableSubjectErrors: LibretaErrorDoc[];
  isGenerating: boolean;
  errorMessage: string | null;
  onChange: (next: OcrVerificationData) => void;
  onBack: () => void;
  onConfirmAndGenerate: () => void;
}

export function OcrVerificationPanel({
  verification,
  images,
  dificultad,
  onDificultadChange,
  availableSubjectErrors,
  isGenerating,
  errorMessage,
  onChange,
  onBack,
  onConfirmAndGenerate,
}: OcrVerificationPanelProps) {
  const [zoomedImage, setZoomedImage] = useState<UploadedImageItem | null>(null);
  const [showInvokeErrors, setShowInvokeErrors] = useState(false);
  const [newEpigrafeText, setNewEpigrafeText] = useState('');

  const epigrafesIndice = verification.epigrafes_indice ?? [];
  const epigrafesSeleccionados = verification.epigrafes_seleccionados ?? [];

  function toggleEpigrafe(epigrafe: string) {
    const exists = epigrafesSeleccionados.includes(epigrafe);
    onChange({
      ...verification,
      epigrafes_seleccionados: exists
        ? epigrafesSeleccionados.filter((e) => e !== epigrafe)
        : [...epigrafesSeleccionados, epigrafe],
    });
  }

  function addCustomEpigrafe() {
    const trimmed = newEpigrafeText.trim();
    if (!trimmed) return;
    const nextIndice = epigrafesIndice.includes(trimmed)
      ? epigrafesIndice
      : [...epigrafesIndice, trimmed];
    const nextSelected = epigrafesSeleccionados.includes(trimmed)
      ? epigrafesSeleccionados
      : [...epigrafesSeleccionados, trimmed];
    onChange({
      ...verification,
      epigrafes_indice: nextIndice,
      epigrafes_seleccionados: nextSelected,
    });
    setNewEpigrafeText('');
  }

  function updateErrorDraft(id: string, patch: Partial<DetectedErrorDraft>) {
    onChange({
      ...verification,
      errores_detectados: verification.errores_detectados.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  }

  function removeErrorDraft(id: string) {
    onChange({
      ...verification,
      errores_detectados: verification.errores_detectados.filter((item) => item.id !== id),
    });
  }

  function addManualErrorDraft() {
    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `manual_${Date.now()}`;

    onChange({
      ...verification,
      errores_detectados: [
        ...verification.errores_detectados,
        {
          id: newId,
          concepto_fallado: '',
          explicacion_error: '',
          severidad: 'media',
          origen: 'error_pablo',
          guardar_en_libreta: true,
        },
      ],
    });
  }

  function toggleInvokedError(errorId: string) {
    const exists = verification.errores_invocados_ids.includes(errorId);
    onChange({
      ...verification,
      errores_invocados_ids: exists
        ? verification.errores_invocados_ids.filter((id) => id !== errorId)
        : [...verification.errores_invocados_ids, errorId],
    });
  }

  const unconfirmedCount = verification.errores_detectados.filter(
    (e) => e.origen === 'pendiente_confirmar',
  ).length;

  const pabloErrorsToSaveCount = verification.errores_detectados.filter(
    (e) => e.origen === 'error_pablo' && e.guardar_en_libreta && e.concepto_fallado.trim(),
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              Validación OCR y Curricular · Paso 1 editable
            </span>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Verificación de lectura, currículo y origen de errores
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Revisa lo leído por Gemini, ajusta el contenido completado del currículo y
              confirma si cada error detectado es realmente de Pablo o del propio material.
            </p>
          </div>
          <span className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
            {verification.asignatura}
          </span>
        </div>

        {verification.observaciones_legibilidad && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold">Observaciones de legibilidad de Gemini:</p>
              <p className="mt-0.5">{verification.observaciones_legibilidad}</p>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
              Archivos de referencia
            </p>
            <div className="flex flex-wrap gap-2.5">
              {images.map((img) =>
                img.mimeType === 'application/pdf' ? (
                  <div
                    key={img.id}
                    className="flex h-20 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-800"
                  >
                    <span>PDF:</span>
                    <span className="max-w-32 truncate">{img.fileName}</span>
                  </div>
                ) : (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setZoomedImage(img)}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={img.previewUrl}
                      alt={img.fileName}
                      className="h-20 w-24 object-cover transition-transform group-hover:scale-105"
                    />
                    <span className="absolute right-1 bottom-1 rounded-md bg-slate-900/75 p-1 text-white">
                      <Eye className="h-3 w-3" />
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="ocr-tema" className="block text-sm font-semibold text-slate-700">
              Tema o unidad didáctica
            </label>
            <input
              id="ocr-tema"
              type="text"
              value={verification.tema}
              onChange={(ev) => onChange({ ...verification, tema: ev.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="ocr-notas" className="block text-sm font-semibold text-slate-700">
              Notas extra del docente / padre
            </label>
            <input
              id="ocr-notas"
              type="text"
              value={verification.notas_adicionales_docente}
              onChange={(ev) =>
                onChange({ ...verification, notas_adicionales_docente: ev.target.value })
              }
              placeholder="Ej: Priorizar problemas aplicados y cálculo mental"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="ocr-transcripcion"
            className="block text-sm font-semibold text-slate-700"
          >
            Transcripción editable del material subido
          </label>
          <textarea
            id="ocr-transcripcion"
            rows={7}
            value={verification.transcripcion}
            onChange={(ev) => onChange({ ...verification, transcripcion: ev.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 font-mono text-xs leading-relaxed text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:outline-none sm:text-sm"
          />
        </div>

        {/* Selector de epígrafes del índice */}
        <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-950">
              <ListChecks className="h-4 w-4 text-indigo-600" />
              Índice / apartados: elige exactamente qué practicar hoy
              {epigrafesSeleccionados.length > 0 && (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  {epigrafesSeleccionados.length} elegido
                  {epigrafesSeleccionados.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {epigrafesIndice.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...verification, epigrafes_seleccionados: [...epigrafesIndice] })
                  }
                  className="font-semibold text-indigo-700 hover:underline"
                >
                  Marcar todos
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...verification, epigrafes_seleccionados: [] })
                  }
                  className="font-semibold text-slate-600 hover:underline"
                >
                  Limpiar (todo el tema)
                </button>
              </div>
            )}
          </div>

          <p className="mt-1 text-xs text-slate-600">
            Marca los epígrafes que quieras trabajar ahora (o déjalo sin marcar para incluir todo el
            material). Podrás cambiar esta selección más adelante dentro del artefacto.
          </p>

          {epigrafesIndice.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {epigrafesIndice.map((ep, idx) => {
                const selected = epigrafesSeleccionados.includes(ep);
                return (
                  <button
                    key={`${ep}_${idx}`}
                    type="button"
                    onClick={() => toggleEpigrafe(ep)}
                    className={`rounded-xl border px-3 py-1.5 text-left text-xs font-semibold transition-all ${
                      selected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                        : 'border-indigo-200 bg-white text-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {selected ? '✓ ' : '+ '}
                    {ep}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newEpigrafeText}
              onChange={(ev) => setNewEpigrafeText(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') {
                  ev.preventDefault();
                  addCustomEpigrafe();
                }
              }}
              placeholder="Añadir apartado o tema específico que quieras practicar..."
              className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={addCustomEpigrafe}
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir
            </button>
          </div>
        </div>

        {/* Compleción curricular LOMLOE Canarias */}
        <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-sky-950">
              <BookOpen className="h-4 w-4 text-sky-600" />
              Contenido completado según el currículo (1º ESO Canarias · Decreto 30/2023)
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-sky-900">
              <input
                type="checkbox"
                checked={verification.incluir_completado_curricular}
                onChange={(ev) =>
                  onChange({
                    ...verification,
                    incluir_completado_curricular: ev.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-sky-300 text-indigo-600"
              />
              Incluir compleción curricular al generar
            </label>
          </div>

          {verification.criterios_evaluacion_lomloe.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {verification.criterios_evaluacion_lomloe.map((criterio, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-900 ring-1 ring-sky-200"
                >
                  {criterio}
                </span>
              ))}
            </div>
          )}

          <textarea
            rows={4}
            value={verification.contenido_curricular_completado}
            onChange={(ev) =>
              onChange({
                ...verification,
                contenido_curricular_completado: ev.target.value,
              })
            }
            placeholder="Aquí aparecerá el contenido que falte en los apuntes para completar los saberes básicos oficiales de 1º ESO..."
            className="mt-3 w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none sm:text-sm"
          />
        </div>

        {/* Origen de errores detectados */}
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Errores detectados en el material ({verification.errores_detectados.length})
              </h3>
              <p className="text-xs text-slate-500">
                Indica en cada uno si es un <strong>error real de Pablo</strong> o si forma
                parte del propio libro/apuntes (ej. ejercicios de «encuentra el fallo»).
              </p>
            </div>
            <button
              type="button"
              onClick={addManualErrorDraft}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
            >
              <Plus className="h-4 w-4" />
              Añadir error manualmente
            </button>
          </div>

          {verification.errores_detectados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
              No se detectaron fallos concretos en esta lectura. Puedes añadir uno manualmente o
              continuar directamente.
            </div>
          ) : (
            <div className="space-y-3">
              {verification.errores_detectados.map((err, idx) => {
                const isPending = err.origen === 'pendiente_confirmar';
                return (
                  <div
                    key={err.id}
                    className={`rounded-xl border p-4 ${
                      isPending
                        ? 'border-amber-400 bg-amber-50/60'
                        : err.origen === 'descartado'
                          ? 'border-slate-200 bg-slate-50 opacity-65'
                          : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 uppercase">
                          Hallazgo #{idx + 1}
                        </span>
                        {isPending && (
                          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-950">
                            Confirmar origen
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={err.severidad}
                          onChange={(ev) =>
                            updateErrorDraft(err.id, {
                              severidad: ev.target.value as SeveridadError,
                            })
                          }
                          aria-label="Severidad del error"
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                        >
                          <option value="alta">Severidad alta</option>
                          <option value="media">Severidad media</option>
                          <option value="baja">Severidad baja</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removeErrorDraft(err.id)}
                          aria-label="Eliminar error"
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {ORIGEN_OPTIONS.map((opt) => {
                        const isSelected = err.origen === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              updateErrorDraft(err.id, {
                                origen: opt.value,
                                guardar_en_libreta: opt.value === 'error_pablo',
                              })
                            }
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                              isSelected
                                ? opt.activeClass
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}

                      {err.origen === 'error_pablo' && (
                        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={err.guardar_en_libreta}
                            onChange={(ev) =>
                              updateErrorDraft(err.id, {
                                guardar_en_libreta: ev.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />
                          Guardar en Libreta de Errores
                        </label>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600">
                          Concepto
                        </label>
                        <input
                          type="text"
                          value={err.concepto_fallado}
                          onChange={(ev) =>
                            updateErrorDraft(err.id, { concepto_fallado: ev.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600">
                          Explicación del fallo y forma correcta
                        </label>
                        <input
                          type="text"
                          value={err.explicacion_error}
                          onChange={(ev) =>
                            updateErrorDraft(err.id, { explicacion_error: ev.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invocación explícita de errores previos (sin mezcla automática) */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <button
            type="button"
            onClick={() => setShowInvokeErrors((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold text-slate-800"
          >
            <span>
              Invocar errores previos de la Libreta en esta sesión (opcional ·{' '}
              {verification.errores_invocados_ids.length} seleccionado(s))
            </span>
            {showInvokeErrors ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <p className="mt-1 text-xs text-slate-500">
            Este artefacto es independiente y no mezcla otros temas por defecto. Solo si
            marcas alguno aquí abajo se integrará como repaso.
          </p>

          {showInvokeErrors && (
            <div className="mt-3 space-y-2">
              {availableSubjectErrors.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No hay errores pendientes o en repaso en Firestore para {verification.asignatura}.
                </p>
              ) : (
                availableSubjectErrors.map((err) => {
                  const checked = verification.errores_invocados_ids.includes(err.id);
                  return (
                    <label
                      key={err.id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleInvokedError(err.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <div>
                        <p className="font-bold text-slate-900">
                          {err.concepto_fallado}{' '}
                          <span className="font-normal text-slate-500">
                            ({err.tema} · {err.veces_fallado}x)
                          </span>
                        </p>
                        {err.explicacion_error && (
                          <p className="mt-0.5 text-slate-600">{err.explicacion_error}</p>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
            Nivel de dificultad global inicial del artefacto
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {DIFICULTAD_CHOICES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onDificultadChange(opt.value)}
                className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                  dificultad === opt.value
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-sm text-indigo-950">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <div className="text-xs text-indigo-900">
              <p className="text-sm font-bold text-indigo-950">
                Se generará un artefacto independiente con:
              </p>
              <p className="mt-1">
                Esquema Visual + Andamiaje + <strong>3 Fichas graduadas + 1 Simulación de Examen</strong>{' '}
                + 4 Mini-Apps (incluyendo <strong>¡Caza al Error!</strong>). Se guardarán{' '}
                <strong>{pabloErrorsToSaveCount}</strong> error(es) real(es) de Pablo y se
                invocarán <strong>{verification.errores_invocados_ids.length}</strong> error(es)
                previo(s).
              </p>
            </div>
          </div>
        </div>

        {unconfirmedCount > 0 && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-sm font-semibold text-amber-900">
            Tienes {unconfirmedCount} hallazgo(s) sin clasificar. Indica arriba si es «Error real
            de Pablo», «Del propio material / libro» o «Descartar» antes de continuar.
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-medium text-rose-800">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isGenerating}
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a subir archivos
          </button>

          <button
            type="button"
            disabled={
              isGenerating ||
              unconfirmedCount > 0 ||
              !verification.transcripcion.trim() ||
              !isGeminiConfigured
            }
            onClick={onConfirmAndGenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando artefacto completo...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Confirmar y generar artefacto (Paso 2)
              </>
            )}
          </button>
        </div>
      </section>

      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-auto rounded-2xl bg-white p-3"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-4 px-1">
              <span className="text-sm font-semibold text-slate-700">{zoomedImage.fileName}</span>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={zoomedImage.previewUrl}
              alt={zoomedImage.fileName}
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
