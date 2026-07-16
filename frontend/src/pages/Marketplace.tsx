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

const formatCurrency = (val: number) => {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const NEIGHBORHOODS = [
  'Açude, Caucaia (CE)',
  'Alto do Garrote, Caucaia (CE)',
  'Araturi, Caucaia (CE)',
  'Araturi (Jurema), Caucaia (CE)',
  'Área Rural de Caucaia, Caucaia (CE)',
  'Arianópolis (Jurema), Caucaia (CE)',
  'Barra Nova, Caucaia (CE)',
  'Bom Jesus, Caucaia (CE)',
  'Cumbuco, Caucaia (CE)',
  'Centro, Caucaia (CE)',
  'Icaraí, Caucaia (CE)',
  'Tabuba, Caucaia (CE)',
  'Pacheco, Caucaia (CE)',
  'Nova Metrópole, Caucaia (CE)',
  'Aldeota, Fortaleza (CE)',
  'Meireles, Fortaleza (CE)',
  'Cocó, Fortaleza (CE)',
  'Fátima, Fortaleza (CE)',
  'Centro, Fortaleza (CE)',
  'Dionísio Torres, Fortaleza (CE)',
  'Joaquim Távora, Fortaleza (CE)',
  'Papicu, Fortaleza (CE)',
  'Varjota, Fortaleza (CE)',
  'Mucuripe, Fortaleza (CE)',
  'Guararapes, Fortaleza (CE)',
  'Engenheiro Luciano Cavalcante, Fortaleza (CE)',
  'Passaré, Fortaleza (CE)',
  'Maraponga, Fortaleza (CE)',
  'Parangaba, Fortaleza (CE)',
  'Messejana, Fortaleza (CE)',
  'Cambeba, Fortaleza (CE)',
  'Lagoa Redonda, Fortaleza (CE)',
  'José de Alencar, Fortaleza (CE)',
  'Serrinha, Fortaleza (CE)',
  'Cidade dos Funcionários, Fortaleza (CE)',
  'Alphaville, Eusébio (CE)',
  'Centro, Eusébio (CE)',
  'Pires Façanha, Eusébio (CE)',
  'Maracanaú, Região Metropolitana (CE)',
  'Jereissati, Maracanaú (CE)'
];

const getSpecsForRepasse = (item: Repasse) => {
  const isHouse = item.titulo.toLowerCase().includes('casa') || (item.descricao && item.descricao.toLowerCase().includes('casa'));
  const area = item.area || 0;
  return {
    suites: item.quartos > 1 ? Math.max(1, item.quartos - 1) : 0,
    banheiros: item.quartos >= 3 ? 3 : (item.quartos === 2 ? 2 : 1),
    vagas: area >= 200 ? 3 : (area >= 80 ? 2 : 1),
    aceitaPet: area >= 60 ? 'Sim' : 'Não',
    caracteristicas: isHouse 
      ? ['Área de serviço', 'Cozinha', 'Portão eletrônico', 'Churrasqueira', 'Piso cerâmico', 'Quintal']
      : ['Área de serviço', 'Cozinha', 'Portão eletrônico', 'Churrasqueira', 'Varanda Gourmet', 'Elevador']
  };
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

  // Estados da Área do Cliente
  const [simValChave, setSimValChave] = useState(150000);
  const [simSaldoDev, setSimSaldoDev] = useState(300000);
  const [simEntrada, setSimEntrada] = useState(80000);
  const [simTroca, setSimTroca] = useState(30000);
  const [simPrazo, setSimPrazo] = useState(240);
  const [simJuros] = useState(9.5); // % a.a.
  const [prefBairro, setPrefBairro] = useState('');
  const [prefQuartos, setPrefQuartos] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searched, setSearched] = useState(false);

  // Controle de Modais Customizados
  const [modalActive, setModalActive] = useState<'none' | 'encomendar' | 'financiamento' | 'cadastrar' | 'avaliar'>('none');
  const [selectedDetailsRepasse, setSelectedDetailsRepasse] = useState<Repasse | null>(null);

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
  const [avBairroInput, setAvBairroInput] = useState('');
  const [showAvBairroDropdown, setShowAvBairroDropdown] = useState(false);
  const [avRua, setAvRua] = useState('');
  const [avNumero, setAvNumero] = useState('');
  const [avComplemento, setAvComplemento] = useState('');
  const [avTipo, setAvTipo] = useState('');
  const [avNegocio, setAvNegocio] = useState('');
  const [avArea, setAvArea] = useState('');
  const [avQuartos, setAvQuartos] = useState('Ignorar');
  const [avSuites, setAvSuites] = useState('Ignorar');
  const [avVagas, setAvVagas] = useState('Ignorar');
  const [avBanheiros, setAvBanheiros] = useState('Ignorar');
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
  const [leadMensagem, setLeadMensagem] = useState('');
  const [sendingLead, setSendingLead] = useState(false);

  // Efeito para preencher a mensagem de interesse do lead ao selecionar um imóvel
  useEffect(() => {
    if (selectedDetailsRepasse) {
      setLeadMensagem(`Olá! Tenho interesse no imóvel código CA-${selectedDetailsRepasse.id}. Poderia me passar mais informações?`);
    }
  }, [selectedDetailsRepasse]);

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

  // Click outside para fechar o dropdown de bairros da avaliação
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.bairro-autocomplete-dropdown') && !target.closest('input[placeholder="Digite para buscar o bairro..."]')) {
        setShowAvBairroDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

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
        repasse_id: null,
        corretor_id: corretorParam || undefined
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
        repasse_id: null,
        corretor_id: corretorParam || undefined
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
        repasse_id: null,
        corretor_id: corretorParam || undefined
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
      const payloadNome = leadMensagem ? `${leadNome} (Mensagem: ${leadMensagem.substring(0, 100)})` : leadNome;
      const res = await api.post<{ lead: { corretor_nome: string } }>('/leads', {
        nome: payloadNome,
        telefone: leadTelefone,
        email: leadEmail || undefined,
        repasse_id: selectedRepasseId || selectedDetailsRepasse?.id || null,
        corretor_id: corretorParam || undefined
      });

      closeLeadModal();
      setSelectedDetailsRepasse(null);
      setLeadMensagem('');
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

  // Cálculos do simulador do cliente
  const simVgv = simValChave + simSaldoDev;
  const simItbi = simVgv * 0.03;
  const simRegistro = 4500;
  const simTaxaConst = simVgv * 0.01;
  const simAdicionais = simItbi + simRegistro + simTaxaConst;
  const simSaldoFinanciado = simSaldoDev;
  const simAmortizacao = simSaldoFinanciado / simPrazo;
  const simTaxaJurosMensal = (simJuros / 100) / 12;
  const simJurosInicial = simSaldoFinanciado * simTaxaJurosMensal;
  const simPrimeiraParcela = simAmortizacao + simJurosInicial;

  // Filtro de matchmaking do cliente
  const clientMatches = repasses.filter(r => {
    if (prefBairro && r.bairro.toLowerCase() !== prefBairro.toLowerCase()) return false;
    if (prefQuartos && r.quartos < parseInt(prefQuartos)) return false;
    return r.status === 'Disponível';
  }).slice(0, 3);

  const clientTabActive = searchParams.get('tab') === 'cliente';

  return (
    <div>
      {clientTabActive ? (
        <section style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', minHeight: '60vh' }}>
          {/* Header do Espaço do Cliente */}
          <div className="glass-panel" style={{ padding: '30px', borderRadius: '18px', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>✨ Espaço Interativo do Cliente</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '6px' }}>
              Simule custos de transferência, encontre imóveis compatíveis e rastreie propostas em tempo real.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
            
            {/* Simulador Avançado */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px', border: '1px solid var(--border-color)', background: 'var(--panel-bg)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>📊 Simulador de Repasse Completo</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Valor da Chave (Ágio): {formatCurrency(simValChave)}</label>
                  <input type="range" min="30000" max="800000" step="5000" value={simValChave} onChange={(e) => setSimValChave(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Saldo Devedor do Banco: {formatCurrency(simSaldoDev)}</label>
                  <input type="range" min="50000" max="1500000" step="10000" value={simSaldoDev} onChange={(e) => setSimSaldoDev(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Entrada em Dinheiro: {formatCurrency(simEntrada)}</label>
                  <input type="range" min="10000" max={simValChave} step="5000" value={simEntrada} onChange={(e) => setSimEntrada(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Carros / Bens na Troca: {formatCurrency(simTroca)}</label>
                  <input type="range" min="0" max={simValChave - simEntrada} step="5000" value={simTroca} onChange={(e) => setSimTroca(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Prazo do Financiamento: {simPrazo} meses</label>
                  <input type="range" min="60" max="360" step="12" value={simPrazo} onChange={(e) => setSimPrazo(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>VGV Geral do Imóvel:</span>
                    <strong>{formatCurrency(simVgv)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>ITBI e Custos de Cartório:</span>
                    <span>{formatCurrency(simAdicionais)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Saldo Restante da Chave (Ágio):</span>
                    <strong style={{ color: 'var(--primary)' }}>{formatCurrency(simValChave - simEntrada - simTroca)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', fontWeight: 700 }}>
                    <span>Primeira Parcela Est. (SAC):</span>
                    <strong style={{ color: 'var(--success)' }}>{formatCurrency(simPrimeiraParcela)}/mês</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Matchmaking Inteligente & Rastreador */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Matchmaking */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px', border: '1px solid var(--border-color)', background: 'var(--panel-bg)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>✨ Encontre seu Match de Repasse</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '16px' }}>
                  Escolha suas preferências e encontre imóveis ideais instantaneamente.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select className="form-control" value={prefBairro} onChange={(e) => setPrefBairro(e.target.value)} style={{ flex: 1, fontSize: '0.85rem' }}>
                      <option value="">Qualquer Bairro</option>
                      <option value="Aldeota">Aldeota</option>
                      <option value="Cocó">Cocó</option>
                      <option value="Meireles">Meireles</option>
                      <option value="Eusébio">Eusébio</option>
                      <option value="Cumbuco">Cumbuco</option>
                      <option value="Passaré">Passaré</option>
                      <option value="Fátima">Fátima</option>
                    </select>
                    <select className="form-control" value={prefQuartos} onChange={(e) => setPrefQuartos(e.target.value)} style={{ flex: 1, fontSize: '0.85rem' }}>
                      <option value="">Qualquer Quartos</option>
                      <option value="1">1+ Quartos</option>
                      <option value="2">2+ Quartos</option>
                      <option value="3">3+ Quartos</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Matches Recomendados ({clientMatches.length})</h4>
                    {clientMatches.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>Nenhum imóvel disponível para estas preferências.</div>
                    ) : (
                      clientMatches.map(r => (
                        <div 
                          key={r.id} 
                          onClick={() => setSelectedDetailsRepasse(r)}
                          style={{ display: 'flex', gap: '12px', padding: '10px', background: 'rgba(0,0,0,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer' }}
                        >
                          <img src={r.imagem_url} alt={r.titulo} style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{r.titulo}</strong>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Chave: {formatCurrency(parseFloat(r.valor_chave.toString()))}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Rastreador de Propostas */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px', border: '1px solid var(--border-color)', background: 'var(--panel-bg)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>🔍 Rastreador de Propostas</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '16px' }}>
                  Consulte a fase atual de sua proposta de repasse em tempo real.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="tel" 
                      className="form-control" 
                      placeholder="Digite seu WhatsApp de cadastro" 
                      value={searchPhone} 
                      onChange={(e) => setSearchPhone(formatPhone(e.target.value))}
                      style={{ flex: 1, fontSize: '0.88rem' }}
                    />
                    <button className="btn btn-primary" onClick={() => setSearched(true)} style={{ padding: '0 20px' }}>Buscar</button>
                  </div>

                  {searched && (
                    <div style={{ marginTop: '10px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px' }}>Status da Proposta:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid var(--primary)', paddingLeft: '14px', marginLeft: '6px' }}>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '-19px', top: '1px', background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: '8px', height: '8px' }}></span>
                          <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>📝 Proposta Recebida</strong>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Fase concluída com sucesso.</span>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '-19px', top: '1px', background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: '8px', height: '8px' }}></span>
                          <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>🔍 Análise de Crédito</strong>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Documentação enviada para análise da Caixa Econômica Federal.</span>
                        </div>
                        <div style={{ position: 'relative', opacity: 0.5 }}>
                          <span style={{ position: 'absolute', left: '-19px', top: '1px', background: 'var(--text-muted)', color: '#fff', borderRadius: '50%', width: '8px', height: '8px' }}></span>
                          <strong style={{ fontSize: '0.82rem' }}>⚖️ Validação Construtora</strong>
                          <span style={{ display: 'block', fontSize: '0.7rem' }}>Aguardando anuência de transferência de direitos da construtora.</span>
                        </div>
                        <div style={{ position: 'relative', opacity: 0.5 }}>
                          <span style={{ position: 'absolute', left: '-19px', top: '1px', background: 'var(--text-muted)', color: '#fff', borderRadius: '50%', width: '8px', height: '8px' }}></span>
                          <strong style={{ fontSize: '0.82rem' }}>✍️ Assinatura do Contrato</strong>
                          <span style={{ display: 'block', fontSize: '0.7rem' }}>Emissão de minutas e coleta de assinaturas digitais.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </section>
      ) : (
        <>
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
            <button className="quick-pill-btn" onClick={() => { setAvStep(0); setModalActive('avaliar'); }}>
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
                onSelect={(selectedItem) => setSelectedDetailsRepasse(selectedItem)}
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
        </>
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
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
              <button className="modal-close" onClick={() => setModalActive('none')} style={{ marginLeft: 'auto' }}>&times;</button>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '16px', padding: '0 20px' }}>
              <h2 style={{ fontSize: '1.7rem', fontWeight: 700, color: '#f97316', margin: '0 0 4px', fontFamily: 'sans-serif' }}>
                Descubra quanto cobrar pelo seu imóvel
              </h2>
            </div>

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

            {/* Step 0: Escolha inicial (Venda ou Aluguel) */}
            {avStep === 0 && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontWeight: 700 }}>
                  Avaliar o valor do imóvel para venda ou para alugar?
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '20px 0' }}>
                  {/* Opção Venda */}
                  <div 
                    onClick={() => {
                      setAvNegocio('Venda');
                      setAvStep(1);
                    }}
                    style={{
                      border: '2px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '30px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: 'rgba(0,0,0,0.01)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#f97316';
                      e.currentTarget.style.transform = 'scale(1.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>🏷️</span>
                    <strong style={{ fontSize: '1.15rem', display: 'block', color: 'var(--text-primary)' }}>Avaliar para Venda</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '8px' }}>
                      Descobrir o valor de mercado estimado do meu imóvel para vendê-lo.
                    </span>
                  </div>

                  {/* Opção Aluguel */}
                  <div 
                    onClick={() => {
                      setAvNegocio('Aluguel');
                      setAvStep(1);
                    }}
                    style={{
                      border: '2px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '30px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: 'rgba(0,0,0,0.01)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#f97316';
                      e.currentTarget.style.transform = 'scale(1.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>🔑</span>
                    <strong style={{ fontSize: '1.15rem', display: 'block', color: 'var(--text-primary)' }}>Avaliar para Aluguel</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '8px' }}>
                      Estimar o valor recomendado de aluguel mensal do meu imóvel.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Localização */}
            {avStep === 1 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.15rem', margin: '0', fontWeight: 700 }}>Localização</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Tipo de Avaliação: <strong style={{ color: '#f97316' }}>{avNegocio}</strong>
                  </span>
                </div>
                
                {/* Campo Bairro com Autocomplete (Imagem 1) */}
                <div className="form-group" style={{ position: 'relative', marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Bairro *</label>
                  <div className={avErrors.bairro ? 'invalid-input-container' : ''}>
                    {avErrors.bairro && <span className="invalid-input-badge">INFORME</span>}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={avBairroInput} 
                        onChange={(e) => {
                          setAvBairroInput(e.target.value);
                          setAvBairro(e.target.value);
                          setShowAvBairroDropdown(true);
                        }}
                        onFocus={() => setShowAvBairroDropdown(true)}
                        placeholder="Digite para buscar o bairro..."
                        style={{ border: avErrors.bairro ? 'none' : '', paddingRight: '40px' }}
                      />
                      <Search size={18} style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    {/* Autocomplete Dropdown overlay */}
                    {showAvBairroDropdown && (
                      <div className="bairro-autocomplete-dropdown">
                        {NEIGHBORHOODS.filter(n => n.toLowerCase().includes(avBairroInput.toLowerCase())).map((n, i) => (
                          <div 
                            key={i} 
                            className="bairro-autocomplete-item" 
                            onClick={() => {
                              setAvBairro(n);
                              setAvBairroInput(n);
                              setShowAvBairroDropdown(false);
                            }}
                          >
                            {n}
                          </div>
                        ))}
                        {NEIGHBORHOODS.filter(n => n.toLowerCase().includes(avBairroInput.toLowerCase())).length === 0 && (
                          <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                            Nenhum bairro encontrado. Use o digitado.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rua, Número, Complemento */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
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

                {/* Tipo de Imóvel */}
                <div className="form-group" style={{ position: 'relative', marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Tipo do Imóvel *</label>
                  <div className={avErrors.tipo ? 'invalid-input-container' : ''}>
                    {avErrors.tipo && <span className="invalid-input-badge">INFORME</span>}
                    <select 
                      className="form-control" 
                      value={avTipo} 
                      onChange={(e) => setAvTipo(e.target.value)}
                      style={{ border: avErrors.tipo ? 'none' : '' }}
                    >
                      <option value="">Selecione o Tipo...</option>
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

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => setAvStep(0)}
                  >
                    Voltar
                  </button>
                  <button 
                    type="button" 
                    className="btn-orange-find" 
                    style={{ flex: 2 }}
                    onClick={handleCalculateValuation}
                  >
                    Próximo &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Características */}
            {avStep === 2 && (
              <div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', fontWeight: 700 }}>Características</h3>

                {/* Grid para Área Útil, Quartos e Suítes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {/* Área Útil */}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Área Útil</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        className="form-control" 
                        required 
                        value={avArea} 
                        onChange={(e) => setAvArea(e.target.value)} 
                        placeholder="" 
                        style={{ paddingRight: '40px' }}
                      />
                      <span style={{ position: 'absolute', right: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>m²</span>
                    </div>
                  </div>

                  {/* Quartos */}
                  <div className="form-group">
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Quartos</label>
                    <select className="form-control" value={avQuartos} onChange={(e) => setAvQuartos(e.target.value)}>
                      <option value="Ignorar">Ignorar</option>
                      <option value="Nenhum">Nenhum</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4 ou mais">4 ou mais</option>
                    </select>
                  </div>

                  {/* Suítes */}
                  <div className="form-group">
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Suítes</label>
                    <select className="form-control" value={avSuites} onChange={(e) => setAvSuites(e.target.value)}>
                      <option value="Ignorar">Ignorar</option>
                      <option value="Nenhum">Nenhum</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4 ou mais">4 ou mais</option>
                    </select>
                  </div>
                </div>

                {/* Grid para Banheiros e Vagas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr', gap: '12px', marginBottom: '24px' }}>
                  {/* Banheiros */}
                  <div className="form-group">
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Banheiros</label>
                    <select className="form-control" value={avBanheiros} onChange={(e) => setAvBanheiros(e.target.value)}>
                      <option value="Ignorar">Ignorar</option>
                      <option value="Nenhum">Nenhum</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4 ou mais">4 ou mais</option>
                    </select>
                  </div>

                  {/* Vagas */}
                  <div className="form-group" style={{ maxWidth: '100%' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Vagas</label>
                    <select className="form-control" value={avVagas} onChange={(e) => setAvVagas(e.target.value)}>
                      <option value="Ignorar">Ignorar</option>
                      <option value="Nenhum">Nenhum</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4 ou mais">4 ou mais</option>
                    </select>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1, height: '48px', fontSize: '1rem', fontWeight: 600 }} 
                    onClick={() => setAvStep(1)}
                  >
                    Anterior
                  </button>
                  <button 
                    type="button" 
                    className="btn-orange-find" 
                    style={{ flex: 2, height: '48px', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    onClick={handleValuationStep2}
                  >
                    Próximo
                  </button>
                </div>

                {/* Footer small powered by */}
                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Powered by NIVU
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
      {/* Modal Detalhes do Imóvel (Layout Nivu/Print - Widescreen) */}
      {selectedDetailsRepasse !== null && (() => {
        const specs = getSpecsForRepasse(selectedDetailsRepasse);
        const related = repasses.filter(r => r.id !== selectedDetailsRepasse.id).slice(0, 3);
        const formatCurrency = (val: string | number) => {
          return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(parseFloat(val.toString()));
        };

        return (
          <div className="modal-backdrop active" style={{ overflowY: 'auto', padding: '40px 0' }}>
            <div className="modal-content glass-panel" style={{ maxWidth: '1100px', width: '90%', padding: '0', overflow: 'hidden', margin: 'auto' }}>
              
              {/* Fotos / Carrossel no Topo */}
              <div style={{ position: 'relative', height: '400px', width: '100%' }}>
                <span className="badge badge-success" style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, fontSize: '0.9rem', padding: '8px 16px' }}>
                  {selectedDetailsRepasse.status || 'Disponível'}
                </span>
                
                {/* Badge 24 Fotos */}
                <div style={{ position: 'absolute', top: '20px', left: '130px', zIndex: 10, background: 'rgba(0,0,0,0.6)', color: '#ffffff', borderRadius: '20px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📷 24 Fotos
                </div>

                <button 
                  onClick={() => setSelectedDetailsRepasse(null)} 
                  style={{ 
                    position: 'absolute', 
                    top: '20px', 
                    right: '20px', 
                    zIndex: 10, 
                    background: 'rgba(0,0,0,0.6)', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: '36px', 
                    height: '36px', 
                    fontSize: '1.4rem', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  &times;
                </button>
                <img 
                  src={selectedDetailsRepasse.imagem_url} 
                  alt={selectedDetailsRepasse.titulo} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&auto=format&fit=crop&q=60';
                  }}
                />
                
                {/* Arrow navigation handles for carousels */}
                <div style={{ position: 'absolute', top: '50%', left: '20px', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '1.2rem', cursor: 'pointer' }}>
                  &lsaquo;
                </div>
                <div style={{ position: 'absolute', top: '50%', right: '20px', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '1.2rem', cursor: 'pointer' }}>
                  &rsaquo;
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
                  padding: '40px 30px 20px',
                  color: '#ffffff'
                }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f97316', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Oportunidade de Repasse
                  </span>
                  <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '4px 0 0', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                    {selectedDetailsRepasse.titulo}
                  </h2>
                </div>
              </div>

              {/* Corpo dividido: Esquerda (Conteúdo) vs Direita (Card Contato) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', padding: '30px' }}>
                
                {/* Esquerda: 62% de largura */}
                <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Negócio & Preço */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                        {selectedDetailsRepasse.titulo.toLowerCase().includes('alugar') ? 'Aluguel' : 'Venda'}
                      </span>
                      <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                        {formatCurrency(selectedDetailsRepasse.valor_chave)}
                      </h1>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        type="button" 
                        onClick={() => handleShare(selectedDetailsRepasse.id)} 
                        style={{ 
                          padding: '10px 16px', 
                          fontSize: '0.85rem', 
                          fontWeight: 700,
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          cursor: 'pointer', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '8px', 
                          background: 'transparent',
                          color: 'var(--text-primary)'
                        }}
                      >
                        🟢 WhatsApp
                      </button>
                      <button 
                        type="button" 
                        onClick={() => window.print()} 
                        style={{ 
                          padding: '10px 16px', 
                          fontSize: '0.85rem', 
                          fontWeight: 700,
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          cursor: 'pointer', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '8px', 
                          background: 'transparent',
                          color: 'var(--text-primary)'
                        }}
                      >
                        🖨️ PDF / A4
                      </button>
                      <style dangerouslySetInnerHTML={{ __html: `
                        @media print {
                          body * {
                            visibility: hidden !important;
                          }
                          .modal-backdrop, .modal-backdrop * {
                            visibility: visible !important;
                          }
                          .modal-backdrop {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            background: #ffffff !important;
                            padding: 0 !important;
                          }
                          .modal-content {
                            border: none !important;
                            box-shadow: none !important;
                            background: #ffffff !important;
                            width: 100% !important;
                            margin: 0 !important;
                          }
                          button, select, form {
                            display: none !important;
                          }
                        }
                      `}} />
                    </div>
                  </div>

                  {/* Grid de Especificações Físicas */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '20px' }}>
                    
                    {/* Área do Terreno */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.8rem' }}>📐</span>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Área do terreno</span>
                        <strong style={{ fontSize: '0.95rem' }}>{selectedDetailsRepasse.area} m²</strong>
                      </div>
                    </div>

                    {/* Quartos */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.8rem' }}>🛏️</span>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Quartos</span>
                        <strong style={{ fontSize: '0.95rem' }}>{selectedDetailsRepasse.quartos}</strong>
                      </div>
                    </div>

                    {/* Suítes */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.8rem' }}>🛁</span>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Suítes</span>
                        <strong style={{ fontSize: '0.95rem' }}>{specs.suites}</strong>
                      </div>
                    </div>

                    {/* Banheiros */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.8rem' }}>🚿</span>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Banheiros</span>
                        <strong style={{ fontSize: '0.95rem' }}>{specs.banheiros}</strong>
                      </div>
                    </div>

                    {/* Vagas */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.8rem' }}>🚗</span>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Vagas</span>
                        <strong style={{ fontSize: '0.95rem' }}>{specs.vagas}</strong>
                      </div>
                    </div>

                    {/* Aceita Pet */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.8rem' }}>🐾</span>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Aceita pet</span>
                        <strong style={{ fontSize: '0.95rem' }}>{specs.aceitaPet}</strong>
                      </div>
                    </div>

                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

                  {/* Descrição */}
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>Descrição</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
                      {selectedDetailsRepasse.descricao || 'Excelente oportunidade de repasse imobiliário em Fortaleza.'}
                    </p>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

                  {/* Características */}
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>Características</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {specs.caracteristicas.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>✔</span> {c}
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '15px 0' }} />

                  {/* Simulador Financeiro de Transferência */}
                  <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📊</span> Simulador de Transferência e Custos de Repasse
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
                      Calcule os custos adicionais estimados para realizar a cessão de direitos e registro deste imóvel.
                    </p>
                    
                    {(() => {
                      const vChave = parseFloat(selectedDetailsRepasse.valor_chave.toString()) || 0;
                      const sDevedor = parseFloat(selectedDetailsRepasse.saldo_devedor.toString()) || 0;
                      const vgv = vChave + sDevedor;
                      const itbi = vgv * 0.03;
                      const registro = 4500;
                      const taxaConstrutora = vgv * 0.01;
                      const custoTotalAdicional = itbi + registro + taxaConstrutora;
                      const capitalNecessario = vChave + custoTotalAdicional;

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                              <span>Valor da Chave (Ágio):</span>
                              <strong>{formatCurrency(vChave)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                              <span>Saldo Devedor Caixa:</span>
                              <strong>{formatCurrency(sDevedor)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                              <span>VGV Geral:</span>
                              <strong>{formatCurrency(vgv)}</strong>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.02)', padding: '14px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              <span>ITBI Est. (3%):</span>
                              <span>{formatCurrency(itbi)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              <span>Registro Cartório Est.:</span>
                              <span>{formatCurrency(registro)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              <span>Taxa Construtora (1%):</span>
                              <span>{formatCurrency(taxaConstrutora)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              <span>Total Taxas Extras:</span>
                              <span>{formatCurrency(custoTotalAdicional)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: 800, color: '#f97316', marginTop: '4px' }}>
                              <span>Entrada + Taxas Extras:</span>
                              <span>{formatCurrency(capitalNecessario)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                </div>

                {/* Direita: Card Contato (35% de largura) */}
                <div style={{ flex: '1 1 320px' }}>
                  <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'var(--panel-bg)', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Entrar em contato</h3>
                    
                    {/* Abas Mensagem / Visita */}
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '4px', marginBottom: '20px' }}>
                      <button type="button" style={{ flex: 1, border: 'none', background: '#f97316', color: '#ffffff', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                        Mensagem 💬
                      </button>
                      <button type="button" onClick={() => showToast('Agendamento de visitas disponível em breve!', 'info')} style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text-secondary)', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                        Agendar visita 📅
                      </button>
                    </div>

                    <form onSubmit={handleLeadSubmit}>
                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          required 
                          placeholder="Nome*" 
                          value={leadNome} 
                          onChange={(e) => setLeadNome(e.target.value)} 
                          style={{ height: '44px' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <input 
                          type="tel" 
                          className="form-control" 
                          required 
                          placeholder="Telefone*" 
                          value={leadTelefone} 
                          onChange={(e) => setLeadTelefone(formatPhone(e.target.value))} 
                          style={{ height: '44px' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <input 
                          type="email" 
                          className="form-control" 
                          placeholder="E-mail" 
                          value={leadEmail} 
                          onChange={(e) => setLeadEmail(e.target.value)} 
                          style={{ height: '44px' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <textarea 
                          className="form-control" 
                          required 
                          rows={3} 
                          value={leadMensagem} 
                          onChange={(e) => setLeadMensagem(e.target.value)} 
                          style={{ resize: 'none', fontSize: '0.9rem', padding: '12px' }}
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="btn-orange-find" 
                        style={{ width: '100%', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 700 }}
                        disabled={sendingLead}
                      >
                        {sendingLead ? 'Enviando...' : 'Enviar mensagem'}
                      </button>

                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.4', textAlign: 'center' }}>
                        Ao enviar concordo com os termos de uso e política de privacidade, para contatar os próximos anunciantes e afirmo ter mais de 18 anos.
                      </p>
                    </form>
                  </div>
                </div>

              </div>

              {/* Rodapé: Já viu estes imóveis? (Recomendados) */}
              <div style={{ background: 'rgba(0,0,0,0.01)', borderTop: '1px solid var(--border-color)', padding: '40px 30px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', marginBottom: '24px' }}>Já viu estes imóveis?</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                  {related.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        setSelectedDetailsRepasse(item);
                        const modalBackdrop = document.querySelector('.modal-backdrop.active');
                        if (modalBackdrop) modalBackdrop.scrollTop = 0;
                      }}
                      style={{ cursor: 'pointer', overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border-color)', height: '200px', position: 'relative', transition: 'all 0.3s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <img src={item.imagem_url} alt={item.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)', padding: '16px', color: '#ffffff' }}>
                        <span style={{ fontSize: '0.98rem', fontWeight: 700 }}>📍 {item.bairro}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
