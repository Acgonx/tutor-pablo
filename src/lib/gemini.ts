import { GoogleGenAI, Type } from '@google/genai';
import type { Part, Schema } from '@google/genai';
import { getAsignaturaByNombre } from '../data/curriculumCanarias';
import type { LibretaErrorDoc, TipoJuego } from '../types/firestore';
import type { FuenteDocumento, OcrVerificationData, SeveridadError, UploadedImageItem } from '../types/ocr';
import type {
  ClasificarPayload,
  FlashcardsPayload,
  GamePayload,
  GeneratedStudyPack,
  OrdenarPasosPayload,
  TriviaRetoPayload,
} from '../types/studyMaterial';

export const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL?.trim() || 'gemini-3.8-flash';

export const isGeminiConfigured = Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim());

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

interface RawOcrResponse {
  tema: string;
  transcripcion: string;
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
      description: 'Título breve y claro del tema o unidad didáctica detectada en los apuntes o examen.',
    },
    transcripcion: {
      type: Type.STRING,
      description:
        'Transcripción fiel, ordenada y legible de todo el texto, definiciones, ejemplos, operaciones o preguntas encontradas en las imágenes.',
    },
    observaciones_legibilidad: {
      type: Type.STRING,
      description:
        'Advertencias para el adulto sobre palabras dudosas, zonas borrosas, letra poco legible o fragmentos cortados.',
    },
    errores_detectados: {
      type: Type.ARRAY,
      description:
        'Lista de errores conceptuales, de cálculo, ortográficos o procedimentales detectados en apuntes o exámenes corregidos.',
      items: {
        type: Type.OBJECT,
        properties: {
          concepto_fallado: {
            type: Type.STRING,
            description: 'Nombre corto del concepto donde se observa el fallo (ej: "Regla de signos en multiplicación").',
          },
          explicacion_error: {
            type: Type.STRING,
            description: 'Explicación pedagógica de qué falló exactamente y cuál era la forma correcta.',
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
  required: ['tema', 'transcripcion', 'observaciones_legibilidad', 'errores_detectados'],
};

const flashcardsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tipo_juego: { type: Type.STRING, format: 'enum', enum: ['flashcards'] },
    titulo: { type: Type.STRING },
    instrucciones: { type: Type.STRING },
    tarjetas: {
      type: Type.ARRAY,
      description: 'Entre 6 y 10 tarjetas de Active Recall adaptadas a 1º ESO.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          frente: { type: Type.STRING, description: 'Pregunta directa, reto o concepto a recordar.' },
          reverso: { type: Type.STRING, description: 'Respuesta clara, precisa y con ejemplo breve.' },
          pista: { type: Type.STRING, description: 'Pista breve que activa el recuerdo sin dar la solución.' },
          concepto_clave: { type: Type.STRING },
          es_repaso_libreta: {
            type: Type.BOOLEAN,
            description: 'true si refuerza un error de libreta_errores o de los apuntes revisados.',
          },
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
      description: 'Entre 6 y 10 elementos para clasificar. Cada categoria_correcta_id debe existir en categorias.',
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
          indice_correcto: {
            type: Type.INTEGER,
            description: 'Índice de base 0 (0, 1, 2 o 3) de la opción correcta.',
          },
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

const ordenarPasosSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tipo_juego: { type: Type.STRING, format: 'enum', enum: ['ordenar_pasos'] },
    titulo: { type: Type.STRING },
    instrucciones: { type: Type.STRING },
    secuencias: {
      type: Type.ARRAY,
      description: 'Entre 2 y 4 secuencias de procedimiento, cronología o razonamiento lógico.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          enunciado: { type: Type.STRING },
          explicacion_final: { type: Type.STRING },
          concepto_clave: { type: Type.STRING },
          es_repaso_libreta: { type: Type.BOOLEAN },
          pasos_orden_correcto: {
            type: Type.ARRAY,
            description: 'Entre 4 y 6 pasos listados en el orden correcto del primero al último.',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                texto: { type: Type.STRING },
              },
              required: ['id', 'texto'],
            },
          },
        },
        required: [
          'id',
          'enunciado',
          'explicacion_final',
          'concepto_clave',
          'es_repaso_libreta',
          'pasos_orden_correcto',
        ],
      },
    },
  },
  required: ['tipo_juego', 'titulo', 'instrucciones', 'secuencias'],
};

const studyPackResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    asignatura: { type: Type.STRING },
    tema: { type: Type.STRING },
    esquema_visual: {
      type: Type.OBJECT,
      properties: {
        titulo_central: { type: Type.STRING },
        subtitulo_competencial: { type: Type.STRING },
        enfoque_canarias_lomloe: {
          type: Type.STRING,
          description: 'Conexión explícita con el Decreto 30/2023 (Canarias) para 1º ESO.',
        },
        ramas: {
          type: Type.ARRAY,
          description: 'Entre 4 y 6 ramas conceptuales claras (Dual Coding).',
          items: {
            type: Type.OBJECT,
            properties: {
              titulo: { type: Type.STRING },
              icono_visual: { type: Type.STRING, description: 'Un único emoji representativo.' },
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
          description: 'Entre 4 y 6 bloques breves de dificultad progresiva con pregunta oculta.',
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
    examen_pdf: {
      type: Type.OBJECT,
      properties: {
        titulo: { type: Type.STRING },
        subtitulo: { type: Type.STRING },
        duracion_estimada: { type: Type.STRING },
        instrucciones_alumno: { type: Type.STRING },
        puntuacion_total: { type: Type.NUMBER },
        preguntas: {
          type: Type.ARRAY,
          description: 'Entre 6 y 8 preguntas variadas que sumen puntuacion_total (10 puntos).',
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
        'preguntas',
        'rubrica_docente',
      ],
    },
    mini_apps: {
      type: Type.OBJECT,
      properties: {
        flashcards: flashcardsSchema,
        clasificar: clasificarSchema,
        trivia_reto: triviaRetoSchema,
        ordenar_pasos: ordenarPasosSchema,
      },
      required: ['flashcards', 'clasificar', 'trivia_reto', 'ordenar_pasos'],
    },
  },
  required: [
    'asignatura',
    'tema',
    'esquema_visual',
    'explicacion_andamiaje',
    'examen_pdf',
    'mini_apps',
  ],
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
    case 'ordenar_pasos': {
      const normalized: OrdenarPasosPayload = {
        ...payload,
        tipo_juego: 'ordenar_pasos',
        secuencias: payload.secuencias.map((seq, seqIndex) => ({
          ...seq,
          id: seq.id?.trim() || `seq_${seqIndex + 1}`,
          pasos_orden_correcto: seq.pasos_orden_correcto.map((step, stepIndex) => ({
            ...step,
            id: step.id?.trim() || `step_${seqIndex + 1}_${stepIndex + 1}`,
          })),
        })),
      };
      return normalized;
    }
  }
}

function buildPedagogicalContext(
  verification: OcrVerificationData,
  libretaErrores: LibretaErrorDoc[],
): string {
  const materia = getAsignaturaByNombre(verification.asignatura);
  const curriculumBlock = materia
    ? `Asignatura: ${materia.nombre} (1º ESO Canarias, Decreto 30/2023 LOMLOE)
Competencias clave prioritarias: ${materia.competenciasClave.join(', ')}
Enfoque curricular Canarias: ${materia.enfoqueDecreto30}`
    : `Asignatura: ${verification.asignatura} (1º ESO Canarias, Decreto 30/2023 LOMLOE)`;

  const activeErrorsText =
    libretaErrores.length > 0
      ? libretaErrores
          .map(
            (err, idx) =>
              `${idx + 1}. [${err.estado.toUpperCase()} | Fallado ${err.veces_fallado}x | Tema: ${err.tema}] ${err.concepto_fallado}: ${err.explicacion_error}`,
          )
          .join('\n')
      : 'No hay errores previos activos en libreta_errores para esta asignatura.';

  const currentErrorsText =
    verification.errores_detectados.length > 0
      ? verification.errores_detectados
          .map(
            (err, idx) =>
              `${idx + 1}. [Severidad: ${err.severidad}] ${err.concepto_fallado}: ${err.explicacion_error}`,
          )
          .join('\n')
      : 'No se marcaron errores concretos en esta sesión.';

  return `${curriculumBlock}
Tema actual: ${verification.tema}
Tipo de material analizado: ${verification.fuente}

=== CONTENIDO VERIFICADO POR EL DOCENTE ===
${verification.transcripcion}

${
  verification.notas_adicionales_docente.trim()
    ? `=== INSTRUCCIONES EXTRA DEL DOCENTE / PADRE ===\n${verification.notas_adicionales_docente.trim()}\n`
    : ''
}=== ERRORES RECIENTES DETECTADOS EN ESTA ENTREGA ===
${currentErrorsText}

=== LIBRETA DE ERRORES HISTÓRICA (REPETICIÓN ESPACIADA) ===
${activeErrorsText}`;
}

export async function analyzeImagesOcr(params: {
  asignatura: string;
  fuente: FuenteDocumento;
  images: UploadedImageItem[];
  extraPrompt?: string;
}): Promise<RawOcrResponse> {
  if (params.images.length === 0) {
    throw new Error('Debes seleccionar al menos una imagen para analizar con OCR.');
  }

  const ai = getGenAIClient();
  const imageParts: Part[] = params.images.map((img) => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.base64Data,
    },
  }));

  const promptText = `Analiza cuidadosamente estas imágenes de 1º de ESO (Canarias).
Asignatura seleccionada: ${params.asignatura}
Tipo de documento: ${params.fuente}
${params.extraPrompt?.trim() ? `Indicaciones del adulto: ${params.extraPrompt.trim()}` : ''}

Tareas del Paso 1 (Validación OCR):
1. Identifica el tema concreto de la materia.
2. Transcribe fielmente todo el contenido visible (texto manuscrito, impreso, ejercicios, operaciones o esquemas), organizándolo con claridad.
3. Si hay correcciones del profesor, tachones o respuestas erróneas del alumno, extrae cada fallo en errores_detectados explicando con rigor qué falló. Si son apuntes sin errores visibles, puedes detectar posibles confusiones o dejar errores_detectados vacío.
4. En observaciones_legibilidad, señala cualquier palabra dudosa o zona poco nítida para que el adulto la verifique antes de generar el material.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [...imageParts, { text: promptText }],
    config: {
      systemInstruction:
        'Eres un especialista en transcripción OCR educativa y diagnóstico de errores escolares para 1º ESO en España (Canarias). No inventes texto ilegible: advierte sobre dudas en observaciones_legibilidad. Responde exclusivamente en español (salvo citas o enunciados en lengua extranjera cuando la asignatura sea idioma).',
      responseMimeType: 'application/json',
      responseSchema: ocrResponseSchema,
      temperature: 0.2,
    },
  });

  return parseJsonResponse<RawOcrResponse>(response.text);
}

export async function generateStudyPack(params: {
  verification: OcrVerificationData;
  libretaErrores: LibretaErrorDoc[];
}): Promise<GeneratedStudyPack> {
  const ai = getGenAIClient();
  const context = buildPedagogicalContext(params.verification, params.libretaErrores);

  const prompt = `Genera un paquete completo de estudio personalizado para Pablo (alumno de 1º de ESO en Canarias, Decreto 30/2023 LOMLOE) usando estrictamente el contexto verificado y aplicando:
- Repetición Espaciada: integra de forma obligatoria y natural los conceptos de la "Libreta de Errores histórica" y los "Errores recientes" en el esquema, en bloques de andamiaje, en preguntas del examen y en las 4 mini-apps interactivas (marcando es_repaso_libreta / refuerza_error_libreta / evalua_error_libreta = true en esos ítems).
- Active Recall: preguntas que obliguen a evocar la respuesta antes de revelarla y pistas progresivas.
- Dual Coding: anclajes visuales concretos, iconos claros, comparativas "Error vs Forma correcta" y organización espacial limpia.
- Andamiaje: progresión de menor a mayor complejidad con situación-problema final competencial (LOMLOE Canarias).
- Examen PDF: suma exacta de 10 puntos entre las preguntas, con espacios de líneas realistas para el alumno y solucionario detallado + criterios LOMLOE para el docente.
- Mini-Apps iPad: los 4 juegos completos (flashcards, clasificar, trivia_reto, ordenar_pasos) listos para jugar de forma táctil en pantalla de iPad.

${context}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      systemInstruction:
        'Eres un arquitecto instruccional experto en LOMLOE Canarias (Decreto 30/2023, 1º ESO) y ciencia cognitiva del aprendizaje (Active Recall, Dual Coding, Andamiaje y Repetición Espaciada). Tu tono con Pablo debe ser claro, cercano, riguroso y motivador, sin infantilizarle. Devuelve JSON válido ajustado exactamente al esquema.',
      responseMimeType: 'application/json',
      responseSchema: studyPackResponseSchema,
      temperature: 0.45,
    },
  });

  const parsed = parseJsonResponse<GeneratedStudyPack>(response.text);

  return {
    ...parsed,
    asignatura: params.verification.asignatura,
    tema: params.verification.tema,
    mini_apps: {
      flashcards: sanitizeGamePayload(parsed.mini_apps.flashcards) as FlashcardsPayload,
      clasificar: sanitizeGamePayload(parsed.mini_apps.clasificar) as ClasificarPayload,
      trivia_reto: sanitizeGamePayload(parsed.mini_apps.trivia_reto) as TriviaRetoPayload,
      ordenar_pasos: sanitizeGamePayload(parsed.mini_apps.ordenar_pasos) as OrdenarPasosPayload,
    },
  };
}

export async function regenerateSingleMiniApp(params: {
  tipoJuego: TipoJuego;
  verification: OcrVerificationData;
  libretaErrores: LibretaErrorDoc[];
}): Promise<GamePayload> {
  const ai = getGenAIClient();
  const context = buildPedagogicalContext(params.verification, params.libretaErrores);

  const schemaByType: Record<TipoJuego, Schema> = {
    flashcards: flashcardsSchema,
    clasificar: clasificarSchema,
    trivia_reto: triviaRetoSchema,
    ordenar_pasos: ordenarPasosSchema,
  };

  const prompt = `Genera una NUEVA versión variada e inspiradora de la mini-app de tipo "${params.tipoJuego}" para Pablo (1º ESO Canarias, Decreto 30/2023), reforzando especialmente los errores de la libreta y aplicando Active Recall.
Evita repetir exactamente las mismas preguntas anteriores; formula ángulos frescos o ejemplos cotidianos canarios cuando encaje con la materia.

${context}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      systemInstruction:
        'Eres un diseñador instruccional LOMLOE Canarias (1º ESO) especializado en microjuegos educativos táctiles para iPad. Devuelve estrictamente el JSON del juego solicitado.',
      responseMimeType: 'application/json',
      responseSchema: schemaByType[params.tipoJuego],
      temperature: 0.7,
    },
  });

  const parsed = parseJsonResponse<GamePayload>(response.text);
  return sanitizeGamePayload(parsed);
}
