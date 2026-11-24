import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Gamepad2,
  Loader2,
  Printer,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { getTipologiasPorAsignatura } from '../../data/curriculumCanarias';
import { isFirebaseConfigured } from '../../lib/firebase';
import { createRetoPablo } from '../../services/retosService';
import type { RetoPabloHydrated, TipoJuego } from '../../types/firestore';
import type {
  GamePayload,
  GenerationPromptConfig,
  MiniAppsBundle,
  NivelDificultad,
} from '../../types/studyMaterial';
import { downloadStandaloneHtml } from '../../utils/exportStandaloneHtml';
import { MathText } from '../common/MathText';
import { VisualFigureRenderer } from '../common/VisualFigureRenderer';
import { GameRenderer } from '../games/GameRenderer';
import { GeminiPromptBox } from './GeminiPromptBox';

interface MiniAppsTabProps {
  asignatura: string;
  tema: string;
  defaultDificultad: NivelDificultad;
  miniApps: MiniAppsBundle;
  generatingGameType: TipoJuego | null;
  generateGameError: string | null;
  isRefiningHtml5?: boolean;
  onGenerateMiniApp: (
    tipo: TipoJuego,
    config: GenerationPromptConfig,
  ) => Promise<void>;
  onRefineHtml5?: (instruction: string) => Promise<void>;
  onRetoPublished: (reto: RetoPabloHydrated) => void;
}

const MINI_APP_TABS: ReadonlyArray<{
  tipo: 'flashcards' | 'clasificar' | 'trivia_reto' | 'caza_error' | 'html5_neon';
  label: string;
  desc: string;
  countLabel: string;
  defaultCantidad: number;
  isNeonWow?: boolean;
}> = [
  {
    tipo: 'flashcards',
    label: '1. Flashcards',
    desc: 'Active Recall frente/reverso',
    countLabel: 'tarjetas',
    defaultCantidad: 6,
  },
  {
    tipo: 'clasificar',
    label: '2. Clasificar',
    desc: 'Cajas táctiles tap-to-place',
    countLabel: 'elementos a clasificar',
    defaultCantidad: 8,
  },
  {
    tipo: 'trivia_reto',
    label: '3. Trivia Reto',
    desc: '4 opciones + pistas y racha',
    countLabel: 'preguntas',
    defaultCantidad: 6,
  },
  {
    tipo: 'caza_error',
    label: '4. ¡Caza al Error!',
    desc: 'Detective: detecta la trampa',
    countLabel: 'casos de detective',
    defaultCantidad: 6,
  },
  {
    tipo: 'html5_neon',
    label: '5. Juego HTML5 WOW',
    desc: 'Unir flechas, huecos, señalar en dibujo...',
    countLabel: 'retos o fases en el juego',
    defaultCantidad: 6,
    isNeonWow: true,
  },
];

const RETOUCH_SUGGESTIONS = [
  'Haz las zonas y botones más grandes para el dedo en iPad.',
  'Cambia la mecánica a unir con flechas de colores.',
  'Añade pistas visuales paso a paso cuando falle un reto.',
] as const;

function PrintableMiniAppSheet({
  asignatura,
  tema,
  payload,
  showAnswers,
}: {
  asignatura: string;
  tema: string;
  payload: GamePayload;
  showAnswers: boolean;
}) {
  return (
    <article className="print-sheet mx-auto max-w-4xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="print-avoid-break border-b-2 border-slate-800 pb-3">
        <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
          1º ESO Canarias · {asignatura} · {tema}
        </p>
        <h3 className="mt-1 text-xl font-extrabold text-slate-900">
          <MathText text={payload.titulo} />
        </h3>
        <p className="mt-0.5 text-xs text-slate-600">
          <MathText text={payload.instrucciones} /> ·{' '}
          {showAnswers ? 'SOLUCIONARIO DOCENTE' : 'VERSIÓN ALUMNO'}
        </p>
      </header>

      {payload.tipo_juego === 'flashcards' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {payload.tarjetas.map((card, idx) => (
            <div
              key={card.id}
              className="print-avoid-break rounded-xl border border-slate-300 p-3.5 text-sm"
            >
              <p className="text-xs font-bold text-indigo-700">Tarjeta #{idx + 1}</p>
              <p className="mt-1 font-bold text-slate-900">
                <MathText text={card.frente} />
              </p>
              {card.recurso_visual && (
                <VisualFigureRenderer
                  spec={card.recurso_visual}
                  showSolution={showAnswers}
                />
              )}
              {showAnswers ? (
                <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-950 print-preserve-color">
                  <strong>Respuesta:</strong> <MathText text={card.reverso} />
                </p>
              ) : (
                <div className="mt-3 space-y-1">
                  <div className="print-answer-line" />
                  <div className="print-answer-line" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {payload.tipo_juego === 'clasificar' && (
        <div className="space-y-4">
          <div className="print-avoid-break rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs print-preserve-color">
            <strong>Categorías:</strong>{' '}
            {payload.categorias.map((c) => `${c.nombre} (${c.descripcion})`).join(' · ')}
          </div>
          <ol className="space-y-2.5 text-sm">
            {payload.elementos.map((el, idx) => {
              const cat = payload.categorias.find((c) => c.id === el.categoria_correcta_id);
              return (
                <li
                  key={el.id}
                  className="print-avoid-break rounded-xl border border-slate-200 p-3"
                >
                  <p className="font-semibold text-slate-900">
                    {idx + 1}. <MathText text={el.texto} />
                  </p>
                  {showAnswers ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-800">
                      Categoría: {cat?.nombre} — <MathText text={el.explicacion} />
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Categoría elegida: ______________________________
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {payload.tipo_juego === 'trivia_reto' && (
        <ol className="space-y-4 text-sm">
          {payload.preguntas.map((q, idx) => (
            <li
              key={q.id}
              className="print-avoid-break rounded-xl border border-slate-200 p-3.5"
            >
              <p className="font-bold text-slate-900">
                {idx + 1}. <MathText text={q.pregunta} />
              </p>
              {q.recurso_visual && (
                <VisualFigureRenderer spec={q.recurso_visual} showSolution={showAnswers} />
              )}
              <ul className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                {q.opciones.map((opt, optIdx) => {
                  const isCorrect = optIdx === q.indice_correcto;
                  return (
                    <li
                      key={optIdx}
                      className={`rounded-lg border px-2.5 py-1.5 ${
                        showAnswers && isCorrect
                          ? 'border-emerald-400 bg-emerald-50 font-bold text-emerald-950 print-preserve-color'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {['A', 'B', 'C', 'D'][optIdx] ?? optIdx + 1}. <MathText text={opt} />
                    </li>
                  );
                })}
              </ul>
              {showAnswers && (
                <p className="mt-2 text-xs text-emerald-900">
                  <strong>Explicación:</strong> <MathText text={q.explicacion} />
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      {payload.tipo_juego === 'caza_error' && (
        <ol className="space-y-4 text-sm">
          {payload.casos.map((caso, idx) => (
            <li
              key={caso.id}
              className="print-avoid-break rounded-xl border border-slate-200 p-3.5"
            >
              <p className="font-bold text-slate-900">
                Caso {idx + 1}: <MathText text={caso.contexto} />
              </p>
              {caso.recurso_visual && (
                <VisualFigureRenderer
                  spec={caso.recurso_visual}
                  showSolution={showAnswers}
                />
              )}
              <p className="mt-0.5 text-xs text-slate-500">
                Marca la única afirmación con error o trampa:
              </p>
              <ul className="mt-2 space-y-1.5 text-xs">
                {caso.afirmaciones.map((af, afIdx) => {
                  const isTrap = afIdx === caso.indice_error;
                  return (
                    <li
                      key={afIdx}
                      className={`rounded-lg border px-2.5 py-1.5 ${
                        showAnswers && isTrap
                          ? 'border-rose-400 bg-rose-50 font-bold text-rose-950 print-preserve-color'
                          : 'border-slate-200 text-slate-800'
                      }`}
                    >
                      [ ] {afIdx + 1}. <MathText text={af} />
                    </li>
                  );
                })}
              </ul>
              {showAnswers && (
                <p className="mt-2 text-xs text-emerald-900">
                  <strong>Corrección:</strong> <MathText text={caso.explicacion_correccion} />
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      {payload.tipo_juego === 'html5_neon' && (
        <div className="print-avoid-break space-y-3 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm">
          <p className="font-bold text-slate-900">
            Mini-App Interactiva HTML5 (Efecto WOW): {payload.estilo_mecanica}
          </p>
          <p className="text-xs text-slate-600">
            Esta actividad es un juego visual interactivo tipo arcade diseñado para iPad o
            navegador. Al jugarla en pantalla podrás imprimir el informe PDF con las respuestas
            y puntuaciones de Pablo, o descargar el archivo <code>.html</code> autocontenido.
          </p>
          {payload.conceptos_clave.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-800">
              {payload.conceptos_clave.map((c, idx) => (
                <li key={idx}>
                  <MathText text={c} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

export function MiniAppsTab({
  asignatura,
  tema,
  defaultDificultad,
  miniApps,
  generatingGameType,
  generateGameError,
  isRefiningHtml5 = false,
  onGenerateMiniApp,
  onRefineHtml5,
  onRetoPublished,
}: MiniAppsTabProps) {
  const [selectedTipo, setSelectedTipo] = useState<
    'flashcards' | 'clasificar' | 'trivia_reto' | 'caza_error' | 'html5_neon'
  >('flashcards');
  const [publishedLinks, setPublishedLinks] = useState<Partial<Record<TipoJuego, string>>>({});
  const [copiedTipo, setCopiedTipo] = useState<TipoJuego | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openConfigFor, setOpenConfigFor] = useState<
    Partial<Record<TipoJuego, boolean>>
  >({});
  const [retouchPrompt, setRetouchPrompt] = useState('');

  const [viewMode, setViewMode] = useState<'interactive' | 'printable'>('interactive');
  const [printAnswers, setPrintAnswers] = useState(false);

  const activeMeta =
    MINI_APP_TABS.find((t) => t.tipo === selectedTipo) ?? MINI_APP_TABS[0];
  const currentPayload = miniApps[selectedTipo];
  const currentPublishedUrl = publishedLinks[selectedTipo];
  const isGeneratingThis = generatingGameType === selectedTipo;
  const isConfigOpen = !currentPayload || Boolean(openConfigFor[selectedTipo]);
  const subjectPresets = getTipologiasPorAsignatura(asignatura);

  async function handleRetouchSubmit() {
    if (!onRefineHtml5 || !retouchPrompt.trim()) return;
    setActionError(null);
    await onRefineHtml5(retouchPrompt);
    setRetouchPrompt('');
    setPublishedLinks((prev) => {
      const next = { ...prev };
      delete next.html5_neon;
      return next;
    });
  }

  async function handleGenerateSubmit(config: GenerationPromptConfig) {
    await onGenerateMiniApp(selectedTipo, config);
    setOpenConfigFor((prev) => ({ ...prev, [selectedTipo]: false }));
    setPublishedLinks((prev) => {
      const next = { ...prev };
      delete next[selectedTipo];
      return next;
    });
  }

  async function handlePublishToIpad() {
    if (!currentPayload) return;
    setActionError(null);
    setIsPublishing(true);
    try {
      const created = await createRetoPablo({
        asignatura,
        titulo: `${tema} · ${currentPayload.titulo}`,
        payload: currentPayload,
      });
      const fullUrl = `${window.location.origin}/reto/${created.id}`;
      setPublishedLinks((prev) => ({ ...prev, [selectedTipo]: fullUrl }));
      onRetoPublished(created);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'No se pudo publicar el reto en Firestore.',
      );
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleCopyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTipo(selectedTipo);
      window.setTimeout(() => setCopiedTipo(null), 2200);
    } catch {
      setActionError('No se pudo copiar automáticamente; selecciona la URL manualmente.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="no-print grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {MINI_APP_TABS.map((tab) => {
          const isActive = selectedTipo === tab.tipo;
          const isReady = Boolean(miniApps[tab.tipo]);
          const activeClass = tab.isNeonWow
            ? 'border-indigo-600 bg-gradient-to-br from-indigo-600 to-sky-600 text-white shadow-sm'
            : 'border-indigo-600 bg-indigo-600 text-white shadow-sm';
          const inactiveClass = tab.isNeonWow
            ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-sky-50/70 text-slate-900 hover:border-indigo-400'
            : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300';
          return (
            <button
              key={tab.tipo}
              type="button"
              onClick={() => {
                setSelectedTipo(tab.tipo);
                setActionError(null);
              }}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                isActive ? activeClass : inactiveClass
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{tab.label}</p>
                {isReady && (
                  <CheckCircle2
                    className={`h-4 w-4 ${isActive ? 'text-emerald-200' : 'text-emerald-600'}`}
                  />
                )}
              </div>
              <p
                className={`mt-0.5 text-xs ${
                  isActive ? 'text-indigo-100' : 'text-slate-500'
                }`}
              >
                {isReady ? `${tab.desc} · Lista` : `${tab.desc} · Sin generar`}
              </p>
            </button>
          );
        })}
      </div>

      {isConfigOpen && (
        <GeminiPromptBox
          key={`${asignatura}_${selectedTipo}_prompt`}
          title={`Configurar ${activeMeta.label}`}
          subtitle={
            selectedTipo === 'html5_neon'
              ? 'Elige el número de retos, la mecánica interactiva (unir con flechas, escribir huecos, señalar en dibujo, arrastrar) y cualquier detalle visual.'
              : 'Elige cuántos ítems quieres en el juego, si incluyes LaTeX/figuras visuales y el enfoque.'
          }
          countLabel={activeMeta.countLabel}
          defaultCantidad={activeMeta.defaultCantidad}
          tipologiaOptions={
            selectedTipo === 'html5_neon'
              ? subjectPresets.html5Tipologias
              : subjectPresets.miniAppTipologias
          }
          quickSuggestions={
            selectedTipo === 'html5_neon'
              ? subjectPresets.html5Sugerencias
              : subjectPresets.miniAppSugerencias
          }
          defaultDificultad={defaultDificultad}
          hasExistingContent={Boolean(currentPayload)}
          isGenerating={isGeneratingThis}
          errorMessage={generateGameError}
          onSubmit={handleGenerateSubmit}
          onCancel={
            currentPayload
              ? () => setOpenConfigFor((prev) => ({ ...prev, [selectedTipo]: false }))
              : undefined
          }
        />
      )}

      {!currentPayload ? null : (
        <>
          <div className="no-print space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={!isFirebaseConfigured || isPublishing}
                  onClick={() => void handlePublishToIpad()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  Crear enlace /reto/:id para iPad
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadStandaloneHtml({
                      asignatura,
                      titulo: `${tema} · ${currentPayload.titulo}`,
                      payload: currentPayload,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Descargar .html
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('interactive')}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
                      viewMode === 'interactive'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    <Gamepad2 className="h-3.5 w-3.5" />
                    Jugar
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('printable')}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
                      viewMode === 'printable'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    PDF en papel
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setOpenConfigFor((prev) => ({
                      ...prev,
                      [selectedTipo]: !prev[selectedTipo],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Configurar / Regenerar
                </button>
              </div>
            </div>

            {selectedTipo === 'html5_neon' && onRefineHtml5 && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-bold text-indigo-950">
                    <Wand2 className="h-3.5 w-3.5 text-indigo-600" />
                    Retocar este juego HTML5 sin empezar de cero
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {RETOUCH_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRetouchPrompt(s)}
                        className="rounded-full border border-indigo-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={retouchPrompt}
                    onChange={(ev) => setRetouchPrompt(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') {
                        ev.preventDefault();
                        void handleRetouchSubmit();
                      }
                    }}
                    placeholder="Ej: Agranda los círculos, pon fondo blanco limpio o añade un nivel de unir con flechas..."
                    className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={isRefiningHtml5 || isGeneratingThis || !retouchPrompt.trim()}
                    onClick={() => void handleRetouchSubmit()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isRefiningHtml5 ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Retocando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Aplicar retoque
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'printable' && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
                <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={printAnswers}
                    onChange={(ev) => setPrintAnswers(ev.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  Incluir soluciones en la impresión
                </label>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 font-bold text-white hover:bg-slate-800"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir / Guardar PDF
                </button>
              </div>
            )}

            {currentPublishedUrl && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Enlace listo para enviar al iPad de Pablo:</p>
                  <p className="mt-0.5 truncate font-mono text-emerald-900">
                    {currentPublishedUrl}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyUrl(currentPublishedUrl)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-bold text-emerald-800 ring-1 ring-emerald-300 hover:bg-emerald-100"
                  >
                    {copiedTipo === selectedTipo ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar enlace
                      </>
                    )}
                  </button>
                  <a
                    href={currentPublishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white hover:bg-emerald-800"
                  >
                    Abrir
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )}

            {actionError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                {actionError}
              </p>
            )}
          </div>

          {viewMode === 'interactive' ? (
            <div>
              <p className="no-print mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                Vista previa interactiva (al terminar podrás imprimir el informe PDF de
                respuestas)
              </p>
              <GameRenderer
                key={`${selectedTipo}_${currentPayload.titulo}`}
                asignatura={asignatura}
                titulo={currentPayload.titulo}
                payload={currentPayload}
                mode="preview"
              />
            </div>
          ) : (
            <PrintableMiniAppSheet
              asignatura={asignatura}
              tema={tema}
              payload={currentPayload}
              showAnswers={printAnswers}
            />
          )}
        </>
      )}
    </div>
  );
}
