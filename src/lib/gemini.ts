import { GoogleGenAI, Type } from '@google/genai';
import type { Part, Schema } from '@google/genai';
import { getAsignaturaByNombre } from '../data/curriculumCanarias';
import type { LibretaErrorDoc, TipoJuego } from '../types/firestore';
import type {
  FuenteDocumento,
  OcrVerificationData,
  SeveridadError,
  UploadedImageItem,
} from '../types/ocr';
import type {
  CazaErrorPayload,
  ClasificarPayload,
  EsquemaVisualData,
  EvaluacionYFichasBundle,
  ExamenPdfData,
  ExplicacionAndamiajeData,
  FlashcardsPayload,
  GamePayload,
  GeneratedStudyPack,
  GenerationPromptConfig,
  MiniAppsBundle,
  NeonHtmlPayload,
  NivelDificultad,
  TipoDocumentoEvaluacion,
  TriviaRetoPayload,
} from '../types/studyMaterial';

export const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL?.trim() || 'gemini-3.8-flash';

export const isGeminiConfigured = Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim());

/**
 * Skill pedagógica integrada ("Ejercicios 1º ESO Canarias") con LaTeX (KaTeX) y figuras visuales.
 */
export const CUSTOM_PEDAGOGICAL_SKILL = `
SKILL PEDAGÓGICA: EJERCICIOS Y EVALUACIÓN 1º ESO CANARIAS (DECRETO 30/2023, DE 16 DE MARZO)

1. MARCO NORMATIVO Y CONTEXTO CANARIO:
- Alinea cada actividad, ficha, examen y mini-app con el Decreto 30/2023 (Canarias) para 1º de ESO (12-13 años).
- Moviliza saberes básicos y criterios de evaluación reales de la materia, favoreciendo situaciones de aprendizaje contextualizadas con referentes del entorno sociocultural y natural de Canarias cuando sea pertinente.
- Cuando los apuntes o fotos subidas estén incompletos respecto a los saberes básicos oficiales del tema, complétalos de forma estructurada y rigurosa.

2. NOTACIÓN MATEMÁTICA LATEX (OBLIGATORIO PARA FÓRMULAS Y FRACCIONES):
- Usa SIEMPRE delimitadores LaTeX ($...$ en línea y $$...$$ en bloque) para expresiones matemáticas, fracciones (ej. $\\frac{3}{4}$), potencias ($2^3$), raíces ($\\sqrt{25}$), ecuaciones ($2x + 3 = 11$), ángulos ($90^\\circ$) o unidades compuestas ($\\text{cm}^2$).
- No pongas $ sueltos para dinero: usa "euros" o "€" para precios (ej. 12 €).

3. DIBUJOS, FIGURAS GEOMÉTRICAS Y RECURSOS VISUALES (recurso_visual):
- Cuando el ejercicio involucre representar o colorear fracciones, usa "fraccion_barra" o "fraccion_circulo" con "denominador", "numerador" y "modo": "colorear" (en Versión Alumno aparecerá en blanco para que Pablo la pinte, y en el solucionario docente aparecerá coloreada) o "lectura" (ya sombreada para identificar la fracción).
- Cuando involucre comparar u ordenar números/fracciones, usa "recta_numerica" ("min", "max", "paso", "marcas_destacadas").
- Cuando involucre áreas, perímetros o geometría, usa "figura_geometrica" ("forma": triangulo|rectangulo|cuadrado|circulo|rombo|trapecio, "medidas").
- Para coordenadas cartesianas, usa "ejes_coordenadas". Para tablas de proporcionalidad, datos o análisis morfológico, usa "tabla_datos".
- Para otras materias (Biología, Tecnología, Geografía), cuando un dibujo ayude, usa "svg_libre" con SVG limpio y etiquetas claras dentro de viewBox="0 0 280 160".

4. ESTRUCTURA PEDAGÓGICA Y SOLUCIONARIO:
- Lenguaje cercano, riguroso pero claro, motivador y sin sobrecarga cognitiva.
- Diferencia estrictamente fichas graduadas de práctica frente a Simulación de Examen (evaluación objetiva sin pistas).
- Proporciona siempre solucionario paso a paso en ejercicios complejos (solucion_docente y nota_correccion).
- En todas las mini-apps da feedback inmediato explicando el porqué pedagógico.
- Respeta siempre el aislamiento del artefacto actual: no mezcles temas ni errores de otros artefactos salvo los invocados expresamente por el docente.
`.trim();

function getGenAIClient(): GoogleGenAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'Falta VITE_GEMINI_API_KEY en el archivo .env. Configura tu clave de Google Gemini para generar materiales.',
    );
  }
  return new GoogleGenAI({ apiKey });
}

function parseJsonResponse<T>(rawText: string | undefined): T {
  if (!rawText || !rawText.trim()) {
    throw new Error('Gemini devolvió una respuesta vacía. Inténtalo de nuevo.');
  }

  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('[Gemini] Error al parsear JSON:', cleaned, error);
    throw new Error('La respuesta de Gemini no tuvo un formato JSON válido. Vuelve a intentarlo.');
  }
}

export interface RawOcrResponse {
  tema: string;
  transcripcion: string;
  epigrafes_indice: string[];
  contenido_curricular_completado: string;
  criterios_evaluacion_lomloe: string[];
  observaciones_legibilidad: string;
  errores_detectados: Array<{
    concepto_fallado: string;
    explicacion_error: string;
    severidad: SeveridadError;
  }>;
}

const ocrResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tema: { type: Type.STRING },
    transcripcion: { type: Type.STRING },
    epigrafes_indice: {
      type: Type.ARRAY,
      description:
        'Lista ordenada de unidades, epígrafes o apartados detectados en el índice o en los apuntes para poder elegir cuáles practicar.',
      items: { type: Type.STRING },
    },
    contenido_curricular_completado: { type: Type.STRING },
    criterios_evaluacion_lomloe: { type: Type.ARRAY, items: { type: Type.STRING } },
    observaciones_legibilidad: { type: Type.STRING },
    errores_detectados: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          concepto_fallado: { type: Type.STRING },
          explicacion_error: { type: Type.STRING },
          severidad: {
            type: Type.STRING,
            format: 'enum',
            enum: ['alta', 'media', 'baja'],
          },
        },
        required: ['concepto_fallado', 'explicacion_error', 'severidad'],
      },
    },
  },
  required: [
    'tema',
    'transcripcion',
    'epigrafes_indice',
    'contenido_curricular_completado',
    'criterios_evaluacion_lomloe',
    'observaciones_legibilidad',
    'errores_detectados',
  ],
};

const visualSpecSchema: Schema = {
  type: Type.OBJECT,
  nullable: true,
  description:
    'Figura geométrica, representación de fracción, recta numérica, tabla o diagrama SVG opcional para acompañar el enunciado.',
  properties: {
    tipo: {
      type: Type.STRING,
      format: 'enum',
      enum: [
        'fraccion_barra',
        'fraccion_circulo',
        'recta_numerica',
        'figura_geometrica',
        'ejes_coordenadas',
        'tabla_datos',
        'svg_libre',
      ],
    },
    titulo: { type: Type.STRING },
    pie_figura: { type: Type.STRING },
    denominador: { type: Type.INTEGER },
    numerador: { type: Type.INTEGER },
    filas: { type: Type.INTEGER },
    modo: { type: Type.STRING, format: 'enum', enum: ['colorear', 'lectura'] },
    min: { type: Type.NUMBER },
    max: { type: Type.NUMBER },
    paso: { type: Type.NUMBER },
    marcas_destacadas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          valor: { type: Type.NUMBER },
          etiqueta: { type: Type.STRING },
        },
        required: ['valor'],
      },
    },
    forma: {
      type: Type.STRING,
      format: 'enum',
      enum: ['triangulo', 'rectangulo', 'cuadrado', 'circulo', 'rombo', 'trapecio'],
    },
    medidas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          etiqueta: { type: Type.STRING },
          valor: { type: Type.STRING },
        },
        required: ['etiqueta', 'valor'],
      },
    },
    rango: { type: Type.INTEGER },
    puntos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER },
          etiqueta: { type: Type.STRING },
        },
        required: ['x', 'y'],
      },
    },
    columnas: { type: Type.ARRAY, items: { type: Type.STRING } },
    filas_tabla: {
      type: Type.ARRAY,
      items: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    filas_vacias_alumno: { type: Type.INTEGER },
    viewBox: { type: Type.STRING },
    svg_contenido: { type: Type.STRING },
  },
  required: ['tipo'],
};

const esquemaVisualSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    titulo_central: { type: Type.STRING },
    subtitulo_competencial: { type: Type.STRING },
    enfoque_canarias_lomloe: { type: Type.STRING },
    recurso_visual: visualSpecSchema,
    ramas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          titulo: { type: Type.STRING },
          icono_visual: { type: Type.STRING },
          resumen_clave: { type: Type.STRING },
          subconceptos: { type: Type.ARRAY, items: { type: Type.STRING } },
          conexion_con_otros_temas: { type: Type.STRING },
          es_repaso_libreta: { type: Type.BOOLEAN },
        },
        required: [
          'titulo',
          'icono_visual',
          'resumen_clave',
          'subconceptos',
          'conexion_con_otros_temas',
          'es_repaso_libreta',
        ],
      },
    },
    reglas_mnemotecnicas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          regla: { type: Type.STRING },
          significado: { type: Type.STRING },
          ejemplo_aplicado: { type: Type.STRING },
        },
        required: ['regla', 'significado', 'ejemplo_aplicado'],
      },
    },
    alertas_errores: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          error_comun: { type: Type.STRING },
          forma_correcta: { type: Type.STRING },
          truco_para_evitarlo: { type: Type.STRING },
        },
        required: ['error_comun', 'forma_correcta', 'truco_para_evitarlo'],
      },
    },
  },
  required: [
    'titulo_central',
    'subtitulo_competencial',
    'enfoque_canarias_lomloe',
    'ramas',
    'reglas_mnemotecnicas',
    'alertas_errores',
  ],
};

const andamiajeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    introduccion: { type: Type.STRING },
    bloques: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          numero: { type: Type.INTEGER },
          titulo: { type: Type.STRING },
          explicacion_breve: { type: Type.STRING },
          anclaje_visual_dual_coding: { type: Type.STRING },
          pregunta_verificacion: { type: Type.STRING },
          pista: { type: Type.STRING },
          solucion_oculta: { type: Type.STRING },
          refuerza_error_libreta: { type: Type.BOOLEAN },
          recurso_visual: visualSpecSchema,
        },
        required: [
          'numero',
          'titulo',
          'explicacion_breve',
          'anclaje_visual_dual_coding',
          'pregunta_verificacion',
          'pista',
          'solucion_oculta',
          'refuerza_error_libreta',
        ],
      },
    },
    reto_integrador_final: {
      type: Type.OBJECT,
      properties: {
        situacion_problema: { type: Type.STRING },
        pregunta_guia: { type: Type.STRING },
        respuesta_modelo: { type: Type.STRING },
      },
      required: ['situacion_problema', 'pregunta_guia', 'respuesta_modelo'],
    },
  },
  required: ['introduccion', 'bloques', 'reto_integrador_final'],
};

const fichaOExamenSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    titulo: { type: Type.STRING },
    subtitulo: { type: Type.STRING },
    duracion_estimada: { type: Type.STRING },
    instrucciones_alumno: { type: Type.STRING },
    puntuacion_total: { type: Type.NUMBER },
    es_simulacion_examen: { type: Type.BOOLEAN },
    nivel_etiqueta: { type: Type.STRING },
    preguntas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          numero: { type: Type.INTEGER },
          tipo: {
            type: Type.STRING,
            format: 'enum',
            enum: ['corta', 'desarrollo', 'practica', 'competencial'],
          },
          enunciado: { type: Type.STRING },
          puntuacion: { type: Type.NUMBER },
          lineas_espacio: { type: Type.INTEGER },
          evalua_error_libreta: { type: Type.BOOLEAN },
          criterio_lomloe: { type: Type.STRING },
          solucion_docente: { type: Type.STRING },
          nota_correccion: { type: Type.STRING },
          recurso_visual: visualSpecSchema,
        },
        required: [
          'numero',
          'tipo',
          'enunciado',
          'puntuacion',
          'lineas_espacio',
          'evalua_error_libreta',
          'criterio_lomloe',
          'solucion_docente',
          'nota_correccion',
        ],
      },
    },
    rubrica_docente: { type: Type.STRING },
  },
  required: [
    'titulo',
    'subtitulo',
    'duracion_estimada',
    'instrucciones_alumno',
    'puntuacion_total',
    'es_simulacion_examen',
    'nivel_etiqueta',
    'preguntas',
    'rubrica_docente',
  ],
};

const flashcardsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tipo_juego: { type: Type.STRING, format: 'enum', enum: ['flashcards'] },
    titulo: { type: Type.STRING },
    instrucciones: { type: Type.STRING },
    tarjetas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          frente: { type: Type.STRING },
          reverso: { type: Type.STRING },
          pista: { type: Type.STRING },
          concepto_clave: { type: Type.STRING },
          es_repaso_libreta: { type: Type.BOOLEAN },
          recurso_visual: visualSpecSchema,
        },
        required: ['id', 'frente', 'reverso', 'pista', 'concepto_clave', 'es_repaso_libreta'],
      },
    },
  },
  required: ['tipo_juego', 'titulo', 'instrucciones', 'tarjetas'],
};

const clasificarSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tipo_juego: { type: Type.STRING, format: 'enum', enum: ['clasificar'] },
    titulo: { type: Type.STRING },
    instrucciones: { type: Type.STRING },
    categorias: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          nombre: { type: Type.STRING },
          descripcion: { type: Type.STRING },
        },
        required: ['id', 'nombre', 'descripcion'],
      },
    },
    elementos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          texto: { type: Type.STRING },
          categoria_correcta_id: { type: Type.STRING },
          explicacion: { type: Type.STRING },
          es_repaso_libreta: { type: Type.BOOLEAN },
        },
        required: ['id', 'texto', 'categoria_correcta_id', 'explicacion', 'es_repaso_libreta'],
      },
    },
  },
  required: ['tipo_juego', 'titulo', 'instrucciones', 'categorias', 'elementos'],
};

const triviaRetoSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tipo_juego: { type: Type.STRING, format: 'enum', enum: ['trivia_reto'] },
    titulo: { type: Type.STRING },
    instrucciones: { type: Type.STRING },
    preguntas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          pregunta: { type: Type.STRING },
          opciones: { type: Type.ARRAY, items: { type: Type.STRING } },
          indice_correcto: { type: Type.INTEGER },
          pista: { type: Type.STRING },
          explicacion: { type: Type.STRING },
          concepto_clave: { type: Type.STRING },
          es_repaso_libreta: { type: Type.BOOLEAN },
          recurso_visual: visualSpecSchema,
        },
        required: [
          'id',
          'pregunta',
          'opciones',
          'indice_correcto',
          'pista',
          'explicacion',
          'concepto_clave',
          'es_repaso_libreta',
        ],
      },
    },
  },
  required: ['tipo_juego', 'titulo', 'instrucciones', 'preguntas'],
};

const cazaErrorSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tipo_juego: { type: Type.STRING, format: 'enum', enum: ['caza_error'] },
    titulo: { type: Type.STRING },
    instrucciones: { type: Type.STRING },
    casos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          contexto: { type: Type.STRING },
          afirmaciones: { type: Type.ARRAY, items: { type: Type.STRING } },
          indice_error: { type: Type.INTEGER },
          explicacion_correccion: { type: Type.STRING },
          concepto_clave: { type: Type.STRING },
          es_repaso_libreta: { type: Type.BOOLEAN },
          recurso_visual: visualSpecSchema,
        },
        required: [
          'id',
          'contexto',
          'afirmaciones',
          'indice_error',
          'explicacion_correccion',
          'concepto_clave',
          'es_repaso_libreta',
        ],
      },
    },
  },
  required: ['tipo_juego', 'titulo', 'instrucciones', 'casos'],
};

const neonHtmlSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tipo_juego: { type: Type.STRING, format: 'enum', enum: ['html5_neon'] },
    titulo: { type: Type.STRING },
    instrucciones: { type: Type.STRING },
    estilo_mecanica: {
      type: Type.STRING,
      description: 'Nombre breve del género visual/arcade implementado (ej. Pintor Neón en Canvas, Misión Escudos, Memory Cyber).',
    },
    conceptos_clave: { type: Type.ARRAY, items: { type: Type.STRING } },
    html_completo: {
      type: Type.STRING,
      description:
        'Documento HTML5 autocontenido completo (<!DOCTYPE html><html>...</html>) con CSS neón oscuro y JavaScript interactivo sin librerías externas obligatorias.',
    },
  },
  required: [
    'tipo_juego',
    'titulo',
    'instrucciones',
    'estilo_mecanica',
    'conceptos_clave',
    'html_completo',
  ],
};

const DIFICULTAD_GUIDANCE: Record<NivelDificultad, string> = {
  refuerzo:
    'NIVEL REFUERZO GUIADO: pasos muy pequeños, lenguaje muy cercano y consolidación de base.',
  estandar:
    'NIVEL ESTÁNDAR 1º ESO (LOMLOE CANARIAS): equilibrio entre comprensión, práctica y competencia.',
  ampliacion:
    'NIVEL AMPLIACIÓN: menos pistas obvias, razonamiento en varios pasos y transferencia.',
  reto_alto:
    'NIVEL RETO ALTO: ejercicios exigentes, distractores inteligentes y problemas combinados.',
};

const EVAL_DOC_GUIDANCE: Record<TipoDocumentoEvaluacion, string> = {
  ficha_refuerzo:
    'FICHA 1 · NIVEL REFUERZO / BASE (es_simulacion_examen: false): consolidación guiada de conceptos esenciales.',
  ficha_estandar:
    'FICHA 2 · NIVEL ESTÁNDAR / PRÁCTICA (es_simulacion_examen: false): aplicación variada de los saberes básicos.',
  ficha_ampliacion:
    'FICHA 3 · NIVEL AMPLIACIÓN / COMPETENCIAL (es_simulacion_examen: false): transferencia y razonamiento.',
  simulacion_examen:
    'SIMULACIÓN OFICIAL DE EXAMEN (es_simulacion_examen: true): NO es práctica ni da pistas; evalúa conocimientos, saberes y capacidades según criterios del Decreto 30/2023.',
};

function sanitizeGamePayload(payload: GamePayload): GamePayload {
  switch (payload.tipo_juego) {
    case 'flashcards': {
      const normalized: FlashcardsPayload = {
        ...payload,
        tipo_juego: 'flashcards',
        tarjetas: payload.tarjetas.map((t, index) => ({
          ...t,
          id: t.id?.trim() || `fc_${index + 1}`,
        })),
      };
      return normalized;
    }
    case 'clasificar': {
      const validCatIds = new Set(payload.categorias.map((c) => c.id));
      const fallbackCatId = payload.categorias[0]?.id ?? 'cat_1';
      const normalized: ClasificarPayload = {
        ...payload,
        tipo_juego: 'clasificar',
        elementos: payload.elementos.map((el, index) => ({
          ...el,
          id: el.id?.trim() || `el_${index + 1}`,
          categoria_correcta_id: validCatIds.has(el.categoria_correcta_id)
            ? el.categoria_correcta_id
            : fallbackCatId,
        })),
      };
      return normalized;
    }
    case 'trivia_reto': {
      const normalized: TriviaRetoPayload = {
        ...payload,
        tipo_juego: 'trivia_reto',
        preguntas: payload.preguntas.map((q, index) => {
          const maxIndex = Math.max(0, q.opciones.length - 1);
          const safeIndex = Math.min(maxIndex, Math.max(0, Math.round(q.indice_correcto)));
          return {
            ...q,
            id: q.id?.trim() || `tr_${index + 1}`,
            indice_correcto: safeIndex,
          };
        }),
      };
      return normalized;
    }
    case 'caza_error': {
      const normalized: CazaErrorPayload = {
        ...payload,
        tipo_juego: 'caza_error',
        casos: payload.casos.map((c, index) => {
          const maxIndex = Math.max(0, c.afirmaciones.length - 1);
          const safeIndex = Math.min(maxIndex, Math.max(0, Math.round(c.indice_error)));
          return {
            ...c,
            id: c.id?.trim() || `ce_${index + 1}`,
            indice_error: safeIndex,
          };
        }),
      };
      return normalized;
    }
    case 'html5_neon': {
      let html = payload.html_completo.trim();
      if (html.startsWith('```')) {
        html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '').trim();
      }
      const normalized: NeonHtmlPayload = {
        ...payload,
        tipo_juego: 'html5_neon',
        conceptos_clave: Array.isArray(payload.conceptos_clave)
          ? payload.conceptos_clave
          : [],
        html_completo: html,
      };
      return normalized;
    }
    case 'ordenar_pasos':
      return payload;
  }
}

function buildPedagogicalContext(
  verification: OcrVerificationData,
  invokedLibretaErrores: LibretaErrorDoc[],
): string {
  const materia = getAsignaturaByNombre(verification.asignatura);
  const curriculumBlock = materia
    ? `Asignatura: ${materia.nombre} (1º ESO Canarias, Decreto 30/2023 LOMLOE)
Competencias clave prioritarias: ${materia.competenciasClave.join(', ')}
Enfoque curricular Canarias: ${materia.enfoqueDecreto30}`
    : `Asignatura: ${verification.asignatura} (1º ESO Canarias, Decreto 30/2023 LOMLOE)`;

  const criteriosText =
    verification.criterios_evaluacion_lomloe.length > 0
      ? verification.criterios_evaluacion_lomloe.map((c, i) => `${i + 1}. ${c}`).join('\n')
      : 'Aplicar criterios de evaluación oficiales del Decreto 30/2023 para 1º ESO.';

  const pabloErrors = verification.errores_detectados.filter(
    (e) => e.origen === 'error_pablo',
  );
  const materialErrors = verification.errores_detectados.filter(
    (e) => e.origen === 'error_material',
  );

  const pabloErrorsText =
    pabloErrors.length > 0
      ? pabloErrors
          .map(
            (err, idx) =>
              `${idx + 1}. [Severidad: ${err.severidad}] ${err.concepto_fallado}: ${err.explicacion_error}`,
          )
          .join('\n')
      : 'No se confirmaron errores personales de Pablo en esta entrega.';

  const materialErrorsText =
    materialErrors.length > 0
      ? materialErrors
          .map(
            (err, idx) =>
              `${idx + 1}. [Ejemplo/errata del libro o apuntes, NO es fallo de Pablo] ${err.concepto_fallado}: ${err.explicacion_error}`,
          )
          .join('\n')
      : 'Ninguno.';

  const invokedText =
    invokedLibretaErrores.length > 0
      ? invokedLibretaErrores
          .map(
            (err, idx) =>
              `${idx + 1}. [INVOCADO POR DOCENTE | Fallado ${err.veces_fallado}x | Tema: ${err.tema}] ${err.concepto_fallado}: ${err.explicacion_error}`,
          )
          .join('\n')
      : 'El docente no ha invocado errores previos de otros artefactos para esta sesión.';

  const selectedEpigrafes = (verification.epigrafes_seleccionados ?? []).filter((e) =>
    e.trim(),
  );
  const allEpigrafes = (verification.epigrafes_indice ?? []).filter((e) => e.trim());

  const focoIndiceBlock =
    selectedEpigrafes.length > 0
      ? `=== APARTADOS ELEGIDOS DEL ÍNDICE PARA PRACTICAR HOY (FOCO PRIORITARIO) ===
${selectedEpigrafes.map((e, i) => `${i + 1}. ${e}`).join('\n')}
IMPORTANTE: Centra las actividades, ejemplos y ejercicios específicamente en estos apartados elegidos.${
          allEpigrafes.length > selectedEpigrafes.length
            ? `\n(Índice completo del tema como contexto: ${allEpigrafes.join(' | ')})`
            : ''
        }
`
      : allEpigrafes.length > 0
        ? `=== APARTADOS DEL ÍNDICE / TEMARIO ===
${allEpigrafes.map((e, i) => `${i + 1}. ${e}`).join('\n')}
`
        : '';

  return `${curriculumBlock}
Tema actual: ${verification.tema}
Tipo de material analizado: ${verification.fuente}

=== CRITERIOS / SABERES LOMLOE DEL TEMA ===
${criteriosText}

${focoIndiceBlock}=== CONTENIDO VERIFICADO POR EL DOCENTE ===
${verification.transcripcion}

${
  verification.incluir_completado_curricular &&
  verification.contenido_curricular_completado.trim()
    ? `=== COMPLECIÓN CURRICULAR LOMLOE (1º ESO CANARIAS) ===\n${verification.contenido_curricular_completado.trim()}\n`
    : ''
}${
  verification.notas_adicionales_docente.trim()
    ? `=== INSTRUCCIONES EXTRA DEL DOCENTE / PADRE ===\n${verification.notas_adicionales_docente.trim()}\n`
    : ''
}=== ERRORES REALES DE PABLO EN ESTA ENTREGA (A REFORZAR) ===
${pabloErrorsText}

=== ERRORES DEL PROPIO MATERIAL / EJEMPLOS DE CLASE ===
${materialErrorsText}

=== ERRORES PREVIOS INVOCADOS EXPRESAMENTE POR EL DOCENTE ===
${invokedText}`;
}

function buildConfigBlock(config: GenerationPromptConfig): string {
  const tiposText =
    config.tipologias.length > 0
      ? config.tipologias.join(', ')
      : 'Variedad equilibrada acorde al tema';

  return `=== PETICIÓN EXACTA DEL DOCENTE PARA ESTA GENERACIÓN ===
- Cantidad exacta de bloques / ejercicios / ítems solicitada: ${config.cantidad}
- Tipologías solicitadas: ${tiposText}
- Incluir dibujos / figuras geométricas / recursos visuales (recurso_visual): ${
    config.incluirDibujos
      ? 'SÍ, incluye recurso_visual donde aporte valor visual (ej. fraccion_barra o fraccion_circulo con modo "colorear" para pintar, figura_geometrica, recta_numerica, tabla_datos o svg_libre).'
      : 'NO es necesario incluir figuras visuales salvo si es imprescindible.'
  }
- ${DIFICULTAD_GUIDANCE[config.dificultad]}
${
  config.promptLibre.trim()
    ? `- Instrucción personalizada del docente: ${config.promptLibre.trim()}`
    : ''
}`;
}

export async function analyzeImagesOcr(params: {
  asignatura: string;
  fuente: FuenteDocumento;
  images: UploadedImageItem[];
  extraPrompt?: string;
}): Promise<RawOcrResponse> {
  if (params.images.length === 0) {
    throw new Error('Debes seleccionar al menos una imagen o PDF para analizar.');
  }

  const ai = getGenAIClient();
  const fileParts: Part[] = params.images.map((item) => ({
    inlineData: {
      mimeType: item.mimeType,
      data: item.base64Data,
    },
  }));

  const isIndice = params.fuente === 'indice_temario';
  const promptText = `Analiza cuidadosamente estos documentos (fotos o PDFs) de 1º de ESO en Canarias (Decreto 30/2023).
Asignatura seleccionada: ${params.asignatura}
Tipo de documento: ${params.fuente}
${params.extraPrompt?.trim() ? `Indicaciones del adulto / qué quiere practicar hoy: ${params.extraPrompt.trim()}` : ''}

Tareas del Paso 1:
1. Identifica el tema concreto de la materia.
2. ${
    isIndice
      ? 'Transcripción estructurada del ÍNDICE: transcribe todas las unidades, bloques o epígrafes visibles en "transcripcion" y extrae cada apartado limpio en el array "epigrafes_indice" para que el adulto pueda marcar exactamente qué practicar hoy.'
      : 'Transcribe fielmente todo el contenido visible (usa LaTeX $...$ para expresiones matemáticas si hay fórmulas) y enumera en "epigrafes_indice" los subapartados o bloques conceptuales principales detectados (o del índice si aparece uno).'
  }
3. COMPLECIÓN CURRICULAR (1º ESO Canarias, Decreto 30/2023): detecta qué saberes básicos o explicaciones clave del tema faltan o están incompletos respecto al currículo oficial y redáctalos de forma didáctica en "contenido_curricular_completado". Añade en "criterios_evaluacion_lomloe" los criterios oficiales vinculados.
4. DETECCIÓN DE ERRORES: ${
    isIndice
      ? 'Al ser un índice o temario, deja "errores_detectados" vacío salvo que haya anotaciones o fallos visibles.'
      : 'extrae cualquier fallo, tachón o ejercicio erróneo visible en "errores_detectados". El adulto confirmará luego si cada fallo es de Pablo o del propio material.'
  }
5. En "observaciones_legibilidad", señala zonas borrosas o dudas de lectura.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [...fileParts, { text: promptText }],
    config: {
      systemInstruction: `${CUSTOM_PEDAGOGICAL_SKILL}\n\nEres especialista en transcripción OCR educativa, currículo LOMLOE Canarias (1º ESO) y diagnóstico de errores escolares.`,
      responseMimeType: 'application/json',
      responseSchema: ocrResponseSchema,
      temperature: 0.2,
    },
  });

  return parseJsonResponse<RawOcrResponse>(response.text);
}

/**
 * Analiza un índice tecleado/pegado o una petición directa de tema sin necesidad de subir foto.
 */
export async function analyzeTextIndexOrTopic(params: {
  asignatura: string;
  fuente: FuenteDocumento;
  rawText: string;
  extraPrompt?: string;
}): Promise<RawOcrResponse> {
  if (!params.rawText.trim()) {
    throw new Error('Escribe o pega el índice o tema que quieres preparar.');
  }

  const ai = getGenAIClient();
  const promptText = `El docente o padre ha tecleado/pegado el siguiente índice, temario o petición de estudio para 1º de ESO en Canarias (Decreto 30/2023).
Asignatura seleccionada: ${params.asignatura}
Tipo de entrada: ${params.fuente}
Texto / índice introducido:
"""
${params.rawText.trim()}
"""
${params.extraPrompt?.trim() ? `Qué quiere practicar o indicaciones extra: ${params.extraPrompt.trim()}` : ''}

Tareas:
1. Deduce el título limpio del tema en "tema".
2. Organiza y amplía brevemente el contenido base del tema en "transcripcion" (usando LaTeX $...$ si es matemáticas) para que sirva de material de partida.
3. Extrae en "epigrafes_indice" la lista clara y ordenada de los apartados/epígrafes del índice (si solo escribió un tema corto como "Fracciones equivalentes", desglósalo en 4-6 apartados didácticos del tema para 1º ESO para que el adulto elija qué practicar hoy).
4. En "contenido_curricular_completado", completa los saberes básicos oficiales del Decreto 30/2023 (Canarias) para 1º ESO relacionados con esos apartados, y añade los "criterios_evaluacion_lomloe".
5. Deja "errores_detectados" vacío y "observaciones_legibilidad" vacío (o indica si algún apartado es muy amplio).`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ text: promptText }],
    config: {
      systemInstruction: `${CUSTOM_PEDAGOGICAL_SKILL}\n\nEres especialista en programación didáctica LOMLOE Canarias (1º ESO).`,
      responseMimeType: 'application/json',
      responseSchema: ocrResponseSchema,
      temperature: 0.25,
    },
  });

  return parseJsonResponse<RawOcrResponse>(response.text);
}

export async function generateEsquemaVisual(params: {
  verification: OcrVerificationData;
  libretaErrores: LibretaErrorDoc[];
  config: GenerationPromptConfig;
}): Promise<EsquemaVisualData> {
  const ai = getGenAIClient();
  const context = buildPedagogicalContext(params.verification, params.libretaErrores);
  const cfg = buildConfigBlock(params.config);

  const prompt = `Genera únicamente el **Esquema Visual** (Dual Coding, ramas conceptuales con LaTeX si aplica, reglas mnemotécnicas y semáforo de errores frecuentes) con exactamente ${params.config.cantidad} ramas conceptuales principales.

${cfg}

${context}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      systemInstruction: `${CUSTOM_PEDAGOGICAL_SKILL}\n\nGenera exclusivamente el JSON del Esquema Visual.`,
      responseMimeType: 'application/json',
      responseSchema: esquemaVisualSchema,
      temperature: 0.4,
    },
  });

  return parseJsonResponse<EsquemaVisualData>(response.text);
}

export async function generateAndamiaje(params: {
  verification: OcrVerificationData;
  libretaErrores: LibretaErrorDoc[];
  config: GenerationPromptConfig;
}): Promise<ExplicacionAndamiajeData> {
  const ai = getGenAIClient();
  const context = buildPedagogicalContext(params.verification, params.libretaErrores);
  const cfg = buildConfigBlock(params.config);

  const prompt = `Genera únicamente la **Explicación con Andamiaje** (bloques progresivos breves con anclaje visual, pregunta de verificación y solución oculta) con exactamente ${params.config.cantidad} bloques progresivos y 1 reto integrador final.

${cfg}

${context}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      systemInstruction: `${CUSTOM_PEDAGOGICAL_SKILL}\n\nGenera exclusivamente el JSON de Explicación con Andamiaje.`,
      responseMimeType: 'application/json',
      responseSchema: andamiajeSchema,
      temperature: 0.4,
    },
  });

  return parseJsonResponse<ExplicacionAndamiajeData>(response.text);
}

export async function generateSingleEvaluationDoc(params: {
  tipoDoc: TipoDocumentoEvaluacion;
  verification: OcrVerificationData;
  libretaErrores: LibretaErrorDoc[];
  config: GenerationPromptConfig;
  currentDoc?: ExamenPdfData;
}): Promise<ExamenPdfData> {
  const ai = getGenAIClient();
  const context = buildPedagogicalContext(params.verification, params.libretaErrores);
  const cfg = buildConfigBlock(params.config);

  const previousQuestionsNote = params.currentDoc
    ? `\nPreguntas anteriores a NO repetir literalmente:\n${params.currentDoc.preguntas
        .map((q) => `- ${q.enunciado}`)
        .join('\n')}`
    : '';

  const prompt = `Genera un documento de evaluación con exactamente ${params.config.cantidad} preguntas/ejercicios cuya puntuación sume 10 puntos en total:
${EVAL_DOC_GUIDANCE[params.tipoDoc]}

${cfg}
${previousQuestionsNote}

${context}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      systemInstruction: `${CUSTOM_PEDAGOGICAL_SKILL}\n\nEres especialista en evaluación LOMLOE Canarias (1º ESO). Devuelve JSON válido exacto.`,
      responseMimeType: 'application/json',
      responseSchema: fichaOExamenSchema,
      temperature: 0.5,
    },
  });

  const parsed = parseJsonResponse<ExamenPdfData>(response.text);
  return {
    ...parsed,
    es_simulacion_examen: params.tipoDoc === 'simulacion_examen',
  };
}

export async function generateSingleMiniApp(params: {
  tipoJuego: TipoJuego;
  verification: OcrVerificationData;
  libretaErrores: LibretaErrorDoc[];
  config: GenerationPromptConfig;
}): Promise<GamePayload> {
  const ai = getGenAIClient();
  const context = buildPedagogicalContext(params.verification, params.libretaErrores);
  const cfg = buildConfigBlock(params.config);

  const effectiveTipo =
    params.tipoJuego === 'ordenar_pasos' ? 'caza_error' : params.tipoJuego;

  if (effectiveTipo === 'html5_neon') {
    const prompt = `Programa una **Mini-App HTML5 tipo WOW con estética NEÓN CYBER-ARCADE** completamente autocontenida en un único archivo HTML5 ("html_completo") con exactamente ${params.config.cantidad} retos/fases/ejercicios para Pablo (1º de ESO Canarias, 12 años).

${cfg}

REQUISITOS DE DISEÑO Y PROGRAMACIÓN DE "html_completo":
1. Documento único válido \`<!DOCTYPE html><html lang="es">...</html>\` con \`<style>\` y \`<script>\` embebidos (100% funcional offline sin depender de CDNs externos obligatorios, ideal para iframe y Safari iPad).
2. ESTÉTICA NEÓN WOW: fondo oscuro espacial/cyber (\`#050816\` con rejilla o brillo radial sutil), tarjetas translúcidas glassmorphism, bordes y botones neón (\`#22d3ee\` cian, \`#e879f9\` magenta, \`#4ade80\` verde neón, \`#facc15\` dorado), tipografía clara legible (\`system-ui, sans-serif\`), barra de progreso animada, contador de combo/racha, botón visible de silencio/sonido con efectos sutiles en Web Audio API (activados solo tras clic del alumno).
3. MECÁNICA REALMENTE JUGABLE Y DIVERTIDA (NO un formulario aburrido):
   - Adapta la mecánica al tema y a lo pedido por el docente (por ejemplo: pintor interactivo de fracciones en SVG/Canvas donde Pablo hace clic en porciones para colorearlas y comprueba su fracción; nave/escudo espacial con opciones o teclado táctil numérico; juego de parejas luminosas / memory; recta numérica láser interactiva; duelo contrarreloj visual).
   - Incluye SVG dinámicos o Canvas nítidos cuando el tema tenga fracciones, geometría, gráficas o diagramas.
   - Para matemáticas, renderiza fracciones apiladas o potencias de forma impecable con HTML/CSS (\`<span class="frac"><span class="num">3</span><span class="den">4</span></span>\`, \`<sup>\`, \`×\`, \`÷\`, \`√\`, \`π\`), nunca dejes símbolos LaTeX crudos \`$...$\` sin formatear en pantalla.
4. FEEDBACK INMEDIATO PEDAGÓGICO: tras cada respuesta, explica brevemente *por qué* es correcta o el truco para corregir el fallo antes de pasar al siguiente reto.
5. PANTALLA FINAL + TELEMETRÍA OBLIGATORIA PARA TUTOR PABLO:
   - Al terminar los ${params.config.cantidad} retos, muestra una pantalla final luminosa con puntuación (%), racha máxima, resumen de aciertos/fallos y botón "Volver a jugar".
   - Justo al completarse la partida, ejecuta OBLIGATORIAMENTE este envío al padre:
     \`\`\`js
     if (window.parent && window.parent !== window) {
       window.parent.postMessage({
         source: 'tutor-pablo-neon',
         completed: true,
         puntuacion: Math.round((aciertos / total) * 100),
         aciertos: aciertos,
         total: total,
         fallos: fallosArray, // [{ concepto, detalle, respuesta_alumno, respuesta_correcta }]
         interacciones: interaccionesArray // [{ item, respuesta_alumno, respuesta_correcta, correcto, explicacion }]
       }, '*');
     }
     \`\`\`
6. IMPORTANTE: Asegúrate de que TODO el JavaScript sea sintácticamente válido, sin errores, táctil (botones >= 44px para iPad) y no uses \`alert()\` ni \`prompt()\`.

${context}`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: prompt }],
      config: {
        systemInstruction: `${CUSTOM_PEDAGOGICAL_SKILL}\n\nEres un experto ingeniero creativo de videojuegos educativos HTML5/CSS3/Canvas con estética neón para adolescentes de 12 años (1º ESO).`,
        responseMimeType: 'application/json',
        responseSchema: neonHtmlSchema,
        temperature: 0.65,
      },
    });

    const parsed = parseJsonResponse<GamePayload>(response.text);
    return sanitizeGamePayload(parsed);
  }

  const schemaByType: Record<
    'flashcards' | 'clasificar' | 'trivia_reto' | 'caza_error',
    Schema
  > = {
    flashcards: flashcardsSchema,
    clasificar: clasificarSchema,
    trivia_reto: triviaRetoSchema,
    caza_error: cazaErrorSchema,
  };

  const prompt = `Genera una mini-app interactiva de tipo "${effectiveTipo}" con exactamente ${params.config.cantidad} ítems/tarjetas/elementos/casos adaptada a iPad (1º ESO Canarias).

${cfg}

${context}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      systemInstruction: `${CUSTOM_PEDAGOGICAL_SKILL}\n\nEres diseñador de microjuegos educativos táctiles para iPad en 1º ESO.`,
      responseMimeType: 'application/json',
      responseSchema: schemaByType[effectiveTipo],
      temperature: 0.6,
    },
  });

  const parsed = parseJsonResponse<GamePayload>(response.text);
  return sanitizeGamePayload(parsed);
}

/**
 * Itera de forma consistente únicamente sobre las secciones del artefacto que ya existen.
 */
export async function iterateStudyPack(params: {
  currentPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  libretaErrores: LibretaErrorDoc[];
  targetDificultad: NivelDificultad;
  instruccionCambio: string;
}): Promise<GeneratedStudyPack> {
  const baseConfig: GenerationPromptConfig = {
    cantidad: 6,
    tipologias: ['Coherente con la iteración solicitada'],
    incluirDibujos: true,
    dificultad: params.targetDificultad,
    promptLibre: `Iteración sobre artefacto existente: ${
      params.instruccionCambio.trim() || 'Ajustar dificultad manteniendo consistencia global.'
    }`,
  };

  const nextPack: GeneratedStudyPack = {
    asignatura: params.verification.asignatura,
    tema: params.verification.tema,
    evaluacion_y_fichas: { ...params.currentPack.evaluacion_y_fichas },
    mini_apps: { ...params.currentPack.mini_apps },
  };

  const tasks: Array<Promise<void>> = [];

  if (params.currentPack.esquema_visual) {
    tasks.push(
      generateEsquemaVisual({
        verification: params.verification,
        libretaErrores: params.libretaErrores,
        config: {
          ...baseConfig,
          cantidad: Math.max(4, params.currentPack.esquema_visual.ramas.length),
        },
      }).then((res) => {
        nextPack.esquema_visual = res;
      }),
    );
  }

  if (params.currentPack.explicacion_andamiaje) {
    tasks.push(
      generateAndamiaje({
        verification: params.verification,
        libretaErrores: params.libretaErrores,
        config: {
          ...baseConfig,
          cantidad: Math.max(4, params.currentPack.explicacion_andamiaje.bloques.length),
        },
      }).then((res) => {
        nextPack.explicacion_andamiaje = res;
      }),
    );
  }

  const evalKeys: TipoDocumentoEvaluacion[] = [
    'ficha_refuerzo',
    'ficha_estandar',
    'ficha_ampliacion',
    'simulacion_examen',
  ];

  for (const key of evalKeys) {
    const existingDoc = params.currentPack.evaluacion_y_fichas[key];
    if (existingDoc) {
      tasks.push(
        generateSingleEvaluationDoc({
          tipoDoc: key,
          verification: params.verification,
          libretaErrores: params.libretaErrores,
          currentDoc: existingDoc,
          config: {
            ...baseConfig,
            cantidad: Math.max(4, existingDoc.preguntas.length),
          },
        }).then((res) => {
          nextPack.evaluacion_y_fichas[key] = res;
        }),
      );
    }
  }

  const gameKeys: Array<keyof MiniAppsBundle> = [
    'flashcards',
    'clasificar',
    'trivia_reto',
    'caza_error',
    'html5_neon',
  ];

  for (const key of gameKeys) {
    const existingGame = params.currentPack.mini_apps[key];
    if (existingGame) {
      tasks.push(
        generateSingleMiniApp({
          tipoJuego: key,
          verification: params.verification,
          libretaErrores: params.libretaErrores,
          config: baseConfig,
        }).then((res) => {
          if (res.tipo_juego === 'flashcards') nextPack.mini_apps.flashcards = res;
          else if (res.tipo_juego === 'clasificar') nextPack.mini_apps.clasificar = res;
          else if (res.tipo_juego === 'trivia_reto') nextPack.mini_apps.trivia_reto = res;
          else if (res.tipo_juego === 'caza_error') nextPack.mini_apps.caza_error = res;
          else if (res.tipo_juego === 'html5_neon') nextPack.mini_apps.html5_neon = res;
        }),
      );
    }
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  return nextPack;
}

export type { EvaluacionYFichasBundle };
