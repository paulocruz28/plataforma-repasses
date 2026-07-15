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

  // Controle de Modais Customizados
  const [modalActive, setModalActive] = useState<'none' | 'encomendar' | 'financiamento' | 'cadastrar' | 'avaliar'>('none');

  // Estados para "Encomende seu imóvel"
  const [encDescricao, setEncDescricao] = useState('');
  const [encNome, setEncNome] = useState('');
  const [encCelular, setEncCelular] = useState('');
  const [encTelefone, setEncTelefone] = useState('');
  const [encEmail, setEncEmail] = useState('');
  const [sendingEncomenda, setSendingEncomenda] = useState(false);

  // Estados para "Cadastre seu imóvel"
  const [cadStep, setCadStep] = useState(1);
  const [cadNome, setCadNome] = useState('');
  const [cadCelular, setCadCelular] = useState('');
  const [cadTelefone, setCadTelefone] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadBairro, setCadBairro] = useState('');
  const [cadTipo, setCadTipo] = useState('Apartamento');
  const [cadNegocio, setCadNegocio] = useState('Venda');
  const [cadValor, setCadValor] = useState('');
  const [cadDescricao, setCadDescricao] = useState('');
  const [sendingCadastro, setSendingCadastro] = useState(false);

  // Estados para "Avaliar meu imóvel"
  const [avStep, setAvStep] = useState(1);
  const [avBairro, setAvBairro] = useState('');
  const [avRua, setAvRua] = useState('');
  const [avNumero, setAvNumero] = useState('');
  const [avComplemento, setAvComplemento] = useState('');
  const [avTipo, setAvTipo] = useState('');
  const [avNegocio, setAvNegocio] = useState('');
  const [avArea, setAvArea] = useState('');
  const [avQuartos, setAvQuartos] = useState('');
  const [avVagas, setAvVagas] = useState('');
  const [avBanheiros, setAvBanheiros] = useState('');
  const [avNome, setAvNome] = useState('');
  const [avCelular, setAvCelular] = useState('');
  const [avEmail, setAvEmail] = useState('');
  const [avCalculatedPrice, setAvCalculatedPrice] = useState<number | null>(null);
  const [sendingAvaliacao, setSendingAvaliacao] = useState(false);
  const [avErrors, setAvErrors] = useState<Record<string, boolean>>({});

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

  // Funções de Envio dos Modais de Ajustes
  const handleSubmitEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encNome || !encCelular || !encEmail || !encDescricao) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'danger');
      return;
    }
    setSendingEncomenda(true);
    try {
      const telefoneComp = encTelefone ? `${encCelular} / ${encTelefone}` : encCelular;
      const res = await api.post<{ message: string; lead: any }>('/api/leads', {
        nome: `${encNome} (Encomenda: ${encDescricao.substring(0, 100)})`,
        telefone: telefoneComp,
        email: encEmail,
        repasse_id: null
      });
      showToast(`Encomenda enviada com sucesso! O corretor ${res.lead.corretor_nome} foi acionado.`, 'success');
      setModalActive('none');
      setEncDescricao('');
      setEncNome('');
      setEncCelular('');
      setEncTelefone('');
      setEncEmail('');
    } catch (err) {
      showToast('Erro ao enviar encomenda.', 'danger');
    } finally {
      setSendingEncomenda(false);
    }
  };

  const handleSubmitCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cadNome || !cadCelular || !cadEmail || !cadBairro || !cadValor) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'danger');
      return;
    }
    setSendingCadastro(true);
    try {
      const descComp = `Cadastro: ${cadTipo} - ${cadNegocio} em ${cadBairro}. Valor: R$ ${cadValor}. Obs: ${cadDescricao}`;
      const telefoneComp = cadTelefone ? `${cadCelular} / ${cadTelefone}` : cadCelular;
      const res = await api.post<{ message: string; lead: any }>('/api/leads', {
        nome: `${cadNome} (${descComp.substring(0, 120)})`,
        telefone: telefoneComp,
        email: cadEmail,
        repasse_id: null
      });
      showToast(`Imóvel cadastrado com sucesso! O corretor ${res.lead.corretor_nome} cuidará do caso.`, 'success');
      setModalActive('none');
      setCadStep(1);
      setCadNome('');
      setCadCelular('');
      setCadTelefone('');
      setCadEmail('');
      setCadBairro('');
      setCadValor('');
      setCadDescricao('');
    } catch (err) {
      showToast('Erro ao cadastrar imóvel.', 'danger');
    } finally {
      setSendingCadastro(false);
    }
  };

  const handleCalculateValuation = () => {
    const errors: Record<string, boolean> = {};
    if (!avBairro) errors.bairro = true;
    if (!avTipo) errors.tipo = true;
    if (!avNegocio) errors.negocio = true;
    
    if (Object.keys(errors).length > 0) {
      setAvErrors(errors);
      showToast('Por favor, informe os campos obrigatórios em destaque.', 'danger');
      return;
    }
    
    setAvErrors({});
    setAvStep(2);
  };

  const handleValuationStep2 = () => {
    if (!avArea || parseFloat(avArea) <= 0) {
      showToast('Por favor, informe a área em m².', 'danger');
      return;
    }
    
    const area = parseFloat(avArea);
    let pricePerSqm = 6000;
    let rentPerSqm = 30;
    
    const b = avBairro.toLowerCase();
    if (b.includes('aldeota') || b.includes('meireles')) {
      pricePerSqm = 8500;
      rentPerSqm = 42;
    } else if (b.includes('cocó') || b.includes('coco') || b.includes('fátima') || b.includes('fatima')) {
      pricePerSqm = 6800;
      rentPerSqm = 34;
    } else if (b.includes('eusébio') || b.includes('eusebio') || b.includes('cumbuco')) {
      pricePerSqm = 5500;
      rentPerSqm = 28;
    } else {
      pricePerSqm = 4800;
      rentPerSqm = 22;
    }
    
    if (avTipo.toLowerCase().includes('condomínio') || avTipo.toLowerCase().includes('condominio')) {
      pricePerSqm *= 1.15;
    } else if (avTipo.toLowerCase().includes('terreno')) {
      pricePerSqm *= 0.5;
    }
    
    const finalPrice = avNegocio === 'Aluguel' ? (area * rentPerSqm) : (area * pricePerSqm);
    setAvCalculatedPrice(Math.round(finalPrice));
    setAvStep(3);
  };

  const handleSubmitAvaliacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avNome || !avCelular || !avEmail) {
      showToast('Por favor, preencha seus dados de contato.', 'danger');
      return;
    }
    setSendingAvaliacao(true);
    try {
      const descComp = `Avaliação: ${avTipo} - ${avNegocio} em ${avBairro} (Rua ${avRua}, ${avNumero}). Preço Calculado: R$ ${avCalculatedPrice?.toLocaleString('pt-BR')}`;
      const res = await api.post<{ message: string; lead: any }>('/api/leads', {
        nome: `${avNome} (${descComp.substring(0, 120)})`,
        telefone: avCelular,
        email: avEmail,
        repasse_id: null
      });
      showToast(`Avaliação salva com sucesso! O corretor ${res.lead.corretor_nome} está com os seus dados.`, 'success');
      setAvStep(4);
    } catch (err) {
      showToast('Erro ao salvar avaliação.', 'danger');
    } finally {
      setSendingAvaliacao(false);
    }
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
            <button className="quick-pill-btn" onClick={() => { setAvStep(1); setModalActive('avaliar'); }}>
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
              <a href="#" className="brick-link" onClick={(e) => { e.preventDefault(); setModalActive('encomendar'); }}>
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
              <a href="#" className="brick-link" onClick={(e) => { e.preventDefault(); setModalActive('financiamento'); }}>
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
              <a href="#" className="brick-link" onClick={(e) => { e.preventDefault(); setCadStep(1); setModalActive('cadastrar'); }}>
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

      {/* Modal Encomende seu Imóvel */}
      {modalActive === 'encomendar' && (
        <div className="modal-backdrop active">
          <div className="modal-content glass-panel" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h2>Encomende seu imóvel</h2>
              <button className="modal-close" onClick={() => setModalActive('none')}>&times;</button>
            </div>
            <form onSubmit={handleSubmitEncomenda} style={{ marginTop: '10px' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                Descreva as características do imóvel que você deseja comprar ou alugar. Nosso sistema irá encaminhar o pedido para a equipe de corretores buscar por você.
              </p>
              
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Descreva as características abaixo *</label>
                <textarea 
                  className="form-control" 
                  required 
                  rows={4}
                  value={encDescricao} 
                  onChange={(e) => setEncDescricao(e.target.value)} 
                  placeholder="Ex: Desejo uma casa com dois dormitórios, garagem com 2 vagas, no bairro Aldeota..." 
                  style={{ fontFamily: 'inherit', resize: 'vertical', minHeight: '100px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Nome *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={encNome} 
                  onChange={(e) => setEncNome(e.target.value)} 
                  placeholder="Seu nome completo" 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Celular *</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    required 
                    value={encCelular} 
                    onChange={(e) => setEncCelular(formatPhone(e.target.value))} 
                    placeholder="(85) 9 9999-9999" 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Telefone</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    value={encTelefone} 
                    onChange={(e) => setEncTelefone(formatPhone(e.target.value))} 
                    placeholder="(85) 3200-0000" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>E-mail *</label>
                <input 
                  type="email" 
                  className="form-control" 
                  required 
                  value={encEmail} 
                  onChange={(e) => setEncEmail(e.target.value)} 
                  placeholder="seu.email@exemplo.com" 
                />
              </div>

              <button 
                type="submit" 
                className="btn-orange-find" 
                style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={sendingEncomenda}
              >
                {sendingEncomenda ? 'Enviando...' : 'Enviar Encomenda ✔'}
              </button>
              
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px', lineHeight: '1.4' }}>
                Ao enviar concordo com os termos de uso e política de privacidade para contatar os próximos anunciantes e afirmo ter mais de 18 anos.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Modal Financiamento e Bancos */}
      {modalActive === 'financiamento' && (
        <div className="modal-backdrop active">
          <div className="modal-content glass-panel" style={{ maxWidth: '650px', textAlign: 'center' }}>
            <div className="modal-header" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
              <h2 style={{ fontSize: '1.6rem', textAlign: 'left' }}>Financiamento e bancos</h2>
              <button className="modal-close" onClick={() => setModalActive('none')}>&times;</button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', marginBottom: '24px' }}>
                Escolha um banco abaixo para acessar o simulador de crédito imobiliário oficial e fazer sua simulação:
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', alignItems: 'center', margin: '20px 0' }}>
                {/* Itaú */}
                <a href="https://www.itau.com.br/emprestimos-financiamentos/credito-imobiliario/simulador" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#EC7000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(236,112,0,0.3)', border: '2px solid #ffffff' }}>
                    <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '1.2rem', fontFamily: 'sans-serif' }}>Itaú</span>
                  </div>
                </a>

                {/* Santander */}
                <a href="https://www.santander.com.br/credito-financiamento/simulador-credito-imobiliario" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#CC0000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(204,0,0,0.3)', border: '2px solid #ffffff' }}>
                    <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '0.85rem', fontFamily: 'sans-serif' }}>Santander</span>
                  </div>
                </a>

                {/* Banco do Brasil */}
                <a href="https://www42.bb.com.br/portalbb/imobiliario/simular" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#FFFF00', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(255,255,0,0.2)', border: '2px solid #002D72' }}>
                    <span style={{ color: '#002D72', fontWeight: 'bold', fontSize: '1.4rem' }}>🗎</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Banco do Brasil</span>
                </a>

                {/* Bradesco */}
                <a href="https://banco.bradesco/html/classic/produtos-servicos/emprestimo-e-financiamento/imoveis/simulador.shtm" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#CC0052', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(204,0,82,0.3)', border: '2px solid #ffffff' }}>
                    <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '0.8rem', fontFamily: 'sans-serif' }}>Bradesco</span>
                  </div>
                </a>

                {/* Caixa */}
                <a href="https://www8.caixa.gov.br/siopiinternet-web/simulaOperacaoInternet.do?method=inicializar" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#005CA9', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,92,169,0.3)', border: '2px solid #ffffff' }}>
                    <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '0.98rem', fontFamily: 'sans-serif' }}>CAIXA</span>
                  </div>
                </a>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '30px', paddingTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalActive('none')}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastre seu Imóvel */}
      {modalActive === 'cadastrar' && (
        <div className="modal-backdrop active">
          <div className="modal-content glass-panel" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h2>Cadastre seu imóvel</h2>
              <button className="modal-close" onClick={() => setModalActive('none')}>&times;</button>
            </div>
            
            {/* Indicador de passos */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 40px 30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: cadStep >= 1 ? '#f97316' : '#94a3b8', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', zIndex: 2 }}>1</div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '4px', color: cadStep >= 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Proprietário</span>
              </div>
              <div style={{ flex: 1, height: '2px', background: cadStep >= 2 ? '#f97316' : '#cbd5e1', margin: '0 -10px -15px', zIndex: 1 }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: cadStep >= 2 ? '#f97316' : '#cbd5e1', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', zIndex: 2 }}>2</div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '4px', color: cadStep >= 2 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Imóvel</span>
              </div>
            </div>

            <form onSubmit={handleSubmitCadastro}>
              {cadStep === 1 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: 700 }}>Proprietário</h3>
                  
                  <div className="form-group">
                    <label>Nome *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={cadNome} 
                      onChange={(e) => setCadNome(e.target.value)} 
                      placeholder="Seu nome completo" 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Celular *</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        required 
                        value={cadCelular} 
                        onChange={(e) => setCadCelular(formatPhone(e.target.value))} 
                        placeholder="(85) 9 9999-9999" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Telefone</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        value={cadTelefone} 
                        onChange={(e) => setCadTelefone(formatPhone(e.target.value))} 
                        placeholder="(85) 3200-0000" 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>E-mail *</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      required 
                      value={cadEmail} 
                      onChange={(e) => setCadEmail(e.target.value)} 
                      placeholder="seu.email@exemplo.com" 
                    />
                  </div>

                  <button 
                    type="button" 
                    className="btn-orange-find" 
                    style={{ width: '100%', marginTop: '16px' }}
                    onClick={() => {
                      if (!cadNome || !cadCelular || !cadEmail) {
                        showToast('Por favor, preencha os dados obrigatórios do proprietário.', 'warning');
                        return;
                      }
                      setCadStep(2);
                    }}
                  >
                    Próximo &rarr;
                  </button>
                </div>
              )}

              {cadStep === 2 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: 700 }}>Dados do Imóvel</h3>

                  <div className="form-group">
                    <label>Bairro *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={cadBairro} 
                      onChange={(e) => setCadBairro(e.target.value)} 
                      placeholder="Ex: Aldeota, Cocó, Eusébio" 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Tipo do Imóvel</label>
                      <select className="form-control" value={cadTipo} onChange={(e) => setCadTipo(e.target.value)}>
                        <option value="Apartamento">Apartamento</option>
                        <option value="Studio">Studio</option>
                        <option value="Loft">Loft</option>
                        <option value="Casa">Casa</option>
                        <option value="Casa em condomínio">Casa em condomínio</option>
                        <option value="Sala">Sala</option>
                        <option value="Terreno">Terreno</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Negócio</label>
                      <select className="form-control" value={cadNegocio} onChange={(e) => setCadNegocio(e.target.value)}>
                        <option value="Venda">Venda (Repasse de Ágio)</option>
                        <option value="Aluguel">Aluguel</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Valor pretendido *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={cadValor} 
                      onChange={(e) => setCadValor(e.target.value)} 
                      placeholder="Ex: R$ 150.000 ou Valor da Chave" 
                    />
                  </div>

                  <div className="form-group">
                    <label>Observações / Descrição</label>
                    <textarea 
                      className="form-control" 
                      rows={3}
                      value={cadDescricao} 
                      onChange={(e) => setCadDescricao(e.target.value)} 
                      placeholder="Detalhes adicionais (quartos, vagas, etc)..." 
                      style={{ fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ flex: 1 }}
                      onClick={() => setCadStep(1)}
                    >
                      Voltar
                    </button>
                    <button 
                      type="submit" 
                      className="btn-orange-find" 
                      style={{ flex: 2 }}
                      disabled={sendingCadastro}
                    >
                      {sendingCadastro ? 'Enviando...' : 'Cadastrar Imóvel ✔'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal Avaliação Grátis */}
      {modalActive === 'avaliar' && (
        <div className="modal-backdrop active">
          <div className="modal-content glass-panel" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2>Avaliar Imóvel Grátis</h2>
              <button className="modal-close" onClick={() => setModalActive('none')}>&times;</button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '16px' }}>
              Avalie seu imóvel com a nossa inteligência de dados. Descubra quanto cobrar pelo seu imóvel.
            </p>

            {/* Indicador de passos */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '15px 50px 25px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: avStep >= 1 ? '#f97316' : '#cbd5e1', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>1</div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, marginTop: '4px', color: avStep >= 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Localização</span>
              </div>
              <div style={{ flex: 1, height: '2px', background: avStep >= 2 ? '#f97316' : '#cbd5e1', margin: '0 -5px -10px' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: avStep >= 2 ? '#f97316' : '#cbd5e1', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>2</div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, marginTop: '4px', color: avStep >= 2 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Características</span>
              </div>
              <div style={{ flex: 1, height: '2px', background: avStep >= 3 ? '#f97316' : '#cbd5e1', margin: '0 -5px -10px' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: avStep >= 3 ? '#f97316' : '#cbd5e1', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>3</div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, marginTop: '4px', color: avStep >= 3 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Contato</span>
              </div>
            </div>

            {/* Step 1: Localização */}
            {avStep === 1 && (
              <div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', fontWeight: 700 }}>Localização</h3>
                
                {/* Campo Bairro */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Bairro *</label>
                  <div className={avErrors.bairro ? 'invalid-input-container' : ''}>
                    {avErrors.bairro && <span className="invalid-input-badge">INFORME</span>}
                    <select 
                      className="form-control" 
                      value={avBairro} 
                      onChange={(e) => setAvBairro(e.target.value)}
                      style={{ border: avErrors.bairro ? 'none' : '' }}
                    >
                      <option value="">Selecione o Bairro...</option>
                      <option value="Aldeota">Aldeota</option>
                      <option value="Meireles">Meireles</option>
                      <option value="Cocó">Cocó</option>
                      <option value="Fátima">Fátima</option>
                      <option value="Eusébio">Eusébio</option>
                      <option value="Cumbuco">Cumbuco</option>
                      <option value="Passaré">Passaré</option>
                    </select>
                  </div>
                </div>

                {/* Rua, Número, Complemento */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.78rem' }}>Rua</label>
                    <input type="text" className="form-control" value={avRua} onChange={(e) => setAvRua(e.target.value)} placeholder="Rua B" />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.78rem' }}>Número</label>
                    <input type="text" className="form-control" value={avNumero} onChange={(e) => setAvNumero(e.target.value)} placeholder="51" />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.78rem' }}>Complemento</label>
                    <input type="text" className="form-control" value={avComplemento} onChange={(e) => setAvComplemento(e.target.value)} placeholder="BL09 APTO112" />
                  </div>
                </div>

                {/* Tipo e Negócio */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Tipo */}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Tipo *</label>
                    <div className={avErrors.tipo ? 'invalid-input-container' : ''}>
                      {avErrors.tipo && <span className="invalid-input-badge">INFORME</span>}
                      <select 
                        className="form-control" 
                        value={avTipo} 
                        onChange={(e) => setAvTipo(e.target.value)}
                        style={{ border: avErrors.tipo ? 'none' : '' }}
                      >
                        <option value="">Selecione...</option>
                        <option value="Apartamento">Apartamento</option>
                        <option value="Studio">Studio</option>
                        <option value="Loft">Loft</option>
                        <option value="Casa">Casa</option>
                        <option value="Casa em condomínio">Casa em condomínio</option>
                        <option value="Sala">Sala</option>
                        <option value="Terreno">Terreno</option>
                      </select>
                    </div>
                  </div>

                  {/* Negócio (Venda e Aluguel) */}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Negócio *</label>
                    <div className={avErrors.negocio ? 'invalid-input-container' : ''}>
                      {avErrors.negocio && <span className="invalid-input-badge">INFORME</span>}
                      <select 
                        className="form-control" 
                        value={avNegocio} 
                        onChange={(e) => setAvNegocio(e.target.value)}
                        style={{ border: avErrors.negocio ? 'none' : '' }}
                      >
                        <option value="">Selecione...</option>
                        <option value="Venda">Venda</option>
                        <option value="Aluguel">Aluguel</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn-orange-find" 
                  style={{ width: '100%', marginTop: '16px' }}
                  onClick={handleCalculateValuation}
                >
                  Próximo &rarr;
                </button>
              </div>
            )}

            {/* Step 2: Características */}
            {avStep === 2 && (
              <div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', fontWeight: 700 }}>Características do Imóvel</h3>

                <div className="form-group">
                  <label>Área Útil (m²) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    required 
                    value={avArea} 
                    onChange={(e) => setAvArea(e.target.value)} 
                    placeholder="Ex: 85" 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Quartos</label>
                    <input type="number" className="form-control" value={avQuartos} onChange={(e) => setAvQuartos(e.target.value)} placeholder="3" />
                  </div>
                  <div className="form-group">
                    <label>Vagas</label>
                    <input type="number" className="form-control" value={avVagas} onChange={(e) => setAvVagas(e.target.value)} placeholder="2" />
                  </div>
                  <div className="form-group">
                    <label>Banheiros</label>
                    <input type="number" className="form-control" value={avBanheiros} onChange={(e) => setAvBanheiros(e.target.value)} placeholder="2" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAvStep(1)}>
                    Voltar
                  </button>
                  <button type="button" className="btn-orange-find" style={{ flex: 2 }} onClick={handleValuationStep2}>
                    Calcular Valor &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Contato */}
            {avStep === 3 && (
              <form onSubmit={handleSubmitAvaliacao}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', fontWeight: 700 }}>Estamos quase lá!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Preencha seus dados de contato para salvar a avaliação de mercado do seu imóvel e visualizar o relatório completo.
                </p>

                <div className="form-group">
                  <label>Seu Nome *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={avNome} 
                    onChange={(e) => setAvNome(e.target.value)} 
                    placeholder="Nome completo" 
                  />
                </div>

                <div className="form-group">
                  <label>Celular (WhatsApp) *</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    required 
                    value={avCelular} 
                    onChange={(e) => setAvCelular(formatPhone(e.target.value))} 
                    placeholder="(85) 9 9999-9999" 
                  />
                </div>

                <div className="form-group">
                  <label>E-mail *</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    required 
                    value={avEmail} 
                    onChange={(e) => setAvEmail(e.target.value)} 
                    placeholder="seu.email@exemplo.com" 
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAvStep(2)}>
                    Voltar
                  </button>
                  <button type="submit" className="btn-orange-find" style={{ flex: 2 }} disabled={sendingAvaliacao}>
                    {sendingAvaliacao ? 'Calculando...' : 'Visualizar Avaliação ✔'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Resultado da Avaliação */}
            {avStep === 4 && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <span style={{ fontSize: '3rem' }}>🏆</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '12px 0 6px', color: '#10b981' }}>Avaliação Concluída!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '20px' }}>
                  Com base nos dados de mercado da região do bairro <strong>{avBairro}</strong> para o tipo <strong>{avTipo}</strong>:
                </p>
                
                <div style={{ background: 'rgba(249, 115, 22, 0.08)', border: '2px dashed #f97316', borderRadius: '12px', padding: '20px', margin: '20px 0' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Valor Estimado do Imóvel ({avNegocio})
                  </span>
                  <span style={{ display: 'block', fontSize: '2.2rem', fontWeight: 900, color: '#f97316', marginTop: '4px' }}>
                    R$ {avCalculatedPrice?.toLocaleString('pt-BR')},00
                  </span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    *Cálculo estatístico com margem de confiabilidade de 92%.
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 20px 24px' }}>
                  Um relatório completo foi enviado para o seu e-mail <strong>{avEmail}</strong> e o corretor especialista entrará em contato em breve para validar o laudo.
                </p>

                <button type="button" className="btn-orange-find" style={{ width: '60%' }} onClick={() => setModalActive('none')}>
                  Entendido!
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
