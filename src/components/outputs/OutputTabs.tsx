import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Gamepad2,
  GitBranch,
  Layers,
  Loader2,
  PlusCircle,
  Share2,
  Sparkles,
} from 'lucide-react';
import { isFirebaseConfigured } from '../../lib/firebase';
import { createSesionPablo } from '../../services/sesionesService';
import type { LibretaErrorDoc, RetoPabloHydrated, TipoJuego } from '../../types/firestore';
import type { OcrVerificationData } from '../../types/ocr';
import type { GamePayload, GeneratedStudyPack } from '../../types/studyMaterial';
import { AndamiajeTab } from './AndamiajeTab';
import { EsquemaVisualTab } from './EsquemaVisualTab';
import { ExamenPdfTab } from './ExamenPdfTab';
import { MiniAppsTab } from './MiniAppsTab';

type OutputTabId = 'esquema' | 'andamiaje' | 'examen' | 'miniapps';

interface OutputTabsProps {
  studyPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  injectedErrors: LibretaErrorDoc[];
  savedNewErrorsCount: number;
  firestoreWarning: string | null;
  onBackToVerification: () => void;
  onStartNewSession: () => void;
  onUpdateMiniApp: (tipo: TipoJuego, nextPayload: GamePayload) => void;
  onRetoPublished: (reto: RetoPabloHydrated) => void;
}

const TABS: ReadonlyArray<{
  id: OutputTabId;
  label: string;
  icon: typeof GitBranch;
}> = [
  { id: 'esquema', label: 'Esquema Visual', icon: GitBranch },
  { id: 'andamiaje', label: 'Explicación con Andamiaje', icon: Layers },
  { id: 'examen', label: 'Examen / Ficha PDF', icon: FileSpreadsheet },
  { id: 'miniapps', label: 'Mini-Apps iPad', icon: Gamepad2 },
];

export function OutputTabs({
  studyPack,
  verification,
  injectedErrors,
  savedNewErrorsCount,
  firestoreWarning,
  onBackToVerification,
  onStartNewSession,
  onUpdateMiniApp,
  onRetoPublished,
}: OutputTabsProps) {
  const [activeTab, setActiveTab] = useState<OutputTabId>('esquema');
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [isPublishingSession, setIsPublishingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [copiedSession, setCopiedSession] = useState(false);

  async function handlePublishFullSession() {
    setSessionError(null);
    setIsPublishingSession(true);
    try {
      const created = await createSesionPablo({
        asignatura: studyPack.asignatura,
        tema: studyPack.tema,
        esquema_visual: studyPack.esquema_visual,
        explicacion_andamiaje: studyPack.explicacion_andamiaje,
        mini_apps: studyPack.mini_apps,
      });
      setSessionUrl(`${window.location.origin}/sesion/${created.id}`);
    } catch (error) {
      setSessionError(
        error instanceof Error
          ? error.message
          : 'No se pudo generar el enlace de la sesión.',
      );
    } finally {
      setIsPublishingSession(false);
    }
  }

  async function handleCopySessionUrl() {
    if (!sessionUrl) return;
    try {
      await navigator.clipboard.writeText(sessionUrl);
      setCopiedSession(true);
      window.setTimeout(() => setCopiedSession(false), 2000);
    } catch {
      // Silencio si no hay permisos de portapapeles
    }
  }

  return (
    <div className="space-y-5">
      <section className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-indigo-700 uppercase">
              {studyPack.asignatura} · 1º ESO Canarias
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">{studyPack.tema}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!isFirebaseConfigured || isPublishingSession}
              onClick={() => void handlePublishFullSession()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isPublishingSession ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              Enlace completo para Pablo
            </button>
            <button
              type="button"
              onClick={onBackToVerification}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Editar lectura OCR
            </button>
            <button
              type="button"
              onClick={onStartNewSession}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Nueva sesión
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
          <div className="flex flex-wrap items-center gap-2 font-bold">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>
              Repetición Espaciada aplicada: {injectedErrors.length}{' '}
              {injectedErrors.length === 1 ? 'error activo integrado' : 'errores activos integrados'}
            </span>
            {savedNewErrorsCount > 0 && (
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                +{savedNewErrorsCount} guardado(s) en Libreta
              </span>
            )}
          </div>
          {injectedErrors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {injectedErrors.map((err) => (
                <span
                  key={err.id}
                  className="rounded-md bg-white px-2 py-0.5 font-medium text-amber-900 ring-1 ring-amber-200"
                >
                  {err.concepto_fallado} ({err.veces_fallado}x)
                </span>
              ))}
            </div>
          )}
          {firestoreWarning && (
            <p className="mt-2 font-semibold text-rose-700">{firestoreWarning}</p>
          )}
        </div>

        {sessionUrl && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                Enlace completo para Pablo (Esquema + Andamiaje + Mini-Apps):
              </p>
              <p className="mt-0.5 truncate font-mono text-emerald-900">{sessionUrl}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopySessionUrl()}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-bold text-emerald-800 ring-1 ring-emerald-300 hover:bg-emerald-100"
              >
                {copiedSession ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </>
                )}
              </button>
              <a
                href={sessionUrl}
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

        {sessionError && (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            {sessionError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2" role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === 'esquema' && (
        <EsquemaVisualTab
          asignatura={studyPack.asignatura}
          tema={studyPack.tema}
          data={studyPack.esquema_visual}
        />
      )}
      {activeTab === 'andamiaje' && (
        <AndamiajeTab data={studyPack.explicacion_andamiaje} />
      )}
      {activeTab === 'examen' && (
        <ExamenPdfTab
          asignatura={studyPack.asignatura}
          tema={studyPack.tema}
          data={studyPack.examen_pdf}
        />
      )}
      {activeTab === 'miniapps' && (
        <MiniAppsTab
          asignatura={studyPack.asignatura}
          tema={studyPack.tema}
          miniApps={studyPack.mini_apps}
          verification={verification}
          injectedErrors={injectedErrors}
          onUpdateMiniApp={onUpdateMiniApp}
          onRetoPublished={onRetoPublished}
        />
      )}
    </div>
  );
}
