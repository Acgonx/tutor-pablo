import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { GameRenderer } from '../components/games/GameRenderer';
import { isFirebaseConfigured } from '../lib/firebase';
import { completeRetoPablo, getRetoPabloById } from '../services/retosService';
import type { RetoPabloHydrated } from '../types/firestore';
import type { GameCompletionResult } from '../types/studyMaterial';

export function StudentRetoPage() {
  const { id } = useParams<{ id: string }>();

  const [reto, setReto] = useState<RetoPabloHydrated | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const [savingError, setSavingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReto() {
      if (!id) {
        setLoadError('Falta el identificador del reto en el enlace.');
        setIsLoading(false);
        return;
      }

      if (!isFirebaseConfigured) {
        setLoadError(
          'Esta aplicación aún no tiene configurada la conexión a Firebase en este dispositivo.',
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      try {
        const fetched = await getRetoPabloById(id);
        if (cancelled) return;
        if (!fetched) {
          setLoadError('Este reto no existe o fue eliminado.');
        } else {
          setReto(fetched);
        }
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el reto. Comprueba tu conexión a Internet.',
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadReto();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleStudentComplete(result: GameCompletionResult) {
    if (!reto) return;
    setSavingStatus('saving');
    setSavingError(null);
    try {
      await completeRetoPablo({
        id: reto.id,
        asignatura: reto.asignatura,
        titulo: reto.titulo,
        puntuacion: result.puntuacion,
        fallos: result.fallos,
      });
      setSavingStatus('saved');
      setReto((prev) =>
        prev
          ? {
              ...prev,
              completado: true,
              puntuacion: result.puntuacion,
              fallos_en_partida: result.fallos,
            }
          : prev,
      );
    } catch (error) {
      setSavingStatus('error');
      setSavingError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la puntuación en Firestore.',
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-slate-900">Reto de Estudio · Pablo</p>
              <p className="text-xs text-slate-500">1º de ESO · Práctica interactiva</p>
            </div>
          </div>

          {reto?.completado && reto.puntuacion !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mejor marca guardada: {reto.puntuacion}%
            </span>
          )}
        </header>

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-600">Cargando tu reto...</p>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">No se pudo abrir este reto</h1>
            <p className="mt-1 text-sm text-slate-600">{loadError}</p>
          </div>
        )}

        {!isLoading && !loadError && reto && (
          <GameRenderer
            asignatura={reto.asignatura}
            titulo={reto.titulo}
            payload={reto.payload}
            mode="student"
            onComplete={handleStudentComplete}
            savingStatus={savingStatus}
            savingError={savingError}
          />
        )}
      </div>
    </div>
  );
}
