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
  MiniAppsBundle,
  NivelDificultad,
  TipoDocumentoEvaluacion,
  TriviaRetoPayload,
} from '../types/studyMaterial';

export const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL?.trim() || 'gemini-3.8-flash';

export const isGeminiConfigured = Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim());

/**
 * Espacio reservado para las instrucciones de la Skill / Gem personalizada del docente.
 * Se inyecta automáticamente en todas las llamadas pedagógicas de Gemini.
 */
export const CUSTOM_PEDAGOGICAL_SKILL = `
INSTRUCCIONES BASE DE DISEÑO INSTRUCCIONAL (LOMLOE CANARIAS · 1º ESO):
- Adapta siempre el vocabulario, los ejemplos y el rigor científico a 1º de ESO (12-13 años) en Canarias (Decreto 30/2023).
- Diferencia claramente entre actividades de práctica graduada (fichas con andamiaje) y pruebas de evaluación tipo examen (comprobación objetiva de saberes, competencias específicas y criterios de evaluación).
- Cuando el material subido esté incompleto frente a los saberes básicos oficiales del tema, complétalo de forma estructurada y rigurosa.
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
    tema: {
      type: Type.STRING,
      description: 'Título breve y claro del tema o unidad didáctica detectada.',
    },
    transcripcion: {
      type: Type.STRING,
      description:
        'Transcripción fiel, ordenada y legible de todo el texto, definiciones, ejemplos, operaciones o preguntas encontradas en las imágenes o PDFs.',
    },
    contenido_curricular_completado: {
      type: Type.STRING,
      description:
        'Ampliación y compleción de los saberes básicos del tema según el currículo oficial de 1º ESO en Canarias (Decreto 30/2023) si en los apuntes subidos faltan definiciones, reglas, propiedades o ejemplos clave.',
    },
    criterios_evaluacion_lomloe: {
      type: Type.ARRAY,
      description:
        'Entre 2 y 4 criterios de evaluación / saberes básicos oficiales de 1º ESO Canarias (Decreto 30/2023) vinculados al tema.',
      items: { type: Type.STRING },
    },
    observaciones_legibilidad: {
      type: Type.STRING,
      description:
        'Advertencias para el adulto sobre palabras dudosas, zonas borrosas, letra poco legible o si hay errores que podrían ser ejemplos del libro.',
    },
    errores_detectados: {
      type: Type.ARRAY,
      description:
        'Lista de errores conceptuales, de cálculo, ortográficos o procedimentales detectados (ya sea en correcciones del alumno o en ejercicios del propio material).',
      items: {
        type: Type.OBJECT,
        properties: {
          concepto_fallado: {
            type: Type.STRING,
            description: 'Nombre corto del concepto donde se observa el fallo.',
          },
          explicacion_error: {
            type: Type.STRING,
            description: 'Explicación pedagógica de qué falló exactamente y cuál es la forma correcta.',
          },
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
    'contenido_curricular_completado',
    'criterios_evaluacion_lomloe',
    'observaciones_legibilidad',
    'errores_detectados',
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
      description: 'Entre 6 y 8 tarjetas de Active Recall adaptadas a 1º ESO.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          frente: { type: Type.STRING, description: 'Pregunta directa, reto o concepto a recordar.' },
          reverso: { type: Type.STRING, description: 'Respuesta clara, precisa y con ejemplo breve.' },
          pista: { type: Type.STRING, description: 'Pista breve que activa el recuerdo sin dar la solución.' },
          concepto_clave: { type: Type.STRING },
          es_repaso_libreta: { type: Type.BOOLEAN },
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
      description: 'Entre 2 y 4 categorías claras y mutuamente excluyentes.',
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
      description: 'Entre 6 y 8 elementos para clasificar.',
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
      description: 'Entre 6 y 8 preguntas tipo test con exactamente 4 opciones.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          pregunta: { type: Type.STRING },
          opciones: {
            type: Type.ARRAY,
            description: 'Exactamente 4 opciones plausibles sin prefijo A/B/C/D.',
            items: { type: Type.STRING },
          },
          indice_correcto: { type: Type.INTEGER },
          pista: { type: Type.STRING },
          explicacion: { type: Type.STRING },
          concepto_clave: { type: Type.STRING },
          es_repaso_libreta: { type: Type.BOOLEAN },
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
      description:
        'Entre 5 y 7 casos lúdicos tipo detective donde el alumno debe cazar la única afirmación, cálculo o frase falsa/errónea entre 3 o 4 opciones.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          contexto: {
            type: Type.STRING,
            description: 'Situación breve o enunciado del caso de detective.',
          },
          afirmaciones: {
            type: Type.ARRAY,
            description: 'Entre 3 y 4 afirmaciones o resoluciones; exactamente UNA contiene el error/trampa.',
            items: { type: Type.STRING },
          },
          indice_error: {
            type: Type.INTEGER,
            description: 'Índice de base 0 de la afirmación que contiene el error a cazar.',
          },
          explicacion_correccion: {
            type: Type.STRING,
            description: 'Por qué esa afirmación es falsa y cuál es la versión correcta.',
          },
          concepto_clave: { type: Type.STRING },
          es_repaso_libreta: { type: Type.BOOLEAN },
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

const esquemaYAndamiajeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    esquema_visual: {
      type: Type.OBJECT,
      properties: {
        titulo_central: { type: Type.STRING },
        subtitulo_competencial: { type: Type.STRING },
        enfoque_canarias_lomloe: { type: Type.STRING },
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
    },
    explicacion_andamiaje: {
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
    },
  },
  required: ['esquema_visual', 'explicacion_andamiaje'],
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
      description: 'Entre 5 y 8 preguntas variadas que sumen puntuacion_total (10 puntos).',
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

const evaluacionYFichasSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    ficha_refuerzo: fichaOExamenSchema,
    ficha_estandar: fichaOExamenSchema,
    ficha_ampliacion: fichaOExamenSchema,
    simulacion_examen: fichaOExamenSchema,
  },
  required: [
    'ficha_refuerzo',
    'ficha_estandar',
    'ficha_ampliacion',
    'simulacion_examen',
  ],
};

const miniAppsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    flashcards: flashcardsSchema,
    clasificar: clasificarSchema,
    trivia_reto: triviaRetoSchema,
    caza_error: cazaErrorSchema,
  },
  required: ['flashcards', 'clasificar', 'trivia_reto', 'caza_error'],
};

const DIFICULTAD_GUIDANCE: Record<NivelDificultad, string> = {
  refuerzo:
    'NIVEL GLOBAL REFUERZO GUIADO: explica en pasos muy pequeños, lenguaje cercano y consolidación de base.',
  estandar:
    'NIVEL GLOBAL ESTÁNDAR 1º ESO (LOMLOE CANARIAS): equilibrio entre comprensión clara, práctica variada y situaciones competenciales.',
  ampliacion:
    'NIVEL GLOBAL AMPLIACIÓN: menos pistas obvias, razonamiento en varios pasos y transferencia a contextos nuevos.',
  reto_alto:
    'NIVEL GLOBAL RETO ALTO: preguntas exigentes, distractores inteligentes, problemas combinados y situaciones competenciales profundas.',
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

  return `${curriculumBlock}
Tema actual: ${verification.tema}
Tipo de material analizado: ${verification.fuente}

=== CRITERIOS / SABERES LOMLOE DEL TEMA ===
${criteriosText}

=== CONTENIDO VERIFICADO POR EL DOCENTE ===
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

=== ERRORES DEL PROPIO MATERIAL / EJEMPLOS DE CLASE (ACLARAR SIN CULPAR AL ALUMNO) ===
${materialErrorsText}

=== ERRORES PREVIOS INVOCADOS EXPRESAMENTE POR EL DOCENTE ===
${invokedText}`;
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

  const promptText = `Analiza cuidadosamente estos documentos (fotos o PDFs) de 1º de ESO en Canarias (Decreto 30/2023).
Asignatura seleccionada: ${params.asignatura}
Tipo de documento: ${params.fuente}
${params.extraPrompt?.trim() ? `Indicaciones del adulto: ${params.extraPrompt.trim()}` : ''}

Tareas del Paso 1:
1. Identifica el tema concreto de la materia.
2. Transcribe fielmente todo el contenido visible (texto manuscrito, impreso, ejercicios, operaciones o esquemas).
3. COMPLECIÓN CURRICULAR (1º ESO Canarias, Decreto 30/2023): detecta qué saberes básicos o explicaciones clave del tema faltan o están incompletos en los apuntes subidos y redáctalos en "contenido_curricular_completado" para completar el tema según el currículo oficial. Añade en "criterios_evaluacion_lomloe" los criterios/saberes oficiales vinculados.
4. DETECCIÓN DE ERRORES: extrae cualquier fallo, tachón o ejercicio erróneo visible en "errores_detectados". El adulto confirmará luego si cada fallo es realmente de Pablo o pertenece al propio material/libro.
5. En "observaciones_legibilidad", señala zonas borrosas o dudas de lectura.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [...fileParts, { text: promptText }],
    config: {
      systemInstruction: `${CUSTOM_PEDAGOGICAL_SKILL}\n\nEres especialista en transcripción OCR educativa, currículo LOMLOE Canarias (1º ESO) y diagnóstico de errores escolares. No inventes texto ilegible: advierte dudas en observaciones_legibilidad.`,
      responseMimeType: 'application/json',
      responseSchema: ocrResponseSchema,
      temperature: 0.2,
    },
  });

  return parseJsonResponse<RawOcrResponse>(response.text);
}

interface EsquemaYAndamiajeResponse {
  esquema_visual: EsquemaVisualData;
  explicacion_andamiaje: ExplicacionAndamiajeData;
}

const EVAL_DOC_GUIDANCE: Record<TipoDocumentoEvaluacion, string> = {
  ficha_refuerzo:
    'FICHA 1 · NIVEL REFUERZO / BASE: consolidación guiada de conceptos esenciales y errores detectados de Pablo, enunciados muy claros, progresivos, suma 10 puntos.',
  ficha_estandar:
    'FICHA 2 · NIVEL ESTÁNDAR / PRÁCTICA: aplicación variada de los saberes básicos del tema con ejercicios procedimentales y de comprensión, suma 10 puntos.',
  ficha_ampliacion:
    'FICHA 3 · NIVEL AMPLIACIÓN / COMPETENCIAL: problemas de transferencia, razonamiento en varios pasos y aplicación contextualizada en Canarias, suma 10 puntos.',
  simulacion_examen:
    'SIMULACIÓN OFICIAL DE EXAMEN (es_simulacion_examen: true): NO es una ficha de práctica ni tiene pistas; es un examen serio y realista de 1º ESO para comprobar conocimientos, saberes y capacidades según los criterios de evaluación del Decreto 30/2023. Combina preguntas conceptuales, ejercicios de procedimiento y al menos una situación-problema competencial evaluando criterios LOMLOE reales. Suma exacta de 10 puntos.',
};

export async function generateStudyPack(params: {
  verification: OcrVerificationData;
  libretaErrores: LibretaErrorDoc[];
  dificultad?: NivelDificultad;
}): Promise<GeneratedStudyPack> {
  const ai = getGenAIClient();
  const dificultad = params.dificultad ?? 'estandar';
  const context = buildPedagogicalContext(params.verification, params.libretaErrores);

  const systemInstruction = `${CUSTOM_PEDAGOGICAL_SKILL}\n\nEres un arquitecto instruccional experto en LOMLOE Canarias (Decreto 30/2023, 1º ESO) y ciencia cognitiva del aprendizaje (Active Recall, Dual Coding y Andamiaje). Responde estrictamente con JSON válido ajustado al esquema.`;

  const promptEsquema = `Genera el Esquema Visual (Dual Coding + Mnemotecnia) y la Explicación con Andamiaje (bloques progresivos con preguntas ocultas antes de la solución) para Pablo.
${DIFICULTAD_GUIDANCE[dificultad]}

${context}`;

  const promptEvaluacion = `Genera las 3 FICHAS graduadas (ficha_refuerzo, ficha_estandar, ficha_ampliacion) y 1 SIMULACIÓN DE EXAMEN OFICIAL (simulacion_examen) para Pablo (1º ESO Canarias, Decreto 30/2023).
- ${EVAL_DOC_GUIDANCE.ficha_refuerzo} (es_simulacion_examen: false, nivel_etiqueta: "Ficha 1 · Refuerzo")
- ${EVAL_DOC_GUIDANCE.ficha_estandar} (es_simulacion_examen: false, nivel_etiqueta: "Ficha 2 · Estándar")
- ${EVAL_DOC_GUIDANCE.ficha_ampliacion} (es_simulacion_examen: false, nivel_etiqueta: "Ficha 3 · Ampliación")
- ${EVAL_DOC_GUIDANCE.simulacion_examen} (es_simulacion_examen: true, nivel_etiqueta: "Simulación de Examen")

${DIFICULTAD_GUIDANCE[dificultad]}
Cada ficha y el examen deben sumar exactamente 10 puntos, incluir criterios LOMLOE reales y solucionario docente completo.

${context}`;

  const promptMiniApps = `Genera las 4 Mini-Apps táctiles para el iPad de Pablo:
1. flashcards (6-8 tarjetas Active Recall)
2. clasificar (2-4 categorías y 6-8 elementos tap-to-place)
3. trivia_reto (6-8 preguntas con 4 opciones)
4. caza_error (¡Caza al Error! Detective LOMLOE: 5-7 casos lúdicos con 3-4 afirmaciones cada uno donde Pablo debe cazar la única afirmación con fallo/trampa)

${DIFICULTAD_GUIDANCE[dificultad]}

${context}`;

  const [resEsquema, resEvaluacion, resMiniApps] = await Promise.all([
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: promptEsquema }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: esquemaYAndamiajeSchema,
        temperature: 0.4,
      },
    }),
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: promptEvaluacion }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: evaluacionYFichasSchema,
        temperature: 0.45,
      },
    }),
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: promptMiniApps }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: miniAppsSchema,
        temperature: 0.5,
      },
    }),
  ]);

  const esquemaPart = parseJsonResponse<EsquemaYAndamiajeResponse>(resEsquema.text);
  const evaluacionPart = parseJsonResponse<EvaluacionYFichasBundle>(resEvaluacion.text);
  const miniAppsPart = parseJsonResponse<MiniAppsBundle>(resMiniApps.text);

  return {
    asignatura: params.verification.asignatura,
    tema: params.verification.tema,
    esquema_visual: esquemaPart.esquema_visual,
    explicacion_andamiaje: esquemaPart.explicacion_andamiaje,
    evaluacion_y_fichas: {
      ficha_refuerzo: {
        ...evaluacionPart.ficha_refuerzo,
        es_simulacion_examen: false,
        nivel_etiqueta: evaluacionPart.ficha_refuerzo.nivel_etiqueta || 'Ficha 1 · Refuerzo',
      },
      ficha_estandar: {
        ...evaluacionPart.ficha_estandar,
        es_simulacion_examen: false,
        nivel_etiqueta: evaluacionPart.ficha_estandar.nivel_etiqueta || 'Ficha 2 · Estándar',
      },
      ficha_ampliacion: {
        ...evaluacionPart.ficha_ampliacion,
        es_simulacion_examen: false,
        nivel_etiqueta:
          evaluacionPart.ficha_ampliacion.nivel_etiqueta || 'Ficha 3 · Ampliación',
      },
      simulacion_examen: {
        ...evaluacionPart.simulacion_examen,
        es_simulacion_examen: true,
        nivel_etiqueta:
          evaluacionPart.simulacion_examen.nivel_etiqueta || 'Simulación de Examen',
      },
    },
    mini_apps: {
      flashcards: sanitizeGamePayload(miniAppsPart.flashcards) as FlashcardsPayload,
      clasificar: sanitizeGamePayload(miniAppsPart.clasificar) as ClasificarPayload,
      trivia_reto: sanitizeGamePayload(miniAppsPart.trivia_reto) as TriviaRetoPayload,
      caza_error: sanitizeGamePayload(miniAppsPart.caza_error) as CazaErrorPayload,
    },
  };
}

export async function regenerateSingleEvaluationDoc(params: {
  tipoDoc: TipoDocumentoEvaluacion;
  verification: OcrVerificationData;
  libretaErrores: LibretaErrorDoc[];
  currentDoc?: ExamenPdfData;
  dificultad?: NivelDificultad;
}): Promise<ExamenPdfData> {
  const ai = getGenAIClient();
  const dificultad = params.dificultad ?? 'estandar';
  const context = buildPedagogicalContext(params.verification, params.libretaErrores);

  const previousQuestionsNote = params.currentDoc
    ? `\nPreguntas anteriores a NO repetir literalmente:\n${params.currentDoc.preguntas
        .map((q) => `- ${q.enunciado}`)
        .join('\n')}`
    : '';

  const prompt = `Genera una NUEVA versión fresca con preguntas distintas de este documento de evaluación:
${EVAL_DOC_GUIDANCE[params.tipoDoc]}
${DIFICULTAD_GUIDANCE[dificultad]}
${previousQuestionsNote}

${context}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      systemInstruction: `${CUSTOM_PEDAGOGICAL_SKILL}\n\nEres especialista en evaluación LOMLOE Canarias (1º ESO, Decreto 30/2023). Genera ejercicios y criterios nuevos manteniendo el nivel exacto solicitado.`,
      responseMimeType: 'application/json',
      responseSchema: fichaOExamenSchema,
      temperature: 0.65,
    },
  });

  const parsed = parseJsonResponse<ExamenPdfData>(response.text);
  return {
    ...parsed,
    es_simulacion_examen: params.tipoDoc === 'simulacion_examen',
  };
}

export async function iterateStudyPack(params: {
  currentPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  libretaErrores: LibretaErrorDoc[];
  targetDificultad: NivelDificultad;
  instruccionCambio: string;
}): Promise<GeneratedStudyPack> {
  const ai = getGenAIClient();
  const context = buildPedagogicalContext(params.verification, params.libretaErrores);
  const systemInstruction = `${CUSTOM_PEDAGOGICAL_SKILL}\n\nEres un arquitecto instruccional experto en LOMLOE Canarias (1º ESO). Evoluciona el artefacto existente manteniendo coherencia entre todas sus partes.`;

  const baseChangeBlock = `=== NIVEL DE DIFICULTAD OBJETIVO ===
${DIFICULTAD_GUIDANCE[params.targetDificultad]}

=== CAMBIOS SOLICITADOS POR EL DOCENTE / PADRE ===
${params.instruccionCambio.trim() || 'Ajustar el material al nuevo nivel de dificultad manteniendo la consistencia global.'}

${context}`;

  const promptEsquema = `Itera sobre el Esquema Visual y el Andamiaje actuales manteniendo consistencia con los cambios pedidos:
Esquema y Andamiaje actuales: ${JSON.stringify({
    esquema_visual: params.currentPack.esquema_visual,
    explicacion_andamiaje: params.currentPack.explicacion_andamiaje,
  })}

${baseChangeBlock}`;

  const promptEvaluacion = `Itera sobre las 3 Fichas y la Simulación de Examen actuales aplicando los cambios pedidos y manteniendo consistencia:
Evaluación actual: ${JSON.stringify(params.currentPack.evaluacion_y_fichas)}

${baseChangeBlock}`;

  const promptMiniApps = `Itera sobre las 4 Mini-Apps actuales (flashcards, clasificar, trivia_reto, caza_error) aplicando los cambios pedidos y manteniendo consistencia:
Mini-Apps actuales: ${JSON.stringify(params.currentPack.mini_apps)}

${baseChangeBlock}`;

  const [resEsquema, resEvaluacion, resMiniApps] = await Promise.all([
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: promptEsquema }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: esquemaYAndamiajeSchema,
        temperature: 0.45,
      },
    }),
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: promptEvaluacion }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: evaluacionYFichasSchema,
        temperature: 0.45,
      },
    }),
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: promptMiniApps }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: miniAppsSchema,
        temperature: 0.5,
      },
    }),
  ]);

  const esquemaPart = parseJsonResponse<EsquemaYAndamiajeResponse>(resEsquema.text);
  const evaluacionPart = parseJsonResponse<EvaluacionYFichasBundle>(resEvaluacion.text);
  const miniAppsPart = parseJsonResponse<MiniAppsBundle>(resMiniApps.text);

  return {
    asignatura: params.verification.asignatura,
    tema: params.verification.tema,
    esquema_visual: esquemaPart.esquema_visual,
    explicacion_andamiaje: esquemaPart.explicacion_andamiaje,
    evaluacion_y_fichas: {
      ficha_refuerzo: {
        ...evaluacionPart.ficha_refuerzo,
        es_simulacion_examen: false,
      },
      ficha_estandar: {
        ...evaluacionPart.ficha_estandar,
        es_simulacion_examen: false,
      },
      ficha_ampliacion: {
        ...evaluacionPart.ficha_ampliacion,
        es_simulacion_examen: false,
      },
      simulacion_examen: {
        ...evaluacionPart.simulacion_examen,
        es_simulacion_examen: true,
      },
    },
    mini_apps: {
      flashcards: sanitizeGamePayload(miniAppsPart.flashcards) as FlashcardsPayload,
      clasificar: sanitizeGamePayload(miniAppsPart.clasificar) as ClasificarPayload,
      trivia_reto: sanitizeGamePayload(miniAppsPart.trivia_reto) as TriviaRetoPayload,
      caza_error: sanitizeGamePayload(miniAppsPart.caza_error) as CazaErrorPayload,
    },
  };
}

export async function regenerateSingleMiniApp(params: {
  tipoJuego: TipoJuego;
  verification: OcrVerificationData;
  libretaErrores: LibretaErrorDoc[];
  dificultad?: NivelDificultad;
}): Promise<GamePayload> {
  const ai = getGenAIClient();
  const dificultad = params.dificultad ?? 'estandar';
  const context = buildPedagogicalContext(params.verification, params.libretaErrores);

  const effectiveTipo =
    params.tipoJuego === 'ordenar_pasos' ? 'caza_error' : params.tipoJuego;

  const schemaByType: Record<
    'flashcards' | 'clasificar' | 'trivia_reto' | 'caza_error',
    Schema
  > = {
    flashcards: flashcardsSchema,
    clasificar: clasificarSchema,
    trivia_reto: triviaRetoSchema,
    caza_error: cazaErrorSchema,
  };

  const prompt = `Genera una NUEVA versión amena, variada y divertida de la mini-app "${effectiveTipo}" para Pablo (1º ESO Canarias, Decreto 30/2023).
${DIFICULTAD_GUIDANCE[dificultad]}
Evita repetir exactamente las preguntas anteriores; formula retos frescos.

${context}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      systemInstruction: `${CUSTOM_PEDAGOGICAL_SKILL}\n\nEres diseñador de microjuegos educativos táctiles para iPad en 1º ESO.`,
      responseMimeType: 'application/json',
      responseSchema: schemaByType[effectiveTipo],
      temperature: 0.7,
    },
  });

  const parsed = parseJsonResponse<GamePayload>(response.text);
  return sanitizeGamePayload(parsed);
}
