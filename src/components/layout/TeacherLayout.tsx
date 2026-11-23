import type { ReactNode } from 'react';
import {
  Archive,
  BookMarked,
  GraduationCap,
  Sparkles,
  TabletSmartphone,
} from 'lucide-react';
import { isFirebaseConfigured } from '../../lib/firebase';
import { GEMINI_MODEL, isGeminiConfigured } from '../../lib/gemini';

export type TeacherSection = 'generador' | 'artefactos' | 'libreta' | 'retos';

interface TeacherLayoutProps {
  activeSection: TeacherSection;
  onSelectSection: (section: TeacherSection) => void;
  artefactosCount: number;
  pendingErrorsCount: number;
  retosCount: number;
  children: ReactNode;
}

export function TeacherLayout({
  activeSection,
  onSelectSection,
  artefactosCount,
  pendingErrorsCount,
  retosCount,
  children,
}: TeacherLayoutProps) {
  const navItems: ReadonlyArray<{
    id: TeacherSection;
    label: string;
    icon: typeof Sparkles;
    badge?: number;
  }> = [
    { id: 'generador', label: 'Generador de Estudio', icon: Sparkles },
    {
      id: 'artefactos',
      label: 'Artefactos',
      icon: Archive,
      badge: artefactosCount,
    },
    {
      id: 'libreta',
      label: 'Libreta de Errores',
      icon: BookMarked,
      badge: pendingErrorsCount,
    },
    {
      id: 'retos',
      label: 'Retos de Pablo',
      icon: TabletSmartphone,
      badge: retosCount,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Tutor Pablo · Panel Docente
                </h1>
                <p className="text-xs text-slate-500">
                  1º ESO Canarias · Decreto 30/2023 (LOMLOE) · Repetición Espaciada
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span
                className={`rounded-full px-2.5 py-1 ${
                  isGeminiConfigured
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                }`}
              >
                Gemini: {isGeminiConfigured ? GEMINI_MODEL : 'Sin API key'}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 ${
                  isFirebaseConfigured
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                }`}
              >
                Firestore: {isFirebaseConfigured ? 'Conectado' : 'Pendiente .env'}
              </span>
            </div>
          </div>

          <nav className="mt-3 flex flex-wrap gap-2" aria-label="Secciones del panel docente">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSection(item.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-slate-700 ring-1 ring-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
