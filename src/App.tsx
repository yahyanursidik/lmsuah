import { Refine, Authenticated } from '@refinedev/core';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { dataProvider } from './providers/dataProvider';
import { authProvider } from './providers/authProvider';
import { PublicLayout } from './pages/public/PublicLayout';
import { HomePage } from './pages/public/HomePage';
import { LoginPage } from './pages/public/LoginPage';
import { OnboardingPage } from './pages/public/OnboardingPage';
import { ProgramsPage } from './pages/public/ProgramsPage';
import { ProgramDetailPage } from './pages/public/ProgramDetailPage';
import { LessonDetailPage } from './pages/public/LessonDetailPage';
import { SchedulesPage } from './pages/public/SchedulesPage';
import { VenuesPage } from './pages/public/VenuesPage';
import { VenueDetailPage } from './pages/public/VenueDetailPage';
import { SpeakerProfilePage } from './pages/public/SpeakerProfilePage';
import { PrivacyPolicyPage } from './pages/public/PrivacyPolicyPage';
import { TermsPage } from './pages/public/TermsPage';

import { ParticipantLayout } from './pages/participant/ParticipantLayout';
import { DashboardPage } from './pages/participant/DashboardPage';
import { SavedItemsPage } from './pages/participant/SavedItemsPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProgramsPage } from './pages/admin/AdminProgramsPage';
import { AdminProgramDetailPage } from './pages/admin/AdminProgramDetailPage';
import { AdminVenuesPage } from './pages/admin/AdminVenuesPage';
import { AdminSchedulesPage } from './pages/admin/AdminSchedulesPage';
import { AdminLessonsPage } from './pages/admin/AdminLessonsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <Refine 
        dataProvider={dataProvider()}
        authProvider={authProvider}
      >
        <Routes>
          {/* Public Portal Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/programs/:id" element={<ProgramDetailPage />} />
            <Route path="/lessons/:id" element={<LessonDetailPage />} />
            <Route path="/lesson/:id" element={<LessonDetailPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/venues" element={<VenuesPage />} />
            <Route path="/venues/:id" element={<VenueDetailPage />} />
            <Route path="/speaker" element={<SpeakerProfilePage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>

          {/* Participant Protected Routes */}
          <Route element={
            <Authenticated key="participant" fallback={<Navigate to="/login" />}>
              <ParticipantLayout />
            </Authenticated>
          }>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tersimpan" element={<SavedItemsPage />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route element={
            <Authenticated key="admin" fallback={<Navigate to="/login" />}>
              <AdminLayout />
            </Authenticated>
          }>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/programs" element={<AdminProgramsPage />} />
            <Route path="/admin/programs/:id" element={<AdminProgramDetailPage />} />
            <Route path="/admin/venues" element={<AdminVenuesPage />} />
            <Route path="/admin/schedules" element={<AdminSchedulesPage />} />
            <Route path="/admin/lessons" element={<AdminLessonsPage />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Refine>
    </BrowserRouter>
  );
}

export default App;
