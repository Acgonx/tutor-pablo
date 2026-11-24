import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Gamepad2,
  Loader2,
  Printer,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { isFirebaseConfigured } from '../../lib/firebase';
import { isGeminiConfigured, regenerateSingleMiniApp } from '../../lib/gemini';
import { createRetoPablo } from '../../services/retosService';
import type { LibretaErrorDoc, RetoPabloHydrated, TipoJuego } from '../../types/firestore';
import type { OcrVerificationData } from '../../types/ocr';
import type {
  GamePayload,
  MiniAppsBundle,
  NivelDificultad,
} from '../../types/studyMaterial';
import { downloadStandaloneHtml } from '../../utils/exportStandaloneHtml';
import { GameRenderer } from '../games/GameRenderer';

interface MiniAppsTabProps {
  asignatura: string;
  tema: string;
  dificultad: NivelDificultad;
  miniApps: MiniAppsBundle;
  verification: OcrVerificationData;
  injectedErrors: LibretaErrorDoc[];
  onUpdateMiniApp: (tipo: TipoJuego, nextPayload: GamePayload) => void;
  onRetoPublished: (reto: RetoPabloHydrated) => void;
}

const MINI_APP_TABS: ReadonlyArray<{
  tipo: 'flashcards' | 'clasificar' | 'trivia_reto' | 'caza_error';
  label: string;
  desc: string;
}> = [
  { tipo: 'flashcards', label: '1. Flashcards', desc: 'Active Recall frente/reverso' },
  { tipo: 'clasificar', label: '2. Clasificar', desc: 'Cajas táctiles tap-to-place' },
  { tipo: 'trivia_reto', label: '3. Trivia Reto', desc: '4 opciones + pistas y racha' },
  {
    tipo: 'caza_error',
    label: '4. ¡Caza al Error!',
    desc: 'Detective: detecta la trampa',
  },
];

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
        <h3 className="mt-1 text-xl font-extrabold text-slate-900">{payload.titulo}</h3>
        <p className="mt-0.5 text-xs text-slate-600">
          {payload.instrucciones} · {showAnswers ? 'SOLUCIONARIO DOCENTE' : 'VERSIÓN ALUMNO'}
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
              <p className="mt-1 font-bold text-slate-900">{card.frente}</p>
              {showAnswers ? (
                <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-950 print-preserve-color">
                  <strong>Respuesta:</strong> {card.reverso}
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
                    {idx + 1}. {el.texto}
                  </p>
                  {showAnswers ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-800">
                      Categoría: {cat?.nombre} — {el.explicacion}
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
                {idx + 1}. {q.pregunta}
              </p>
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
                      {['A', 'B', 'C', 'D'][optIdx] ?? optIdx + 1}. {opt}
                    </li>
                  );
                })}
              </ul>
              {showAnswers && (
                <p className="mt-2 text-xs text-emerald-900">
                  <strong>Explicación:</strong> {q.explicacion}
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
                Caso {idx + 1}: {caso.contexto}
              </p>
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
                      [ ] {afIdx + 1}. {af}
                    </li>
                  );
                })}
              </ul>
              {showAnswers && (
                <p className="mt-2 text-xs text-emerald-900">
                  <strong>Corrección:</strong> {caso.explicacion_correccion}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export function MiniAppsTab({
  asignatura,
  tema,
  dificultad,
  miniApps,
  verification,
  injectedErrors,
  onUpdateMiniApp,
  onRetoPublished,
}: MiniAppsTabProps) {
  const [selectedTipo, setSelectedTipo] = useState<
    'flashcards' | 'clasificar' | 'trivia_reto' | 'caza_error'
  >('flashcards');
  const [publishedLinks, setPublishedLinks] = useState<Partial<Record<TipoJuego, string>>>({});
  const [copiedTipo, setCopiedTipo] = useState<TipoJuego | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'interactive' | 'printable'>('interactive');
  const [printAnswers, setPrintAnswers] = useState(false);

  const currentPayload = miniApps[selectedTipo];
  const currentPublishedUrl = publishedLinks[selectedTipo];

  async function handlePublishToIpad() {
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

  async function handleRegenerateCurrent() {
    setActionError(null);
    setIsRegenerating(true);
    try {
      const freshPayload = await regenerateSingleMiniApp({
        tipoJuego: selectedTipo,
        verification,
        libretaErrores: injectedErrors,
        dificultad,
      });
      onUpdateMiniApp(selectedTipo, freshPayload);
      setPublishedLinks((prev) => {
        const next = { ...prev };
        delete next[selectedTipo];
        return next;
      });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Error al regenerar la actividad con Gemini.',
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="no-print grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {MINI_APP_TABS.map((tab) => {
          const isActive = selectedTipo === tab.tipo;
          return (
            <button
              key={tab.tipo}
              type="button"
              onClick={() => {
                setSelectedTipo(tab.tipo);
                setActionError(null);
              }}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                isActive
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300'
              }`}
            >
              <p className="text-sm font-bold">{tab.label}</p>
              <p
                className={`mt-0.5 text-xs ${
                  isActive ? 'text-indigo-100' : 'text-slate-500'
                }`}
              >
                {tab.desc}
              </p>
            </button>
          );
        })}
      </div>

      <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
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
              disabled={!isGeminiConfigured || isRegenerating}
              onClick={() => void handleRegenerateCurrent()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {isRegenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Regenerar
            </button>
          </div>
        </div>

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
            Vista previa interactiva (al terminar podrás imprimir también el informe PDF de
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
    </div>
  );
}
