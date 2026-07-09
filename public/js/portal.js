// Lógica do Portal / Marketplace Público de Repasses

let selectedRepasseId = null;
let currentCorretorId = null;
let loadedRepasses = []; // Armazenamento global dos repasses carregados

document.addEventListener('DOMContentLoaded', () => {
  // Verificar se estamos acessando um portfólio exclusivo de corretor
  const urlParams = new URLSearchParams(window.location.search);
  currentCorretorId = urlParams.get('corretor');

  // Registrar listeners de filtros
  const filterInputs = ['filter-bairro', 'filter-quartos', 'filter-varanda', 'filter-chave', 'filter-saldo', 'filter-busca'];
  filterInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => debounce(fetchRepasses, 300)());
    }
  });

  // Modal formulário de leads
  const leadForm = document.getElementById('lead-form');
  if (leadForm) {
    leadForm.addEventListener('submit', handleLeadSubmit);
  }

  // Carregar dados iniciais
  if (currentCorretorId) {
    fetchCorretorPortfolio(currentCorretorId);
  } else {
    fetchRepasses();
  }
});

// Debounce para digitação rápida nos filtros
let debounceTimer;
function debounce(func, delay) {
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
}

// Buscar repasses gerais com filtros
async function fetchRepasses() {
  try {
    const grid = document.getElementById('repasses-grid');
    grid.innerHTML = '<div class="empty-state"><h3>Carregando repasses...</h3></div>';

    // Construir query string de filtros
    const queryParams = new URLSearchParams();
    
    const bairro = document.getElementById('filter-bairro')?.value;
    const quartos = document.getElementById('filter-quartos')?.value;
    const varanda = document.getElementById('filter-varanda')?.checked;
    const chaveMax = document.getElementById('filter-chave')?.value;
    const saldoMax = document.getElementById('filter-saldo')?.value;
    const busca = document.getElementById('filter-busca')?.value;

    if (bairro) queryParams.append('bairro', bairro);
    if (quartos) queryParams.append('quartos', quartos);
    if (varanda) queryParams.append('varanda', 'true');
    if (chaveMax) queryParams.append('valor_chave_max', chaveMax);
    if (saldoMax) queryParams.append('saldo_devedor_max', saldoMax);
    if (busca) queryParams.append('busca', busca);

    const data = await api.get(`/repasses?${queryParams.toString()}`);
    renderRepasses(data);
  } catch (err) {
    showToast('Falha ao carregar repasses da imobiliária.', 'danger');
  }
}

// Buscar portfólio do corretor específico
async function fetchCorretorPortfolio(corretorId) {
  try {
    const grid = document.getElementById('repasses-grid');
    grid.innerHTML = '<div class="empty-state"><h3>Carregando portfólio...</h3></div>';

    const data = await api.get(`/repasses/corretor/${corretorId}`);
    
    // Atualizar o banner do portfólio
    const portfolioBanner = document.getElementById('portfolio-banner');
    if (portfolioBanner) {
      portfolioBanner.style.display = 'flex';
      document.getElementById('portfolio-broker-name').innerText = data.corretor.nome;
      document.getElementById('portfolio-broker-phone').innerText = data.corretor.telefone;
      
      // Ocultar a seção hero para dar foco ao portfólio
      const hero = document.getElementById('hero-section');
      if (hero) hero.style.display = 'none';
      
      // Bloquear filtro de portfólio nas buscas ou apenas filtrar dentro dos repasses dele
      // Para fins de simplificação, ocultamos os filtros avançados no portfólio
      const filters = document.getElementById('filters-section');
      if (filters) filters.style.display = 'none';
    }

    renderRepasses(data.repasses);
  } catch (err) {
    showToast('Corretor não encontrado. Carregando portal geral.', 'warning');
    // Redirecionar para o portal geral caso dê erro
    window.history.replaceState({}, '', '/');
    currentCorretorId = null;
    fetchRepasses();
  }
}

// Renderizar os repasses na tela
function renderRepasses(repasses) {
  const grid = document.getElementById('repasses-grid');
  grid.innerHTML = '';

  if (repasses.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>Nenhum repasse disponível</h3>
        <p>Tente ajustar os filtros de busca para encontrar outras oportunidades.</p>
      </div>
    `;
    return;
  }

  repasses.forEach(item => {
    const card = document.createElement('div');
    card.className = 'repasse-card glass-panel';

    const formatCurrency = (val) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val));
    };

    card.innerHTML = `
      <div class="card-image-wrapper">
        <span class="badge badge-success card-badge">${item.status}</span>
        <img src="${item.imagem_url}" alt="${item.titulo}" onerror="this.src='https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&auto=format&fit=crop&q=60'">
      </div>
      <div class="card-details">
        <h3>${item.titulo}</h3>
        <div class="card-location">
          📍 <span>${item.bairro}</span>
        </div>
        <div class="card-specs">
          <span>🛏️ ${item.quartos} ${item.quartos > 1 ? 'Quartos' : 'Quarto'}</span>
          <span>📐 ${item.area ? item.area : 0} m²</span>
          <span>🌅 ${item.varanda ? 'Com Varanda' : 'Sem Varanda'}</span>
        </div>
        <div class="card-financials">
          <div class="financial-item">
            <span class="financial-label">Valor da Chave (Ágio)</span>
            <span class="financial-value highlight">${formatCurrency(item.valor_chave)}</span>
          </div>
          <div class="financial-item">
            <span class="financial-label">Saldo Devedor</span>
            <span class="financial-value">${formatCurrency(item.saldo_devedor)}</span>
          </div>
        </div>
        <div class="card-footer">
          <div class="broker-info">
            <span class="broker-label">Responsável</span>
            <span class="broker-name">${item.corretor_nome || 'N/A'}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" onclick="shareOnWhatsApp(${item.id})" title="Enviar por WhatsApp" style="padding: 10px 14px;">📲</button>
            <button class="btn btn-primary" onclick="openLeadModal(${item.id})">Negociar</button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Salvar repasses globalmente para compartilhar
  loadedRepasses = repasses;
}

// Compartilhar repasse no WhatsApp no formato de anotação rápida
function shareOnWhatsApp(id) {
  const item = loadedRepasses.find(r => r.id === id);
  if (!item) return;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val));
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
}

// Controle do Modal de Lead
function openLeadModal(repasseId) {
  selectedRepasseId = repasseId;
  const modal = document.getElementById('lead-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeLeadModal() {
  const modal = document.getElementById('lead-modal');
  if (modal) {
    modal.classList.remove('active');
    document.getElementById('lead-form').reset();
  }
  selectedRepasseId = null;
}

// Submeter o Lead (Cria o lead e aciona a Roleta de corretores)
async function handleLeadSubmit(e) {
  e.preventDefault();

  const nome = document.getElementById('lead-nome').value;
  const telefone = document.getElementById('lead-telefone').value;
  const email = document.getElementById('lead-email').value;

  if (!nome || !telefone) {
    showToast('Por favor, preencha nome e telefone.', 'warning');
    return;
  }

  try {
    const payload = {
      nome,
      telefone,
      email,
      repasse_id: selectedRepasseId
    };

    // Caso o cliente venha de um portfólio de corretor, podemos registrar essa informação.
    // Mas a roleta é justa e distribui de forma automática e igualitária no CRM.
    const res = await api.post('/leads', payload);
    
    closeLeadModal();
    
    // Sucesso! Mostrar para quem a roleta entregou o lead
    showToast(`Obrigado! O corretor <b>${res.lead.corretor_name}</b> já foi notificado e entrará em contato.`, 'success');
  } catch (err) {
    showToast('Ocorreu um erro ao enviar seu contato. Tente novamente.', 'danger');
  }
}
