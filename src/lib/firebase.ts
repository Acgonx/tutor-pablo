import { getApp, getApps, initializeApp } from 'firebase/app';
import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

const REQUIRED_FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

type RequiredFirebaseEnvKey = (typeof REQUIRED_FIREBASE_ENV_KEYS)[number];

const firebaseEnvValues: Record<RequiredFirebaseEnvKey, string | undefined> = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Variables VITE_FIREBASE_* obligatorias que faltan o están vacías en .env. */
export const missingFirebaseEnvVars: readonly string[] = REQUIRED_FIREBASE_ENV_KEYS.filter(
  (key) => !firebaseEnvValues[key]?.trim(),
);

/** Indica si Firebase dispone de toda la configuración mínima en .env. */
export const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;

/** Nombres oficiales de las colecciones en Cloud Firestore. */
export const COLLECTIONS = {
  LIBRETA_ERRORES: 'libreta_errores',
  RETOS_PABLO: 'retos_pablo',
  SESIONES_PABLO: 'sesiones_pablo',
  ARTEFACTOS: 'artefactos',
} as const;

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim();

const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseEnvValues.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: firebaseEnvValues.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: firebaseEnvValues.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: firebaseEnvValues.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: firebaseEnvValues.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: firebaseEnvValues.VITE_FIREBASE_APP_ID?.trim(),
  ...(measurementId ? { measurementId } : {}),
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  console.warn(
    `[Firebase] Configuración incompleta. Faltan variables en .env: ${missingFirebaseEnvVars.join(', ')}`,
  );
}

export { app, db };

/**
 * Devuelve la instancia activa de Firestore o lanza un error descriptivo
 * indicando las variables de entorno pendientes.
 */
export function requireDb(): Firestore {
  if (!db) {
    throw new Error(
      `Cloud Firestore no está inicializado. Configura en .env las variables faltantes: ${missingFirebaseEnvVars.join(', ')}`,
    );
  }
  return db;
}
