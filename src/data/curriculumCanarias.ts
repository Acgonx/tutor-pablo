import type { AsignaturaCurricular } from '../types/curriculum';
import type { FuenteDocumento } from '../types/ocr';

/**
 * Catálogo oficial de materias de 1º de ESO en Canarias según el Decreto 30/2023 (LOMLOE).
 */
export const ASIGNATURAS_1ESO_CANARIAS: readonly AsignaturaCurricular[] = [
  {
    id: 'matematicas',
    nombre: 'Matemáticas',
    nombreCorto: 'Matemáticas',
    colorBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    competenciasClave: ['STEM', 'CCL', 'CD', 'CPSAA', 'CE'],
    enfoqueDecreto30:
      'Resolución de problemas contextualizados en la vida cotidiana y el entorno canario, sentido numérico, algebraico, espacial y estocástico con modelización y argumentación.',
    ejemplosSaberesBasicos: [
      'Números naturales, enteros y divisibilidad',
      'Fracciones, decimales y proporcionalidad directa',
      'Introducción al lenguaje algebraico y ecuaciones de 1er grado',
      'Geometría plana, perímetros, áreas y tablas estadísticas',
    ],
  },
  {
    id: 'lengua_castellana',
    nombre: 'Lengua Castellana y Literatura',
    nombreCorto: 'Lengua',
    colorBadge: 'bg-rose-100 text-rose-800 border-rose-200',
    competenciasClave: ['CCL', 'CP', 'CD', 'CPSAA', 'CC', 'CCEC'],
    enfoqueDecreto30:
      'Comunicación oral y escrita en contextos reales, valoración de la variedad lingüística del español de Canarias, reflexión gramatical funcional y educación literaria.',
    ejemplosSaberesBasicos: [
      'Categorías gramaticales y morfología básica',
      'Ortografía, acentuación y signos de puntuación',
      'Tipología textual: narración, descripción y diálogo',
      'Comprensión lectora, léxico canario y géneros literarios',
    ],
  },
  {
    id: 'geografia_historia',
    nombre: 'Geografía e Historia',
    nombreCorto: 'Geografía e Hist.',
    colorBadge: 'bg-amber-100 text-amber-800 border-amber-200',
    competenciasClave: ['CC', 'CCL', 'CD', 'CPSAA', 'CCEC'],
    enfoqueDecreto30:
      'Pensamiento histórico y geográfico a partir de fuentes, conciencia ecosocial en el archipiélago canario y evolución desde la Prehistoria hasta las civilizaciones antiguas.',
    ejemplosSaberesBasicos: [
      'Representación de la Tierra, relieves y climas de Canarias',
      'Hidrosfera, biosfera y retos ecosociales insulares',
      'Prehistoria y primeras civilizaciones fluviales',
      'Grecia, Roma y poblamiento aborigen de Canarias (contexto histórico)',
    ],
  },
  {
    id: 'biologia_geologia',
    nombre: 'Biología y Geología',
    nombreCorto: 'Biología y Geol.',
    colorBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    competenciasClave: ['STEM', 'CCL', 'CD', 'CPSAA', 'CC'],
    enfoqueDecreto30:
      'Metodología científica escolar, interpretación del medio natural y vulcanismo canario, biodiversidad endémica, célula y clasificación de los seres vivos.',
    ejemplosSaberesBasicos: [
      'El método científico y magnitudes en el laboratorio',
      'La geosfera, rocas volcánicas y relieve de Canarias',
      'Atmósfera, hidrosfera y ecosistemas terrestres/marinos',
      'La célula y los cinco reinos (moneras, protoctistas, hongos, plantas, animales)',
    ],
  },
  {
    id: 'ingles',
    nombre: 'Primera Lengua Extranjera (Inglés)',
    nombreCorto: 'Inglés',
    colorBadge: 'bg-sky-100 text-sky-800 border-sky-200',
    competenciasClave: ['CP', 'CCL', 'CD', 'CPSAA', 'CC'],
    enfoqueDecreto30:
      'Enfoque comunicativo orientado a la acción: comprensión, producción, interacción y mediación básica en situaciones cotidianas, interculturalidad y turismo responsable.',
    ejemplosSaberesBasicos: [
      'Present Simple, Present Continuous y Past Simple (verbo to be / regulares)',
      'Pronombres, posesivos, adverbios de frecuencia y preposiciones',
      'Vocabulario cotidiano: rutinas, familia, ciudad, tiempo libre y entorno',
      'Estrategias de comprensión y redacción guiada de mensajes breves',
    ],
  },
  {
    id: 'educacion_plastica',
    nombre: 'Educación Plástica, Visual y Audiovisual',
    nombreCorto: 'Plástica y Visual',
    colorBadge: 'bg-purple-100 text-purple-800 border-purple-200',
    competenciasClave: ['CCEC', 'CD', 'STEM', 'CPSAA'],
    enfoqueDecreto30:
      'Alfabetización visual crítica, expresión plástica, geometría descriptiva inicial y patrimonio artístico canario.',
    ejemplosSaberesBasicos: [
      'Elementos del lenguaje visual: punto, línea, plano y textura',
      'Teoría del color y composición gráfica',
      'Trazados geométricos básicos con regla, escuadra y compás',
      'Lectura de imágenes y lenguaje audiovisual',
    ],
  },
  {
    id: 'musica',
    nombre: 'Música',
    nombreCorto: 'Música',
    colorBadge: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    competenciasClave: ['CCEC', 'CCL', 'CPSAA', 'CD'],
    enfoqueDecreto30:
      'Escucha activa, interpretación vocal/instrumental, lectura rítmico-melódica y valoración del patrimonio musical universal y del folclore canario.',
    ejemplosSaberesBasicos: [
      'Cualidades del sonido: altura, duración, intensidad y timbre',
      'Lectura musical: pentagrama, claves, figuras y compases simples',
      'Familias instrumentales e instrumentos tradicionales canarios',
      'Formas musicales básicas y escucha comprensiva',
    ],
  },
  {
    id: 'tecnologia_digitalizacion',
    nombre: 'Tecnología y Digitalización',
    nombreCorto: 'Tecnología',
    colorBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    competenciasClave: ['STEM', 'CD', 'CE', 'CPSAA'],
    enfoqueDecreto30:
      'Resolución de problemas tecnológicos mediante diseño y prototipado, pensamiento computacional, seguridad digital y sostenibilidad tecnológica.',
    ejemplosSaberesBasicos: [
      'Fases del proyecto tecnológico y dibujo técnico básico',
      'Materiales de uso técnico (madera, metales, plásticos) y herramientas',
      'Estructuras, mecanismos y circuitos eléctricos elementales',
      'Algoritmos, programación por bloques y ciudadanía digital segura',
    ],
  },
  {
    id: 'educacion_fisica',
    nombre: 'Educación Física',
    nombreCorto: 'Ed. Física',
    colorBadge: 'bg-lime-100 text-lime-800 border-lime-200',
    competenciasClave: ['CPSAA', 'CC', 'STEM', 'CE'],
    enfoqueDecreto30:
      'Vida activa y saludable, autorregulación corporal, cooperación motriz en el medio natural canario y juegos/deportes tradicionales.',
    ejemplosSaberesBasicos: [
      'Condición física orientada a la salud y calentamiento',
      'Capacidades físicas básicas y hábitos posturales',
      'Juegos motores, deportes alternativos y deportes autóctonos canarios',
      'Seguridad y respeto en actividades en el medio natural',
    ],
  },
  {
    id: 'segunda_lengua_extranjera',
    nombre: 'Segunda Lengua Extranjera (Francés / Alemán)',
    nombreCorto: '2ª Lengua Ext.',
    colorBadge: 'bg-teal-100 text-teal-800 border-teal-200',
    competenciasClave: ['CP', 'CCL', 'CPSAA', 'CC'],
    enfoqueDecreto30:
      'Iniciación comunicativa funcional (nivel A1), comprensión de mensajes muy breves, fórmulas de cortesía, fonética básica y apertura plurilingüe.',
    ejemplosSaberesBasicos: [
      'Saludos, presentaciones personales, números y fechas',
      'Artículos, género/número básico y presente de verbos frecuentes',
      'Descripción sencilla de personas, aula y familia',
      'Comprensión auditiva y escrita de diálogos guiados',
    ],
  },
];

export const FUENTES_DOCUMENTO: ReadonlyArray<{
  value: FuenteDocumento;
  label: string;
  descripcion: string;
}> = [
  {
    value: 'apuntes_clase',
    label: 'Apuntes de clase',
    descripcion: 'Fotos del cuaderno, esquemas en pizarra o resúmenes manuscritos.',
  },
  {
    value: 'examen_corregido',
    label: 'Examen o control corregido',
    descripcion: 'Prueba con marcas del profesor para extraer exactamente dónde falló Pablo.',
  },
  {
    value: 'libro_ejercicios',
    label: 'Libro o ficha de ejercicios',
    descripcion: 'Páginas del libro de texto, actividades resueltas o deberes.',
  },
  {
    value: 'indice_temario',
    label: 'Índice del libro / Programación didáctica',
    descripcion: 'Foto o texto del índice o programación para elegir qué apartados practicar hoy.',
  },
  {
    value: 'mixto',
    label: 'Material mixto',
    descripcion: 'Combinación de apuntes, ejercicios y correcciones en la misma sesión.',
  },
];

export function getAsignaturaByNombre(nombre: string): AsignaturaCurricular | undefined {
  const normalized = nombre.trim().toLowerCase();
  return ASIGNATURAS_1ESO_CANARIAS.find(
    (item) =>
      item.nombre.toLowerCase() === normalized ||
      item.nombreCorto.toLowerCase() === normalized ||
      item.id.toLowerCase() === normalized,
  );
}

export interface SubjectTipologiaPreset {
  evaluacionTipologias: string[];
  evaluacionSugerencias: string[];
  miniAppTipologias: string[];
  miniAppSugerencias: string[];
  html5Tipologias: string[];
  html5Sugerencias: string[];
}

export function getTipologiasPorAsignatura(asignatura: string): SubjectTipologiaPreset {
  const id = getAsignaturaByNombre(asignatura)?.id ?? 'matematicas';

  switch (id) {
    case 'lengua_castellana':
      return {
        evaluacionTipologias: [
          'Análisis morfológico / sintáctico en tabla',
          'Ortografía y acentuación (completar o corregir)',
          'Comprensión lectora con texto breve',
          'Tipología textual / redacción guiada',
          'Vocabulario, sinónimos y variedad canaria',
          'Preguntas conceptuales de gramática o literatura',
        ],
        evaluacionSugerencias: [
          'Incluye una tabla de análisis morfológico con filas en blanco para que Pablo la complete.',
          'Pon un texto corto con 4 preguntas de comprensión, acentuación y categorías gramaticales.',
        ],
        miniAppTipologias: [
          'Clasificar categorías gramaticales o tipos de palabras',
          'Reglas de acentuación y ortografía',
          'Detectar errores gramaticales o de puntuación',
          'Definiciones literarias y recursos expresivos',
        ],
        miniAppSugerencias: [
          'Haz preguntas ágiles para distinguir agudas, llanas, esdrújulas y categorías gramaticales.',
          'Usa ejemplos cercanos y errores típicos de redacción en 1º ESO.',
        ],
        html5Tipologias: [
          'Unir con flechas (palabra ↔ categoría o recurso literario)',
          'Rellenar huecos escribiendo tildes o palabras correctas',
          'Señalar / subrayar palabras clave dentro de una oración',
          'Arrastrar y ordenar fragmentos de un texto o análisis',
        ],
        html5Sugerencias: [
          'Juego de unir con flechas cada palabra o ejemplo con su categoría y otro nivel de rellenar huecos con tilde.',
          'Actividad interactiva donde Pablo señala el sujeto/núcleo o clasifica palabras tocando bloques.',
        ],
      };

    case 'ingles':
    case 'segunda_lengua_extranjera':
      return {
        evaluacionTipologias: [
          'Completar huecos (verbos, tiempos o vocabulario)',
          'Construir o transformar oraciones (afirmativa/negativa/pregunta)',
          'Reading comprehension breve con preguntas',
          'Vocabulario cotidiano y expresiones',
          'Traducir frases cortas o corregir errores típicos',
        ],
        evaluacionSugerencias: [
          'Combina 2 ejercicios de fill-in-the-blanks, 2 de ordenar/transformar frases y 1 reading corto.',
          'Insiste en Present Simple vs Continuous o verbo to be / have got según el tema.',
        ],
        miniAppTipologias: [
          'Gramática práctica (tiempos verbales y partículas)',
          'Vocabulario y falsos amigos',
          'Detectar el fallo gramatical típico en una frase',
          'Comprensión rápida en contexto real',
        ],
        miniAppSugerencias: [
          'Frases cotidianas de 12 años con explicaciones claras en español cuando falle.',
          'Mezcla huecos rápidos con errores frecuentes de tercera persona o auxiliares.',
        ],
        html5Tipologias: [
          'Unir con flechas (English ↔ Español o pregunta ↔ respuesta)',
          'Rellenar huecos escribiendo la forma verbal correcta',
          'Ordenar palabras clicando fichas para formar la oración',
          'Señalar el error dentro de la frase en inglés',
        ],
        html5Sugerencias: [
          'Juego de construir oraciones ordenando tarjetas y otro bloque de unir con flechas vocabulario del tema.',
          'Práctica interactiva de rellenar huecos con autocorrección instantánea y puntuación.',
        ],
      };

    case 'biologia_geologia':
      return {
        evaluacionTipologias: [
          'Diagrama / dibujo SVG para señalar partes',
          'Tabla comparativa para completar (ej. células, reinos, rocas)',
          'Cuestiones del método científico y experimentos',
          'Situación contextualizada en ecosistemas o vulcanismo de Canarias',
          'Preguntas conceptuales y definiciones clave',
        ],
        evaluacionSugerencias: [
          'Incluye un dibujo/esquema SVG limpio con partes para identificar o completar.',
          'Pon una tabla comparativa con filas vacías para Pablo y un caso práctico del entorno canario.',
        ],
        miniAppTipologias: [
          'Con diagramas o esquemas visuales SVG',
          'Clasificar organismos, rocas o funciones vitales',
          'Cazar afirmaciones científicas falsas o mitos',
          'Vocabulario científico y definiciones',
        ],
        miniAppSugerencias: [
          'Relaciona estructuras celulares, reinos o tipos de rocas con ejemplos claros de Canarias.',
          'Incluye pistas visuales que ayuden a memorizar diferencias clave.',
        ],
        html5Tipologias: [
          'Apuntar y señalar partes directamente sobre un diagrama SVG',
          'Unir con flechas (órgano / estructura ↔ función)',
          'Arrastrar o clasificar tarjetas en grupos biológicos',
          'Completar un esquema o ciclo escribiendo conceptos clave',
        ],
        html5Sugerencias: [
          'Diagrama interactivo en SVG donde Pablo señala cada parte al hacer clic sobre el dibujo.',
          'Juego de unir con flechas estructuras y funciones con feedback explicativo.',
        ],
      };

    case 'geografia_historia':
      return {
        evaluacionTipologias: [
          'Mapa o esquema visual SVG (relieve, climas o civilización)',
          'Línea del tiempo / orden cronológico y tabla de etapas',
          'Interpretación de fuentes históricas, gráficos o climogramas',
          'Situación contextualizada con patrimonio o geografía de Canarias',
          'Preguntas de causas, consecuencias y vocabulario histórico',
        ],
        evaluacionSugerencias: [
          'Incluye un esquema o mapa mudo en SVG para localizar elementos y una tabla de etapas.',
          'Contextualiza con ejemplos de Canarias (relieve insular, climas o historia aborigen) cuando encaje.',
        ],
        miniAppTipologias: [
          'Con mapas o esquemas visuales SVG',
          'Ubicar hechos y etapas históricas',
          'Detectar anacronismos o errores históricos/geográficos',
          'Vocabulario geográfico e histórico',
        ],
        miniAppSugerencias: [
          'Caza anacronismos o confusiones entre etapas, ríos, climas y mapas.',
          'Haz preguntas dinámicas con referencias visuales claras.',
        ],
        html5Tipologias: [
          'Apuntar y señalar zonas en un mapa o esquema SVG interactivo',
          'Unir con flechas (etapa / lugar ↔ característica o hecho)',
          'Línea del tiempo interactiva (colocar hitos en orden)',
          'Rellenar huecos sobre un esquema geográfico o histórico',
        ],
        html5Sugerencias: [
          'Mapa o esquema interactivo donde Pablo señala accidentes geográficos o zonas históricas.',
          'Juego de unir con flechas etapas históricas, personajes o climas con su descripción.',
        ],
      };

    case 'matematicas':
    default:
      return {
        evaluacionTipologias: [
          'Pintar / representar fracciones (barras o círculos)',
          'Cálculo y operaciones (LaTeX)',
          'Problemas contextualizados de la vida real',
          'Geometría con figuras y medidas',
          'Recta numérica / Coordenadas',
          'Tablas de datos / proporcionalidad',
        ],
        evaluacionSugerencias: [
          'Incluye 2 ejercicios de colorear fracciones en círculos y barras, 2 operaciones y 1 problema.',
          'Pon figuras geométricas con sus medidas para calcular área y perímetro.',
        ],
        miniAppTipologias: [
          'Con fórmulas matemáticas en LaTeX',
          'Con figuras visuales / fracciones dibujadas',
          'Cálculo mental rápido',
          'Comprensión de definiciones y conceptos',
          'Errores típicos para cazar la trampa',
        ],
        miniAppSugerencias: [
          'Pon preguntas visuales donde tenga que identificar la fracción dibujada en el círculo o barra.',
          'Hazlo ágil y divertido con operaciones rápidas y errores típicos de signos.',
        ],
        html5Tipologias: [
          'Pintar o seleccionar partes en figuras / fracciones interactivas',
          'Unir con flechas (operación o fracción equivalente ↔ resultado)',
          'Escribir la respuesta numérica o completar huecos paso a paso',
          'Apuntar en recta numérica o plano cartesiano interactivo',
        ],
        html5Sugerencias: [
          'Juego interactivo luminoso donde Pablo pinta fracciones en círculos/barras y resuelve retos paso a paso.',
          'Actividad de unir con flechas fracciones equivalentes o resultados y escribir respuestas en huecos.',
        ],
      };
  }
}
