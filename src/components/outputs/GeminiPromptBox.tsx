import { useState } from 'react';
import { Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { isGeminiConfigured } from '../../lib/gemini';
import type { GenerationPromptConfig, NivelDificultad } from '../../types/studyMaterial';

interface GeminiPromptBoxProps {
  title: string;
  subtitle: string;
  countLabel: string;
  defaultCantidad?: number;
  tipologiaOptions: readonly string[];
  quickSuggestions?: readonly string[];
  defaultDificultad?: NivelDificultad;
  hasExistingContent?: boolean;
  isGenerating: boolean;
  errorMessage?: string | null;
  onSubmit: (config: GenerationPromptConfig) => Promise<void> | void;
  onCancel?: () => void;
}

const DIFICULTAD_LABELS: ReadonlyArray<{ value: NivelDificultad; label: string }> = [
  { value: 'refuerzo', label: 'Refuerzo guiado' },
  { value: 'estandar', label: 'Estándar 1º ESO' },
  { value: 'ampliacion', label: 'Ampliación' },
  { value: 'reto_alto', label: 'Reto alto' },
];

const PRESET_COUNTS = [3, 5, 6, 8, 10] as const;

export function GeminiPromptBox({
  title,
  subtitle,
  countLabel,
  defaultCantidad = 6,
  tipologiaOptions,
  quickSuggestions = [],
  defaultDificultad = 'estandar',
  hasExistingContent = false,
  isGenerating,
  errorMessage = null,
  onSubmit,
  onCancel,
}: GeminiPromptBoxProps) {
  const [cantidad, setCantidad] = useState(defaultCantidad);
  const [selectedTipologias, setSelectedTipologias] = useState<string[]>(
    tipologiaOptions.slice(0, 2),
  );
  const [incluirDibujos, setIncluirDibujos] = useState(true);
  const [dificultad, setDificultad] = useState<NivelDificultad>(defaultDificultad);
  const [promptLibre, setPromptLibre] = useState('');

  function toggleTipologia(tipo: string) {
    setSelectedTipologias((prev) =>
      prev.includes(tipo) ? prev.filter((item) => item !== tipo) : [...prev, tipo],
    );
  }

  async function handleGenerateClick() {
    await onSubmit({
      cantidad: Math.max(1, Math.min(20, cantidad)),
      tipologias: selectedTipologias,
      incluirDibujos,
      dificultad,
      promptLibre,
    });
  }

  return (
    <div className="no-print space-y-4 rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-800">
            <Sparkles className="h-3.5 w-3.5" />
            Cuadro de petición · Gemini
          </span>
          <h3 className="mt-1.5 text-lg font-extrabold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600">{subtitle}</p>
        </div>
        {onCancel && hasExistingContent && (
          <button
            type="button"
            disabled={isGenerating}
            onClick={onCancel}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Ocultar panel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase">
            ¿Cuántos {countLabel} quieres?
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {PRESET_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={isGenerating}
                onClick={() => setCantidad(n)}
                className={`h-9 min-w-9 rounded-xl border px-3 text-xs font-bold transition-colors ${
                  cantidad === n
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={20}
              disabled={isGenerating}
              value={cantidad}
              onChange={(ev) => setCantidad(Number(ev.target.value) || 1)}
              aria-label={`Número exacto de ${countLabel}`}
              className="h-9 w-16 rounded-xl border border-slate-300 bg-white px-2.5 text-center text-xs font-bold text-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase">
            Nivel de dificultad
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DIFICULTAD_LABELS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={isGenerating}
                onClick={() => setDificultad(opt.value)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                  dificultad === opt.value
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tipologiaOptions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold text-slate-700 uppercase">
            Tipología exacta de ejercicios / enfoque (marca los que quieras)
          </p>
          <div className="flex flex-wrap gap-2">
            {tipologiaOptions.map((tipo) => {
              const active = selectedTipologias.includes(tipo);
              return (
                <button
                  key={tipo}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => toggleTipologia(tipo)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300'
                  }`}
                >
                  {tipo}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-slate-800">
          <input
            type="checkbox"
            disabled={isGenerating}
            checked={incluirDibujos}
            onChange={(ev) => setIncluirDibujos(ev.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          <ImageIcon className="h-4 w-4 text-indigo-600" />
          Incluir dibujos, figuras geométricas, rectas numéricas o recuadros para pintar
        </label>
      </div>

      <div>
        <label
          htmlFor="gemini-free-prompt"
          className="block text-xs font-bold text-slate-700 uppercase"
        >
          Petición libre estilo Gemini (opcional)
        </label>
        <textarea
          id="gemini-free-prompt"
          rows={2}
          disabled={isGenerating}
          value={promptLibre}
          onChange={(ev) => setPromptLibre(ev.target.value)}
          placeholder="Ej: Pon 3 ejercicios con círculos y barras en blanco para pintar fracciones, 2 operaciones en LaTeX y 1 problema de la vida diaria."
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
        />
        {quickSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={isGenerating}
                onClick={() => setPromptLibre(s)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isGenerating || !isGeminiConfigured}
          onClick={() => void handleGenerateClick()}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando con Gemini...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {hasExistingContent ? 'Regenerar con esta petición' : 'Generar ahora con Gemini'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
