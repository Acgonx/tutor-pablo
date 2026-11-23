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
