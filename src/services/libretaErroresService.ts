import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { COLLECTIONS, requireDb } from '../lib/firebase';
import type {
  EstadoError,
  FalloEnPartida,
  LibretaErrorDoc,
  LibretaErrorInput,
} from '../types/firestore';
import { normalizeTimestampToIso } from '../utils/firestoreUtils';

function normalizeConceptKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function mapDocToLibretaError(id: string, data: Record<string, unknown>): LibretaErrorDoc {
  const rawEstado = data.estado;
  const estado: EstadoError =
    rawEstado === 'en_repaso' || rawEstado === 'superado' ? rawEstado : 'pendiente';

  const rawVeces = typeof data.veces_fallado === 'number' ? data.veces_fallado : 1;

  return {
    id,
    asignatura: typeof data.asignatura === 'string' ? data.asignatura : '',
    tema: typeof data.tema === 'string' ? data.tema : '',
    concepto_fallado:
      typeof data.concepto_fallado === 'string' ? data.concepto_fallado : 'Concepto sin título',
    explicacion_error:
      typeof data.explicacion_error === 'string' ? data.explicacion_error : '',
    estado,
    veces_fallado: Math.max(1, rawVeces),
    ultima_revision: normalizeTimestampToIso(data.ultima_revision),
    created_at: normalizeTimestampToIso(data.created_at),
  };
}

/**
 * Consulta en Firestore los errores en estado 'pendiente' o 'en_repaso' de una asignatura
 * para integrarlos mediante repetición espaciada en los nuevos materiales.
 */
export async function getActiveErrorsByAsignatura(
  asignatura: string,
): Promise<LibretaErrorDoc[]> {
  const db = requireDb();
  const q = query(
    collection(db, COLLECTIONS.LIBRETA_ERRORES),
    where('asignatura', '==', asignatura.trim()),
  );

  const snapshot = await getDocs(q);
  const items = snapshot.docs
    .map((docSnap) => mapDocToLibretaError(docSnap.id, docSnap.data()))
    .filter((item) => item.estado === 'pendiente' || item.estado === 'en_repaso');

  return items.sort((a, b) => {
    if (b.veces_fallado !== a.veces_fallado) {
      return b.veces_fallado - a.veces_fallado;
    }
    return b.ultima_revision.localeCompare(a.ultima_revision);
  });
}

export async function getAllLibretaErrores(): Promise<LibretaErrorDoc[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.LIBRETA_ERRORES));
  const items = snapshot.docs.map((docSnap) =>
    mapDocToLibretaError(docSnap.id, docSnap.data()),
  );

  return items.sort((a, b) => b.ultima_revision.localeCompare(a.ultima_revision));
}

/**
 * Crea o actualiza un error en libreta_errores incrementando veces_fallado si ya existía
 * el mismo concepto en esa asignatura.
 */
export async function upsertLibretaError(
  input: LibretaErrorInput,
): Promise<LibretaErrorDoc> {
  const db = requireDb();
  const asignatura = input.asignatura.trim();
  const tema = input.tema.trim() || 'General';
  const conceptoFallado = input.concepto_fallado.trim();
  const explicacionError = input.explicacion_error.trim();
  const incrementBy = Math.max(1, input.veces_fallado ?? 1);
  const targetEstado: EstadoError = input.estado ?? 'pendiente';
  const targetKey = normalizeConceptKey(conceptoFallado);

  const existingQuery = query(
    collection(db, COLLECTIONS.LIBRETA_ERRORES),
    where('asignatura', '==', asignatura),
  );
  const existingSnap = await getDocs(existingQuery);

  const matchDoc = existingSnap.docs.find((docSnap) => {
    const existingConcept = docSnap.data().concepto_fallado;
    return typeof existingConcept === 'string' && normalizeConceptKey(existingConcept) === targetKey;
  });

  const now = Timestamp.now();

  if (matchDoc) {
    const existingData = mapDocToLibretaError(matchDoc.id, matchDoc.data());
    const nextVeces = existingData.veces_fallado + incrementBy;
    const nextExplicacion = explicacionError || existingData.explicacion_error;
    const nextTema = tema !== 'General' ? tema : existingData.tema;

    await updateDoc(doc(db, COLLECTIONS.LIBRETA_ERRORES, matchDoc.id), {
      tema: nextTema,
      explicacion_error: nextExplicacion,
      estado: targetEstado,
      veces_fallado: nextVeces,
      ultima_revision: now,
    });

    return {
      ...existingData,
      tema: nextTema,
      explicacion_error: nextExplicacion,
      estado: targetEstado,
      veces_fallado: nextVeces,
      ultima_revision: now.toDate().toISOString(),
    };
  }

  const newDocPayload = {
    asignatura,
    tema,
    concepto_fallado: conceptoFallado,
    explicacion_error: explicacionError,
    estado: targetEstado,
    veces_fallado: incrementBy,
    ultima_revision: now,
    created_at: now,
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.LIBRETA_ERRORES), newDocPayload);

  return {
    id: docRef.id,
    asignatura,
    tema,
    concepto_fallado: conceptoFallado,
    explicacion_error: explicacionError,
    estado: targetEstado,
    veces_fallado: incrementBy,
    ultima_revision: now.toDate().toISOString(),
    created_at: now.toDate().toISOString(),
  };
}

export async function updateLibretaErrorEstado(
  id: string,
  estado: EstadoError,
): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.LIBRETA_ERRORES, id), {
    estado,
    ultima_revision: Timestamp.now(),
  });
}

export async function deleteLibretaError(id: string): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, COLLECTIONS.LIBRETA_ERRORES, id));
}

export async function registerGameFailuresInLibreta(params: {
  asignatura: string;
  tema: string;
  fallos: FalloEnPartida[];
}): Promise<number> {
  if (params.fallos.length === 0) {
    return 0;
  }

  const grouped = new Map<string, { concepto: string; detalles: string[] }>();

  for (const fallo of params.fallos) {
    const concepto = fallo.concepto.trim() || 'Concepto fallado en reto';
    const key = normalizeConceptKey(concepto);
    const parts = [fallo.detalle.trim()];
    if (fallo.respuesta_alumno?.trim()) {
      parts.push(`Respuesta dada: "${fallo.respuesta_alumno.trim()}"`);
    }
    if (fallo.respuesta_correcta?.trim()) {
      parts.push(`Respuesta correcta: "${fallo.respuesta_correcta.trim()}"`);
    }
    const line = parts.filter(Boolean).join(' · ');

    const current = grouped.get(key);
    if (current) {
      if (line && !current.detalles.includes(line)) {
        current.detalles.push(line);
      }
    } else {
      grouped.set(key, {
        concepto,
        detalles: line ? [line] : [],
      });
    }
  }

  let savedCount = 0;
  for (const entry of grouped.values()) {
    await upsertLibretaError({
      asignatura: params.asignatura,
      tema: params.tema,
      concepto_fallado: entry.concepto,
      explicacion_error:
        entry.detalles.join(' | ') || 'Fallo detectado al completar la mini-app en el iPad.',
      estado: 'pendiente',
      veces_fallado: 1,
    });
    savedCount += 1;
  }

  return savedCount;
}
