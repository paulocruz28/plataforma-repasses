import React, { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Home, UserCheck, Sun, Moon } from 'lucide-react';

export const Header: React.FC = () => {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <header 
      className="glass-panel" 
      style={{
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        borderRadius: '0 0 18px 18px',
        borderTop: 'none',
        position: 'relative',
        zIndex: 100
      }}
    >
      <Link to="/" className="logo" style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        🏠 Repasses<span style={{ color: 'var(--primary)' }}>Imóveis</span>
      </Link>
      
      <nav className="nav-links" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <NavLink 
          to="/" 
          className={({ isActive }) => isActive ? 'active' : ''} 
          style={({ isActive }) => ({
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: isActive ? 600 : 500,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          })}
        >
          <Home size={18} />
          Marketplace
        </NavLink>
        <NavLink 
          to="/admin" 
          className={({ isActive }) => isActive ? 'active' : ''} 
          style={({ isActive }) => ({
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: isActive ? 600 : 500,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          })}
        >
          <UserCheck size={18} />
          Painel do Corretor
        </NavLink>
        <button 
          className="btn btn-secondary" 
          onClick={toggleTheme} 
          style={{ padding: '8px 12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Alternar Tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>
    </header>
  );
};
