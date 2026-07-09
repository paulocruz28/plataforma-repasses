const API_BASE = '/api';

export interface Repasse {
  id: number;
  titulo: string;
  bairro: string;
  valor_chave: string | number;
  saldo_devedor: string | number;
  parcela?: string | number;
  quartos: number;
  varanda: boolean;
  area?: number;
  imagem_url?: string;
  descricao?: string;
  corretor_id: number;
  corretor_nome?: string;
  corretor_telefone?: string;
  status: string;
  comissao_pct?: number;
  data_criacao?: string;
}

export interface Lead {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  repasse_id?: number;
  repasse_titulo?: string;
  repasse_bairro?: string;
  corretor_id?: number;
  corretor_nome?: string;
  status: string;
  data_criacao?: string;
}

export interface CorretorPerformance {
  corretor_id: number;
  corretor_name: string;
  total_leads: number;
  vendas: number;
  taxa_conversao: number;
}

export interface DashboardData {
  leadsPorStatus: { status: string; quantidade: number }[];
  financeiro: {
    totalVgv: number;
    totalChaves: number;
    comissaoCorretor: number;
    comissaoGestor: number;
  };
  performanceCorretores: CorretorPerformance[];
}

const getHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      if (res.status === 401 && !endpoint.includes('/auth/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('corretor');
        window.location.href = '/login';
      }
      const errText = await res.text();
      throw new Error(errText || `Erro HTTP: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      if (res.status === 401 && !endpoint.includes('/auth/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('corretor');
        window.location.href = '/login';
      }
      const errText = await res.text();
      throw new Error(errText || `Erro HTTP: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      if (res.status === 401 && !endpoint.includes('/auth/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('corretor');
        window.location.href = '/login';
      }
      const errText = await res.text();
      throw new Error(errText || `Erro HTTP: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  async delete<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      if (res.status === 401 && !endpoint.includes('/auth/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('corretor');
        window.location.href = '/login';
      }
      const errText = await res.text();
      throw new Error(errText || `Erro HTTP: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }
};
