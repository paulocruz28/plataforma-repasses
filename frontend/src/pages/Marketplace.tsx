import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import type { Repasse } from '../services/api';
import { RepasseCard } from '../components/RepasseCard';
import { useToast } from '../components/Toast';
import { Search, MapPin, BedDouble, DollarSign, X } from 'lucide-react';

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export const Marketplace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  
  const corretorParam = searchParams.get('corretor');

  // Estados dos filtros
  const [busca, setBusca] = useState('');
  const [bairro, setBairro] = useState('');
  const [quartos, setQuartos] = useState('');
  const [chaveMax, setChaveMax] = useState('');
  const [saldoMax, setSaldoMax] = useState('');
  const [varanda, setVaranda] = useState(false);

  // Novos estados para o design Inova
  const [pretensao, setPretensao] = useState<'comprar' | 'alugar'>('comprar');
  const [activeTab, setActiveTab] = useState<'casas' | 'condominio' | 'apartamentos' | 'alugar' | 'todos'>('todos');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Estados do portal
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [loading, setLoading] = useState(true);
  const [corretorNome, setCorretorNome] = useState('');
  const [corretorTelefone, setCorretorTelefone] = useState('');

  // Estados do modal
  const [selectedRepasseId, setSelectedRepasseId] = useState<number | null>(null);
  const [leadNome, setLeadNome] = useState('');
  const [leadTelefone, setLeadTelefone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [sendingLead, setSendingLead] = useState(false);

  // Função para buscar repasses
  const fetchRepasses = useCallback(async () => {
    setLoading(true);
    try {
      if (corretorParam) {
        // Buscar portfólio do corretor
        const data = await api.get<{ corretor: { nome: string; telefone: string }; repasses: Repasse[] }>(
          `/repasses/corretor/${corretorParam}`
        );
        setRepasses(data.repasses);
        setCorretorNome(data.corretor.nome);
        setCorretorTelefone(data.corretor.telefone);
      } else {
        // Buscar repasses gerais com filtros
        const queryParams = new URLSearchParams();
        if (busca) queryParams.append('busca', busca);
        if (bairro) queryParams.append('bairro', bairro);
        if (quartos) queryParams.append('quartos', quartos);
        if (varanda) queryParams.append('varanda', 'true');
        if (chaveMax) queryParams.append('valor_chave_max', chaveMax);
        if (saldoMax) queryParams.append('saldo_devedor_max', saldoMax);

        const data = await api.get<Repasse[]>(`/repasses?${queryParams.toString()}`);
        setRepasses(data);
      }
    } catch (err) {
      showToast('Falha ao conectar com o servidor e carregar imóveis.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [corretorParam, busca, bairro, quartos, varanda, chaveMax, saldoMax, showToast]);

  // Recarregar quando parâmetros mudam
  useEffect(() => {
    fetchRepasses();
  }, [fetchRepasses]);

  // Debounce para os campos de busca rápida
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (!corretorParam) {
        fetchRepasses();
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [busca, bairro, quartos, varanda, chaveMax, saldoMax, fetchRepasses, corretorParam]);

  // Lógica de Compartilhamento no WhatsApp
  const handleShare = (id: number) => {
    const item = repasses.find(r => r.id === id);
    if (!item) return;

    const formatCurrency = (val: string | number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val.toString()));
    };

    const portfolioLink = `${window.location.origin}/?corretor=${item.corretor_id}`;

    const text = `*OPORTUNIDADE DE REPASSE - ${item.titulo.toUpperCase()}*\n` +
                 `📍 Bairro: ${item.bairro}\n\n` +
                 `• ${item.quartos} ${item.quartos > 1 ? 'quartos' : 'quarto'}${item.area ? ', ' + item.area + 'm²' : ''}\n` +
                 `• ${item.varanda ? 'Com Varanda' : 'Sem Varanda'}\n` +
                 `• Valor da Chave (Ágio): ${formatCurrency(item.valor_chave)}\n` +
                 `• Saldo Devedor: ${formatCurrency(item.saldo_devedor)}\n` +
                 `• Valor da Parcela: ${item.parcela ? formatCurrency(item.parcela) : 'N/A'}\n\n` +
                 `Confira fotos e mais detalhes no meu portfólio digital:\n${portfolioLink}`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  const openLeadModal = (id: number) => {
    setSelectedRepasseId(id);
  };

  const closeLeadModal = () => {
    setSelectedRepasseId(null);
    setLeadNome('');
    setLeadTelefone('');
    setLeadEmail('');
  };

  // Enviar Lead para Roleta
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadNome || !leadTelefone) {
      showToast('Por favor, insira nome e telefone para contato.', 'warning');
      return;
    }

    setSendingLead(true);
    try {
      const res = await api.post<{ lead: { corretor_nome: string } }>('/leads', {
        nome: leadNome,
        telefone: leadTelefone,
        email: leadEmail || undefined,
        repasse_id: selectedRepasseId
      });

      closeLeadModal();
      showToast(
        `Obrigado! O corretor <b>${res.lead.corretor_nome}</b> foi acionado na roleta e entrará em contato.`,
        'success'
      );
    } catch (err) {
      showToast('Erro ao cadastrar seu contato. Tente novamente.', 'danger');
    } finally {
      setSendingLead(false);
    }
  };

  const limparFiltros = () => {
    setBusca('');
    setBairro('');
    setQuartos('');
    setChaveMax('');
    setSaldoMax('');
    setVaranda(false);
  };

  const filteredRepasses = repasses.filter(item => {
    // 0. Remover da vitrine se o imóvel já estiver vendido
    if (item.status && (item.status.toLowerCase() === 'vendido' || item.status.toLowerCase() === 'venda confirmada')) return false;

    const text = `${item.titulo} ${item.descricao || ''}`.toLowerCase();
    
    // 1. Filtrar pela aba ativa (Highlights/Categorias)
    if (activeTab === 'casas') {
      if (!text.includes('casa') || text.includes('condominio') || text.includes('condomínio')) return false;
    } else if (activeTab === 'condominio') {
      if (!text.includes('condominio') && !text.includes('condomínio')) return false;
    } else if (activeTab === 'apartamentos') {
      if (!text.includes('apartamento') && !text.includes('apto') && !text.includes('cobertura') && !text.includes('flat')) return false;
    } else if (activeTab === 'alugar') {
      if (!text.includes('aluguel') && !text.includes('alugar')) return false;
    }
    
    // 2. Filtrar pela pretensão selecionada no Hero (Comprar/Alugar)
    if (pretensao === 'alugar') {
      if (!text.includes('aluguel') && !text.includes('alugar') && !text.includes('locação') && !text.includes('locacao')) return false;
    }

    return true;
  });

  return (
    <div>
      {/* Banner de Portfólio de Corretor se selecionado */}
      {corretorParam && (
        <section className="portfolio-header glass-panel" style={{ margin: '40px auto 0', padding: '30px 40px', maxWidth: '1200px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="portfolio-info">
            <p style={{ color: 'var(--text-secondary)' }}>Você está visualizando o portfólio exclusivo de:</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>{corretorNome}</h2>
            <p>Telefone de Contato: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{corretorTelefone}</span></p>
          </div>
          <button className="btn btn-secondary" onClick={() => setSearchParams({})}>
            Ver Todos os Repasses
          </button>
        </section>
      )}

      {/* Hero Section */}
      {!corretorParam && (
        <section className="hero-beach" id="hero-section">
          <h1>Encontre o seu <span>Repasse Imobiliário</span> sem Burocracia</h1>
          <p>Acesse oportunidades de imóveis financiados direto com os proprietários. Assuma o saldo devedor.</p>

          {/* Barra de Pesquisa Flutuante */}
          <div className="search-bar-floating-card">
            {/* Campo 1: Pretensão */}
            <div className="search-field-group">
              <label>Pretensão</label>
              <select 
                value={pretensao} 
                onChange={(e) => {
                  const val = e.target.value as 'comprar' | 'alugar';
                  setPretensao(val);
                  if (val === 'alugar') {
                    setActiveTab('alugar');
                  } else {
                    setActiveTab('todos');
                  }
                }}
              >
                <option value="comprar">Comprar</option>
                <option value="alugar">Alugar</option>
              </select>
            </div>

            {/* Campo 2: Tipo de Imóvel */}
            <div className="search-field-group">
              <label>Tipo Imóvel</label>
              <select 
                value={activeTab} 
                onChange={(e) => setActiveTab(e.target.value as any)}
              >
                <option value="todos">Todos os tipos</option>
                <option value="casas">Casas</option>
                <option value="condominio">Casas em Condomínio</option>
                <option value="apartamentos">Apartamentos</option>
                <option value="alugar">Comercial / Locação</option>
              </select>
            </div>

            {/* Campo 3: Localização (Bairro) */}
            <div className="search-field-group" style={{ flex: 1.5, borderRight: 'none' }}>
              <label>Localização</label>
              <input 
                type="text" 
                value={bairro} 
                onChange={(e) => setBairro(e.target.value)} 
                placeholder="Digite condomínio, região, bairro ou cidade"
              />
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn-filter-more" 
                onClick={() => setShowMoreFilters(prev => !prev)}
              >
                Mais filtros
              </button>
              <button 
                type="button" 
                className="btn-orange-find"
                onClick={() => fetchRepasses()}
              >
                Encontrar imóvel
              </button>
            </div>
          </div>

          {/* Quick Pills */}
          <div className="quick-pills-row">
            <button className="quick-pill-btn" onClick={() => showToast('Digite o nome do bairro no campo de busca para filtrar por código.', 'info')}>
              Busca por código
            </button>
            <button className="quick-pill-btn" onClick={() => openLeadModal(repasses[0]?.id || 1)}>
              Avaliar meu imóvel ↗
            </button>
            <button className="quick-pill-btn" onClick={() => {
              setChaveMax('100000');
              showToast('Filtro de até 50% de desconto (chaves de até R$ 100 mil) aplicado!', 'success');
            }}>
              Imóveis com até 50% de desconto ↗
            </button>
          </div>
        </section>
      )}

      {/* Seção de Filtros Avançados (Colapsável) */}
      {!corretorParam && showMoreFilters && (
        <section className="filters-container-premium" style={{ marginTop: '20px', animation: 'fadeIn 0.3s ease' }}>
          <div className="filters-grid-premium">
            {/* Campo: Busca Rápida por Texto */}
            <div className="form-group-premium">
              <label>Busca Rápida</label>
              <div className="input-with-icon-premium">
                <Search size={18} className="input-icon-premium" />
                <input 
                  type="text" 
                  className="form-control-premium" 
                  value={busca} 
                  onChange={(e) => setBusca(e.target.value)} 
                  placeholder="Título ou descrição..." 
                />
              </div>
            </div>

            {/* Campo: Quartos */}
            <div className="form-group-premium">
              <label>Quartos (Mínimo)</label>
              <div className="input-with-icon-premium">
                <BedDouble size={18} className="input-icon-premium" />
                <select 
                  className="form-control-premium" 
                  value={quartos} 
                  onChange={(e) => setQuartos(e.target.value)}
                  style={{ appearance: 'none', WebkitAppearance: 'none' }}
                >
                  <option value="">Qualquer Qtd</option>
                  <option value="1">1 Quarto</option>
                  <option value="2">2 Quartos</option>
                  <option value="3">3+ Quartos</option>
                </select>
              </div>
            </div>

            {/* Campo: Chave Máxima */}
            <div className="form-group-premium">
              <label>Chave Máxima (Ágio)</label>
              <div className="input-with-icon-premium">
                <DollarSign size={18} className="input-icon-premium" />
                <input 
                  type="number" 
                  className="form-control-premium" 
                  value={chaveMax} 
                  onChange={(e) => setChaveMax(e.target.value)} 
                  placeholder="Ex: 150000" 
                />
              </div>
            </div>

            {/* Campo: Saldo Devedor Máximo */}
            <div className="form-group-premium">
              <label>Saldo Dev. Máximo</label>
              <div className="input-with-icon-premium">
                <DollarSign size={18} className="input-icon-premium" />
                <input 
                  type="number" 
                  className="form-control-premium" 
                  value={saldoMax} 
                  onChange={(e) => setSaldoMax(e.target.value)} 
                  placeholder="Ex: 300000" 
                />
              </div>
            </div>
          </div>

          <div className="filters-actions-premium">
            <label className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={varanda} 
                onChange={(e) => setVaranda(e.target.checked)} 
              />
              <span className="switch-slider"></span>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Apenas imóveis com Varanda</span>
            </label>
            
            <button 
              className="btn btn-secondary" 
              onClick={limparFiltros}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.9rem', fontWeight: 600 }}
            >
              <X size={16} /> Limpar Filtros
            </button>
          </div>
        </section>
      )}

      {/* Empreendimento em Destaque (Solaris Beach) */}
      {!corretorParam && (
        <section className="destaque-container">
          <div className="destaque-section">
            <div className="destaque-image-wrapper">
              <img src="/destaque_empreendimento.jpg" alt="Solaris Beach Residence" />
            </div>
            <div className="destaque-info">
              <span className="destaque-tag">Empreendimento em Destaque</span>
              <h2 className="destaque-title">Solaris Beach Residence</h2>
              <p className="destaque-description">
                Descubra o privilégio de morar em um verdadeiro resort frente ao mar. Apartamentos premium de 2 e 3 quartos com varanda gourmet, lazer completo e segurança 24h. Oportunidade exclusiva de repasse com desconto imperdível sobre a tabela original.
              </p>
              <a href="#" className="destaque-link" onClick={(e) => { e.preventDefault(); openLeadModal(repasses[0]?.id || 1); }}>
                Saiba mais &rarr;
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Seção das Categorias Separadas por Bairro/Tipo (Mais Destaques) */}
      {!corretorParam && (
        <section className="category-tabs-container">
          <h2>Mais destaques</h2>
          <div className="category-tabs">
            <button 
              className={`category-tab ${activeTab === 'casas' ? 'active' : ''}`}
              onClick={() => setActiveTab('casas')}
            >
              Casas
            </button>
            <button 
              className={`category-tab ${activeTab === 'condominio' ? 'active' : ''}`}
              onClick={() => setActiveTab('condominio')}
            >
              Casas em Condomínio
            </button>
            <button 
              className={`category-tab ${activeTab === 'apartamentos' ? 'active' : ''}`}
              onClick={() => setActiveTab('apartamentos')}
            >
              Apartamentos
            </button>
            <button 
              className={`category-tab ${activeTab === 'alugar' ? 'active' : ''}`}
              onClick={() => setActiveTab('alugar')}
            >
              Alugar
            </button>
            <button 
              className={`category-tab ${activeTab === 'todos' ? 'active' : ''}`}
              onClick={() => setActiveTab('todos')}
            >
              Ver mais
            </button>
          </div>
        </section>
      )}

      {/* Lista de Repasses */}
      <main className="repasses-section" style={{ paddingTop: '0px' }}>
        {loading ? (
          <div className="empty-state">
            <h3>Carregando repasses...</h3>
          </div>
        ) : filteredRepasses.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhum repasse disponível para esta categoria</h3>
            <p>Tente ajustar as abas de categorias ou os filtros de busca para encontrar outras oportunidades.</p>
          </div>
        ) : (
          <div className="repasses-grid">
            {filteredRepasses.map(item => (
              <RepasseCard 
                key={item.id} 
                item={item} 
                onNegociar={openLeadModal} 
                onShare={handleShare} 
              />
            ))}
          </div>
        )}
      </main>

      {/* Seção de Vantagens e Serviços (Parede de Tijolos) */}
      {!corretorParam && (
        <section className="brick-section">
          <div className="brick-grid">
            <div className="brick-column">
              <div className="brick-icon-wrapper">
                <Search size={22} />
              </div>
              <h3 className="brick-title">Atendimento VIP</h3>
              <p className="brick-description">
                Descreva o imóvel que você procura e nós avisaremos assim que novas oportunidades de repasse entrarem na plataforma.
              </p>
              <a href="#" className="brick-link" onClick={(e) => { e.preventDefault(); openLeadModal(repasses[0]?.id || 1); }}>
                Encomente seu imóvel &rarr;
              </a>
            </div>

            <div className="brick-column">
              <div className="brick-icon-wrapper">
                <DollarSign size={22} />
              </div>
              <h3 className="brick-title">Financiamento</h3>
              <p className="brick-description">
                Oferecemos assessoria jurídica e financeira completa para aprovar o seu crédito e transferir o saldo devedor com segurança.
              </p>
              <a href="#" className="brick-link" onClick={(e) => { e.preventDefault(); openLeadModal(repasses[0]?.id || 1); }}>
                Faça uma simulação &rarr;
              </a>
            </div>

            <div className="brick-column">
              <div className="brick-icon-wrapper">
                <MapPin size={22} />
              </div>
              <h3 className="brick-title">Cadastre seu imóvel</h3>
              <p className="brick-description">
                Anuncie conosco! Nós encontraremos os melhores compradores e intermediaremos toda a roleta de negociações de leads.
              </p>
              <a href="#" className="brick-link" onClick={(e) => { e.preventDefault(); window.location.href = '/login'; }}>
                Cadastre seu imóvel &rarr;
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Botão de WhatsApp Flutuante */}
      <a 
        href="https://wa.me/5585985629727" 
        target="_blank" 
        rel="noopener noreferrer" 
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          backgroundColor: '#25d366',
          color: '#ffffff',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(37, 211, 102, 0.3)',
          zIndex: 9999,
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 12px 28px rgba(37, 211, 102, 0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 211, 102, 0.3)';
        }}
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.38 1.966 13.91 1.948 12.008 1.948c-5.442 0-9.866 4.372-9.87 9.802 0 1.63.45 3.22 1.302 4.637L2.4 21.05l4.858-1.258zM17.11 14.86c-.28-.14-1.657-.82-1.913-.91-.256-.09-.443-.14-.63.14-.186.28-.72.91-.884 1.1-.162.18-.326.2-.606.06-2.825-1.422-4.66-2.585-6.533-5.78-.495-.845.495-.785 1.417-2.63.155-.31.08-.58-.04-.82-.12-.24-.98-2.36-1.343-3.24-.354-.856-.714-.74-1.043-.74-.27 0-.58-.02-.888-.02-.308 0-.81.115-1.233.58-.423.465-1.615 1.58-1.615 3.85 0 2.27 1.65 4.465 1.88 4.78.23.315 3.245 4.957 7.86 6.953 1.1.47 1.958.75 2.628.963 1.104.35 2.11.3 2.905.18.887-.13 2.72-.11 3.1-.31.38-.2.63-.66.63-1.12 0-.46-.28-.82-.56-.96z"/>
        </svg>
      </a>

      {/* Modal de Captura de Lead */}
      {selectedRepasseId !== null && (
        <div className="modal-backdrop active">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2>Tenho Interesse neste Repasse</h2>
              <button className="modal-close" onClick={closeLeadModal}>&times;</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.95rem' }}>
              Preencha seus dados de contato. Nossa roleta automática irá direcionar o seu atendimento para o corretor responsável imediatamente.
            </p>
            <form onSubmit={handleLeadSubmit}>
              <div className="form-group">
                <label>Seu Nome *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={leadNome} 
                  onChange={(e) => setLeadNome(e.target.value)} 
                  placeholder="Ex: João da Silva" 
                />
              </div>
              <div className="form-group">
                <label>Telefone (WhatsApp) *</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  required 
                  value={leadTelefone} 
                  onChange={(e) => setLeadTelefone(formatPhone(e.target.value))} 
                  placeholder="Ex: (85) 9 9999-9999" 
                />
              </div>
              <div className="form-group">
                <label>E-mail (Opcional)</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={leadEmail} 
                  onChange={(e) => setLeadEmail(e.target.value)} 
                  placeholder="Ex: joao@email.com" 
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={sendingLead}>
                  {sendingLead ? 'Enviando...' : 'Enviar e Falar com Corretor'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeLeadModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
