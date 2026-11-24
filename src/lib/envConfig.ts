export const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL?.trim() || 'gemini-3.8-flash';

export const GEMINI_IMAGE_MODEL =
  import.meta.env.VITE_GEMINI_IMAGE_MODEL?.trim() || 'gemini-2.5-flash-image';

export const isGeminiConfigured = Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim());

export const GEMINI_MODEL_CHOICES: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: '', label: `Por defecto (${GEMINI_MODEL})` },
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (equilibrado)' },
  { value: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (muy rápido)' },
  { value: 'gemini-4-neon', label: 'Gemini 4 Neon (creativo / HTML5)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (clásico rápido)' },
];
