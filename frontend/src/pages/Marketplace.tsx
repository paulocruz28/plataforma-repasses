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
        <section className="hero" id="hero-section">
          <h1>Encontre o seu <span>Repasse Imobiliário</span> sem Burocracia</h1>
          <p>Acesse oportunidades de imóveis financiados direto com os proprietários. Filtre por bairro, valor de chave e assuma o saldo devedor.</p>
        </section>
      )}

      {/* Seção de Filtros Avançados Premium */}
      {!corretorParam && (
        <section className="filters-container-premium">
          <div className="filters-grid-premium">
            
            {/* Campo 1: Busca Rápida */}
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

            {/* Campo 2: Bairro */}
            <div className="form-group-premium">
              <label>Bairro</label>
              <div className="input-with-icon-premium">
                <MapPin size={18} className="input-icon-premium" />
                <input 
                  type="text" 
                  className="form-control-premium" 
                  value={bairro} 
                  onChange={(e) => setBairro(e.target.value)} 
                  placeholder="Ex: Aldeota, Cocó..." 
                />
              </div>
            </div>

            {/* Campo 3: Quartos */}
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

            {/* Campo 4: Valor Máximo Chave */}
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

            {/* Campo 5: Saldo Devedor Máximo */}
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

      {/* Lista de Repasses */}
      <main className="repasses-section">
        {loading ? (
          <div className="empty-state">
            <h3>Carregando repasses...</h3>
          </div>
        ) : repasses.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhum repasse disponível</h3>
            <p>Tente ajustar os filtros de busca para encontrar outras oportunidades.</p>
          </div>
        ) : (
          <div className="repasses-grid">
            {repasses.map(item => (
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
