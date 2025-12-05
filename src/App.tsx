import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { TrainingTemplatesPage } from './pages/TrainingTemplatesPage';
import { MesocycleEditorPage } from './pages/MesocycleEditorPage';
import { AIGeneratorPage } from './pages/AIGeneratorPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientLayout } from './components/layout/ClientLayout';
import { MainLayout } from './components/layout/MainLayout';
import {
  ClientOverviewPage,
  ClientInterviewPage,
  ClientProgramsPage,
  ClientMetricsPage,
  ClientDietPage,
} from './pages/client';
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/exercises"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ExercisesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ClientsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Client Workspace - Nested Routes with MainLayout */}
        <Route
          path="/clients/:clientId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ClientLayout />
              </MainLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<ClientOverviewPage />} />
          <Route path="interview" element={<ClientInterviewPage />} />
          <Route path="programs" element={<ClientProgramsPage />} />
          <Route path="programs/new" element={<MesocycleEditorPage />} />
          <Route path="programs/:id" element={<MesocycleEditorPage />} />
          <Route path="metrics" element={<ClientMetricsPage />} />
          <Route path="diet" element={<ClientDietPage />} />
        </Route>

        {/* Training Templates (reusable, no client assigned) */}
        <Route
          path="/templates"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TrainingTemplatesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/templates/new"
          element={
            <ProtectedRoute>
              <MainLayout>
                <MesocycleEditorPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/templates/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <MesocycleEditorPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Client Programs (legacy route for backwards compatibility) */}
        <Route
          path="/mesocycles/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <MesocycleEditorPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-generator"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AIGeneratorPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch all - 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
