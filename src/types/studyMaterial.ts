import type { FalloEnPartida, InteraccionPartida, TipoJuego } from './firestore';
import type { OcrVerificationData } from './ocr';

export type FormaGeometrica =
  | 'triangulo'
  | 'rectangulo'
  | 'cuadrado'
  | 'circulo'
  | 'rombo'
  | 'trapecio';

export interface MedidaFigura {
  etiqueta: string;
  valor: string;
}

export interface MarcaRectaNumerica {
  valor: number;
  etiqueta?: string;
}

export interface PuntoCoordenadas {
  x: number;
  y: number;
  etiqueta?: string;
}

export interface VisualSpec {
  tipo:
    | 'fraccion_barra'
    | 'fraccion_circulo'
    | 'recta_numerica'
    | 'figura_geometrica'
    | 'ejes_coordenadas'
    | 'tabla_datos'
    | 'svg_libre';
  titulo?: string;
  pie_figura?: string;
  // Para fraccion_barra y fraccion_circulo
  denominador?: number;
  numerador?: number;
  filas?: number;
  modo?: 'colorear' | 'lectura';
  // Para recta_numerica
  min?: number;
  max?: number;
  paso?: number;
  marcas_destacadas?: MarcaRectaNumerica[];
  // Para figura_geometrica
  forma?: FormaGeometrica;
  medidas?: MedidaFigura[];
  // Para ejes_coordenadas
  rango?: number;
  puntos?: PuntoCoordenadas[];
  // Para tabla_datos
  columnas?: string[];
  filas_tabla?: string[][];
  filas_vacias_alumno?: number;
  // Para svg_libre (diagramas de biología, geografía, tecnología...)
  viewBox?: string;
  svg_contenido?: string;
}

export interface GenerationPromptConfig {
  cantidad: number;
  tipologias: string[];
  incluirDibujos: boolean;
  dificultad: NivelDificultad;
  promptLibre: string;
}

export interface EsquemaRama {
  titulo: string;
  icono_visual: string;
  resumen_clave: string;
  subconceptos: string[];
  conexion_con_otros_temas: string;
  es_repaso_libreta: boolean;
}

export interface ReglaMnemotecnica {
  regla: string;
  significado: string;
  ejemplo_aplicado: string;
}

export interface ErrorFrecuenteComparativa {
  error_comun: string;
  forma_correcta: string;
  truco_para_evitarlo: string;
}

export interface EsquemaVisualData {
  titulo_central: string;
  subtitulo_competencial: string;
  enfoque_canarias_lomloe: string;
  ramas: EsquemaRama[];
  reglas_mnemotecnicas: ReglaMnemotecnica[];
  alertas_errores: ErrorFrecuenteComparativa[];
  recurso_visual?: VisualSpec;
}

export interface BloqueAndamiaje {
  numero: number;
  titulo: string;
  explicacion_breve: string;
  anclaje_visual_dual_coding: string;
  pregunta_verificacion: string;
  pista: string;
  solucion_oculta: string;
  refuerza_error_libreta: boolean;
  recurso_visual?: VisualSpec;
}

export interface ExplicacionAndamiajeData {
  introduccion: string;
  bloques: BloqueAndamiaje[];
  reto_integrador_final: {
    situacion_problema: string;
    pregunta_guia: string;
    respuesta_modelo: string;
  };
}

export type TipoPreguntaExamen = 'corta' | 'desarrollo' | 'practica' | 'competencial';

export interface PreguntaExamen {
  numero: number;
  tipo: TipoPreguntaExamen;
  enunciado: string;
  puntuacion: number;
  lineas_espacio: number;
  evalua_error_libreta: boolean;
  criterio_lomloe: string;
  solucion_docente: string;
  nota_correccion: string;
  recurso_visual?: VisualSpec;
}

export interface ExamenPdfData {
  titulo: string;
  subtitulo: string;
  duracion_estimada: string;
  instrucciones_alumno: string;
  puntuacion_total: number;
  preguntas: PreguntaExamen[];
  rubrica_docente: string;
  es_simulacion_examen?: boolean;
  nivel_etiqueta?: string;
}

export type TipoDocumentoEvaluacion =
  | 'ficha_refuerzo'
  | 'ficha_estandar'
  | 'ficha_ampliacion'
  | 'simulacion_examen';

export interface EvaluacionYFichasBundle {
  ficha_refuerzo?: ExamenPdfData;
  ficha_estandar?: ExamenPdfData;
  ficha_ampliacion?: ExamenPdfData;
  simulacion_examen?: ExamenPdfData;
}

export interface FlashcardItem {
  id: string;
  frente: string;
  reverso: string;
  pista: string;
  concepto_clave: string;
  es_repaso_libreta: boolean;
  recurso_visual?: VisualSpec;
}

export interface FlashcardsPayload {
  tipo_juego: 'flashcards';
  titulo: string;
  instrucciones: string;
  tarjetas: FlashcardItem[];
}

export interface ClasificarCategoria {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface ClasificarElemento {
  id: string;
  texto: string;
  categoria_correcta_id: string;
  explicacion: string;
  es_repaso_libreta: boolean;
}

export interface ClasificarPayload {
  tipo_juego: 'clasificar';
  titulo: string;
  instrucciones: string;
  categorias: ClasificarCategoria[];
  elementos: ClasificarElemento[];
}

export interface TriviaPregunta {
  id: string;
  pregunta: string;
  opciones: string[];
  indice_correcto: number;
  pista: string;
  explicacion: string;
  concepto_clave: string;
  es_repaso_libreta: boolean;
  recurso_visual?: VisualSpec;
}

export interface TriviaRetoPayload {
  tipo_juego: 'trivia_reto';
  titulo: string;
  instrucciones: string;
  preguntas: TriviaPregunta[];
}

export interface CazaErrorCaso {
  id: string;
  contexto: string;
  afirmaciones: string[];
  indice_error: number;
  explicacion_correccion: string;
  concepto_clave: string;
  es_repaso_libreta: boolean;
  recurso_visual?: VisualSpec;
}

export interface CazaErrorPayload {
  tipo_juego: 'caza_error';
  titulo: string;
  instrucciones: string;
  casos: CazaErrorCaso[];
}

export interface PasoOrdenar {
  id: string;
  texto: string;
}

export interface SecuenciaOrdenar {
  id: string;
  enunciado: string;
  explicacion_final: string;
  concepto_clave: string;
  es_repaso_libreta: boolean;
  pasos_orden_correcto: PasoOrdenar[];
}

export interface OrdenarPasosPayload {
  tipo_juego: 'ordenar_pasos';
  titulo: string;
  instrucciones: string;
  secuencias: SecuenciaOrdenar[];
}

export interface NeonHtmlPayload {
  tipo_juego: 'html5_neon';
  titulo: string;
  instrucciones: string;
  estilo_mecanica: string;
  conceptos_clave: string[];
  html_completo: string;
}

export type GamePayload =
  | FlashcardsPayload
  | ClasificarPayload
  | TriviaRetoPayload
  | CazaErrorPayload
  | NeonHtmlPayload
  | OrdenarPasosPayload;

export interface MiniAppsBundle {
  flashcards?: FlashcardsPayload;
  clasificar?: ClasificarPayload;
  trivia_reto?: TriviaRetoPayload;
  caza_error?: CazaErrorPayload;
  html5_neon?: NeonHtmlPayload;
  ordenar_pasos?: OrdenarPasosPayload;
}

export interface GeneratedStudyPack {
  asignatura: string;
  tema: string;
  esquema_visual?: EsquemaVisualData;
  explicacion_andamiaje?: ExplicacionAndamiajeData;
  evaluacion_y_fichas: EvaluacionYFichasBundle;
  mini_apps: MiniAppsBundle;
}

export interface GameCompletionResult {
  puntuacion: number;
  aciertos: number;
  total: number;
  fallos: FalloEnPartida[];
  interacciones: InteraccionPartida[];
}

export type NivelDificultad = 'refuerzo' | 'estandar' | 'ampliacion' | 'reto_alto';

export type EstadoArtefacto = 'activo' | 'superado';

export interface ArtefactoIteracion {
  version: number;
  fecha: string;
  dificultad: NivelDificultad;
  instruccion: string;
}

export interface ArtefactoDoc {
  id: string;
  asignatura: string;
  tema: string;
  titulo: string;
  dificultad: NivelDificultad;
  estado: EstadoArtefacto;
  version: number;
  verification: OcrVerificationData;
  study_pack: GeneratedStudyPack;
  injected_errors_summary: string[];
  sesion_pablo_id?: string;
  historial_iteraciones: ArtefactoIteracion[];
  created_at: string;
  updated_at: string;
}

export type { TipoJuego };
