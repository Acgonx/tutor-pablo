import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { isGeminiConfigured } from '../../lib/gemini';
import type {
  DetectedErrorDraft,
  OcrVerificationData,
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

interface OcrVerificationPanelProps {
  verification: OcrVerificationData;
  images: UploadedImageItem[];
  dificultad: NivelDificultad;
  onDificultadChange: (value: NivelDificultad) => void;
  activeLibretaErrorsCount: number | null;
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
  activeLibretaErrorsCount,
  isGenerating,
  errorMessage,
  onChange,
  onBack,
  onConfirmAndGenerate,
}: OcrVerificationPanelProps) {
  const [zoomedImage, setZoomedImage] = useState<UploadedImageItem | null>(null);

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
          incluir_en_libreta: true,
        },
      ],
    });
  }

  const errorsSelectedCount = verification.errores_detectados.filter(
    (e) => e.incluir_en_libreta && e.concepto_fallado.trim(),
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              Validación OCR en 2 pasos · Paso 1 editable
            </span>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Verificación de lectura y errores
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Revisa la transcripción de Gemini antes de generar materiales. Si hay algún fallo de
              lectura manuscrita o quieres añadir errores concretos de Pablo, edítalo aquí.
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
              Fotos originales de referencia (haz clic para ampliar)
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
              placeholder="Ej: Priorizar ejercicios prácticos de nivel medio"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="ocr-transcripcion"
            className="block text-sm font-semibold text-slate-700"
          >
            Transcripción editable del contenido leído
          </label>
          <textarea
            id="ocr-transcripcion"
            rows={9}
            value={verification.transcripcion}
            onChange={(ev) => onChange({ ...verification, transcripcion: ev.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 font-mono text-xs leading-relaxed text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:outline-none sm:text-sm"
          />
        </div>

        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Errores detectados para reforzar ({verification.errores_detectados.length})
              </h3>
              <p className="text-xs text-slate-500">
                Los errores marcados se guardarán en{' '}
                <code className="rounded bg-slate-100 px-1">libreta_errores</code> para repetición
                espaciada.
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
              No se detectaron fallos concretos en esta lectura. Puedes añadir alguno manualmente o
              continuar directamente.
            </div>
          ) : (
            <div className="space-y-3">
              {verification.errores_detectados.map((err, idx) => (
                <div
                  key={err.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Error #{idx + 1}
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
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

                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={err.incluir_en_libreta}
                          onChange={(ev) =>
                            updateErrorDraft(err.id, { incluir_en_libreta: ev.target.checked })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Guardar en Libreta
                      </label>

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

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">
                        Concepto fallado
                      </label>
                      <input
                        type="text"
                        value={err.concepto_fallado}
                        onChange={(ev) =>
                          updateErrorDraft(err.id, { concepto_fallado: ev.target.value })
                        }
                        placeholder="Ej: Suma de fracciones con distinto denominador"
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
                        placeholder="Ej: Sumó denominadores directamente; debe hallar el m.c.m. primero."
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
            Nivel de dificultad inicial del artefacto
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
            <div>
              <p className="font-bold">Motor Pedagógico listo (Repetición Espaciada + LOMLOE):</p>
              <p className="mt-0.5 text-xs text-indigo-900">
                Al confirmar, se guardarán <strong>{errorsSelectedCount}</strong> errores nuevos/actualizados
                y se integrarán automáticamente los errores previos en estado{' '}
                <code>pendiente</code> o <code>en_repaso</code> de{' '}
                <strong>{verification.asignatura}</strong>
                {activeLibretaErrorsCount !== null
                  ? ` (actualmente ${activeLibretaErrorsCount} registrados en Firestore)`
                  : ''}
                .
              </p>
            </div>
          </div>
        </div>

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
            Volver a subir fotos
          </button>

          <button
            type="button"
            disabled={
              isGenerating ||
              !verification.transcripcion.trim() ||
              !isGeminiConfigured
            }
            onClick={onConfirmAndGenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando 4 materiales pedagógicos...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Confirmar lectura y generar materiales (Paso 2)
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
