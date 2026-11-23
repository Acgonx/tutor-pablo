import type { GamePayload } from './studyMaterial';

export type EstadoError = 'pendiente' | 'en_repaso' | 'superado';

export type TipoJuego = 'flashcards' | 'clasificar' | 'trivia_reto' | 'ordenar_pasos';

export interface FalloEnPartida {
  concepto: string;
  detalle: string;
  respuesta_alumno?: string;
  respuesta_correcta?: string;
}

export interface LibretaErrorInput {
  asignatura: string;
  tema: string;
  concepto_fallado: string;
  explicacion_error: string;
  estado?: EstadoError;
  veces_fallado?: number;
}

export interface LibretaErrorDoc {
  id: string;
  asignatura: string;
  tema: string;
  concepto_fallado: string;
  explicacion_error: string;
  estado: EstadoError;
  veces_fallado: number;
  ultima_revision: string;
  created_at: string;
}

export interface RetoPabloDoc {
  id: string;
  asignatura: string;
  titulo: string;
  tipo_juego: TipoJuego;
  payload_json: string;
  completado: boolean;
  puntuacion: number | null;
  fallos_en_partida: FalloEnPartida[];
  created_at: string;
}

export interface RetoPabloHydrated extends RetoPabloDoc {
  payload: GamePayload;
}
