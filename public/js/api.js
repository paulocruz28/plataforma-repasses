const API_BASE = '/api';

const api = {
  async get(endpoint) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Erro HTTP: ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error(`Erro no GET ${endpoint}:`, error);
      throw error;
    }
  },

  async post(endpoint, data) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Erro HTTP: ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error(`Erro no POST ${endpoint}:`, error);
      throw error;
    }
  },

  async put(endpoint, data) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Erro HTTP: ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error(`Erro no PUT ${endpoint}:`, error);
      throw error;
    }
  }
};

// Função Global de Notificação (Toast)
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Ícones simples
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'danger') icon = '❌';

  toast.innerHTML = `<div>${icon}</div> <div>${message}</div>`;
  container.appendChild(toast);
  
  // Pequeno delay para disparar a transição CSS
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Remover após 4.5 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4500);
}

// Inicializar Tema Light/Dark Salvo
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
});

// Toggle do Tema
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  showToast(`Tema alterado para ${newTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`, 'success');
}
