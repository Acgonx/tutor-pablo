import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
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
  tipo: TipoJuego;
  label: string;
  desc: string;
}> = [
  { tipo: 'flashcards', label: '1. Flashcards', desc: 'Active Recall frente/reverso' },
  { tipo: 'clasificar', label: '2. Clasificar', desc: 'Cajas táctiles tap-to-place' },
  { tipo: 'trivia_reto', label: '3. Trivia Reto', desc: '4 opciones + pistas y racha' },
  { tipo: 'ordenar_pasos', label: '4. Ordenar Pasos', desc: 'Secuenciación lógica táctil' },
];

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
  const [selectedTipo, setSelectedTipo] = useState<TipoJuego>('flashcards');
  const [publishedLinks, setPublishedLinks] = useState<Partial<Record<TipoJuego, string>>>({});
  const [copiedTipo, setCopiedTipo] = useState<TipoJuego | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
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
              Descargar .html autónomo
            </button>
          </div>

          <button
            type="button"
            disabled={!isGeminiConfigured || isRegenerating}
            onClick={() => void handleRegenerateCurrent()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {isRegenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Regenerar actividad
          </button>
        </div>

        {currentPublishedUrl && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
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
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            {actionError}
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
          Vista previa interactiva (modo prueba docente)
        </p>
        <GameRenderer
          key={`${selectedTipo}_${currentPayload.titulo}`}
          asignatura={asignatura}
          titulo={currentPayload.titulo}
          payload={currentPayload}
          mode="preview"
        />
      </div>
    </div>
  );
}
