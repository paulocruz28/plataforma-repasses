require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDb } = require('./database/db');

// Controllers
const repassesController = require('./controllers/repassesController');
const leadsController = require('./controllers/leadsController');
const contractsController = require('./controllers/contractsController');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

console.log('>>> [SISTEMA] Inicializando Plataforma de Repasses...');

// Middleware de CORS
app.use(cors());

// Middlewares Globais de Segurança e Timeout (Padrão STI)
app.use((req, res, next) => {
  // Mantendo timeout de 10s para integrações externas e conexões
  req.setTimeout(10000, () => {
    console.log(`>>> [STI] TIMEOUT: A requisição para ${req.originalUrl} excedeu 10s.`);
    res.status(408).send('Request Timeout');
  });

  // Headers de segurança básicos
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// >>> ROTAS DA API
// ============================================================================

// Repasses
app.get('/api/repasses', repassesController.getRepasses);
app.get('/api/repasses/:id', repassesController.getRepasseById);
app.get('/api/repasses/corretor/:corretorId', repassesController.getRepassesByCorretor);
app.post('/api/repasses', repassesController.createRepasse);
app.get('/api/corretores', repassesController.getCorretores);

// Leads
app.post('/api/leads', leadsController.createLead);
app.get('/api/leads', leadsController.getLeads);
app.put('/api/leads/:id/status', leadsController.updateLeadStatus);

// Dashboard
app.get('/api/dashboard/stats', leadsController.getDashboardStats);

// Contratos e Automação Jurídica
app.post('/api/contracts/generate', contractsController.generateContract);
app.post('/api/contracts/verify-certificates', contractsController.verifyCertificates);

// ============================================================================
// >>> ROTEAMENTO ESTÁTICO (FRONTEND)
// ============================================================================

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback para a área administrativa (CRM)
app.use('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback geral (Portal Público / Marketplace)
app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// >>> INICIALIZAÇÃO
// ============================================================================

// Inicializar banco PostgreSQL e depois ligar o servidor
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`>>> [SISTEMA] Servidor rodando com sucesso na porta ${PORT}`);
      console.log(`>>> Ambiente detectado: ${isProduction ? 'Nuvem/Render (Produção)' : 'Local/Docker (Desenvolvimento)'}`);
    });
  })
  .catch(err => {
    console.error('>>> [CRÍTICO] Falha ao iniciar banco de dados. Encerrando...', err);
    process.exit(1);
  });
