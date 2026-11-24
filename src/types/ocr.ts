export type FuenteDocumento =
  | 'apuntes_clase'
  | 'examen_corregido'
  | 'libro_ejercicios'
  | 'indice_temario'
  | 'mixto';

export interface UploadedImageItem {
  id: string;
  fileName: string;
  mimeType: string;
  base64Data: string;
  previewUrl: string;
  sizeBytes: number;
}

export type SeveridadError = 'alta' | 'media' | 'baja';

export type OrigenErrorOcr =
  | 'pendiente_confirmar'
  | 'error_pablo'
  | 'error_material'
  | 'descartado';

export interface DetectedErrorDraft {
  id: string;
  concepto_fallado: string;
  explicacion_error: string;
  severidad: SeveridadError;
  origen: OrigenErrorOcr;
  guardar_en_libreta: boolean;
}

export interface OcrVerificationData {
  asignatura: string;
  tema: string;
  fuente: FuenteDocumento;
  transcripcion: string;
  epigrafes_indice?: string[];
  epigrafes_seleccionados?: string[];
  contenido_curricular_completado: string;
  incluir_completado_curricular: boolean;
  criterios_evaluacion_lomloe: string[];
  errores_detectados: DetectedErrorDraft[];
  errores_invocados_ids: string[];
  observaciones_legibilidad: string;
  notas_adicionales_docente: string;
}
