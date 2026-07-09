import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { DashboardData, Lead, Repasse } from '../services/api';
import { useToast } from '../components/Toast';
import { 
  TrendingUp, 
  Key, 
  Handshake, 
  BarChart, 
  Printer,
  User,
  Search,
  Pencil,
  Trash2,
  Plus,
  ArrowLeft,
  Building,
  Users
} from 'lucide-react';

type AdminTab = 'dashboard' | 'crm' | 'contracts' | 'new-repasse' | 'profile' | 'team';

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents);
};

const parseCurrencyToNumber = (value: string): number => {
  if (!value) return 0;
  const cleanValue = value
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/\s/g, '');
  return parseFloat(cleanValue) || 0;
};

export const AdminPanel: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Dados Globais
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [corretores, setCorretores] = useState<{ id: number; nome: string }[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);

  // Estados de Controle de Acesso (RBAC) e Gestão de Equipe
  const [isAdmin, setIsAdmin] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Formulário de Membros da Equipe
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeamMemberId, setEditingTeamMemberId] = useState<number | null>(null);
  const [teamNome, setTeamNome] = useState('');
  const [teamEmail, setTeamEmail] = useState('');
  const [teamTelefone, setTeamTelefone] = useState('');
  const [teamSenha, setTeamSenha] = useState('');
  const [teamRole, setTeamRole] = useState('corretor');
  const [teamAtivo, setTeamAtivo] = useState(true);
  const [savingTeamMember, setSavingTeamMember] = useState(false);

  // Modal de Detalhamento de Cálculo Financeiro
  const [selectedCalcRepasse, setSelectedCalcRepasse] = useState<Repasse | null>(null);

  // Efeito para carregar o papel do usuário (role)
  useEffect(() => {
    const rawCorretor = localStorage.getItem('corretor');
    if (rawCorretor) {
      try {
        const corretorObj = JSON.parse(rawCorretor);
        setIsAdmin(corretorObj.role === 'admin');
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Estados de Formulários
  // 1. Novo Repasse
  const [repasseTitulo, setRepasseTitulo] = useState('');
  const [repasseBairro, setRepasseBairro] = useState('');
  const [repasseChave, setRepasseChave] = useState('');
  const [repasseSaldo, setRepasseSaldo] = useState('');
  const [repasseParcela, setRepasseParcela] = useState('');
  const [repasseArea, setRepasseArea] = useState('');
  const [repasseQuartos, setRepasseQuartos] = useState('1');
  const [repasseVaranda, setRepasseVaranda] = useState(false);
  const [repasseImagem, setRepasseImagem] = useState('');
  const [repasseDescricao, setRepasseDescricao] = useState('');
  const [repasseCorretor, setRepasseCorretor] = useState('');
  const [repasseStatus, setRepasseStatus] = useState('Disponível');
  const [repasseComissaoPct, setRepasseComissaoPct] = useState('5');
  const [savingRepasse, setSavingRepasse] = useState(false);
  
  // Controle de Visualização e Busca de Repasses (CRUD)
  const [showRepasseForm, setShowRepasseForm] = useState(false);
  const [editingRepasseId, setEditingRepasseId] = useState<number | null>(null);
  const [searchRepasse, setSearchRepasse] = useState('');

  // 2. Automação Jurídica
  const [cRepasse, setCRepasse] = useState('');
  const [cName, setCName] = useState('');
  const [cCpf, setCCpf] = useState('');
  const [cProfissao, setCProfissao] = useState('');
  const [cEstadoCivil, setCEstadoCivil] = useState('Solteiro(a)');
  const [cEndereco, setCEndereco] = useState('');
  const [cNumero, setCNumero] = useState('');
  const [cBairroEndereco, setCBairroEndereco] = useState('');
  const [cComplemento, setCComplemento] = useState('');
  const [certStatus, setCertStatus] = useState<'idle' | 'checking_sefin' | 'checking_onr' | 'success' | 'error'>('idle');

  // 3. Perfil do Corretor
  const [pNome, setPNome] = useState('');
  const [pNomeExibicao, setPNomeExibicao] = useState('');
  const [pTelefone, setPTelefone] = useState('');
  const [pFotoUrl, setPFotoUrl] = useState('');
  const [pSenha, setPSenha] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [sefinDetail, setSefinDetail] = useState('SEFIN (Prefeitura)');
  const [onrDetail, setOnrDetail] = useState('ONR (Cartórios)');
  const [generatedContract, setGeneratedContract] = useState('');
  const [generatingContract, setGeneratingContract] = useState(false);

  // Carregar dados conforme aba ativa
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadStats();
    } else if (activeTab === 'crm') {
      loadCRMData();
    } else if (activeTab === 'contracts') {
      loadContractsData();
    } else if (activeTab === 'new-repasse') {
      loadCorretoresList();
      loadRepassesData();
    } else if (activeTab === 'profile') {
      const rawCorretor = localStorage.getItem('corretor');
      if (rawCorretor) {
        try {
          const corretorObj = JSON.parse(rawCorretor);
          setPNome(corretorObj.nome || '');
          setPNomeExibicao(corretorObj.nome_exibicao || '');
          setPTelefone(corretorObj.telefone || '');
          setPFotoUrl(corretorObj.foto_url || '');
          setPSenha('');
        } catch (e) {
          console.error(e);
        }
      }
    } else if (activeTab === 'team') {
      loadTeamData();
    }
  }, [activeTab]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api.get<DashboardData>('/dashboard/stats');
      setStats(data);
    } catch (err) {
      showToast('Erro ao carregar estatísticas do dashboard.', 'danger');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadCRMData = async () => {
    setLoadingLeads(true);
    try {
      const data = await api.get<Lead[]>('/leads');
      setLeads(data);
    } catch (err) {
      showToast('Erro ao obter leads do CRM.', 'danger');
    } finally {
      setLoadingLeads(false);
    }
  };

  const loadTeamData = async () => {
    setLoadingTeam(true);
    try {
      const data = await api.get<any[]>('/admin/team');
      setTeam(data);
    } catch (err) {
      showToast('Erro ao carregar equipe de corretores.', 'danger');
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleSaveTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNome || !teamEmail || (!editingTeamMemberId && !teamSenha)) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    setSavingTeamMember(true);
    try {
      const payload = {
        nome: teamNome,
        email: teamEmail,
        telefone: teamTelefone || null,
        role: teamRole,
        ativo: teamAtivo,
        senha: teamSenha || undefined
      };

      if (editingTeamMemberId) {
        await api.put(`/admin/team/${editingTeamMemberId}`, payload);
        showToast('Membro da equipe atualizado com sucesso!', 'success');
      } else {
        await api.post('/admin/team', payload);
        showToast('Novo corretor adicionado à equipe!', 'success');
      }

      // Resetar form e recarregar
      setTeamNome('');
      setTeamEmail('');
      setTeamTelefone('');
      setTeamSenha('');
      setTeamRole('corretor');
      setTeamAtivo(true);
      setEditingTeamMemberId(null);
      setShowTeamForm(false);
      loadTeamData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar corretor na equipe.', 'danger');
    } finally {
      setSavingTeamMember(false);
    }
  };

  const loadRepassesData = async () => {
    try {
      const data = await api.get<Repasse[]>('/repasses');
      setRepasses(data);
    } catch (err) {
      showToast('Erro ao carregar repasses.', 'danger');
    }
  };

  const loadContractsData = async () => {
    await loadRepassesData();
  };

  const loadCorretoresList = async () => {
    try {
      const data = await api.get<{ id: number; nome: string }[]>('/corretores');
      setCorretores(data);
    } catch (err) {
      showToast('Erro ao carregar lista de corretores.', 'danger');
    }
  };

  const copyPortfolioLink = (corretorId: number) => {
    const link = `${window.location.origin}/?corretor=${corretorId}`;
    navigator.clipboard.writeText(link).then(() => {
      showToast('Link do portfólio do corretor copiado!', 'success');
    }).catch(() => {
      showToast('Erro ao copiar link.', 'danger');
    });
  };

  const triggerConfetti = () => {
    if ((window as any).confetti) {
      (window as any).confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
      script.onload = () => {
        (window as any).confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      };
      document.body.appendChild(script);
    }
  };

  // Alterar Status do Lead no Kanban
  const changeLeadStatus = async (leadId: number, status: string) => {
    try {
      await api.put(`/leads/${leadId}/status`, { status });
      showToast('Status do lead atualizado no CRM!', 'success');
      if (status === 'Vendido') {
        triggerConfetti();
      }
      loadCRMData();
    } catch (err) {
      showToast('Erro ao atualizar status do lead.', 'danger');
    }
  };

  // Salvar Repasse (Criar ou Editar)
  const handleSaveRepasse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repasseTitulo || !repasseBairro || !repasseChave || !repasseSaldo || !repasseCorretor) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    setSavingRepasse(true);
    try {
      const payload = {
        titulo: repasseTitulo,
        bairro: repasseBairro,
        valor_chave: parseCurrencyToNumber(repasseChave),
        saldo_devedor: parseCurrencyToNumber(repasseSaldo),
        parcela: repasseParcela ? parseCurrencyToNumber(repasseParcela) : null,
        quartos: parseInt(repasseQuartos),
        varanda: repasseVaranda,
        area: repasseArea ? parseInt(repasseArea) : null,
        imagem_url: repasseImagem || undefined,
        descricao: repasseDescricao,
        status: repasseStatus,
        comissao_pct: repasseComissaoPct ? parseFloat(repasseComissaoPct) : 5.00,
        corretor_id: parseInt(repasseCorretor)
      };

      if (editingRepasseId) {
        await api.put(`/repasses/${editingRepasseId}`, payload);
        showToast('Repasse atualizado com sucesso!', 'success');
      } else {
        await api.post('/repasses', payload);
        showToast('Repasse cadastrado e disponível no portal!', 'success');
      }

      // Resetar form e retornar
      setRepasseTitulo('');
      setRepasseBairro('');
      setRepasseChave('');
      setRepasseSaldo('');
      setRepasseParcela('');
      setRepasseArea('');
      setRepasseQuartos('1');
      setRepasseVaranda(false);
      setRepasseImagem('');
      setRepasseDescricao('');
      setRepasseCorretor('');
      setRepasseStatus('Disponível');
      setRepasseComissaoPct('5');
      setEditingRepasseId(null);
      setShowRepasseForm(false);
      loadRepassesData();
    } catch (err) {
      showToast('Erro ao salvar repasse imobiliário.', 'danger');
    } finally {
      setSavingRepasse(false);
    }
  };

  // Excluir Repasse
  const handleDeleteRepasse = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta oportunidade de repasse? Esta ação é irreversível.')) {
      return;
    }

    try {
      await api.delete(`/repasses/${id}`);
      showToast('Oportunidade de repasse excluída com sucesso.', 'success');
      loadRepassesData();
    } catch (err) {
      showToast('Erro ao excluir repasse.', 'danger');
    }
  };

  // Consultar certidões
  const verifyCertificates = async () => {
    if (!cCpf) {
      showToast('Insira o CPF do comprador para a consulta.', 'warning');
      return;
    }

    setCertStatus('checking_sefin');
    setSefinDetail('SEFIN (Prefeitura): Consultando pendências tributárias...');
    setOnrDetail('ONR (Cartórios): Aguardando finalização municipal...');

    try {
      const res = await api.post<{ consultas: { codigo_autenticidade: string }[] }>(
        '/contracts/verify-certificates', 
        { cpf: cCpf }
      );

      // Simular etapas de verificação visualmente
      setTimeout(() => {
        setCertStatus('checking_onr');
        setSefinDetail(`SEFIN: <b>Nada Consta</b> (Chave: ${res.consultas[0].codigo_autenticidade})`);
        setOnrDetail('ONR: Consultando histórico de ônus reais da matrícula...');

        setTimeout(() => {
          setCertStatus('success');
          setOnrDetail(`ONR: <b>Matrícula Livre</b> (Protocolo: ${res.consultas[1].codigo_autenticidade})`);
          showToast('Certidões governamentais validadas eletronicamente!', 'success');
        }, 1200);

      }, 1000);

    } catch (err: any) {
      setCertStatus('error');
      setSefinDetail(`Falha na consulta municipal: ${err.message || 'Erro de conexão'}`);
      setOnrDetail('Consulta cartorária cancelada devido a erro prévio.');
      showToast(err.message || 'Timeout ou falha na integração governamental.', 'danger');
    }
  };

  // Gerar Contrato
  const handleGenerateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cRepasse || !cName || !cCpf) {
      showToast('Selecione o imóvel e insira nome/CPF do comprador.', 'warning');
      return;
    }

    const addressParts = [];
    if (cEndereco.trim()) addressParts.push(cEndereco.trim());
    if (cNumero.trim()) addressParts.push(`Nº ${cNumero.trim()}`);
    if (cComplemento.trim()) addressParts.push(cComplemento.trim());
    if (cBairroEndereco.trim()) addressParts.push(cBairroEndereco.trim());
    
    const enderecoCompleto = addressParts.join(', ');

    setGeneratingContract(true);
    try {
      const res = await api.post<{ contrato: string }>('/contracts/generate', {
        repasse_id: cRepasse,
        cliente_nome: cName,
        cliente_cpf: cCpf,
        cliente_profissao: cProfissao || undefined,
        cliente_estado_civil: cEstadoCivil,
        cliente_endereco: enderecoCompleto || undefined
      });

      setGeneratedContract(res.contrato);
      showToast('Minuta particular de cessão criada com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao emitir minuta de cessão.', 'danger');
    } finally {
      setGeneratingContract(false);
    }
  };

  // Atualizar Perfil do Corretor
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pNome.trim()) {
      showToast('O nome completo é obrigatório.', 'warning');
      return;
    }

    setUpdatingProfile(true);
    try {
      const data = await api.put<{ token: string; corretor: any }>('/auth/profile', {
        nome: pNome,
        nome_exibicao: pNomeExibicao || undefined,
        telefone: pTelefone || undefined,
        foto_url: pFotoUrl || undefined,
        senha: pSenha || undefined
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('corretor', JSON.stringify(data.corretor));
      showToast('Perfil atualizado com sucesso!', 'success');
      
      // Pequeno timeout e reload para sincronizar o avatar e nome no Header
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar perfil.', 'danger');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Uploader de imagem convertido para Base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limite
      showToast('A imagem de perfil deve ter menos de 1MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPFotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="admin-layout">
      {/* Sidebar do Admin */}
      <aside className="admin-sidebar glass-panel">
        <div className="sidebar-brand">
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.1em' }}>Área de Repasses</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '6px' }}>Painel Executivo</h3>
        </div>

        <nav className="sidebar-menu">
          <button 
            className={`sidebar-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart size={18} />
            Dashboard (VGV)
          </button>
          <button 
            className={`sidebar-menu-item ${activeTab === 'crm' ? 'active' : ''}`}
            onClick={() => setActiveTab('crm')}
          >
            <TrendingUp size={18} />
            CRM & Leads
          </button>
          <button 
            className={`sidebar-menu-item ${activeTab === 'contracts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contracts')}
          >
            <Handshake size={18} />
            Automação Jurídica
          </button>
          <button 
            className={`sidebar-menu-item ${activeTab === 'new-repasse' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('new-repasse');
              setShowRepasseForm(false);
            }}
          >
            <Building size={18} />
            Meus Imóveis
          </button>
          <button 
            className={`sidebar-menu-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            Meu Perfil
          </button>
          {isAdmin && (
            <button 
              className={`sidebar-menu-item ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('team');
                setShowTeamForm(false);
              }}
            >
              <Users size={18} />
              Gestão de Equipe
            </button>
          )}
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <main className="admin-main-content">
        
        {/* 1. ABA DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="admin-section active">
            {loadingStats ? (
              <div className="empty-state"><h3>Carregando estatísticas...</h3></div>
            ) : !stats ? (
              <div className="empty-state"><h3>Nenhum dado financeiro disponível.</h3></div>
            ) : (
              <>
                <div className="metrics-grid">
                  <div className="metric-card glass-panel" style={{ borderLeft: '4px solid var(--success)' }}>
                    <div className="metric-header">
                      <span className="metric-title">VGV Total (Vendido)</span>
                      <TrendingUp size={20} color="var(--success)" />
                    </div>
                    <div className="metric-value">{formatCurrency(stats.financeiro.totalVgv)}</div>
                    <div className="metric-sub">Soma das Chaves + Saldos Devedores</div>
                  </div>
                  <div className="metric-card glass-panel" style={{ borderLeft: '4px solid var(--primary)' }}>
                    <div className="metric-header">
                      <span className="metric-title">Total em Ágios (Chaves)</span>
                      <Key size={20} color="var(--primary)" />
                    </div>
                    <div className="metric-value">{formatCurrency(stats.financeiro.totalChaves)}</div>
                    <div className="metric-sub">Capital líquido negociado</div>
                  </div>
                  <div className="metric-card glass-panel" style={{ borderLeft: '4px solid var(--warning)' }}>
                    <div className="metric-header">
                      <span className="metric-title">Comissão Corretores (5%)</span>
                      <Handshake size={20} color="var(--warning)" />
                    </div>
                    <div className="metric-value">{formatCurrency(stats.financeiro.comissaoCorretor)}</div>
                    <div className="metric-sub">5% calculados sobre o valor das chaves</div>
                  </div>
                  <div className="metric-card glass-panel" style={{ borderLeft: '4px solid #a855f7' }}>
                    <div className="metric-header">
                      <span className="metric-title">Comissão Gestão (1%)</span>
                      <BarChart size={20} color="#a855f7" />
                    </div>
                    <div className="metric-value">{formatCurrency(stats.financeiro.comissaoGestor)}</div>
                    <div className="metric-sub">1% sobre VGV Geral (Paulo)</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '30px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '20px' }}>Desempenho da Equipe (Roleta e Conversão)</h2>
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Corretor</th>
                          <th>Leads Recebidos</th>
                          <th>Vendas Feitas</th>
                          <th>Taxa de Conversão</th>
                          <th>Portfólio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.performanceCorretores.map(c => (
                          <tr key={c.corretor_id}>
                            <td><b>{c.corretor_name}</b></td>
                            <td>{c.total_leads}</td>
                            <td><span className="badge badge-success">{c.vendas}</span></td>
                            <td>{c.taxa_conversao}%</td>
                            <td>
                              <button 
                                className="btn btn-secondary" 
                                onClick={() => copyPortfolioLink(c.corretor_id)}
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                Copiar Link
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 2. ABA CRM KANBAN */}
        {activeTab === 'crm' && (
          <div className="admin-section active">
            <style dangerouslySetInnerHTML={{ __html: `
              .kanban-board-premium {
                display: grid;
                grid-template-columns: repeat(4, minmax(220px, 1fr));
                gap: 20px;
                align-items: start;
                margin-top: 10px;
                overflow-x: auto;
                padding-bottom: 20px;
              }
              .kanban-column-premium {
                border-radius: 16px;
                padding: 16px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02);
                min-height: 600px;
                border: 1px solid var(--border-color);
                display: flex;
                flex-direction: column;
                gap: 16px;
              }
              .column-header-premium {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 12px;
                border-bottom: 2px solid rgba(0, 0, 0, 0.04);
              }
              .column-title-premium {
                font-weight: 700;
                font-size: 0.95rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
              .column-count-premium {
                font-size: 0.8rem;
                font-weight: 700;
                padding: 3px 10px;
                border-radius: 20px;
                color: #ffffff;
              }
              .leads-list-premium {
                display: flex;
                flex-direction: column;
                gap: 12px;
                flex-grow: 1;
              }
              .lead-card-premium {
                background: #ffffff;
                border: 1px solid rgba(0, 0, 0, 0.06);
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01);
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                gap: 10px;
              }
              .lead-card-premium:hover {
                transform: translateY(-4px) scale(1.01);
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
                border-color: var(--primary);
              }
              .lead-card-sold-premium {
                border: 2px solid #fbbf24 !important;
                background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%) !important;
                box-shadow: 0 8px 16px rgba(251, 191, 36, 0.1) !important;
                position: relative;
                overflow: hidden;
              }
              .lead-card-sold-premium::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 50%;
                height: 100%;
                background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%);
                transform: skewX(-25deg);
                animation: shine-animation 4s infinite ease-in-out;
              }
              @keyframes shine-animation {
                0% { left: -100%; }
                20% { left: 150%; }
                100% { left: 150%; }
              }
              .sold-badge-premium {
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                color: #ffffff;
                font-size: 0.7rem;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 6px;
                display: inline-flex;
                align-items: center;
                gap: 3px;
                box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
              }
              .lead-name-premium {
                font-weight: 700;
                font-size: 0.95rem;
                color: var(--text-primary);
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .lead-contact-premium {
                font-size: 0.85rem;
                color: var(--text-secondary);
                display: flex;
                align-items: center;
                gap: 6px;
              }
              .lead-property-premium {
                font-size: 0.82rem;
                color: var(--text-muted);
                background-color: rgba(0, 0, 0, 0.02);
                padding: 6px 10px;
                border-radius: 6px;
                border: 1px solid rgba(0, 0, 0, 0.04);
                display: flex;
                align-items: center;
                gap: 6px;
              }
              .lead-footer-premium {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px solid rgba(0, 0, 0, 0.05);
                padding-top: 10px;
                margin-top: 4px;
              }
              .lead-broker-premium {
                font-size: 0.78rem;
                color: var(--text-secondary);
                display: flex;
                align-items: center;
                gap: 4px;
                font-weight: 500;
              }
              .status-select-premium {
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 4px 8px;
                font-size: 0.8rem;
                font-weight: 600;
                background-color: var(--panel-bg);
                color: var(--text-primary);
                cursor: pointer;
                outline: none;
                transition: border-color 0.2s;
              }
              .status-select-premium:focus {
                border-color: var(--primary);
              }
            `}} />

            {loadingLeads ? (
              <div className="empty-state"><h3>Carregando Leads do CRM...</h3></div>
            ) : (
              <div className="kanban-board-premium">
                {/* Colunas do Kanban */}
                {(['Novo', 'Não respondeu', 'Em negociação', 'Vendido'] as const).map(columnStatus => {
                  const columnLeads = leads.filter(l => l.status === columnStatus);
                  const countId = `count-${columnStatus.toLowerCase().replace(/\s+/g, '-')}`;
                  
                  // Configuração de estilo de cada coluna
                  let colBg = 'rgba(255, 255, 255, 0.8)';
                  let colBorder = 'rgba(0, 0, 0, 0.05)';
                  let titleColor = 'var(--text-primary)';
                  let badgeBg = 'var(--text-muted)';
                  
                  if (columnStatus === 'Novo') {
                    colBg = '#eff6ff';
                    colBorder = 'rgba(59, 130, 246, 0.15)';
                    titleColor = '#1d4ed8';
                    badgeBg = '#3b82f6';
                  } else if (columnStatus === 'Não respondeu') {
                    colBg = '#fffbeb';
                    colBorder = 'rgba(245, 158, 11, 0.15)';
                    titleColor = '#b45309';
                    badgeBg = '#d97706';
                  } else if (columnStatus === 'Em negociação') {
                    colBg = '#f5f3ff';
                    colBorder = 'rgba(139, 92, 246, 0.15)';
                    titleColor = '#6d28d9';
                    badgeBg = '#7c3aed';
                  } else if (columnStatus === 'Vendido') {
                    colBg = '#ecfdf5';
                    colBorder = 'rgba(16, 185, 129, 0.15)';
                    titleColor = '#047857';
                    badgeBg = '#10b981';
                  }

                  return (
                    <div 
                      key={columnStatus} 
                      className="kanban-column-premium" 
                      style={{ backgroundColor: colBg, borderColor: colBorder }}
                    >
                      <div className="column-header-premium" style={{ borderBottomColor: colBorder }}>
                        <span className="column-title-premium" style={{ color: titleColor }}>{columnStatus}</span>
                        <span 
                          className="column-count-premium" 
                          id={countId}
                          style={{ backgroundColor: badgeBg }}
                        >
                          {columnLeads.length}
                        </span>
                      </div>
                      <div className="leads-list-premium">
                        {columnLeads.map(lead => {
                          const isSold = lead.status === 'Vendido';
                          return (
                            <div 
                              key={lead.id} 
                              className={`lead-card-premium ${isSold ? 'lead-card-sold-premium' : ''}`}
                            >
                              <div className="lead-name-premium">
                                <span>{lead.nome}</span>
                                {isSold && <span className="sold-badge-premium">⭐ Vendido</span>}
                              </div>
                              <div className="lead-contact-premium">
                                <span>📞</span> {lead.telefone}
                              </div>
                              <div className="lead-property-premium">
                                <span>🏠</span> 
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${lead.repasse_titulo || 'Geral'} - ${lead.repasse_bairro || 'N/A'}`}>
                                  {lead.repasse_titulo || 'Interesse Geral'} ({lead.repasse_bairro || 'N/A'})
                                </span>
                              </div>
                              <div className="lead-footer-premium">
                                <div className="lead-broker-premium" title={`Atribuído a: ${lead.corretor_nome}`}>
                                  <span>👤</span> {lead.corretor_nome ? lead.corretor_nome.split(' ')[0] : 'N/A'}
                                </div>
                                <select 
                                  className="status-select-premium" 
                                  value={lead.status}
                                  onChange={(e) => changeLeadStatus(lead.id, e.target.value)}
                                >
                                  <option value="Novo">Novo</option>
                                  <option value="Não respondeu">Não resp.</option>
                                  <option value="Em negociação">Em negoc.</option>
                                  <option value="Vendido">Vendido</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. ABA AUTOMAÇÃO JURÍDICA */}
        {activeTab === 'contracts' && (
          <div className="admin-section active">
            <div className="contracts-layout">
              {/* Esquerda: Form de Emissão */}
              <div className="contract-form-panel glass-panel">
                <h2>Preenchimento do Contrato</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
                  Selecione o imóvel e preencha os dados do comprador para emitir o instrumento de cessão automática de repasse.
                </p>
                <form onSubmit={handleGenerateContract}>
                  <div className="form-group">
                    <label>Selecione o Imóvel *</label>
                    <select 
                      className="form-control" 
                      required 
                      value={cRepasse} 
                      onChange={(e) => setCRepasse(e.target.value)}
                    >
                      <option value="">Selecione o imóvel do repasse</option>
                      {repasses.map(r => (
                        <option key={r.id} value={r.id}>
                          [{r.bairro}] {r.titulo} (Chave: {formatCurrency(parseFloat(r.valor_chave.toString()))})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nome do Comprador *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={cName} 
                        onChange={(e) => setCName(e.target.value)} 
                        placeholder="Nome completo" 
                      />
                    </div>
                    <div className="form-group">
                      <label>CPF do Comprador *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={cCpf} 
                        onChange={(e) => setCCpf(formatCPF(e.target.value))} 
                        placeholder="Ex: 000.000.000-00" 
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Profissão</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={cProfissao} 
                        onChange={(e) => setCProfissao(e.target.value)} 
                        placeholder="Ex: Engenheiro, Advogado" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Estado Civil</label>
                      <select 
                        className="form-control" 
                        value={cEstadoCivil} 
                        onChange={(e) => setCEstadoCivil(e.target.value)}
                      >
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Divorciado(a)">Divorciado(a)</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                        <option value="União Estável">União Estável</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Endereço Residencial (Rua / Av. / Logradouro) *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required
                      value={cEndereco} 
                      onChange={(e) => setCEndereco(e.target.value)} 
                      placeholder="Ex: Av. Beira Mar" 
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: '0 0 20%' }}>
                      <label>Número *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required
                        value={cNumero} 
                        onChange={(e) => setCNumero(e.target.value)} 
                        placeholder="Ex: 1200" 
                      />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 40%' }}>
                      <label>Bairro *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required
                        value={cBairroEndereco} 
                        onChange={(e) => setCBairroEndereco(e.target.value)} 
                        placeholder="Ex: Meireles" 
                      />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 40%' }}>
                      <label>Complemento</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={cComplemento} 
                        onChange={(e) => setCComplemento(e.target.value)} 
                        placeholder="Ex: Apto 402 (Opcional)" 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={verifyCertificates} 
                      style={{ flex: 1 }}
                      disabled={certStatus === 'checking_sefin' || certStatus === 'checking_onr'}
                    >
                      🔍 Validar Certidões
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ flex: 1 }}
                      disabled={generatingContract}
                    >
                      {generatingContract ? 'Gerando...' : '✍️ Gerar Minuta'}
                    </button>
                  </div>
                </form>

                {/* Status da Validação */}
                {certStatus !== 'idle' && (
                  <div className="verification-status" style={{ display: 'block', marginTop: '20px' }}>
                    <h4>Verificação Eletrônica de Certidões Negativas</h4>
                    <div style={{ marginTop: '12px' }}>
                      <div className="verification-item">
                        <div 
                          className={`verification-dot ${
                            certStatus === 'checking_sefin' 
                              ? 'checking' 
                              : certStatus === 'checking_onr' || certStatus === 'success' 
                              ? 'success' 
                              : ''
                          }`} 
                        />
                        <span dangerouslySetInnerHTML={{ __html: sefinDetail }} />
                      </div>
                      <div className="verification-item">
                        <div 
                          className={`verification-dot ${
                            certStatus === 'checking_onr' 
                              ? 'checking' 
                              : certStatus === 'success' 
                              ? 'success' 
                              : ''
                          }`} 
                        />
                        <span dangerouslySetInnerHTML={{ __html: onrDetail }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Direita: Preview e Impressão */}
              <div className="contract-preview-panel glass-panel">
                <div className="preview-header">
                  <h2>Minuta Gerada</h2>
                  {generatedContract && (
                    <button 
                      className="btn btn-success" 
                      onClick={() => window.print()} 
                      style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Printer size={16} /> Imprimir / Salvar PDF
                    </button>
                  )}
                </div>
                <div className="preview-content printable-area" id="contract-preview-box">
                  {generatedContract || 'A minuta do contrato preenchida automaticamente aparecerá aqui após o preenchimento do formulário ao lado.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. ABA CADASTRAR REPASSE */}
        {activeTab === 'new-repasse' && (
          <div className="admin-section active">
            {!showRepasseForm ? (
              <div className="glass-panel" style={{ padding: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Meus Imóveis</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
                      Gerencie as oportunidades de repasse cadastradas no portal ({repasses.length} cadastrados).
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                    onClick={() => {
                      setRepasseTitulo('');
                      setRepasseBairro('');
                      setRepasseChave('');
                      setRepasseSaldo('');
                      setRepasseParcela('');
                      setRepasseArea('');
                      setRepasseQuartos('1');
                      setRepasseVaranda(false);
                      setRepasseImagem('');
                      setRepasseDescricao('');
                      setRepasseCorretor('');
                      setRepasseStatus('Disponível');
                      setEditingRepasseId(null);
                      setShowRepasseForm(true);
                    }}
                  >
                    <Plus size={18} /> Novo Imóvel
                  </button>
                </div>

                {/* Filtro de Busca */}
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Buscar imóveis por título ou bairro..." 
                    value={searchRepasse}
                    onChange={(e) => setSearchRepasse(e.target.value)}
                    style={{ paddingLeft: '45px', maxWidth: '400px' }}
                  />
                </div>

                {/* Listagem */}
                {repasses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <Building size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p>Nenhum imóvel cadastrado no momento.</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>Clique em "+ Novo Imóvel" para publicar seu primeiro repasse.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Imóvel</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Bairro</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Valor da Chave</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Saldo Devedor</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Status</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repasses
                          .filter(r => 
                            r.titulo.toLowerCase().includes(searchRepasse.toLowerCase()) || 
                            r.bairro.toLowerCase().includes(searchRepasse.toLowerCase())
                          )
                          .map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '16px', fontWeight: 600 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <img 
                                    src={r.imagem_url || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=100'} 
                                    alt={r.titulo} 
                                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                  />
                                  <span style={{ fontSize: '0.95rem' }}>{r.titulo}</span>
                                </div>
                              </td>
                              <td style={{ padding: '16px', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>{r.bairro}</td>
                              <td style={{ padding: '16px' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{formatCurrency(parseFloat(r.valor_chave.toString()))}</div>
                                <div 
                                  style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '2px', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={() => setSelectedCalcRepasse(r)}
                                  title="Ver detalhamento completo dos valores"
                                >
                                  Recebe: <b>{formatCurrency(parseFloat(r.valor_chave.toString()) * (r.comissao_pct ? parseFloat(r.comissao_pct.toString()) / 100 : 0.05))}</b> ({r.comissao_pct || 5}%) 🔍
                                </div>
                              </td>
                              <td style={{ padding: '16px', fontSize: '0.92rem', color: 'var(--text-muted)' }}>{formatCurrency(parseFloat(r.saldo_devedor.toString()))}</td>
                              <td style={{ padding: '16px' }}>
                                <span className={`badge ${r.status === 'Disponível' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                  {r.status}
                                </span>
                              </td>
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                                    onClick={() => {
                                      setRepasseTitulo(r.titulo);
                                      setRepasseBairro(r.bairro);
                                      setRepasseChave(formatCurrencyInput(r.valor_chave.toString()));
                                      setRepasseSaldo(formatCurrencyInput(r.saldo_devedor.toString()));
                                      setRepasseParcela(r.parcela ? formatCurrencyInput(r.parcela.toString()) : '');
                                      setRepasseArea(r.area ? r.area.toString() : '');
                                      setRepasseQuartos(r.quartos ? r.quartos.toString() : '1');
                                      setRepasseVaranda(r.varanda || false);
                                      setRepasseImagem(r.imagem_url || '');
                                      setRepasseDescricao(r.descricao || '');
                                      setRepasseCorretor(r.corretor_id ? r.corretor_id.toString() : '');
                                      setRepasseStatus(r.status || 'Disponível');
                                      setRepasseComissaoPct(r.comissao_pct ? r.comissao_pct.toString() : '5');
                                      setEditingRepasseId(r.id);
                                      setShowRepasseForm(true);
                                    }}
                                  >
                                    <Pencil size={14} /> Editar
                                  </button>
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                    onClick={() => handleDeleteRepasse(r.id)}
                                  >
                                    <Trash2 size={14} /> Excluir
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                      {editingRepasseId ? 'Editar Oportunidade' : 'Cadastrar Oportunidade'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>
                      Insira as especificações do imóvel para o portal.
                    </p>
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem' }}
                    onClick={() => setShowRepasseForm(false)}
                  >
                    <ArrowLeft size={16} /> Voltar para a lista
                  </button>
                </div>
                
                <form onSubmit={handleSaveRepasse}>
                  <div className="form-group">
                    <label>Título do Anúncio *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={repasseTitulo} 
                      onChange={(e) => setRepasseTitulo(e.target.value)} 
                      placeholder="Ex: Lindo apartamento com vista para o parque" 
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Bairro *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={repasseBairro} 
                        onChange={(e) => setRepasseBairro(e.target.value)} 
                        placeholder="Ex: Aldeota" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Corretor Responsável *</label>
                      <select 
                        className="form-control" 
                        required 
                        value={repasseCorretor} 
                        onChange={(e) => setRepasseCorretor(e.target.value)}
                      >
                        <option value="">Selecione o Corretor Responsável</option>
                        {corretores.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Valor da Chave (Ágio) *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={repasseChave} 
                        onChange={(e) => setRepasseChave(formatCurrencyInput(e.target.value))} 
                        placeholder="Ex: R$ 50.000,00" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Saldo Devedor do Financiamento *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={repasseSaldo} 
                        onChange={(e) => setRepasseSaldo(formatCurrencyInput(e.target.value))} 
                        placeholder="Ex: R$ 120.000,00" 
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Valor da Parcela Mensal</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={repasseParcela} 
                        onChange={(e) => setRepasseParcela(formatCurrencyInput(e.target.value))} 
                        placeholder="Ex: R$ 850,00" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Área Privativa (m²)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={repasseArea} 
                        onChange={(e) => setRepasseArea(e.target.value)} 
                        placeholder="Ex: 85" 
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Comissão do Corretor (%) *</label>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        step="0.1"
                        className="form-control" 
                        required
                        value={repasseComissaoPct} 
                        onChange={(e) => setRepasseComissaoPct(e.target.value)} 
                        placeholder="Ex: 5" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Quantidade de Quartos</label>
                      <select 
                        className="form-control" 
                        value={repasseQuartos} 
                        onChange={(e) => setRepasseQuartos(e.target.value)}
                      >
                        <option value="1">1 Quarto</option>
                        <option value="2">2 Quartos</option>
                        <option value="3">3 Quartos</option>
                        <option value="4">4 ou mais Quartos</option>
                      </select>
                    </div>
                  </div>
                    
                  <div className="form-row">
                    {editingRepasseId ? (
                      <>
                        <div className="form-group">
                          <label>Status do Imóvel</label>
                          <select 
                            className="form-control" 
                            value={repasseStatus} 
                            onChange={(e) => setRepasseStatus(e.target.value)}
                          >
                            <option value="Disponível">Disponível</option>
                            <option value="Vendido">Vendido</option>
                            <option value="Indisponível">Indisponível</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '12px' }}>
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={repasseVaranda} 
                              onChange={(e) => setRepasseVaranda(e.target.checked)} 
                            />
                            <span className="switch-slider"></span>
                            <span>Possui Varanda</span>
                          </label>
                        </div>
                      </>
                    ) : (
                      <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '12px' }}>
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={repasseVaranda} 
                            onChange={(e) => setRepasseVaranda(e.target.checked)} 
                          />
                          <span className="switch-slider"></span>
                          <span>Possui Varanda</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>URL da Imagem do Imóvel</label>
                    <input 
                      type="url" 
                      className="form-control" 
                      value={repasseImagem} 
                      onChange={(e) => setRepasseImagem(e.target.value)} 
                      placeholder="Ex: https://images.unsplash.com/..." 
                    />
                  </div>

                  <div className="form-group">
                    <label>Descrição do Imóvel</label>
                    <textarea 
                      className="form-control" 
                      rows={4} 
                      value={repasseDescricao} 
                      onChange={(e) => setRepasseDescricao(e.target.value)} 
                      placeholder="Descreva os detalhes adicionais, área de lazer, diferenciais, etc." 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingRepasse}>
                      {savingRepasse ? 'Aguarde...' : (editingRepasseId ? 'Salvar Alterações' : 'Publicar Anúncio no Marketplace')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => {
                      setRepasseTitulo('');
                      setRepasseBairro('');
                      setRepasseChave('');
                      setRepasseSaldo('');
                      setRepasseParcela('');
                      setRepasseArea('');
                      setRepasseQuartos('1');
                      setRepasseVaranda(false);
                      setRepasseImagem('');
                      setRepasseDescricao('');
                      setRepasseCorretor('');
                      setRepasseStatus('Disponível');
                      setEditingRepasseId(null);
                      setShowRepasseForm(false);
                    }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 5. ABA MEU PERFIL */}
        {activeTab === 'profile' && (
          <div className="admin-section active">
            <div className="glass-panel" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>Meu Perfil</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                Personalize suas informações públicas, senha de acesso e foto de perfil.
              </p>

              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Layout em 2 colunas para foto e campos */}
                <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                  
                  {/* Coluna da Foto de Perfil */}
                  <div style={{ 
                    flex: '1 1 200px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '20px',
                    borderRight: '1px solid var(--border-color)',
                    paddingRight: '20px'
                  }}>
                    <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>FOTO DE PERFIL</label>
                    
                    {pFotoUrl ? (
                      <div style={{ position: 'relative' }}>
                        <img 
                          src={pFotoUrl} 
                          alt="Previsualização" 
                          style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-hover)', boxShadow: 'var(--shadow-md)' }} 
                        />
                        <button 
                          type="button" 
                          onClick={() => setPFotoUrl('')}
                          className="btn btn-secondary" 
                          style={{ 
                            position: 'absolute', 
                            bottom: '0', 
                            right: '0', 
                            borderRadius: '50%', 
                            width: '36px', 
                            height: '36px', 
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderColor: 'var(--danger)',
                            color: 'var(--danger)',
                            background: 'var(--panel-bg)'
                          }}
                          title="Remover Foto"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '3.5rem',
                        boxShadow: '0 8px 24px var(--primary-glow)'
                      }}>
                        {pNome.trim().charAt(0).toUpperCase() || 'C'}
                      </div>
                    )}
                    
                    <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                        Escolher Imagem
                      </button>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          opacity: 0,
                          cursor: 'pointer',
                          width: '100%',
                          height: '100%'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      Formatos aceitos: JPG, PNG. Limite de 1MB.
                    </span>
                  </div>

                  {/* Coluna dos Dados */}
                  <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Nome Completo *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={pNome} 
                        onChange={(e) => setPNome(e.target.value)} 
                        placeholder="Seu nome completo" 
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Nome de Exibição (Como quer ser chamado)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={pNomeExibicao} 
                        onChange={(e) => setPNomeExibicao(e.target.value)} 
                        placeholder="Ex: Gabriel David" 
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Telefone (WhatsApp)</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        value={pTelefone} 
                        onChange={(e) => setPTelefone(formatPhone(e.target.value))} 
                        placeholder="Ex: (85) 9 9999-9999" 
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Nova Senha (Deixe em branco para manter a atual)</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        value={pSenha} 
                        onChange={(e) => setPSenha(e.target.value)} 
                        placeholder="Digite se deseja alterar a senha" 
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                  <button type="submit" className="btn btn-primary" style={{ minWidth: '180px', height: '45px' }} disabled={updatingProfile}>
                    {updatingProfile ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. ABA GESTÃO DE EQUIPE (ADMIN ONLY) */}
        {activeTab === 'team' && isAdmin && (
          <div className="admin-section active">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Gestão de Equipe</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
                  Gerencie o cadastro, permissões e status dos corretores da imobiliária.
                </p>
              </div>
              {!showTeamForm && (
                <button 
                  className="btn btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                  onClick={() => {
                    setTeamNome('');
                    setTeamEmail('');
                    setTeamTelefone('');
                    setTeamSenha('');
                    setTeamRole('corretor');
                    setTeamAtivo(true);
                    setEditingTeamMemberId(null);
                    setShowTeamForm(true);
                  }}
                >
                  <Plus size={18} /> Adicionar Corretor
                </button>
              )}
            </div>

            {loadingTeam ? (
              <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}><h3>Carregando Equipe de Corretores...</h3></div>
            ) : showTeamForm ? (
              <div className="glass-panel" style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>
                  {editingTeamMemberId ? 'Editar Corretor' : 'Cadastrar Novo Corretor na Equipe'}
                </h3>
                <form onSubmit={handleSaveTeamMember} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nome Completo *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={teamNome} 
                        onChange={(e) => setTeamNome(e.target.value)} 
                        placeholder="Nome do corretor" 
                      />
                    </div>
                    <div className="form-group">
                      <label>E-mail Corporativo *</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        required 
                        value={teamEmail} 
                        onChange={(e) => setTeamEmail(e.target.value)} 
                        placeholder="email@imobiliaria.com" 
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Telefone (WhatsApp)</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        value={teamTelefone} 
                        onChange={(e) => setTeamTelefone(formatPhone(e.target.value))} 
                        placeholder="Ex: (85) 9 9999-9999" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Nível de Acesso (Cargo) *</label>
                      <select 
                        className="form-control" 
                        value={teamRole} 
                        onChange={(e) => setTeamRole(e.target.value)}
                      >
                        <option value="corretor">Corretor Parcerias</option>
                        <option value="admin">Administrador / Diretor</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group">
                      <label>{editingTeamMemberId ? 'Alterar Senha (Opcional)' : 'Senha de Acesso *'}</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        required={!editingTeamMemberId}
                        value={teamSenha} 
                        onChange={(e) => setTeamSenha(e.target.value)} 
                        placeholder={editingTeamMemberId ? "Deixe em branco para manter" : "Senha provisória (min. 6 dígitos)"} 
                      />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '12px' }}>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={teamAtivo} 
                          onChange={(e) => setTeamAtivo(e.target.checked)} 
                        />
                        <span className="switch-slider"></span>
                        <span>Conta Ativa (Pode logar)</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setShowTeamForm(false)}
                      disabled={savingTeamMember}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={savingTeamMember}
                      style={{ minWidth: '120px' }}
                    >
                      {savingTeamMember ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '0px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                        <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Nome / E-mail</th>
                        <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>WhatsApp</th>
                        <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Cargo</th>
                        <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Nenhum corretor cadastrado na equipe.
                          </td>
                        </tr>
                      ) : (
                        team.map((member) => (
                          <tr key={member.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                            <td style={{ padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  backgroundColor: member.role === 'admin' ? 'var(--primary)' : 'var(--text-muted)',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '600',
                                  fontSize: '0.9rem'
                                }}>
                                  {member.nome.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{member.nome}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '16px', fontSize: '0.92rem' }}>{member.telefone || 'Não informado'}</td>
                            <td style={{ padding: '16px' }}>
                              <span className={`badge ${member.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                {member.role === 'admin' ? 'Admin' : 'Corretor'}
                              </span>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span className={`badge ${member.ativo ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                {member.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                  onClick={() => {
                                    setTeamNome(member.nome);
                                    setTeamEmail(member.email);
                                    setTeamTelefone(member.telefone || '');
                                    setTeamSenha('');
                                    setTeamRole(member.role);
                                    setTeamAtivo(member.ativo);
                                    setEditingTeamMemberId(member.id);
                                    setShowTeamForm(true);
                                  }}
                                >
                                  Editar
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '0.85rem', color: member.ativo ? '#ef4444' : '#10b981', borderColor: 'rgba(0,0,0,0.1)' }}
                                  onClick={async () => {
                                    try {
                                      await api.put(`/admin/team/${member.id}`, {
                                        nome: member.nome,
                                        email: member.email,
                                        telefone: member.telefone,
                                        role: member.role,
                                        ativo: !member.ativo
                                      });
                                      showToast(`Corretor ${member.ativo ? 'desativado' : 'ativado'} com sucesso!`, 'success');
                                      loadTeamData();
                                    } catch (e) {
                                      showToast('Erro ao alterar status do corretor.', 'danger');
                                    }
                                  }}
                                >
                                  {member.ativo ? 'Desativar' : 'Reativar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL DE DETALHAMENTO FINANCEIRO */}
        {selectedCalcRepasse && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div className="glass-panel" style={{
              width: '100%',
              maxWidth: '550px',
              padding: '30px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
              border: '1px solid var(--border-color)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Detalhamento Financeiro do Fechamento</h3>
                <button 
                  onClick={() => setSelectedCalcRepasse(null)}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '4px'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  Imóvel: <b>{selectedCalcRepasse.titulo}</b> ({selectedCalcRepasse.bairro})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                    <span>Valor da Chave (Ágio):</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(parseFloat(selectedCalcRepasse.valor_chave.toString()))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                    <span>Saldo Devedor do Financiamento:</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(parseFloat(selectedCalcRepasse.saldo_devedor.toString()))}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, padding: '8px 0', borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)', margin: '4px 0' }}>
                    <span>VGV Geral (Valor do Imóvel):</span>
                    <span style={{ color: 'var(--primary)' }}>{formatCurrency(parseFloat(selectedCalcRepasse.valor_chave.toString()) + parseFloat(selectedCalcRepasse.saldo_devedor.toString()))}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#059669' }}>
                    <span>Comissão do Corretor ({selectedCalcRepasse.comissao_pct || 5}% da Chave):</span>
                    <span style={{ fontWeight: 600 }}>+ {formatCurrency(parseFloat(selectedCalcRepasse.valor_chave.toString()) * ((selectedCalcRepasse.comissao_pct || 5) / 100))}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#dc2626' }}>
                    <span>Taxa da Imobiliária (1% do VGV):</span>
                    <span style={{ fontWeight: 600 }}>- {formatCurrency((parseFloat(selectedCalcRepasse.valor_chave.toString()) + parseFloat(selectedCalcRepasse.saldo_devedor.toString())) * 0.01)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, padding: '12px', backgroundColor: 'rgba(5, 150, 105, 0.05)', border: '1px solid rgba(5, 150, 105, 0.1)', borderRadius: '8px', marginTop: '8px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>Líquido Recebido pelo Vendedor:</span>
                    <span style={{ color: '#059669' }}>
                      {formatCurrency(
                        parseFloat(selectedCalcRepasse.valor_chave.toString()) - 
                        (parseFloat(selectedCalcRepasse.valor_chave.toString()) * ((selectedCalcRepasse.comissao_pct || 5) / 100)) - 
                        ((parseFloat(selectedCalcRepasse.valor_chave.toString()) + parseFloat(selectedCalcRepasse.saldo_devedor.toString())) * 0.01)
                      )}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '16px', lineHeight: '1.4' }}>
                  💡 <b>Legenda das Comissões:</b> A comissão do corretor é adicionada ao valor pago pelo comprador no fechamento do ágio. A taxa da imobiliária (1%) é deduzida do valor de VGV final para custear a plataforma e assessoria comercial.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button className="btn btn-primary" onClick={() => setSelectedCalcRepasse(null)} style={{ minWidth: '120px' }}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
