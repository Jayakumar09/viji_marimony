import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ProfileView from './pages/ProfileView';
import Search from './pages/Search';
import Messages from './pages/Messages';
import Interests from './pages/Interests';
import Dashboard from './pages/Dashboard';
import Verification from './pages/Verification';
import AdminPanel from './pages/AdminPanel';
import NotFound from './pages/NotFound';
import ManualPayment from './pages/ManualPayment';
import UserChat from './pages/UserChat';
import TestPDF from './TestPDF';

// Context/Hooks
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      <Header />
      <main className="page-container">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/test-pdf" element={<TestPDF />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/profile/:profileId" element={user ? <ProfileView /> : <Navigate to="/login" />} />
          <Route path="/verification" element={user ? <Verification /> : <Navigate to="/login" />} />
          <Route path="/search" element={user ? <Search /> : <Navigate to="/login" />} />
          <Route path="/messages" element={user ? <Messages /> : <Navigate to="/login" />} />
          <Route path="/interests" element={user ? <Interests /> : <Navigate to="/login" />} />
          <Route path="/subscription" element={user ? <ManualPayment /> : <Navigate to="/login" />} />
          <Route path="/chat" element={user ? <UserChat /> : <Navigate to="/login" />} />

          {/* Admin Routes */}
          <Route path="/admin/*" element={<AdminPanel />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;