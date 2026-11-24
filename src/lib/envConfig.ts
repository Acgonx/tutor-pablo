export const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL?.trim() || 'gemini-3.8-flash';

export const isGeminiConfigured = Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim());
