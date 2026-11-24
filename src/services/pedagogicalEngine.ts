import { isFirebaseConfigured } from '../lib/firebase';
import {
  analyzeImagesOcr,
  analyzeTextIndexOrTopic,
  generateAndamiaje,
  generateEducationalImage,
  generateEsquemaVisual,
  generateFreeHtmlDocument,
  generateSingleEvaluationDoc,
  generateSingleMiniApp,
  iterateStudyPack,
  refineHtml5Game,
} from '../lib/gemini';
import type { RawOcrResponse } from '../lib/gemini';
import {
  createArtefacto,
  updateArtefactoEvaluationDoc,
  updateArtefactoIteration,
  updateArtefactoStudyPack,
} from './artefactosService';
import { upsertLibretaError } from './libretaErroresService';
import { updateSesionPablo } from './sesionesService';
import type { LibretaErrorDoc, TipoJuego } from '../types/firestore';
import type { FuenteDocumento, OcrVerificationData, UploadedImageItem } from '../types/ocr';
import type {
  ArtefactoDoc,
  DocumentoLibreData,
  EsquemaVisualData,
  ExamenPdfData,
  ExplicacionAndamiajeData,
  GamePayload,
  GeneratedStudyPack,
  GenerationPromptConfig,
  NeonHtmlPayload,
  NivelDificultad,
  TipoDocumentoEvaluacion,
} from '../types/studyMaterial';

function createDraftId(index: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `err_${Date.now()}_${index}`;
}

function mapRawOcrToVerification(
  ocrResult: RawOcrResponse,
  params: { asignatura: string; fuente: FuenteDocumento; extraPrompt?: string },
): OcrVerificationData {
  const epigrafes = Array.isArray(ocrResult.epigrafes_indice)
    ? ocrResult.epigrafes_indice.map((e) => e.trim()).filter(Boolean)
    : [];

  return {
    asignatura: params.asignatura,
    tema: ocrResult.tema.trim() || 'Tema sin título',
    fuente: params.fuente,
    transcripcion: ocrResult.transcripcion.trim(),
    epigrafes_indice: epigrafes,
    epigrafes_seleccionados: [],
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

/**
 * Paso 1 del flujo: Gemini Vision transcribe fotos/PDFs (apuntes, examen o foto de índice),
 * propone compleción curricular acorde al Decreto 30/2023 y detecta posibles errores.
 */
export async function runStep1OcrAnalysis(params: {
  asignatura: string;
  fuente: FuenteDocumento;
  images: UploadedImageItem[];
  extraPrompt?: string;
}): Promise<OcrVerificationData> {
  const ocrResult = await analyzeImagesOcr(params);
  return mapRawOcrToVerification(ocrResult, params);
}

/**
 * Paso 1 alternativo sin foto: el adulto teclea/pega un índice o tema y Gemini lo
 * estructura en epígrafes elegibles + compleción curricular LOMLOE Canarias.
 */
export async function runStep1TextIndexAnalysis(params: {
  asignatura: string;
  fuente: FuenteDocumento;
  rawText: string;
  extraPrompt?: string;
}): Promise<OcrVerificationData> {
  const ocrResult = await analyzeTextIndexOrTopic(params);
  return mapRawOcrToVerification(ocrResult, params);
}

export interface InitializeArtifactResult {
  studyPack: GeneratedStudyPack;
  injectedErrors: LibretaErrorDoc[];
  savedNewErrorsCount: number;
  firestoreWarning: string | null;
  artefacto: ArtefactoDoc | null;
}

/**
 * Paso 2 instantáneo: guarda errores reales confirmados de Pablo e inicializa el artefacto
 * vacío para que cada pestaña se genere bajo demanda al pinchar en ella.
 */
export async function initializeArtifactFromVerification(
  verification: OcrVerificationData,
  dificultad: NivelDificultad = 'estandar',
  availableLibretaErrors: LibretaErrorDoc[] = [],
): Promise<InitializeArtifactResult> {
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

  const studyPack: GeneratedStudyPack = {
    asignatura: verification.asignatura,
    tema: verification.tema,
    evaluacion_y_fichas: {},
    mini_apps: {},
  };

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
      console.error('[Motor Pedagógico] No se pudo crear el artefacto en Firestore:', error);
      firestoreWarning =
        firestoreWarning ??
        'No se pudo guardar el artefacto en Firestore (revisa las reglas de seguridad).';
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

function resolveInvoked(
  verification: OcrVerificationData,
  availableLibretaErrors: LibretaErrorDoc[],
): LibretaErrorDoc[] {
  return availableLibretaErrors.filter((item) =>
    verification.errores_invocados_ids.includes(item.id),
  );
}

async function syncSesionIfAttached(
  artefacto: ArtefactoDoc | null,
  pack: GeneratedStudyPack,
): Promise<void> {
  if (!artefacto?.sesion_pablo_id) return;
  await updateSesionPablo(artefacto.sesion_pablo_id, {
    asignatura: pack.asignatura,
    tema: pack.tema,
    esquema_visual: pack.esquema_visual,
    explicacion_andamiaje: pack.explicacion_andamiaje,
    mini_apps: pack.mini_apps,
  });
}

export async function runGenerateEsquema(params: {
  studyPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  artefacto: ArtefactoDoc | null;
  availableLibretaErrors: LibretaErrorDoc[];
  config: GenerationPromptConfig;
}): Promise<{
  esquema: EsquemaVisualData;
  nextPack: GeneratedStudyPack;
  nextArtefacto: ArtefactoDoc | null;
}> {
  const invoked = resolveInvoked(params.verification, params.availableLibretaErrors);
  const esquema = await generateEsquemaVisual({
    verification: params.verification,
    libretaErrores: invoked,
    config: params.config,
  });

  const nextPack: GeneratedStudyPack = {
    ...params.studyPack,
    esquema_visual: esquema,
  };

  let nextArtefacto = params.artefacto;
  if (isFirebaseConfigured && params.artefacto) {
    nextArtefacto = await updateArtefactoStudyPack({
      artefacto: params.artefacto,
      nextStudyPack: nextPack,
    });
    await syncSesionIfAttached(nextArtefacto, nextPack);
  }

  return { esquema, nextPack, nextArtefacto };
}

export async function runGenerateAndamiaje(params: {
  studyPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  artefacto: ArtefactoDoc | null;
  availableLibretaErrors: LibretaErrorDoc[];
  config: GenerationPromptConfig;
}): Promise<{
  andamiaje: ExplicacionAndamiajeData;
  nextPack: GeneratedStudyPack;
  nextArtefacto: ArtefactoDoc | null;
}> {
  const invoked = resolveInvoked(params.verification, params.availableLibretaErrors);
  const andamiaje = await generateAndamiaje({
    verification: params.verification,
    libretaErrores: invoked,
    config: params.config,
  });

  const nextPack: GeneratedStudyPack = {
    ...params.studyPack,
    explicacion_andamiaje: andamiaje,
  };

  let nextArtefacto = params.artefacto;
  if (isFirebaseConfigured && params.artefacto) {
    nextArtefacto = await updateArtefactoStudyPack({
      artefacto: params.artefacto,
      nextStudyPack: nextPack,
    });
    await syncSesionIfAttached(nextArtefacto, nextPack);
  }

  return { andamiaje, nextPack, nextArtefacto };
}

export async function runGenerateEvaluationDoc(params: {
  tipoDoc: TipoDocumentoEvaluacion;
  studyPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  artefacto: ArtefactoDoc | null;
  availableLibretaErrors: LibretaErrorDoc[];
  config: GenerationPromptConfig;
}): Promise<{
  doc: ExamenPdfData;
  nextPack: GeneratedStudyPack;
  nextArtefacto: ArtefactoDoc | null;
}> {
  const invoked = resolveInvoked(params.verification, params.availableLibretaErrors);
  const doc = await generateSingleEvaluationDoc({
    tipoDoc: params.tipoDoc,
    verification: params.verification,
    libretaErrores: invoked,
    config: params.config,
    currentDoc: params.studyPack.evaluacion_y_fichas[params.tipoDoc],
  });

  const nextPack: GeneratedStudyPack = {
    ...params.studyPack,
    evaluacion_y_fichas: {
      ...params.studyPack.evaluacion_y_fichas,
      [params.tipoDoc]: doc,
    },
  };

  let nextArtefacto = params.artefacto;
  if (isFirebaseConfigured && params.artefacto) {
    nextArtefacto = await updateArtefactoEvaluationDoc({
      artefacto: params.artefacto,
      tipoDoc: params.tipoDoc,
      nextDoc: doc,
    });
  }

  return { doc, nextPack, nextArtefacto };
}

export async function runGenerateFreeDocument(params: {
  studyPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  artefacto: ArtefactoDoc | null;
  availableLibretaErrors: LibretaErrorDoc[];
  config: GenerationPromptConfig;
}): Promise<{
  docLibre: DocumentoLibreData;
  nextPack: GeneratedStudyPack;
  nextArtefacto: ArtefactoDoc | null;
}> {
  const invoked = resolveInvoked(params.verification, params.availableLibretaErrors);
  const docLibre = await generateFreeHtmlDocument({
    verification: params.verification,
    libretaErrores: invoked,
    config: params.config,
  });

  const nextPack: GeneratedStudyPack = {
    ...params.studyPack,
    evaluacion_y_fichas: {
      ...params.studyPack.evaluacion_y_fichas,
      documento_libre: docLibre,
    },
  };

  let nextArtefacto = params.artefacto;
  if (isFirebaseConfigured && params.artefacto) {
    nextArtefacto = await updateArtefactoStudyPack({
      artefacto: params.artefacto,
      nextStudyPack: nextPack,
    });
  }

  return { docLibre, nextPack, nextArtefacto };
}

export async function runSaveStudyPackEdit(params: {
  nextPack: GeneratedStudyPack;
  artefacto: ArtefactoDoc | null;
  syncStudentSession?: boolean;
}): Promise<ArtefactoDoc | null> {
  if (!isFirebaseConfigured || !params.artefacto) {
    return params.artefacto;
  }
  const nextArtefacto = await updateArtefactoStudyPack({
    artefacto: params.artefacto,
    nextStudyPack: params.nextPack,
  });
  if (params.syncStudentSession) {
    await syncSesionIfAttached(nextArtefacto, params.nextPack);
  }
  return nextArtefacto;
}

export { generateEducationalImage };

export async function runGenerateMiniApp(params: {
  tipoJuego: TipoJuego;
  studyPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  artefacto: ArtefactoDoc | null;
  availableLibretaErrors: LibretaErrorDoc[];
  config: GenerationPromptConfig;
}): Promise<{
  payload: GamePayload;
  nextPack: GeneratedStudyPack;
  nextArtefacto: ArtefactoDoc | null;
}> {
  const invoked = resolveInvoked(params.verification, params.availableLibretaErrors);
  const payload = await generateSingleMiniApp({
    tipoJuego: params.tipoJuego,
    verification: params.verification,
    libretaErrores: invoked,
    config: params.config,
  });

  const nextPack: GeneratedStudyPack = {
    ...params.studyPack,
    mini_apps: {
      ...params.studyPack.mini_apps,
      [payload.tipo_juego]: payload,
    },
  };

  let nextArtefacto = params.artefacto;
  if (isFirebaseConfigured && params.artefacto) {
    nextArtefacto = await updateArtefactoStudyPack({
      artefacto: params.artefacto,
      nextStudyPack: nextPack,
    });
    await syncSesionIfAttached(nextArtefacto, nextPack);
  }

  return { payload, nextPack, nextArtefacto };
}

export async function runRefineHtml5MiniApp(params: {
  currentPayload: NeonHtmlPayload;
  instruction: string;
  studyPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  artefacto: ArtefactoDoc | null;
  availableLibretaErrors: LibretaErrorDoc[];
}): Promise<{
  payload: NeonHtmlPayload;
  nextPack: GeneratedStudyPack;
  nextArtefacto: ArtefactoDoc | null;
}> {
  const invoked = resolveInvoked(params.verification, params.availableLibretaErrors);
  const payload = await refineHtml5Game({
    currentPayload: params.currentPayload,
    instruction: params.instruction,
    verification: params.verification,
    libretaErrores: invoked,
  });

  const nextPack: GeneratedStudyPack = {
    ...params.studyPack,
    mini_apps: {
      ...params.studyPack.mini_apps,
      html5_neon: payload,
    },
  };

  let nextArtefacto = params.artefacto;
  if (isFirebaseConfigured && params.artefacto) {
    nextArtefacto = await updateArtefactoStudyPack({
      artefacto: params.artefacto,
      nextStudyPack: nextPack,
    });
    await syncSesionIfAttached(nextArtefacto, nextPack);
  }

  return { payload, nextPack, nextArtefacto };
}

export interface IterateArtifactResult {
  nextStudyPack: GeneratedStudyPack;
  nextArtefacto: ArtefactoDoc | null;
  injectedErrors: LibretaErrorDoc[];
  syncedSesion: boolean;
  firestoreWarning: string | null;
}

export async function runIterateArtifact(params: {
  currentPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  artefacto: ArtefactoDoc | null;
  availableLibretaErrors: LibretaErrorDoc[];
  targetDificultad: NivelDificultad;
  instruccionCambio: string;
}): Promise<IterateArtifactResult> {
  const invokedErrors = resolveInvoked(
    params.verification,
    params.availableLibretaErrors,
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
        await syncSesionIfAttached(nextArtefacto, nextStudyPack);
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
