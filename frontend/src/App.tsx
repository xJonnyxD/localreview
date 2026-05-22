import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ToastContainer from './components/ui/Toast';
import ScrollToTop from './components/ui/ScrollToTop';
import ErrorBoundary from './components/ui/ErrorBoundary';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import BusinessDetailPage from './pages/BusinessDetailPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import CreateBusinessPage from './pages/CreateBusinessPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <BrowserRouter>
      <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1">
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/business/:id" element={<BusinessDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/create" element={<CreateBusinessPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </ErrorBoundary>
        </main>
        <Footer />
        <ToastContainer />
        <ScrollToTop />
      </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
