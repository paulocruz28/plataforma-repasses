import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { Header } from './components/Header';
import { Marketplace } from './pages/Marketplace';
import { AdminPanel } from './pages/AdminPanel';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Marketplace />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
