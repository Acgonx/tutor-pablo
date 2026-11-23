import { isFirebaseConfigured } from '../lib/firebase';
import { analyzeImagesOcr, generateStudyPack, iterateStudyPack } from '../lib/gemini';
import {
  createArtefacto,
  updateArtefactoIteration,
} from './artefactosService';
import {
  getActiveErrorsByAsignatura,
  upsertLibretaError,
} from './libretaErroresService';
import { updateSesionPablo } from './sesionesService';
import type { LibretaErrorDoc } from '../types/firestore';
import type { FuenteDocumento, OcrVerificationData, UploadedImageItem } from '../types/ocr';
import type {
  ArtefactoDoc,
  GeneratedStudyPack,
  NivelDificultad,
} from '../types/studyMaterial';

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
  artefacto: ArtefactoDoc | null;
}

/**
 * Paso 2 del motor pedagógico:
 * 1. Persiste en libreta_errores los errores validados por el docente.
 * 2. Consulta en Firestore los errores en estado 'pendiente' o 'en_repaso' de la asignatura.
 * 3. Genera el artefacto completo (4 salidas consistentes) y lo guarda en Firestore ('artefactos').
 */
export async function runStep2GenerateMaterials(
  verification: OcrVerificationData,
  dificultad: NivelDificultad = 'estandar',
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
      'Firebase no está configurado en .env; el material incluye los errores de esta sesión pero no se guardó en Firestore.';
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
        injectedErrorsSummary: injectedErrors.map(
          (e) => `${e.concepto_fallado} (${e.veces_fallado}x)`,
        ),
      });
    } catch (error) {
      console.error('[Motor Pedagógico] No se pudo guardar el artefacto en Firestore:', error);
      firestoreWarning =
        firestoreWarning ??
        'Se generó el material, pero no se pudo guardar en la colección "artefactos" de Firestore (revisa las reglas de seguridad).';
    }
  }

  return {
    studyPack,
    injectedErrors,
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
 * Itera sobre un artefacto existente para aplicar cambios del docente o subir/bajar dificultad,
 * preservando consistencia entre Esquema, Andamiaje, Examen y Mini-Apps.
 */
export async function runIterateArtifact(params: {
  currentPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  artefacto: ArtefactoDoc | null;
  targetDificultad: NivelDificultad;
  instruccionCambio: string;
}): Promise<IterateArtifactResult> {
  let injectedErrors: LibretaErrorDoc[] = [];
  let firestoreWarning: string | null = null;

  if (isFirebaseConfigured) {
    try {
      injectedErrors = await getActiveErrorsByAsignatura(params.verification.asignatura);
    } catch {
      injectedErrors = [];
    }
  }

  const nextStudyPack = await iterateStudyPack({
    currentPack: params.currentPack,
    verification: params.verification,
    libretaErrores: injectedErrors,
    targetDificultad: params.targetDificultad,
    instruccionCambio: params.instruccionCambio,
  });

  let nextArtefacto: ArtefactoDoc | null = null;
  let syncedSesion = false;

  if (isFirebaseConfigured && params.artefacto) {
    try {
      nextArtefacto = await updateArtefactoIteration({
        artefacto: params.artefacto,
        nextDificultad: params.targetDificultad,
        instruccion: params.instruccionCambio,
        nextStudyPack,
        nextInjectedErrorsSummary: injectedErrors.map(
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
        'Se aplicaron los cambios en pantalla, pero no se pudo actualizar el historial en Firestore.';
    }
  }

  return {
    nextStudyPack,
    nextArtefacto,
    injectedErrors,
    syncedSesion,
    firestoreWarning,
  };
}
