"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./database/db");
// Controllers
const repassesController = __importStar(require("./controllers/repassesController"));
const leadsController = __importStar(require("./controllers/leadsController"));
const contractsController = __importStar(require("./controllers/contractsController"));
const authController = __importStar(require("./controllers/authController"));
const adminController = __importStar(require("./controllers/adminController"));
const authMiddleware_1 = require("./middlewares/authMiddleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
console.log('>>> [SISTEMA] Inicializando Plataforma de Repasses em TypeScript...');
// Middleware de CORS
app.use((0, cors_1.default)());
// Middlewares Globais de Segurança e Timeout (Padrão STI)
app.use((req, res, next) => {
    req.setTimeout(10000, () => {
        console.log(`>>> [STI] TIMEOUT: A requisição para ${req.originalUrl} excedeu 10s.`);
        res.status(408).send('Request Timeout');
    });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});
// Middleware de Log detalhado para depuração
app.use((req, res, next) => {
    console.log(`>>> [REQ] ${req.method} ${req.originalUrl}`);
    const originalJson = res.json;
    res.json = function (body) {
        console.log(`>>> [RES-JSON] ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`);
        if (res.statusCode >= 400) {
            console.log(`>>> [RES-ERROR] Body:`, JSON.stringify(body));
        }
        return originalJson.apply(this, arguments);
    };
    next();
});
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
// ============================================================================
// >>> ROTAS DA API
// ============================================================================
// Autenticação (Rotas Públicas e Me protegida)
app.post('/api/auth/login', authController.login);
app.post('/api/auth/register', authController.register);
app.get('/api/auth/me', authMiddleware_1.authMiddleware, authController.me);
app.put('/api/auth/profile', authMiddleware_1.authMiddleware, authController.updateProfile);
// Repasses
app.get('/api/repasses', repassesController.getRepasses);
app.get('/api/repasses/:id', repassesController.getRepasseById);
app.get('/api/repasses/corretor/:corretorId', repassesController.getRepassesByCorretor);
app.post('/api/repasses', authMiddleware_1.authMiddleware, repassesController.createRepasse);
app.put('/api/repasses/:id', authMiddleware_1.authMiddleware, repassesController.updateRepasse);
app.delete('/api/repasses/:id', authMiddleware_1.authMiddleware, repassesController.deleteRepasse);
app.get('/api/corretores', authMiddleware_1.authMiddleware, repassesController.getCorretores);
// Leads
app.post('/api/leads', leadsController.createLead);
app.get('/api/leads', authMiddleware_1.authMiddleware, leadsController.getLeads);
app.put('/api/leads/:id/status', authMiddleware_1.authMiddleware, leadsController.updateLeadStatus);
app.get('/api/sales/events', authMiddleware_1.authMiddleware, leadsController.getSaleEvents);
// Dashboard
app.get('/api/dashboard/stats', authMiddleware_1.authMiddleware, leadsController.getDashboardStats);
// Gestão de Equipe (Admin)
app.get('/api/admin/team', authMiddleware_1.authMiddleware, adminController.getTeam);
app.post('/api/admin/team', authMiddleware_1.authMiddleware, adminController.createTeamMember);
app.put('/api/admin/team/:id', authMiddleware_1.authMiddleware, adminController.updateTeamMember);
app.get('/api/admin/settings', authMiddleware_1.authMiddleware, adminController.getSettings);
app.put('/api/admin/settings', authMiddleware_1.authMiddleware, adminController.updateSettings);
// Contratos e Automação Jurídica
app.post('/api/contracts/generate', authMiddleware_1.authMiddleware, contractsController.generateContract);
app.post('/api/contracts/verify-certificates', authMiddleware_1.authMiddleware, contractsController.verifyCertificates);
// ============================================================================
// >>> ROTEAMENTO ESTÁTICO (FRONTEND REACT COM VITE)
// ============================================================================
// Servir arquivos estáticos do frontend compilado
const isCompiled = __dirname.endsWith('dist') || __dirname.includes('dist/');
const frontendDistPath = isCompiled
    ? path_1.default.join(__dirname, '../../frontend/dist')
    : path_1.default.join(__dirname, '../frontend/dist');
app.use(express_1.default.static(frontendDistPath));
// Fallback para o frontend SPA (React Router cuidará das rotas /admin, etc.)
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(frontendDistPath, 'index.html'));
});
// ============================================================================
// >>> INICIALIZAÇÃO
// ============================================================================
(0, db_1.initDb)()
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
