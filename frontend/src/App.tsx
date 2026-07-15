import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { Header } from './components/Header';
import { Marketplace } from './pages/Marketplace';
import { AdminPanel } from './pages/AdminPanel';
import { Login } from './pages/Login';

// Componente Wrapper para proteger a rota do Painel Admin
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Sintetizar som de estouro de confete dinamicamente (Web Audio API)
const playPopSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Som 1: Impacto/explosão grave
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(90, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.4);
    gain1.gain.setValueAtTime(0.6, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    // Som 2: Pop agudo brilhante
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(350, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.2);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.41);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.21);
  } catch (e) {
    console.error("Erro ao reproduzir áudio da comemoração:", e);
  }
};

// Disparar animação de confetes em Canvas e banner na tela
const triggerConfettiAndSound = (brokerName: string, propertyTitle: string) => {
  // 1. Tocar som
  playPopSound();

  // 2. Criar banner VIP flutuante
  const banner = document.createElement('div');
  banner.style.position = 'fixed';
  banner.style.bottom = '40px';
  banner.style.left = '40px';
  banner.style.background = 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)';
  banner.style.color = '#ffffff';
  banner.style.padding = '20px 28px';
  banner.style.borderRadius = '16px';
  banner.style.boxShadow = '0 20px 50px rgba(249, 115, 22, 0.4)';
  banner.style.border = '2px solid #f97316';
  banner.style.zIndex = '999999';
  banner.style.maxWidth = '400px';
  banner.style.fontFamily = "'Outfit', sans-serif";
  banner.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  banner.style.transform = 'translateY(150px) scale(0.8)';
  banner.style.opacity = '0';
  
  banner.innerHTML = `
    <div style="display: flex; gap: 16px; align-items: center;">
      <div style="font-size: 2.5rem; animation: pulse 1s infinite alternate;">🏆</div>
      <div>
        <h4 style="margin: 0 0 4px; font-size: 1.1rem; font-weight: 800; text-transform: uppercase; color: #f97316; letter-spacing: 0.5px;">Venda Confirmada!</h4>
        <p style="margin: 0; font-size: 0.92rem; line-height: 1.4; color: #e2e8f0;">
          O corretor <strong style="color: #ffffff; font-size: 0.98rem;">${brokerName}</strong> acaba de vender o imóvel <strong>${propertyTitle}</strong>!
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  // Animar entrada
  setTimeout(() => {
    banner.style.transform = 'translateY(0) scale(1)';
    banner.style.opacity = '1';
  }, 100);

  // Animar saída e remover do DOM
  setTimeout(() => {
    banner.style.transform = 'translateY(150px) scale(0.8)';
    banner.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(banner)) {
        document.body.removeChild(banner);
      }
    }, 600);
  }, 8000);

  // 3. Chuva de confetes coloridos
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999998';
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d')!;
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);
  
  const handleResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', handleResize);
  
  const colors = ['#f97316', '#3b82f6', '#10b981', '#eab308', '#ef4444', '#a855f7', '#ec4899'];
  const particles = Array.from({ length: 180 }).map(() => ({
    x: Math.random() * width,
    y: Math.random() * -height - 20,
    size: Math.random() * 8 + 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    speedY: Math.random() * 4 + 3,
    speedX: Math.random() * 4 - 2,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: Math.random() * 0.1 - 0.05
  }));
  
  const animate = () => {
    ctx.clearRect(0, 0, width, height);
    let active = false;
    
    particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;
      
      if (p.y < height) {
        active = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });
    
    if (active) {
      requestAnimationFrame(animate);
    } else {
      window.removeEventListener('resize', handleResize);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  };
  
  animate();
};

export const App: React.FC = () => {
  // Polling para escutar eventos de vendas da equipe
  useEffect(() => {
    let intervalId: any;
    const seenEvents = new Set<string>();

    const checkSalesEvents = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch('/api/sales/events', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const events = await res.json() as any[];
          events.forEach(evt => {
            if (!seenEvents.has(evt.id)) {
              seenEvents.add(evt.id);
              // Apenas disparar confete para eventos gerados nos últimos 20 segundos
              const ageMs = Date.now() - evt.timestamp;
              if (ageMs < 20000) {
                triggerConfettiAndSound(evt.brokerName, evt.propertyTitle);
              }
            }
          });
        }
      } catch (err) {
        console.error('Erro ao verificar eventos de comemoração de vendas:', err);
      }
    };

    // Executar imediatamente e configurar polling
    checkSalesEvents();
    intervalId = setInterval(checkSalesEvents, 4500);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Header />
          <Routes>
            <Route path="/" element={<Marketplace />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />
          </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
