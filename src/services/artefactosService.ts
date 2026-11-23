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
  GeneratedStudyPack,
  NivelDificultad,
} from '../types/studyMaterial';

function normalizeTimestampToIso(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value) {
    const maybeFn = (value as { toDate?: unknown }).toDate;
    if (typeof maybeFn === 'function') {
      const date = (maybeFn as () => Date)();
      return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    }
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

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

function parseJsonField<T>(raw: unknown, label: string): T {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`El campo ${label} del artefacto no tiene un formato válido.`);
  }
  return parsed as T;
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
  const studyPack = parseJsonField<GeneratedStudyPack>(data.study_pack_json, 'study_pack');
  const verification = parseJsonField<OcrVerificationData>(
    data.verification_json,
    'verification',
  );

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
      instruccion: 'Generación inicial a partir de los apuntes/examen verificados.',
    },
  ];

  const payload = {
    asignatura: params.asignatura.trim(),
    tema: params.tema.trim(),
    titulo: titulo.trim(),
    dificultad: params.dificultad,
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

export async function updateArtefactoMiniApp(params: {
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
