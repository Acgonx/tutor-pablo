import { isFirebaseConfigured } from '../lib/firebase';
import {
  analyzeImagesOcr,
  generateStudyPack,
  iterateStudyPack,
  regenerateSingleEvaluationDoc,
} from '../lib/gemini';
import {
  createArtefacto,
  updateArtefactoEvaluationDoc,
  updateArtefactoIteration,
} from './artefactosService';
import { upsertLibretaError } from './libretaErroresService';
import { updateSesionPablo } from './sesionesService';
import type { LibretaErrorDoc } from '../types/firestore';
import type { FuenteDocumento, OcrVerificationData, UploadedImageItem } from '../types/ocr';
import type {
  ArtefactoDoc,
  ExamenPdfData,
  GeneratedStudyPack,
  NivelDificultad,
  TipoDocumentoEvaluacion,
} from '../types/studyMaterial';

function createDraftId(index: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `err_${Date.now()}_${index}`;
}

/**
 * Paso 1 del flujo: Gemini Vision transcribe fotos/PDFs, propone compleción curricular
 * acorde al Decreto 30/2023 y detecta posibles errores dejando su origen como 'pendiente_confirmar'
 * para que el adulto confirme si son reales de Pablo o del propio material.
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
    contenido_curricular_completado:
      ocrResult.contenido_curricular_completado.trim(),
    incluir_completado_curricular: Boolean(
      ocrResult.contenido_curricular_completado.trim(),
    ),
    criterios_evaluacion_lomloe: ocrResult.criterios_evaluacion_lomloe,
    observaciones_legibilidad: ocrResult.observaciones_legibilidad.trim(),
    notas_adicionales_docente: params.extraPrompt?.trim() || '',
    errores_invocados_ids: [],
    errores_detectados: ocrResult.errores_detectados.map((item, idx) => ({
      id: createDraftId(idx),
      concepto_fallado: item.concepto_fallado.trim(),
      explicacion_error: item.explicacion_error.trim(),
      severidad: item.severidad,
      origen: 'pendiente_confirmar',
      guardar_en_libreta: true,
    })),
  };
}

export interface Step2GenerationResult {
  studyPack: GeneratedStudyPack;
  injectedErrors: LibretaErrorDoc[];
  savedNewErrorsCount: number;
  firestoreWarning: string | null;
  artefacto: ArtefactoDoc | null;
}

/**
 * Paso 2 del motor pedagógico (con aislamiento estricto de artefactos):
 * 1. Solo guarda en libreta_errores los fallos marcados como 'error_pablo' con guardar_en_libreta=true.
 * 2. NO mezcla errores previos automáticamente: solo inyecta los que el docente invocó explícitamente.
 * 3. Genera las 4 salidas (Esquema, Andamiaje, 3 Fichas + Examen, 4 Mini-Apps) y guarda el artefacto aislado.
 */
export async function runStep2GenerateMaterials(
  verification: OcrVerificationData,
  dificultad: NivelDificultad = 'estandar',
  availableLibretaErrors: LibretaErrorDoc[] = [],
): Promise<Step2GenerationResult> {
  let savedNewErrorsCount = 0;
  let firestoreWarning: string | null = null;

  const realPabloErrorsToSave = verification.errores_detectados.filter(
    (item) =>
      item.origen === 'error_pablo' &&
      item.guardar_en_libreta &&
      item.concepto_fallado.trim(),
  );

  const invokedErrors = availableLibretaErrors.filter((item) =>
    verification.errores_invocados_ids.includes(item.id),
  );

  if (isFirebaseConfigured && realPabloErrorsToSave.length > 0) {
    try {
      for (const draft of realPabloErrorsToSave) {
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
    } catch (error) {
      console.error('[Motor Pedagógico] Error guardando en libreta_errores:', error);
      firestoreWarning =
        'No se pudieron guardar los errores nuevos en libreta_errores (revisa las reglas de Firestore).';
    }
  }

  const studyPack = await generateStudyPack({
    verification,
    libretaErrores: invokedErrors,
    dificultad,
  });

  let artefacto: ArtefactoDoc | null = null;
  if (isFirebaseConfigured) {
    try {
      artefacto = await createArtefacto({
        asignatura: verification.asignatura,
        tema: verification.tema,
        dificultad,
        verification,
        studyPack,
        injectedErrorsSummary: invokedErrors.map(
          (e) => `${e.concepto_fallado} (${e.veces_fallado}x)`,
        ),
      });
    } catch (error) {
      console.error('[Motor Pedagógico] No se pudo guardar el artefacto en Firestore:', error);
      firestoreWarning =
        firestoreWarning ??
        'Se generó el material, pero no se pudo guardar en la colección "artefactos" de Firestore.';
    }
  }

  return {
    studyPack,
    injectedErrors: invokedErrors,
    savedNewErrorsCount,
    firestoreWarning,
    artefacto,
  };
}

export interface IterateArtifactResult {
  nextStudyPack: GeneratedStudyPack;
  nextArtefacto: ArtefactoDoc | null;
  injectedErrors: LibretaErrorDoc[];
  syncedSesion: boolean;
  firestoreWarning: string | null;
}

/**
 * Itera sobre un artefacto existente manteniendo estricto aislamiento (solo usa su propio contexto
 * y los errores que tuviera invocados explícitamente).
 */
export async function runIterateArtifact(params: {
  currentPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  artefacto: ArtefactoDoc | null;
  availableLibretaErrors: LibretaErrorDoc[];
  targetDificultad: NivelDificultad;
  instruccionCambio: string;
}): Promise<IterateArtifactResult> {
  const invokedErrors = params.availableLibretaErrors.filter((item) =>
    params.verification.errores_invocados_ids.includes(item.id),
  );

  const nextStudyPack = await iterateStudyPack({
    currentPack: params.currentPack,
    verification: params.verification,
    libretaErrores: invokedErrors,
    targetDificultad: params.targetDificultad,
    instruccionCambio: params.instruccionCambio,
  });

  let nextArtefacto: ArtefactoDoc | null = null;
  let syncedSesion = false;
  let firestoreWarning: string | null = null;

  if (isFirebaseConfigured && params.artefacto) {
    try {
      nextArtefacto = await updateArtefactoIteration({
        artefacto: params.artefacto,
        nextDificultad: params.targetDificultad,
        instruccion: params.instruccionCambio,
        nextStudyPack,
        nextInjectedErrorsSummary: invokedErrors.map(
          (e) => `${e.concepto_fallado} (${e.veces_fallado}x)`,
        ),
      });

      if (params.artefacto.sesion_pablo_id) {
        await updateSesionPablo(params.artefacto.sesion_pablo_id, {
          asignatura: nextStudyPack.asignatura,
          tema: nextStudyPack.tema,
          esquema_visual: nextStudyPack.esquema_visual,
          explicacion_andamiaje: nextStudyPack.explicacion_andamiaje,
          mini_apps: nextStudyPack.mini_apps,
        });
        syncedSesion = true;
      }
    } catch (error) {
      console.error('[Motor Pedagógico] Error al actualizar artefacto iterado:', error);
      firestoreWarning =
        'Se aplicaron los cambios en pantalla, pero no se pudo actualizar en Firestore.';
    }
  }

  return {
    nextStudyPack,
    nextArtefacto,
    injectedErrors: invokedErrors,
    syncedSesion,
    firestoreWarning,
  };
}

export async function runRegenerateEvaluationDoc(params: {
  tipoDoc: TipoDocumentoEvaluacion;
  verification: OcrVerificationData;
  currentDoc: ExamenPdfData;
  artefacto: ArtefactoDoc | null;
  availableLibretaErrors: LibretaErrorDoc[];
  dificultad: NivelDificultad;
}): Promise<{ nextDoc: ExamenPdfData; nextArtefacto: ArtefactoDoc | null }> {
  const invokedErrors = params.availableLibretaErrors.filter((item) =>
    params.verification.errores_invocados_ids.includes(item.id),
  );

  const nextDoc = await regenerateSingleEvaluationDoc({
    tipoDoc: params.tipoDoc,
    verification: params.verification,
    libretaErrores: invokedErrors,
    currentDoc: params.currentDoc,
    dificultad: params.dificultad,
  });

  let nextArtefacto: ArtefactoDoc | null = params.artefacto;
  if (isFirebaseConfigured && params.artefacto) {
    nextArtefacto = await updateArtefactoEvaluationDoc({
      artefacto: params.artefacto,
      tipoDoc: params.tipoDoc,
      nextDoc,
    });
  }

  return { nextDoc, nextArtefacto };
}
