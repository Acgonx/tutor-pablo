import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

const TeacherDashboardPage = lazy(() =>
  import('./pages/TeacherDashboardPage').then((m) => ({
    default: m.TeacherDashboardPage,
  })),
);
const StudentRetoPage = lazy(() =>
  import('./pages/StudentRetoPage').then((m) => ({
    default: m.StudentRetoPage,
  })),
);
const StudentSessionPage = lazy(() =>
  import('./pages/StudentSessionPage').then((m) => ({
    default: m.StudentSessionPage,
  })),
);

function RouteLoadingFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-700">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold shadow-xs">
        Cargando Tutor Pablo...
      </div>
    </main>
  );
}

export function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<TeacherDashboardPage />} />
        <Route path="/reto/:id" element={<StudentRetoPage />} />
        <Route path="/sesion/:id" element={<StudentSessionPage />} />
        <Route
          path="*"
          element={
            <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
              <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <h1 className="text-lg font-bold text-slate-900">Página no encontrada</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Comprueba que el enlace que te compartieron esté completo.
                </p>
              </div>
            </main>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
