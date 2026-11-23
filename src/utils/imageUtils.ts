import type { UploadedImageItem } from '../types/ocr';

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error(`No se pudo leer el archivo "${file.name}".`));
      }
    };
    reader.onerror = () => reject(new Error(`Error al leer "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function createUid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo decodificar la imagen seleccionada.'));
    img.src = src;
  });
}

/**
 * Prepara fotos (redimensionadas manteniendo nitidez) o documentos PDF
 * para enviarlos a Gemini Vision.
 */
export async function prepareImageFile(file: File): Promise<UploadedImageItem> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error(`El PDF "${file.name}" supera el límite de 20 MB.`);
    }
    const dataUrl = await readFileAsDataUrl(file);
    const commaIndex = dataUrl.indexOf(',');
    const base64Data = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;

    return {
      id: createUid(),
      fileName: file.name,
      mimeType: 'application/pdf',
      base64Data,
      previewUrl: '',
      sizeBytes: file.size,
    };
  }

  if (!file.type.startsWith('image/')) {
    throw new Error(`El archivo "${file.name}" no es una imagen ni un PDF válido.`);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
    const targetWidth = Math.max(1, Math.round(img.width * scale));
    const targetHeight = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('El navegador no pudo inicializar el lienzo para procesar la imagen.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const previewUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const commaIndex = previewUrl.indexOf(',');
    const base64Data = commaIndex >= 0 ? previewUrl.slice(commaIndex + 1) : previewUrl;
    const approxSizeBytes = Math.round((base64Data.length * 3) / 4);

    return {
      id: createUid(),
      fileName: file.name,
      mimeType: 'image/jpeg',
      base64Data,
      previewUrl,
      sizeBytes: approxSizeBytes,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
