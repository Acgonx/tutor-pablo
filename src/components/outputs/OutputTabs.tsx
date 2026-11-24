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
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { isFirebaseConfigured } from '../../lib/firebase';
import { isGeminiConfigured } from '../../lib/gemini';
import { attachSesionToArtefacto } from '../../services/artefactosService';
import { createSesionPablo } from '../../services/sesionesService';
import type { LibretaErrorDoc, RetoPabloHydrated, TipoJuego } from '../../types/firestore';
import type { OcrVerificationData } from '../../types/ocr';
import type {
  ArtefactoDoc,
  GamePayload,
  GeneratedStudyPack,
  NivelDificultad,
  TipoDocumentoEvaluacion,
} from '../../types/studyMaterial';
import { AndamiajeTab } from './AndamiajeTab';
import { EsquemaVisualTab } from './EsquemaVisualTab';
import { ExamenPdfTab } from './ExamenPdfTab';
import { MiniAppsTab } from './MiniAppsTab';

type OutputTabId = 'esquema' | 'andamiaje' | 'examen' | 'miniapps';

interface OutputTabsProps {
  studyPack: GeneratedStudyPack;
  verification: OcrVerificationData;
  artefacto: ArtefactoDoc | null;
  dificultad: NivelDificultad;
  injectedErrors: LibretaErrorDoc[];
  savedNewErrorsCount: number;
  firestoreWarning: string | null;
  isIterating: boolean;
  iterateError: string | null;
  iterateSuccessMessage: string | null;
  regeneratingDocType: TipoDocumentoEvaluacion | null;
  regenerateDocError: string | null;
  onIterateArtifact: (
    targetDificultad: NivelDificultad,
    instruccionCambio: string,
  ) => Promise<void>;
  onRegenerateEvaluationDoc: (tipoDoc: TipoDocumentoEvaluacion) => Promise<void>;
  onSesionAttached: (sesionId: string) => void;
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
  { id: 'examen', label: 'Fichas (3 niveles) y Examen', icon: FileSpreadsheet },
  { id: 'miniapps', label: 'Mini-Apps iPad', icon: Gamepad2 },
];

const DIFICULTAD_OPTIONS: ReadonlyArray<{
  value: NivelDificultad;
  label: string;
}> = [
  { value: 'refuerzo', label: 'Refuerzo guiado' },
  { value: 'estandar', label: 'Estándar 1º ESO' },
  { value: 'ampliacion', label: 'Ampliación' },
  { value: 'reto_alto', label: 'Reto alto' },
];

const DIFICULTAD_LABEL: Record<NivelDificultad, string> = {
  refuerzo: 'Refuerzo guiado',
  estandar: 'Estándar 1º ESO',
  ampliacion: 'Ampliación',
  reto_alto: 'Reto alto',
};

const QUICK_PROMPTS: readonly string[] = [
  'Sube un punto la exigencia de los problemas y reduce las pistas en el Trivia.',
  'Añade más ejemplos paso a paso y simplifica el esquema visual.',
  'Incluye una situación competencial más realista ambientada en Canarias.',
];

export function OutputTabs({
  studyPack,
  verification,
  artefacto,
  dificultad,
  injectedErrors,
  savedNewErrorsCount,
  firestoreWarning,
  isIterating,
  iterateError,
  iterateSuccessMessage,
  regeneratingDocType,
  regenerateDocError,
  onIterateArtifact,
  onRegenerateEvaluationDoc,
  onSesionAttached,
  onBackToVerification,
  onStartNewSession,
  onUpdateMiniApp,
  onRetoPublished,
}: OutputTabsProps) {
  const [activeTab, setActiveTab] = useState<OutputTabId>('esquema');
  const [isPublishingSession, setIsPublishingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [copiedSession, setCopiedSession] = useState(false);

  const [showIteratePanel, setShowIteratePanel] = useState(false);
  const [customTargetDificultad, setCustomTargetDificultad] =
    useState<NivelDificultad | null>(null);
  const [instruccionCambio, setInstruccionCambio] = useState('');

  const targetDificultad = customTargetDificultad ?? dificultad;

  const sessionUrl = artefacto?.sesion_pablo_id
    ? `${window.location.origin}/sesion/${artefacto.sesion_pablo_id}`
    : null;

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
      if (artefacto?.id) {
        await attachSesionToArtefacto(artefacto.id, created.id);
      }
      onSesionAttached(created.id);
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

  async function handleRunIteration() {
    await onIterateArtifact(targetDificultad, instruccionCambio);
    setCustomTargetDificultad(null);
    setInstruccionCambio('');
  }

  const nextVersion = (artefacto?.version ?? 1) + 1;

  return (
    <div className="space-y-5">
      <section className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold tracking-wide text-indigo-700 uppercase">
                {studyPack.asignatura} · 1º ESO Canarias
              </p>
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                v{artefacto?.version ?? 1}
              </span>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                {DIFICULTAD_LABEL[dificultad]}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">{studyPack.tema}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowIteratePanel((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                showIteratePanel
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                  : 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Iterar / Subir dificultad
            </button>

            {!sessionUrl && (
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
            )}

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

        {showIteratePanel && (
          <div className="mt-4 space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-bold text-indigo-950">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                Iterar artefacto manteniendo consistencia global (generará v{nextVersion})
              </p>
              <span className="text-xs text-slate-600">
                Actualiza al unísono Esquema, Andamiaje, Examen y las 4 Mini-Apps
              </span>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-700">
                Nivel de dificultad objetivo:
              </p>
              <div className="flex flex-wrap gap-2">
                {DIFICULTAD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isIterating}
                    onClick={() => setCustomTargetDificultad(opt.value)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                      targetDificultad === opt.value
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="iterate-instruction"
                className="block text-xs font-semibold text-slate-700"
              >
                ¿Qué cambios quieres pedir?
              </label>
              <textarea
                id="iterate-instruction"
                rows={2}
                disabled={isIterating}
                value={instruccionCambio}
                onChange={(ev) => setInstruccionCambio(ev.target.value)}
                placeholder="Ej: Sube la dificultad de los ejercicios, añade 2 preguntas más de desarrollo en el examen y haz las flashcards más exigentes."
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={isIterating}
                    onClick={() => setInstruccionCambio(suggestion)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {iterateError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">
                {iterateError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isIterating}
                onClick={() => setShowIteratePanel(false)}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={isIterating || !isGeminiConfigured}
                onClick={() => void handleRunIteration()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isIterating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Iterando artefacto...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Aplicar cambios e iterar (v{nextVersion})
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {iterateSuccessMessage && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
            {iterateSuccessMessage}
          </div>
        )}

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
          <div className="flex flex-wrap items-center gap-2 font-bold">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>
              {injectedErrors.length > 0
                ? `Artefacto con ${injectedErrors.length} error(es) previo(s) invocado(s) por ti`
                : 'Artefacto aislado: generado solo con este material (sin mezclar otros temas)'}
            </span>
            {savedNewErrorsCount > 0 && (
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                +{savedNewErrorsCount} error(es) real(es) de Pablo guardado(s) en Libreta
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
                Enlace completo sincronizado para Pablo (Esquema + Andamiaje + Mini-Apps):
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
          bundle={studyPack.evaluacion_y_fichas}
          regeneratingDocType={regeneratingDocType}
          regenerateError={regenerateDocError}
          onRegenerateDoc={onRegenerateEvaluationDoc}
        />
      )}
      {activeTab === 'miniapps' && (
        <MiniAppsTab
          asignatura={studyPack.asignatura}
          tema={studyPack.tema}
          dificultad={dificultad}
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
