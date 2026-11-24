import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Gamepad2,
  GitBranch,
  Layers,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { GameRenderer } from '../components/games/GameRenderer';
import { AndamiajeTab } from '../components/outputs/AndamiajeTab';
import { EsquemaVisualTab } from '../components/outputs/EsquemaVisualTab';
import { isFirebaseConfigured } from '../lib/firebase';
import { getSesionPabloById } from '../services/sesionesService';
import type { SesionPabloDoc } from '../services/sesionesService';
import type { TipoJuego } from '../types/firestore';

type StudentTab = 'esquema' | 'andamiaje' | 'juegos';

const GAME_LABELS: Record<TipoJuego, string> = {
  flashcards: 'Flashcards',
  clasificar: 'Clasificar',
  trivia_reto: 'Trivia Reto',
  caza_error: '¡Caza al Error!',
  html5_neon: 'Juego HTML5 WOW',
  ordenar_pasos: 'Ordenar Pasos',
};

export function StudentSessionPage() {
  const { id } = useParams<{ id: string }>();
  const [sesion, setSesion] = useState<SesionPabloDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudentTab>('esquema');
  const [selectedGame, setSelectedGame] = useState<TipoJuego>('flashcards');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setLoadError('Falta el identificador de la sesión en el enlace.');
        setIsLoading(false);
        return;
      }
      if (!isFirebaseConfigured) {
        setLoadError('La conexión a Firebase no está configurada.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      try {
        const fetched = await getSesionPabloById(id);
        if (cancelled) return;
        if (!fetched) {
          setLoadError('Esta sesión no existe o fue eliminada.');
        } else {
          setSesion(fetched);
          if (!fetched.esquema_visual && fetched.explicacion_andamiaje) {
            setActiveTab('andamiaje');
          } else if (
            !fetched.esquema_visual &&
            !fetched.explicacion_andamiaje &&
            Object.values(fetched.mini_apps).some(Boolean)
          ) {
            setActiveTab('juegos');
          }
        }
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la sesión. Comprueba tu conexión.',
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const availableGames: TipoJuego[] = sesion
    ? ([
        'flashcards',
        'clasificar',
        'trivia_reto',
        'caza_error',
        'html5_neon',
        'ordenar_pasos',
      ] as TipoJuego[]).filter((k) => Boolean(sesion.mini_apps[k]))
    : [];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                Sesión de Estudio · Pablo
              </p>
              <p className="text-xs text-slate-500">
                {sesion ? `${sesion.asignatura} · ${sesion.tema}` : '1º de ESO'}
              </p>
            </div>
          </div>

          {sesion && (
            <div className="flex flex-wrap gap-2">
              {sesion.esquema_visual && (
                <button
                  type="button"
                  onClick={() => setActiveTab('esquema')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
                    activeTab === 'esquema'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <GitBranch className="h-4 w-4" />
                  Esquema
                </button>
              )}
              {sesion.explicacion_andamiaje && (
                <button
                  type="button"
                  onClick={() => setActiveTab('andamiaje')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
                    activeTab === 'andamiaje'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  Andamiaje
                </button>
              )}
              {availableGames.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('juegos')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
                    activeTab === 'juegos'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Gamepad2 className="h-4 w-4" />
                  Mini-Apps
                </button>
              )}
            </div>
          )}
        </header>

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-600">Cargando tu sesión...</p>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">No se pudo abrir esta sesión</h1>
            <p className="mt-1 text-sm text-slate-600">{loadError}</p>
          </div>
        )}

        {!isLoading && !loadError && sesion && (
          <>
            {activeTab === 'esquema' && sesion.esquema_visual && (
              <EsquemaVisualTab
                asignatura={sesion.asignatura}
                tema={sesion.tema}
                data={sesion.esquema_visual}
              />
            )}

            {activeTab === 'andamiaje' && sesion.explicacion_andamiaje && (
              <AndamiajeTab data={sesion.explicacion_andamiaje} />
            )}

            {activeTab === 'juegos' && availableGames.length > 0 && (() => {
              const activeGameKey = availableGames.includes(selectedGame)
                ? selectedGame
                : availableGames[0];
              const currentPayload = sesion.mini_apps[activeGameKey];
              if (!currentPayload) return null;

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {availableGames.map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setSelectedGame(tipo)}
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                          activeGameKey === tipo
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {GAME_LABELS[tipo]}
                      </button>
                    ))}
                  </div>

                  <GameRenderer
                    key={activeGameKey}
                    asignatura={sesion.asignatura}
                    titulo={currentPayload.titulo}
                    payload={currentPayload}
                    mode="preview"
                  />
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
