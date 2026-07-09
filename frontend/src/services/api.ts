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

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Erro HTTP: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Erro HTTP: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Erro HTTP: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }
};
