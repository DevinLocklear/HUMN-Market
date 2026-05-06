import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Browse from './pages/Browse';
import ListingDetail from './pages/ListingDetail';
import Sell from './pages/Sell';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import './App.css';

function PrivateRoute({ children, session, loading }) {
  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  return session ? children : <Navigate to="/auth" />;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing session={session} />} />
        <Route path="/auth" element={session ? <Navigate to="/dashboard" /> : <Auth />} />
        <Route path="/browse" element={<Browse session={session} />} />
        <Route path="/listing/:id" element={<ListingDetail session={session} />} />
        <Route path="/sell" element={<PrivateRoute session={session} loading={loading}><Sell session={session} /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute session={session} loading={loading}><Dashboard session={session} /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute session={session} loading={loading}><Orders session={session} /></PrivateRoute>} />
        <Route path="/profile/:id" element={<Profile session={session} />} />
      </Routes>
    </Router>
  );
}
