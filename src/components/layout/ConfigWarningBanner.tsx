import { AlertTriangle } from 'lucide-react';
import { isFirebaseConfigured, missingFirebaseEnvVars } from '../../lib/firebase';
import { isGeminiConfigured } from '../../lib/gemini';

export function ConfigWarningBanner() {
  if (isFirebaseConfigured && isGeminiConfigured) {
    return null;
  }

  return (
    <div className="no-print mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1.5">
          <p className="font-bold">
            Configuración pendiente en <code className="rounded bg-amber-100 px-1">.env</code>
          </p>
          {!isGeminiConfigured && (
            <p>
              • Falta <code className="rounded bg-amber-100 px-1 font-mono">VITE_GEMINI_API_KEY</code>{' '}
              para analizar apuntes y generar material con Gemini.
            </p>
          )}
          {!isFirebaseConfigured && (
            <p>
              • Faltan variables de Firebase Firestore:{' '}
              <code className="rounded bg-amber-100 px-1 font-mono">
                {missingFirebaseEnvVars.join(', ')}
              </code>
              .
            </p>
          )}
          <p className="text-xs text-amber-800">
            Copia <code>.env.example</code> a <code>.env</code> en la raíz del proyecto, añade tus
            claves y reinicia <code>npm run dev</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
