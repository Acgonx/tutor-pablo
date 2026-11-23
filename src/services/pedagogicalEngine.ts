import { isFirebaseConfigured } from '../lib/firebase';
import { analyzeImagesOcr, generateStudyPack } from '../lib/gemini';
import {
  getActiveErrorsByAsignatura,
  upsertLibretaError,
} from './libretaErroresService';
import type { LibretaErrorDoc } from '../types/firestore';
import type { FuenteDocumento, OcrVerificationData, UploadedImageItem } from '../types/ocr';
import type { GeneratedStudyPack } from '../types/studyMaterial';

function createDraftId(index: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `err_${Date.now()}_${index}`;
}

/**
 * Paso 1 del flujo: Gemini Vision transcribe las imágenes y detecta errores iniciales
 * para que el adulto los revise y edite antes de generar material.
 */
export async function runStep1OcrAnalysis(params: {
  asignatura: string;
  fuente: FuenteDocumento;
  images: UploadedImageItem[];
  extraPrompt?: string;
}): Promise<OcrVerificationData> {
  const ocrResult = await analyzeImagesOcr(params);

  return {
    asignatura: params.asignatura,
    tema: ocrResult.tema.trim() || 'Tema sin título',
    fuente: params.fuente,
    transcripcion: ocrResult.transcripcion.trim(),
    observaciones_legibilidad: ocrResult.observaciones_legibilidad.trim(),
    notas_adicionales_docente: params.extraPrompt?.trim() || '',
    errores_detectados: ocrResult.errores_detectados.map((item, idx) => ({
      id: createDraftId(idx),
      concepto_fallado: item.concepto_fallado.trim(),
      explicacion_error: item.explicacion_error.trim(),
      severidad: item.severidad,
      incluir_en_libreta: true,
    })),
  };
}

export interface Step2GenerationResult {
  studyPack: GeneratedStudyPack;
  injectedErrors: LibretaErrorDoc[];
  savedNewErrorsCount: number;
  firestoreWarning: string | null;
}

/**
 * Paso 2 del motor pedagógico:
 * 1. Persiste en libreta_errores los errores validados por el docente.
 * 2. Consulta en Firestore los errores en estado 'pendiente' o 'en_repaso' de la asignatura.
 * 3. Integra esos errores mediante Repetición Espaciada, Active Recall, Dual Coding y Andamiaje.
 */
export async function runStep2GenerateMaterials(
  verification: OcrVerificationData,
): Promise<Step2GenerationResult> {
  let savedNewErrorsCount = 0;
  let injectedErrors: LibretaErrorDoc[] = [];
  let firestoreWarning: string | null = null;

  const errorsToSave = verification.errores_detectados.filter(
    (item) => item.incluir_en_libreta && item.concepto_fallado.trim(),
  );

  if (isFirebaseConfigured) {
    try {
      for (const draft of errorsToSave) {
        await upsertLibretaError({
          asignatura: verification.asignatura,
          tema: verification.tema,
          concepto_fallado: draft.concepto_fallado,
          explicacion_error: draft.explicacion_error,
          estado: 'pendiente',
          veces_fallado: 1,
        });
        savedNewErrorsCount += 1;
      }

      injectedErrors = await getActiveErrorsByAsignatura(verification.asignatura);
    } catch (error) {
      console.error('[Motor Pedagógico] Error consultando Firestore:', error);
      firestoreWarning =
        'No se pudo sincronizar con Firestore en este momento; se generó el material usando solo los errores verificados en pantalla.';
      injectedErrors = errorsToSave.map((draft, idx) => ({
        id: `local_${idx}`,
        asignatura: verification.asignatura,
        tema: verification.tema,
        concepto_fallado: draft.concepto_fallado,
        explicacion_error: draft.explicacion_error,
        estado: 'pendiente',
        veces_fallado: 1,
        ultima_revision: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }));
    }
  } else {
    firestoreWarning =
      'Firebase no está configurado en .env; el material incluye los errores de esta sesión pero no se guardaron en libreta_errores.';
    injectedErrors = errorsToSave.map((draft, idx) => ({
      id: `local_${idx}`,
      asignatura: verification.asignatura,
      tema: verification.tema,
      concepto_fallado: draft.concepto_fallado,
      explicacion_error: draft.explicacion_error,
      estado: 'pendiente',
      veces_fallado: 1,
      ultima_revision: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));
  }

  const studyPack = await generateStudyPack({
    verification,
    libretaErrores: injectedErrors,
  });

  return {
    studyPack,
    injectedErrors,
    savedNewErrorsCount,
    firestoreWarning,
  };
}
