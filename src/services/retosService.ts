import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { COLLECTIONS, requireDb } from '../lib/firebase';
import type { FalloEnPartida, RetoPabloHydrated, TipoJuego } from '../types/firestore';
import type { GamePayload } from '../types/studyMaterial';
import { registerGameFailuresInLibreta } from './libretaErroresService';

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

function parsePayloadJson(raw: unknown): GamePayload {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object' || !('tipo_juego' in parsed)) {
    throw new Error('El formato payload_json del reto no es válido.');
  }
  return parsed as GamePayload;
}

function sanitizeFallos(fallos: FalloEnPartida[]): FalloEnPartida[] {
  return fallos.map((fallo) => {
    const clean: FalloEnPartida = {
      concepto: fallo.concepto.trim() || 'Concepto a repasar',
      detalle: fallo.detalle.trim() || 'Error registrado durante la actividad.',
    };
    if (fallo.respuesta_alumno?.trim()) {
      clean.respuesta_alumno = fallo.respuesta_alumno.trim();
    }
    if (fallo.respuesta_correcta?.trim()) {
      clean.respuesta_correcta = fallo.respuesta_correcta.trim();
    }
    return clean;
  });
}

function parseFallosArray(raw: unknown): FalloEnPartida[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const result: FalloEnPartida = {
        concepto: typeof item.concepto === 'string' ? item.concepto : 'Concepto',
        detalle: typeof item.detalle === 'string' ? item.detalle : '',
      };
      if (typeof item.respuesta_alumno === 'string' && item.respuesta_alumno.trim()) {
        result.respuesta_alumno = item.respuesta_alumno;
      }
      if (typeof item.respuesta_correcta === 'string' && item.respuesta_correcta.trim()) {
        result.respuesta_correcta = item.respuesta_correcta;
      }
      return result;
    });
}

function mapDocToReto(id: string, data: Record<string, unknown>): RetoPabloHydrated {
  const payload = parsePayloadJson(data.payload_json);
  const rawTipo = data.tipo_juego;
  const tipoJuego: TipoJuego =
    rawTipo === 'flashcards' ||
    rawTipo === 'clasificar' ||
    rawTipo === 'trivia_reto' ||
    rawTipo === 'ordenar_pasos'
      ? rawTipo
      : payload.tipo_juego;

  const payloadJsonString =
    typeof data.payload_json === 'string' ? data.payload_json : JSON.stringify(payload);

  return {
    id,
    asignatura: typeof data.asignatura === 'string' ? data.asignatura : '',
    titulo: typeof data.titulo === 'string' ? data.titulo : payload.titulo,
    tipo_juego: tipoJuego,
    payload_json: payloadJsonString,
    payload,
    completado: Boolean(data.completado),
    puntuacion: typeof data.puntuacion === 'number' ? data.puntuacion : null,
    fallos_en_partida: parseFallosArray(data.fallos_en_partida),
    created_at: normalizeTimestampToIso(data.created_at),
  };
}

export async function createRetoPablo(params: {
  asignatura: string;
  titulo: string;
  payload: GamePayload;
}): Promise<RetoPabloHydrated> {
  const db = requireDb();
  const payloadJsonString = JSON.stringify(params.payload);
  const now = Timestamp.now();

  const docData = {
    asignatura: params.asignatura.trim(),
    titulo: params.titulo.trim() || params.payload.titulo,
    tipo_juego: params.payload.tipo_juego,
    payload_json: payloadJsonString,
    completado: false,
    puntuacion: null,
    fallos_en_partida: [] as FalloEnPartida[],
    created_at: now,
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.RETOS_PABLO), docData);

  return {
    id: docRef.id,
    asignatura: docData.asignatura,
    titulo: docData.titulo,
    tipo_juego: docData.tipo_juego,
    payload_json: payloadJsonString,
    payload: params.payload,
    completado: false,
    puntuacion: null,
    fallos_en_partida: [],
    created_at: now.toDate().toISOString(),
  };
}

export async function getRetoPabloById(id: string): Promise<RetoPabloHydrated | null> {
  const db = requireDb();
  const docSnap = await getDoc(doc(db, COLLECTIONS.RETOS_PABLO, id));
  if (!docSnap.exists()) {
    return null;
  }
  return mapDocToReto(docSnap.id, docSnap.data());
}

export async function getAllRetosPablo(): Promise<RetoPabloHydrated[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.RETOS_PABLO));
  const items: RetoPabloHydrated[] = [];

  for (const docSnap of snapshot.docs) {
    try {
      items.push(mapDocToReto(docSnap.id, docSnap.data()));
    } catch (error) {
      console.warn(`[Firestore] Se omitió un reto con JSON inválido (${docSnap.id}):`, error);
    }
  }

  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function completeRetoPablo(params: {
  id: string;
  asignatura: string;
  titulo: string;
  puntuacion: number;
  fallos: FalloEnPartida[];
}): Promise<{ savedErrorsCount: number }> {
  const db = requireDb();
  const cleanFallos = sanitizeFallos(params.fallos);

  await updateDoc(doc(db, COLLECTIONS.RETOS_PABLO, params.id), {
    completado: true,
    puntuacion: Math.max(0, Math.min(100, Math.round(params.puntuacion))),
    fallos_en_partida: cleanFallos,
  });

  const savedErrorsCount = await registerGameFailuresInLibreta({
    asignatura: params.asignatura,
    tema: params.titulo,
    fallos: cleanFallos,
  });

  return { savedErrorsCount };
}

export async function deleteRetoPablo(id: string): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, COLLECTIONS.RETOS_PABLO, id));
}
