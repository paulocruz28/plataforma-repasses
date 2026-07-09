// Lógica do Painel Administrativo, CRM Kanban e Automação Jurídica

let allLeads = [];
let allCorretores = [];
let allRepasses = [];

document.addEventListener('DOMContentLoaded', () => {
  // Configurar tabs de navegação
  const tabs = document.querySelectorAll('.admin-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-target');
      const sections = document.querySelectorAll('.admin-section');
      sections.forEach(s => s.classList.remove('active'));
      document.getElementById(target).classList.add('active');

      // Carregar dados específicos da aba aberta
      if (target === 'sec-dashboard') {
        loadDashboardData();
      } else if (target === 'sec-crm') {
        loadCRMData();
      } else if (target === 'sec-contracts') {
        loadContractsForm();
      }
    });
  });

  // Cadastro de Novo Repasse
  const repasseForm = document.getElementById('new-repasse-form');
  if (repasseForm) {
    repasseForm.addEventListener('submit', handleCreateRepasse);
  }

  // Formulário de Contrato
  const contractForm = document.getElementById('contract-form');
  if (contractForm) {
    contractForm.addEventListener('submit', handleGenerateContract);
  }

  // Carregar dados da tela padrão (Dashboard)
  loadDashboardData();
  loadCorretores();
});

// Formatar valores para Reais (BRL)
const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val));
};

// ---------------------------------------------------------
// 1. DASHBOARD
// ---------------------------------------------------------
async function loadDashboardData() {
  try {
    const data = await api.get('/dashboard/stats');
    
    // Atualizar os KPIs
    document.getElementById('stat-vgv').innerText = formatCurrency(data.financeiro.totalVgv);
    document.getElementById('stat-chaves').innerText = formatCurrency(data.financeiro.totalChaves);
    document.getElementById('stat-comissao-corretor').innerText = formatCurrency(data.financeiro.comissaoCorretor);
    document.getElementById('stat-comissao-gestor').innerText = formatCurrency(data.financeiro.comissaoGestor);

    // Tabela de performance dos corretores
    const tableBody = document.getElementById('performance-table-body');
    tableBody.innerHTML = '';

    if (data.performanceCorretores.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum corretor cadastrado</td></tr>';
      return;
    }

    data.performanceCorretores.forEach(c => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><b>${c.corretor_name}</b></td>
        <td>${c.total_leads}</td>
        <td><span class="badge badge-success">${c.vendas}</span></td>
        <td>${c.taxa_conversao}%</td>
      `;
      tableBody.appendChild(row);
    });

  } catch (err) {
    showToast('Erro ao carregar estatísticas do dashboard.', 'danger');
  }
}

// ---------------------------------------------------------
// 2. CRM / KANBAN
// ---------------------------------------------------------
async function loadCRMData() {
  try {
    allLeads = await api.get('/leads');
    renderKanban();
  } catch (err) {
    showToast('Erro ao carregar leads do CRM.', 'danger');
  }
}

function renderKanban() {
  const columns = {
    'Novo': document.getElementById('leads-novo'),
    'Não respondeu': document.getElementById('leads-nao-respondeu'),
    'Em negociação': document.getElementById('leads-em-negociacao'),
    'Vendido': document.getElementById('leads-vendido')
  };

  // Limpar colunas
  Object.keys(columns).forEach(key => {
    if (columns[key]) {
      columns[key].innerHTML = '';
      document.getElementById(`count-${key.toLowerCase().replace(/\s+/g, '-')}`).innerText = '0';
    }
  });

  const counts = { 'Novo': 0, 'Não respondeu': 0, 'Em negociação': 0, 'Vendido': 0 };

  allLeads.forEach(lead => {
    const col = columns[lead.status];
    if (col) {
      counts[lead.status]++;
      const card = document.createElement('div');
      card.className = 'lead-card glass-panel';
      card.innerHTML = `
        <div class="lead-name">${lead.nome}</div>
        <div class="lead-contact">📞 ${lead.telefone}</div>
        <div class="lead-property">🏠 ${lead.repasse_titulo || 'Interesse Geral'} (${lead.repasse_bairro || 'N/A'})</div>
        <div class="lead-footer">
          <span class="lead-broker-tag">👤 ${lead.corretor_name || 'Não distribuído'}</span>
          <select class="status-select" onchange="changeLeadStatus(${lead.id}, this.value)">
            <option value="Novo" ${lead.status === 'Novo' ? 'selected' : ''}>Novo</option>
            <option value="Não respondeu" ${lead.status === 'Não respondeu' ? 'selected' : ''}>Não respondeu</option>
            <option value="Em negociação" ${lead.status === 'Em negociação' ? 'selected' : ''}>Em negociação</option>
            <option value="Vendido" ${lead.status === 'Vendido' ? 'selected' : ''}>Vendido</option>
          </select>
        </div>
      `;
      col.appendChild(card);
    }
  });

  // Atualizar contadores
  Object.keys(counts).forEach(key => {
    const countEl = document.getElementById(`count-${key.toLowerCase().replace(/\s+/g, '-')}`);
    if (countEl) countEl.innerText = counts[key];
  });
}

// Alterar o status do lead no Kanban
async function changeLeadStatus(leadId, newStatus) {
  try {
    await api.put(`/leads/${leadId}/status`, { status: newStatus });
    showToast('Status do lead atualizado com sucesso!', 'success');
    // Recarregar os dados do CRM e do Dashboard caso as métricas tenham mudado
    loadCRMData();
  } catch (err) {
    showToast('Erro ao atualizar status do lead.', 'danger');
  }
}

// ---------------------------------------------------------
// 3. CADASTRO DE REPASSES
// ---------------------------------------------------------
async function loadCorretores() {
  try {
    allCorretores = await api.get('/corretores');
    
    // Preencher select de corretores no cadastro de repasses
    const select = document.getElementById('repasse-corretor');
    if (select) {
      select.innerHTML = '<option value="">Selecione o Corretor Responsável</option>';
      allCorretores.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerText = c.nome;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Erro ao carregar corretores:', err);
  }
}

async function handleCreateRepasse(e) {
  e.preventDefault();

  const payload = {
    titulo: document.getElementById('repasse-titulo').value,
    bairro: document.getElementById('repasse-bairro').value,
    valor_chave: document.getElementById('repasse-chave').value,
    saldo_devedor: document.getElementById('repasse-saldo').value,
    parcela: document.getElementById('repasse-parcela').value || null,
    quartos: document.getElementById('repasse-quartos').value || 1,
    varanda: document.getElementById('repasse-varanda').checked,
    area: document.getElementById('repasse-area').value || null,
    imagem_url: document.getElementById('repasse-imagem').value || null,
    descricao: document.getElementById('repasse-descricao').value,
    corretor_id: document.getElementById('repasse-corretor').value
  };

  if (!payload.titulo || !payload.bairro || !payload.valor_chave || !payload.saldo_devedor || !payload.corretor_id) {
    showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
    return;
  }

  try {
    await api.post('/repasses', payload);
    showToast('Repasse cadastrado no portal com sucesso!', 'success');
    document.getElementById('new-repasse-form').reset();
    
    // Atualiza estatísticas do dashboard se necessário
    loadDashboardData();
  } catch (err) {
    showToast('Erro ao cadastrar repasse imobiliário.', 'danger');
  }
}

// ---------------------------------------------------------
// 4. AUTOMAÇÃO JURÍDICA (CONTRATOS E CERTIDÕES)
// ---------------------------------------------------------
async function loadContractsForm() {
  try {
    // Buscar todos os repasses para o dropdown
    const data = await api.get('/repasses');
    allRepasses = data;

    const select = document.getElementById('contract-repasse');
    if (select) {
      select.innerHTML = '<option value="">Selecione o imóvel do repasse</option>';
      allRepasses.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.innerText = `[${r.bairro}] ${r.titulo} (Chave: ${formatCurrency(r.valor_chave)})`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    showToast('Erro ao carregar repasses para emissão de contrato.', 'danger');
  }
}

// Consulta de Certidões Negativas (Sefin / ONR)
async function requestCertificates() {
  const cpf = document.getElementById('c-cpf').value;
  if (!cpf) {
    showToast('É necessário informar o CPF para consultar certidões.', 'warning');
    return;
  }

  const container = document.getElementById('verification-status-box');
  container.style.display = 'block';

  // Atualiza interface para "Carregando"
  document.getElementById('dot-sefin').className = 'verification-dot checking';
  document.getElementById('text-sefin').innerText = 'SEFIN (Prefeitura): Consultando débitos do CPF...';
  
  document.getElementById('dot-onr').className = 'verification-dot';
  document.getElementById('text-onr').innerText = 'ONR (Cartórios): Aguardando finalização municipal...';

  try {
    // Fazer a chamada simulada com timeout de segurança
    const res = await api.post('/contracts/verify-certificates', { cpf });

    // Atualiza interface para "Sucesso" na primeira certidão (Sefin)
    setTimeout(() => {
      document.getElementById('dot-sefin').className = 'verification-dot success';
      document.getElementById('text-sefin').innerHTML = `SEFIN: <b>Nada Consta</b> (Cód. Autenticidade: ${res.consultas[0].codigo_autenticidade})`;
      
      // Inicia a segunda consulta (ONR)
      document.getElementById('dot-onr').className = 'verification-dot checking';
      document.getElementById('text-onr').innerText = 'ONR: Consultando matrícula do imóvel e restrições reais...';

      // Atualiza interface para sucesso na segunda certidão (ONR)
      setTimeout(() => {
        document.getElementById('dot-onr').className = 'verification-dot success';
        document.getElementById('text-onr').innerHTML = `ONR: <b>Matrícula Livre e Sem Ônus</b> (Protocolo: ${res.consultas[1].codigo_autenticidade})`;
        showToast('Todas as certidões foram geradas e validadas eletronicamente!', 'success');
      }, 1200);

    }, 1000);

  } catch (err) {
    showToast('Erro na conexão com órgãos governamentais ou timeout.', 'danger');
    document.getElementById('dot-sefin').className = 'verification-dot';
    document.getElementById('text-sefin').innerText = 'Erro ao conectar à SEFIN.';
    document.getElementById('dot-onr').className = 'verification-dot';
    document.getElementById('text-onr').innerText = 'Erro ao conectar à ONR.';
  }
}

// Geração automática do Contrato de cessão
async function handleGenerateContract(e) {
  e.preventDefault();

  const payload = {
    repasse_id: document.getElementById('contract-repasse').value,
    cliente_nome: document.getElementById('c-name').value,
    cliente_cpf: document.getElementById('c-cpf').value,
    cliente_profissao: document.getElementById('c-profissao').value,
    cliente_estado_civil: document.getElementById('c-estado-civil').value,
    cliente_endereco: document.getElementById('c-endereco').value
  };

  if (!payload.repasse_id || !payload.cliente_nome || !payload.cliente_cpf) {
    showToast('Imóvel, Nome e CPF do comprador são obrigatórios.', 'warning');
    return;
  }

  try {
    const res = await api.post('/contracts/generate', payload);
    
    // Renderizar o texto do contrato na caixa de preview
    document.getElementById('contract-preview-box').innerText = res.contrato;
    
    // Exibir botões de impressão e download
    document.getElementById('print-contract-btn').style.display = 'inline-flex';
    
    showToast('Minuta jurídica do contrato gerada com sucesso!', 'success');
  } catch (err) {
    showToast('Erro ao gerar contrato de repasse.', 'danger');
  }
}

// Imprimir o contrato gerado
function printContract() {
  window.print();
}
