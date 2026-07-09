import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { DashboardData, Lead, Repasse } from '../services/api';
import { useToast } from '../components/Toast';
import { 
  TrendingUp, 
  Key, 
  Handshake, 
  BarChart, 
  Printer
} from 'lucide-react';

type AdminTab = 'dashboard' | 'crm' | 'contracts' | 'new-repasse';

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
  const [savingRepasse, setSavingRepasse] = useState(false);

  // 2. Automação Jurídica
  const [cRepasse, setCRepasse] = useState('');
  const [cName, setCName] = useState('');
  const [cCpf, setCCpf] = useState('');
  const [cProfissao, setCProfissao] = useState('');
  const [cEstadoCivil, setCEstadoCivil] = useState('Solteiro(a)');
  const [cEndereco, setCEndereco] = useState('');
  const [certStatus, setCertStatus] = useState<'idle' | 'checking_sefin' | 'checking_onr' | 'success' | 'error'>('idle');
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

  const loadContractsData = async () => {
    try {
      const data = await api.get<Repasse[]>('/repasses');
      setRepasses(data);
    } catch (err) {
      showToast('Erro ao carregar repasses.', 'danger');
    }
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

  // Alterar Status do Lead no Kanban
  const changeLeadStatus = async (leadId: number, status: string) => {
    try {
      await api.put(`/leads/${leadId}/status`, { status });
      showToast('Status do lead atualizado no CRM!', 'success');
      loadCRMData();
    } catch (err) {
      showToast('Erro ao atualizar status do lead.', 'danger');
    }
  };

  // Cadastrar Repasse
  const handleCreateRepasse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repasseTitulo || !repasseBairro || !repasseChave || !repasseSaldo || !repasseCorretor) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    setSavingRepasse(true);
    try {
      await api.post('/repasses', {
        titulo: repasseTitulo,
        bairro: repasseBairro,
        valor_chave: repasseChave,
        saldo_devedor: repasseSaldo,
        parcela: repasseParcela || undefined,
        quartos: repasseQuartos,
        varanda: repasseVaranda,
        area: repasseArea || undefined,
        imagem_url: repasseImagem || undefined,
        descricao: repasseDescricao,
        corretor_id: repasseCorretor
      });

      showToast('Repasse cadastrado e disponível no portal!', 'success');
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
    } catch (err) {
      showToast('Erro ao registrar repasse imobiliário.', 'danger');
    } finally {
      setSavingRepasse(false);
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

    } catch (err) {
      setCertStatus('error');
      setSefinDetail('Erro de conexão ou timeout na SEFIN.');
      setOnrDetail('Erro de conexão na ONR.');
      showToast('Timeout ou falha na integração governamental.', 'danger');
    }
  };

  // Gerar Contrato
  const handleGenerateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cRepasse || !cName || !cCpf) {
      showToast('Selecione o imóvel e insira nome/CPF do comprador.', 'warning');
      return;
    }

    setGeneratingContract(true);
    try {
      const res = await api.post<{ contrato: string }>('/contracts/generate', {
        repasse_id: cRepasse,
        cliente_nome: cName,
        cliente_cpf: cCpf,
        cliente_profissao: cProfissao || undefined,
        cliente_estado_civil: cEstadoCivil,
        cliente_endereco: cEndereco || undefined
      });

      setGeneratedContract(res.contrato);
      showToast('Minuta particular de cessão criada com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao emitir minuta de cessão.', 'danger');
    } finally {
      setGeneratingContract(false);
    }
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
            onClick={() => setActiveTab('new-repasse')}
          >
            <Key size={18} />
            Cadastrar Repasse
          </button>
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
            {loadingLeads ? (
              <div className="empty-state"><h3>Carregando Leads do CRM...</h3></div>
            ) : (
              <div className="kanban-board">
                {/* Colunas do Kanban */}
                {(['Novo', 'Não respondeu', 'Em negociação', 'Vendido'] as const).map(columnStatus => {
                  const columnLeads = leads.filter(l => l.status === columnStatus);
                  const countId = `count-${columnStatus.toLowerCase().replace(/\s+/g, '-')}`;
                  const styleBorder = columnStatus === 'Vendido' ? { backgroundColor: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.2)' } : {};
                  
                  return (
                    <div key={columnStatus} className="kanban-column glass-panel" style={styleBorder}>
                      <div className="column-header">
                        <span className="column-title" style={columnStatus === 'Vendido' ? { color: 'var(--success)' } : {}}>{columnStatus}</span>
                        <span 
                          className="column-count" 
                          id={countId}
                          style={columnStatus === 'Vendido' ? { backgroundColor: 'var(--success-glow)', color: 'var(--success)' } : {}}
                        >
                          {columnLeads.length}
                        </span>
                      </div>
                      <div className="leads-list">
                        {columnLeads.map(lead => (
                          <div key={lead.id} className="lead-card glass-panel">
                            <div className="lead-name">{lead.nome}</div>
                            <div className="lead-contact">📞 {lead.telefone}</div>
                            <div className="lead-property">🏠 {lead.repasse_titulo || 'Interesse Geral'} ({lead.repasse_bairro || 'N/A'})</div>
                            <div className="lead-footer">
                              <span className="lead-broker-tag">👤 {lead.corretor_nome}</span>
                              <select 
                                className="status-select" 
                                value={lead.status}
                                onChange={(e) => changeLeadStatus(lead.id, e.target.value)}
                              >
                                <option value="Novo">Novo</option>
                                <option value="Não respondeu">Não respondeu</option>
                                <option value="Em negociação">Em negociação</option>
                                <option value="Vendido">Vendido</option>
                              </select>
                            </div>
                          </div>
                        ))}
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
                        onChange={(e) => setCCpf(e.target.value)} 
                        placeholder="Apenas números" 
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
                    <label>Endereço Residencial</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={cEndereco} 
                      onChange={(e) => setCEndereco(e.target.value)} 
                      placeholder="Rua, Número, Bairro, Cidade" 
                    />
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
            <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
              <h2>Cadastrar Oportunidade de Repasse</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                Insira as especificações do repasse imobiliário para listagem pública imediata no portal.
              </p>
              
              <form onSubmit={handleCreateRepasse}>
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
                      type="number" 
                      className="form-control" 
                      required 
                      value={repasseChave} 
                      onChange={(e) => setRepasseChave(e.target.value)} 
                      placeholder="R$ valor em dinheiro" 
                    />
                  </div>
                  <div className="form-group">
                    <label>Saldo Devedor do Financiamento *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      required 
                      value={repasseSaldo} 
                      onChange={(e) => setRepasseSaldo(e.target.value)} 
                      placeholder="R$ saldo junto ao banco" 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Valor da Parcela Mensal</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={repasseParcela} 
                      onChange={(e) => setRepasseParcela(e.target.value)} 
                      placeholder="R$ valor mensal" 
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
                    {savingRepasse ? 'Publicando...' : 'Publicar Anúncio no Marketplace'}
                  </button>
                  <button type="reset" className="btn btn-secondary" onClick={() => {
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
                  }}>
                    Limpar Formulário
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
