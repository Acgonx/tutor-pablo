import { Route, Routes } from 'react-router-dom';
import { StudentRetoPage } from './pages/StudentRetoPage';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<TeacherDashboardPage />} />
      <Route path="/reto/:id" element={<StudentRetoPage />} />
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
  );
}

export default App;
