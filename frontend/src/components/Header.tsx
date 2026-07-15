import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, UserCheck, Sun, Moon, LogOut } from 'lucide-react';
import { useToast } from './Toast';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'light');
  const [corretor, setCorretor] = useState<{ id: number; nome: string; nome_exibicao?: string; foto_url?: string } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Monitorar se o corretor está logado a cada mudança de rota
  useEffect(() => {
    const rawCorretor = localStorage.getItem('corretor');
    if (rawCorretor) {
      try {
        setCorretor(JSON.parse(rawCorretor));
      } catch (e) {
        setCorretor(null);
      }
    } else {
      setCorretor(null);
    }
  }, [location]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('corretor');
    setCorretor(null);
    showToast('Sua sessão foi encerrada.', 'success');
    navigate('/login');
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
      
      <nav className="nav-links" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {corretor && (
          <>
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
          </>
        )}

        {corretor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px', marginLeft: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {corretor.foto_url ? (
                <img 
                  src={corretor.foto_url} 
                  alt={corretor.nome_exibicao || corretor.nome} 
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-hover)' }} 
                />
              ) : (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  boxShadow: '0 2px 8px var(--primary-glow)'
                }}>
                  {(corretor.nome_exibicao || corretor.nome).trim().charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Olá, <b style={{ color: 'var(--text-primary)' }}>{corretor.nome_exibicao || corretor.nome}</b>
              </span>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={handleLogout} 
              style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.04)' }}
              title="Sair do Painel"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        )}

        <button 
          onClick={toggleTheme} 
          style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            border: '1px solid var(--border-color)', 
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            padding: 0
          }}
          className="theme-toggle-btn"
          title="Alternar Tema"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.style.borderColor = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </nav>
    </header>
  );
};
