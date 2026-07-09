import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import { initDb } from './database/db';

// Controllers
import * as repassesController from './controllers/repassesController';
import * as leadsController from './controllers/leadsController';
import * as contractsController from './controllers/contractsController';
import * as authController from './controllers/authController';
import { authMiddleware } from './middlewares/authMiddleware';

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

console.log('>>> [SISTEMA] Inicializando Plataforma de Repasses em TypeScript...');

// Middleware de CORS
app.use(cors());

// Middlewares Globais de Segurança e Timeout (Padrão STI)
app.use((req: Request, res: Response, next: NextFunction) => {
  req.setTimeout(10000, () => {
    console.log(`>>> [STI] TIMEOUT: A requisição para ${req.originalUrl} excedeu 10s.`);
    res.status(408).send('Request Timeout');
  });

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

// Autenticação (Rotas Públicas e Me protegida)
app.post('/api/auth/login', authController.login);
app.post('/api/auth/register', authController.register);
app.get('/api/auth/me', authMiddleware, authController.me);

// Repasses
app.get('/api/repasses', repassesController.getRepasses);
app.get('/api/repasses/:id', repassesController.getRepasseById);
app.get('/api/repasses/corretor/:corretorId', repassesController.getRepassesByCorretor);
app.post('/api/repasses', authMiddleware, repassesController.createRepasse);
app.get('/api/corretores', authMiddleware, repassesController.getCorretores);

// Leads
app.post('/api/leads', leadsController.createLead);
app.get('/api/leads', authMiddleware, leadsController.getLeads);
app.put('/api/leads/:id/status', authMiddleware, leadsController.updateLeadStatus);

// Dashboard
app.get('/api/dashboard/stats', authMiddleware, leadsController.getDashboardStats);

// Contratos e Automação Jurídica
app.post('/api/contracts/generate', authMiddleware, contractsController.generateContract);
app.post('/api/contracts/verify-certificates', authMiddleware, contractsController.verifyCertificates);

// ============================================================================
// >>> ROTEAMENTO ESTÁTICO (FRONTEND REACT COM VITE)
// ============================================================================

// Servir arquivos estáticos do frontend compilado
const isCompiled = __dirname.endsWith('dist') || __dirname.includes('dist/');
const frontendDistPath = isCompiled
  ? path.join(__dirname, '../../frontend/dist')
  : path.join(__dirname, '../frontend/dist');

app.use(express.static(frontendDistPath));

// Fallback para o frontend SPA (React Router cuidará das rotas /admin, etc.)
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// ============================================================================
// >>> INICIALIZAÇÃO
// ============================================================================

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
