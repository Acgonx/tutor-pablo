import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { COLLECTIONS, requireDb } from '../lib/firebase';
import type {
  EsquemaVisualData,
  ExplicacionAndamiajeData,
  MiniAppsBundle,
} from '../types/studyMaterial';
import { normalizeTimestampToIso } from '../utils/firestoreUtils';

export interface SesionPabloDoc {
  id: string;
  asignatura: string;
  tema: string;
  esquema_visual?: EsquemaVisualData;
  explicacion_andamiaje?: ExplicacionAndamiajeData;
  mini_apps: MiniAppsBundle;
  created_at: string;
}

export async function createSesionPablo(params: {
  asignatura: string;
  tema: string;
  esquema_visual?: EsquemaVisualData;
  explicacion_andamiaje?: ExplicacionAndamiajeData;
  mini_apps: MiniAppsBundle;
}): Promise<SesionPabloDoc> {
  const db = requireDb();
  const now = Timestamp.now();

  const payload = {
    asignatura: params.asignatura.trim(),
    tema: params.tema.trim(),
    esquema_visual_json: params.esquema_visual
      ? JSON.stringify(params.esquema_visual)
      : null,
    explicacion_andamiaje_json: params.explicacion_andamiaje
      ? JSON.stringify(params.explicacion_andamiaje)
      : null,
    mini_apps_json: JSON.stringify(params.mini_apps ?? {}),
    created_at: now,
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.SESIONES_PABLO), payload);

  return {
    id: docRef.id,
    asignatura: payload.asignatura,
    tema: payload.tema,
    esquema_visual: params.esquema_visual,
    explicacion_andamiaje: params.explicacion_andamiaje,
    mini_apps: params.mini_apps,
    created_at: now.toDate().toISOString(),
  };
}

export async function getSesionPabloById(id: string): Promise<SesionPabloDoc | null> {
  const db = requireDb();
  const snap = await getDoc(doc(db, COLLECTIONS.SESIONES_PABLO, id));
  if (!snap.exists()) {
    return null;
  }

  const data = snap.data();
  const esquema =
    typeof data.esquema_visual_json === 'string' && data.esquema_visual_json.trim()
      ? (JSON.parse(data.esquema_visual_json) as EsquemaVisualData)
      : (data.esquema_visual as EsquemaVisualData | undefined);
  const andamiaje =
    typeof data.explicacion_andamiaje_json === 'string' &&
    data.explicacion_andamiaje_json.trim()
      ? (JSON.parse(data.explicacion_andamiaje_json) as ExplicacionAndamiajeData)
      : (data.explicacion_andamiaje as ExplicacionAndamiajeData | undefined);
  const miniApps =
    typeof data.mini_apps_json === 'string' && data.mini_apps_json.trim()
      ? (JSON.parse(data.mini_apps_json) as MiniAppsBundle)
      : ((data.mini_apps as MiniAppsBundle | undefined) ?? {});

  return {
    id: snap.id,
    asignatura: typeof data.asignatura === 'string' ? data.asignatura : '',
    tema: typeof data.tema === 'string' ? data.tema : '',
    esquema_visual: esquema,
    explicacion_andamiaje: andamiaje,
    mini_apps: miniApps,
    created_at: normalizeTimestampToIso(data.created_at),
  };
}

export async function updateSesionPablo(
  id: string,
  params: {
    asignatura: string;
    tema: string;
    esquema_visual?: EsquemaVisualData;
    explicacion_andamiaje?: ExplicacionAndamiajeData;
    mini_apps: MiniAppsBundle;
  },
): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.SESIONES_PABLO, id), {
    asignatura: params.asignatura.trim(),
    tema: params.tema.trim(),
    esquema_visual_json: params.esquema_visual
      ? JSON.stringify(params.esquema_visual)
      : null,
    explicacion_andamiaje_json: params.explicacion_andamiaje
      ? JSON.stringify(params.explicacion_andamiaje)
      : null,
    mini_apps_json: JSON.stringify(params.mini_apps ?? {}),
  });
}
