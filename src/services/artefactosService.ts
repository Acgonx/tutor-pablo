import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { COLLECTIONS, requireDb } from '../lib/firebase';
import type { OcrVerificationData } from '../types/ocr';
import type {
  ArtefactoDoc,
  ArtefactoIteracion,
  EstadoArtefacto,
  EvaluacionYFichasBundle,
  ExamenPdfData,
  GeneratedStudyPack,
  NivelDificultad,
  TipoDocumentoEvaluacion,
} from '../types/studyMaterial';
import { normalizeTimestampToIso } from '../utils/firestoreUtils';

function normalizeDificultad(raw: unknown): NivelDificultad {
  if (
    raw === 'refuerzo' ||
    raw === 'estandar' ||
    raw === 'ampliacion' ||
    raw === 'reto_alto'
  ) {
    return raw;
  }
  return 'estandar';
}

function normalizeEstadoArtefacto(raw: unknown): EstadoArtefacto {
  return raw === 'superado' ? 'superado' : 'activo';
}

function parseJsonField<T>(raw: unknown, label: string): T {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`El campo ${label} del artefacto no tiene un formato válido.`);
  }
  return parsed as T;
}

function buildFallbackFicha(base: ExamenPdfData, label: string, isExam: boolean): ExamenPdfData {
  return {
    ...base,
    titulo: `${base.titulo} (${label})`,
    es_simulacion_examen: isExam,
    nivel_etiqueta: label,
  };
}

/**
 * Hidrata artefactos antiguos (que tenían examen_pdf único u ordenar_pasos)
 * al formato actual sin perder compatibilidad.
 */
function hydrateStudyPack(rawPack: Record<string, unknown>): GeneratedStudyPack {
  const legacyExam = rawPack.examen_pdf as ExamenPdfData | undefined;
  const rawEval = rawPack.evaluacion_y_fichas as EvaluacionYFichasBundle | undefined;

  let evaluacionYFichas: EvaluacionYFichasBundle;
  if (rawEval && rawEval.simulacion_examen && rawEval.ficha_refuerzo) {
    evaluacionYFichas = rawEval;
  } else if (legacyExam) {
    evaluacionYFichas = {
      ficha_refuerzo: buildFallbackFicha(legacyExam, 'Ficha 1 · Refuerzo', false),
      ficha_estandar: buildFallbackFicha(legacyExam, 'Ficha 2 · Estándar', false),
      ficha_ampliacion: buildFallbackFicha(legacyExam, 'Ficha 3 · Ampliación', false),
      simulacion_examen: buildFallbackFicha(legacyExam, 'Simulación de Examen', true),
    };
  } else {
    throw new Error('El artefacto no contiene datos de fichas ni examen.');
  }

  const rawMiniApps = (rawPack.mini_apps ?? {}) as Record<string, unknown>;
  const cazaError = (rawMiniApps.caza_error as GeneratedStudyPack['mini_apps']['caza_error'] | undefined) ?? {
    tipo_juego: 'caza_error' as const,
    titulo: '¡Caza al Error!',
    instrucciones: 'Pulsa «Regenerar actividad» para generar casos de detective para este tema.',
    casos: [],
  };

  return {
    asignatura: typeof rawPack.asignatura === 'string' ? rawPack.asignatura : '',
    tema: typeof rawPack.tema === 'string' ? rawPack.tema : '',
    esquema_visual: rawPack.esquema_visual as GeneratedStudyPack['esquema_visual'],
    explicacion_andamiaje:
      rawPack.explicacion_andamiaje as GeneratedStudyPack['explicacion_andamiaje'],
    evaluacion_y_fichas: evaluacionYFichas,
    mini_apps: {
      flashcards: rawMiniApps.flashcards as GeneratedStudyPack['mini_apps']['flashcards'],
      clasificar: rawMiniApps.clasificar as GeneratedStudyPack['mini_apps']['clasificar'],
      trivia_reto: rawMiniApps.trivia_reto as GeneratedStudyPack['mini_apps']['trivia_reto'],
      caza_error: cazaError,
    },
  };
}

function hydrateVerification(raw: Record<string, unknown>): OcrVerificationData {
  const rawErrors = Array.isArray(raw.errores_detectados)
    ? (raw.errores_detectados as Array<Record<string, unknown>>)
    : [];

  return {
    asignatura: typeof raw.asignatura === 'string' ? raw.asignatura : '',
    tema: typeof raw.tema === 'string' ? raw.tema : '',
    fuente: (typeof raw.fuente === 'string'
      ? raw.fuente
      : 'apuntes_clase') as OcrVerificationData['fuente'],
    transcripcion: typeof raw.transcripcion === 'string' ? raw.transcripcion : '',
    contenido_curricular_completado:
      typeof raw.contenido_curricular_completado === 'string'
        ? raw.contenido_curricular_completado
        : '',
    incluir_completado_curricular:
      typeof raw.incluir_completado_curricular === 'boolean'
        ? raw.incluir_completado_curricular
        : true,
    criterios_evaluacion_lomloe: Array.isArray(raw.criterios_evaluacion_lomloe)
      ? raw.criterios_evaluacion_lomloe.filter((x): x is string => typeof x === 'string')
      : [],
    errores_detectados: rawErrors.map((err, idx) => ({
      id: typeof err.id === 'string' ? err.id : `err_${idx}`,
      concepto_fallado:
        typeof err.concepto_fallado === 'string' ? err.concepto_fallado : '',
      explicacion_error:
        typeof err.explicacion_error === 'string' ? err.explicacion_error : '',
      severidad: (err.severidad === 'alta' || err.severidad === 'baja'
        ? err.severidad
        : 'media') as 'alta' | 'media' | 'baja',
      origen:
        err.origen === 'error_pablo' ||
        err.origen === 'error_material' ||
        err.origen === 'descartado' ||
        err.origen === 'pendiente_confirmar'
          ? err.origen
          : err.incluir_en_libreta === false
            ? 'error_material'
            : 'error_pablo',
      guardar_en_libreta:
        typeof err.guardar_en_libreta === 'boolean'
          ? err.guardar_en_libreta
          : Boolean(err.incluir_en_libreta ?? true),
    })),
    errores_invocados_ids: Array.isArray(raw.errores_invocados_ids)
      ? raw.errores_invocados_ids.filter((x): x is string => typeof x === 'string')
      : [],
    observaciones_legibilidad:
      typeof raw.observaciones_legibilidad === 'string'
        ? raw.observaciones_legibilidad
        : '',
    notas_adicionales_docente:
      typeof raw.notas_adicionales_docente === 'string'
        ? raw.notas_adicionales_docente
        : '',
  };
}

function parseHistorial(raw: unknown): ArtefactoIteracion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      version: typeof item.version === 'number' ? item.version : 1,
      fecha: typeof item.fecha === 'string' ? item.fecha : new Date().toISOString(),
      dificultad: normalizeDificultad(item.dificultad),
      instruccion: typeof item.instruccion === 'string' ? item.instruccion : '',
    }));
}

function mapDocToArtefacto(id: string, data: Record<string, unknown>): ArtefactoDoc {
  const rawPack = parseJsonField<Record<string, unknown>>(data.study_pack_json, 'study_pack');
  const rawVerif = parseJsonField<Record<string, unknown>>(
    data.verification_json,
    'verification',
  );
  const studyPack = hydrateStudyPack(rawPack);
  const verification = hydrateVerification(rawVerif);

  const summary = Array.isArray(data.injected_errors_summary)
    ? data.injected_errors_summary.filter((item): item is string => typeof item === 'string')
    : [];

  const result: ArtefactoDoc = {
    id,
    asignatura: typeof data.asignatura === 'string' ? data.asignatura : studyPack.asignatura,
    tema: typeof data.tema === 'string' ? data.tema : studyPack.tema,
    titulo:
      typeof data.titulo === 'string'
        ? data.titulo
        : studyPack.esquema_visual.titulo_central || studyPack.tema,
    dificultad: normalizeDificultad(data.dificultad),
    estado: normalizeEstadoArtefacto(data.estado),
    version: typeof data.version === 'number' ? data.version : 1,
    verification,
    study_pack: studyPack,
    injected_errors_summary: summary,
    historial_iteraciones: parseHistorial(data.historial_iteraciones),
    created_at: normalizeTimestampToIso(data.created_at),
    updated_at: normalizeTimestampToIso(data.updated_at),
  };

  if (typeof data.sesion_pablo_id === 'string' && data.sesion_pablo_id.trim()) {
    result.sesion_pablo_id = data.sesion_pablo_id.trim();
  }

  return result;
}

export async function createArtefacto(params: {
  asignatura: string;
  tema: string;
  dificultad: NivelDificultad;
  verification: OcrVerificationData;
  studyPack: GeneratedStudyPack;
  injectedErrorsSummary: string[];
}): Promise<ArtefactoDoc> {
  const db = requireDb();
  const now = Timestamp.now();
  const isoNow = now.toDate().toISOString();
  const titulo = params.studyPack.esquema_visual.titulo_central || params.tema;

  const initialHistory: ArtefactoIteracion[] = [
    {
      version: 1,
      fecha: isoNow,
      dificultad: params.dificultad,
      instruccion: 'Generación inicial aislada a partir del material verificado.',
    },
  ];

  const payload = {
    asignatura: params.asignatura.trim(),
    tema: params.tema.trim(),
    titulo: titulo.trim(),
    dificultad: params.dificultad,
    estado: 'activo' as EstadoArtefacto,
    version: 1,
    verification_json: JSON.stringify(params.verification),
    study_pack_json: JSON.stringify(params.studyPack),
    injected_errors_summary: params.injectedErrorsSummary,
    historial_iteraciones: initialHistory,
    created_at: now,
    updated_at: now,
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.ARTEFACTOS), payload);

  return {
    id: docRef.id,
    asignatura: payload.asignatura,
    tema: payload.tema,
    titulo: payload.titulo,
    dificultad: payload.dificultad,
    estado: 'activo',
    version: 1,
    verification: params.verification,
    study_pack: params.studyPack,
    injected_errors_summary: params.injectedErrorsSummary,
    historial_iteraciones: initialHistory,
    created_at: isoNow,
    updated_at: isoNow,
  };
}

export async function updateArtefactoIteration(params: {
  artefacto: ArtefactoDoc;
  nextDificultad: NivelDificultad;
  instruccion: string;
  nextStudyPack: GeneratedStudyPack;
  nextInjectedErrorsSummary: string[];
}): Promise<ArtefactoDoc> {
  const db = requireDb();
  const now = Timestamp.now();
  const isoNow = now.toDate().toISOString();
  const nextVersion = params.artefacto.version + 1;
  const nextTitulo =
    params.nextStudyPack.esquema_visual.titulo_central || params.nextStudyPack.tema;

  const nextHistory: ArtefactoIteracion[] = [
    ...params.artefacto.historial_iteraciones,
    {
      version: nextVersion,
      fecha: isoNow,
      dificultad: params.nextDificultad,
      instruccion: params.instruccion.trim() || 'Ajuste de dificultad y consistencia.',
    },
  ];

  await updateDoc(doc(db, COLLECTIONS.ARTEFACTOS, params.artefacto.id), {
    tema: params.nextStudyPack.tema,
    titulo: nextTitulo,
    dificultad: params.nextDificultad,
    version: nextVersion,
    study_pack_json: JSON.stringify(params.nextStudyPack),
    injected_errors_summary: params.nextInjectedErrorsSummary,
    historial_iteraciones: nextHistory,
    updated_at: now,
  });

  return {
    ...params.artefacto,
    tema: params.nextStudyPack.tema,
    titulo: nextTitulo,
    dificultad: params.nextDificultad,
    version: nextVersion,
    study_pack: params.nextStudyPack,
    injected_errors_summary: params.nextInjectedErrorsSummary,
    historial_iteraciones: nextHistory,
    updated_at: isoNow,
  };
}

export async function updateArtefactoStudyPack(params: {
  artefacto: ArtefactoDoc;
  nextStudyPack: GeneratedStudyPack;
}): Promise<ArtefactoDoc> {
  const db = requireDb();
  const now = Timestamp.now();
  const isoNow = now.toDate().toISOString();

  await updateDoc(doc(db, COLLECTIONS.ARTEFACTOS, params.artefacto.id), {
    study_pack_json: JSON.stringify(params.nextStudyPack),
    updated_at: now,
  });

  return {
    ...params.artefacto,
    study_pack: params.nextStudyPack,
    updated_at: isoNow,
  };
}

export async function updateArtefactoEvaluationDoc(params: {
  artefacto: ArtefactoDoc;
  tipoDoc: TipoDocumentoEvaluacion;
  nextDoc: ExamenPdfData;
}): Promise<ArtefactoDoc> {
  const nextPack: GeneratedStudyPack = {
    ...params.artefacto.study_pack,
    evaluacion_y_fichas: {
      ...params.artefacto.study_pack.evaluacion_y_fichas,
      [params.tipoDoc]: params.nextDoc,
    },
  };
  return updateArtefactoStudyPack({
    artefacto: params.artefacto,
    nextStudyPack: nextPack,
  });
}

export async function updateArtefactoEstado(
  id: string,
  estado: EstadoArtefacto,
): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.ARTEFACTOS, id), {
    estado,
    updated_at: Timestamp.now(),
  });
}

export async function attachSesionToArtefacto(
  artefactoId: string,
  sesionId: string,
): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.ARTEFACTOS, artefactoId), {
    sesion_pablo_id: sesionId,
    updated_at: Timestamp.now(),
  });
}

export async function getAllArtefactos(): Promise<ArtefactoDoc[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.ARTEFACTOS));
  const items: ArtefactoDoc[] = [];

  for (const docSnap of snapshot.docs) {
    try {
      items.push(mapDocToArtefacto(docSnap.id, docSnap.data()));
    } catch (error) {
      console.warn(`[Firestore] Se omitió un artefacto inválido (${docSnap.id}):`, error);
    }
  }

  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function deleteArtefacto(id: string): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, COLLECTIONS.ARTEFACTOS, id));
}
