import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import {
  BookOpen,
  Camera,
  FileText,
  ImagePlus,
  ListChecks,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ASIGNATURAS_1ESO_CANARIAS,
  FUENTES_DOCUMENTO,
  getAsignaturaByNombre,
} from '../../data/curriculumCanarias';
import { isGeminiConfigured } from '../../lib/envConfig';
import type { FuenteDocumento, UploadedImageItem } from '../../types/ocr';
import { formatBytes } from '../../utils/imageUtils';

interface ImageUploaderProps {
  asignatura: string;
  onAsignaturaChange: (value: string) => void;
  fuente: FuenteDocumento;
  onFuenteChange: (value: FuenteDocumento) => void;
  images: UploadedImageItem[];
  onAddImages: (files: FileList | File[]) => void;
  onRemoveImage: (id: string) => void;
  extraPrompt: string;
  onExtraPromptChange: (value: string) => void;
  manualText: string;
  onManualTextChange: (value: string) => void;
  activeLibretaErrorsCount: number | null;
  isProcessingImages: boolean;
  isAnalyzingOcr: boolean;
  errorMessage: string | null;
  onAnalyzeImages: () => void;
  onAnalyzeManualTextWithGemini: () => void;
  onContinueWithManualText: () => void;
}

export function ImageUploader({
  asignatura,
  onAsignaturaChange,
  fuente,
  onFuenteChange,
  images,
  onAddImages,
  onRemoveImage,
  extraPrompt,
  onExtraPromptChange,
  manualText,
  onManualTextChange,
  activeLibretaErrorsCount,
  isProcessingImages,
  isAnalyzingOcr,
  errorMessage,
  onAnalyzeImages,
  onAnalyzeManualTextWithGemini,
  onContinueWithManualText,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectedMateria = getAsignaturaByNombre(asignatura);

  function handleDrop(ev: DragEvent<HTMLDivElement>) {
    ev.preventDefault();
    setIsDragging(false);
    if (ev.dataTransfer.files && ev.dataTransfer.files.length > 0) {
      onAddImages(ev.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              Paso 1 · Subir apuntes o exámenes corregidos
            </span>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Prepara una sesión personalizada para Pablo
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Sube fotos de apuntes manuscritos, fichas o exámenes corregidos. Primero validaremos
              la lectura OCR y los errores antes de generar los materiales.
            </p>
          </div>
          {activeLibretaErrorsCount !== null && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-900">
              <span className="font-bold">{activeLibretaErrorsCount}</span>{' '}
              {activeLibretaErrorsCount === 1
                ? 'error activo en Libreta'
                : 'errores activos en Libreta'}{' '}
              para esta materia
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="select-asignatura"
              className="block text-sm font-semibold text-slate-700"
            >
              Materia de 1º de ESO (Decreto 30/2023 Canarias)
            </label>
            <select
              id="select-asignatura"
              value={asignatura}
              onChange={(ev) => onAsignaturaChange(ev.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            >
              {ASIGNATURAS_1ESO_CANARIAS.map((item) => (
                <option key={item.id} value={item.nombre}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="select-fuente"
              className="block text-sm font-semibold text-slate-700"
            >
              Tipo de material subido
            </label>
            <select
              id="select-fuente"
              value={fuente}
              onChange={(ev) => onFuenteChange(ev.target.value as FuenteDocumento)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            >
              {FUENTES_DOCUMENTO.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedMateria && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span className="font-bold text-slate-900">Enfoque LOMLOE Canarias:</span>
              {selectedMateria.competenciasClave.map((comp) => (
                <span
                  key={comp}
                  className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700 ring-1 ring-slate-200"
                >
                  {comp}
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-slate-600">{selectedMateria.enfoqueDecreto30}</p>
          </div>
        )}

        <div
          onDragOver={(ev) => {
            ev.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-5 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-300 bg-slate-50/70 hover:border-indigo-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(ev) => {
              if (ev.target.files) onAddImages(ev.target.files);
              ev.target.value = '';
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(ev) => {
              if (ev.target.files) onAddImages(ev.target.files);
              ev.target.value = '';
            }}
          />

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <ImagePlus className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-800">
            Arrastra aquí fotos o PDFs de apuntes, exámenes o del índice del libro
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Si subes el índice del tema, podrás elegir exactamente qué apartados practicar hoy
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImages || isAnalyzingOcr}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Seleccionar fotos o PDFs
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessingImages || isAnalyzingOcr}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              Hacer foto
            </button>
          </div>

          {isProcessingImages && (
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-indigo-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Optimizando imágenes...
            </p>
          )}
        </div>

        {images.length > 0 && (
          <div className="mt-5">
            <p className="mb-2.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
              Archivos listos ({images.length})
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
                >
                  {img.mimeType === 'application/pdf' ? (
                    <div className="flex h-32 w-full flex-col items-center justify-center gap-1.5 bg-rose-50 text-rose-700">
                      <FileText className="h-9 w-9" />
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold uppercase">
                        PDF
                      </span>
                    </div>
                  ) : (
                    <img
                      src={img.previewUrl}
                      alt={img.fileName}
                      className="h-32 w-full object-cover"
                    />
                  )}
                  <div className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{img.fileName}</p>
                      <p className="text-[11px] text-slate-500">{formatBytes(img.sizeBytes)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveImage(img.id)}
                      aria-label={`Eliminar ${img.fileName}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="extra-prompt"
              className="block text-sm font-semibold text-slate-700"
            >
              Qué quieres practicar hoy / indicaciones para Gemini (opcional)
            </label>
            <textarea
              id="extra-prompt"
              rows={3}
              value={extraPrompt}
              onChange={(ev) => onExtraPromptChange(ev.target.value)}
              placeholder="Ej: Hoy quiero practicar el apartado 2 (fracciones equivalentes) y problemas con dibujos."
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="manual-text"
              className="block text-sm font-semibold text-slate-700"
            >
              O teclea/pega aquí el índice o tema (sin necesidad de foto)
            </label>
            <textarea
              id="manual-text"
              rows={3}
              value={manualText}
              onChange={(ev) => onManualTextChange(ev.target.value)}
              placeholder="Ej: Tema 4 Fracciones: 1. Concepto y representación. 2. Fracciones equivalentes. 3. Reducción a común denominador. 4. Operaciones."
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-medium text-rose-800">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {manualText.trim().length > 0 && (
            <>
              <button
                type="button"
                disabled={isAnalyzingOcr}
                onClick={onContinueWithManualText}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                Edición rápida sin IA
              </button>

              {images.length === 0 && (
                <button
                  type="button"
                  disabled={isAnalyzingOcr || !isGeminiConfigured}
                  onClick={onAnalyzeManualTextWithGemini}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isAnalyzingOcr ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparando espacio de trabajo...
                    </>
                  ) : (
                    <>
                      <ListChecks className="h-4 w-4" />
                      Abrir espacio de trabajo directo (sin OCR)
                    </>
                  )}
                </button>
              )}
            </>
          )}

          <button
            type="button"
            disabled={
              images.length === 0 ||
              isProcessingImages ||
              isAnalyzingOcr ||
              !isGeminiConfigured
            }
            onClick={onAnalyzeImages}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isAnalyzingOcr ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Leyendo apuntes con Gemini Vision...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analizar con Gemini (Paso 1: Verificación OCR)
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
