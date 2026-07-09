import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { Lock, Mail, Phone, User, KeyRound } from 'lucide-react';

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Campos do Form
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [codigoConvite, setCodigoConvite] = useState('');

  // Redirecionar se já estiver logado
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        // Cadastro
        if (!nome || !email || !senha || !codigoConvite) {
          showToast('Preencha todos os campos obrigatórios.', 'warning');
          setLoading(false);
          return;
        }

        const data = await api.post<{ token: string; corretor: any }>('/auth/register', {
          nome,
          email,
          telefone,
          senha,
          codigo_convite: codigoConvite
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('corretor', JSON.stringify(data.corretor));
        showToast(`Bem-vindo, <b>${data.corretor.nome}</b>! Conta de corretor criada com sucesso.`, 'success');
        navigate('/admin');
      } else {
        // Login
        if (!email || !senha) {
          showToast('Preencha os campos de e-mail e senha.', 'warning');
          setLoading(false);
          return;
        }

        const data = await api.post<{ token: string; corretor: any }>('/auth/login', {
          email,
          senha
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('corretor', JSON.stringify(data.corretor));
        showToast(`Olá, <b>${data.corretor.nome}</b>! Autenticado com sucesso no painel.`, 'success');
        navigate('/admin');
      }
    } catch (err: any) {
      showToast(err.message || 'Ocorreu um erro na autenticação.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 80px)',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>
            {isRegister ? 'Cadastrar Corretor' : 'Acesso Restrito'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {isRegister 
              ? 'Crie sua conta para entrar na roleta de repasses' 
              : 'Entre com suas credenciais de corretor autorizado'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isRegister && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Nome Completo *</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Gabriel Souza"
                    style={{ paddingLeft: '45px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Telefone (WhatsApp)</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="tel" 
                    className="form-control" 
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    placeholder="Ex: (85) 9 9999-9999"
                    style={{ paddingLeft: '45px' }}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>E-mail Corporativo *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                className="form-control" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: corretor@repasses.com"
                style={{ paddingLeft: '45px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Senha de Acesso *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="form-control" 
                required 
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha secreta"
                style={{ paddingLeft: '45px' }}
              />
            </div>
          </div>

          {isRegister && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Código de Convite/Acesso *</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={codigoConvite}
                  onChange={(e) => setCodigoConvite(e.target.value)}
                  placeholder="Código administrativo (ex: REPASSES2026)"
                  style={{ paddingLeft: '45px' }}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', height: '48px' }} disabled={loading}>
            {loading ? 'Aguarde...' : isRegister ? 'Criar Conta e Entrar' : 'Entrar no Painel'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          {isRegister ? (
            <p>
              Já tem uma conta registrada?{' '}
              <button 
                onClick={() => setIsRegister(false)}
                style={{ background: 'none', border: 'none', color: 'var(--primary-hover)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
              >
                Faça Login
              </button>
            </p>
          ) : (
            <p>
              É um novo corretor parceiro?{' '}
              <button 
                onClick={() => setIsRegister(true)}
                style={{ background: 'none', border: 'none', color: 'var(--primary-hover)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
              >
                Cadastre-se aqui
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
