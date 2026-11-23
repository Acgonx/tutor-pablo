export type FuenteDocumento =
  | 'apuntes_clase'
  | 'examen_corregido'
  | 'libro_ejercicios'
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

export interface DetectedErrorDraft {
  id: string;
  concepto_fallado: string;
  explicacion_error: string;
  severidad: SeveridadError;
  incluir_en_libreta: boolean;
}

export interface OcrVerificationData {
  asignatura: string;
  tema: string;
  fuente: FuenteDocumento;
  transcripcion: string;
  errores_detectados: DetectedErrorDraft[];
  observaciones_legibilidad: string;
  notas_adicionales_docente: string;
}
