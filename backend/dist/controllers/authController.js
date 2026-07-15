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
exports.updateProfile = exports.me = exports.register = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db = __importStar(require("../database/db"));
const JWT_SECRET = process.env.JWT_SECRET || 'repasses-secreto-secret-key-123';
const INVITATION_CODE = process.env.INVITATION_CODE || 'REPASSES2026';
// Autenticar Corretor
const login = async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        res.status(400).send('Por favor, informe e-mail e senha.');
        return;
    }
    try {
        const result = await db.query('SELECT * FROM corretores WHERE email = $1 AND ativo = TRUE', [email.toLowerCase().trim()]);
        if (result.rows.length === 0) {
            res.status(400).send('E-mail ou senha incorretos.');
            return;
        }
        const corretor = result.rows[0];
        // Verificar se o corretor possui senha_hash
        if (!corretor.senha_hash) {
            res.status(400).send('Corretor não possui senha configurada. Entre em contato com a administração.');
            return;
        }
        // Comparar senha
        const isMatch = await bcryptjs_1.default.compare(senha, corretor.senha_hash);
        if (!isMatch) {
            res.status(400).send('E-mail ou senha incorretos.');
            return;
        }
        // Gerar Token JWT
        const token = jsonwebtoken_1.default.sign({ id: corretor.id, email: corretor.email, nome: corretor.nome, role: corretor.role || 'corretor' }, JWT_SECRET, { expiresIn: '7d' } // Expira em 7 dias
        );
        res.json({
            token,
            corretor: {
                id: corretor.id,
                nome: corretor.nome,
                email: corretor.email,
                telefone: corretor.telefone,
                role: corretor.role || 'corretor'
            }
        });
    }
    catch (err) {
        console.error('>>> [AUTH] Erro no login:', err);
        res.status(500).send('Erro interno do servidor.');
    }
};
exports.login = login;
// Cadastrar Novo Corretor (Registro)
const register = async (req, res) => {
    const { nome, email, telefone, senha, codigo_convite } = req.body;
    if (!nome || !email || !senha) {
        res.status(400).send('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    // Validar código de convite
    if (codigo_convite !== INVITATION_CODE) {
        res.status(400).send('Código de convite/acesso incorreto.');
        return;
    }
    try {
        // Verificar e-mail duplicado
        const checkEmail = await db.query('SELECT id FROM corretores WHERE email = $1', [email.toLowerCase().trim()]);
        if (checkEmail.rows.length > 0) {
            res.status(400).send('Este e-mail já está registrado por outro corretor.');
            return;
        }
        // Criptografar Senha
        const salt = await bcryptjs_1.default.genSalt(10);
        const hash = await bcryptjs_1.default.hash(senha, salt);
        // Inserir Corretor no Banco
        const result = await db.query('INSERT INTO corretores (nome, email, telefone, senha_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, telefone, role', [nome.trim(), email.toLowerCase().trim(), telefone || null, hash, 'corretor']);
        const novoCorretor = result.rows[0];
        // Gerar Token JWT
        const token = jsonwebtoken_1.default.sign({ id: novoCorretor.id, email: novoCorretor.email, nome: novoCorretor.nome, role: novoCorretor.role || 'corretor' }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            corretor: novoCorretor
        });
    }
    catch (err) {
        console.error('>>> [AUTH] Erro no cadastro:', err);
        res.status(500).send('Erro interno do servidor.');
    }
};
exports.register = register;
// Obter dados do usuário logado
const me = async (req, res) => {
    const authReq = req;
    if (!authReq.user) {
        res.status(401).send('Não autorizado.');
        return;
    }
    res.json({ corretor: authReq.user });
};
exports.me = me;
// Atualizar Perfil do Corretor
const updateProfile = async (req, res) => {
    const authReq = req;
    if (!authReq.user) {
        res.status(401).send('Não autorizado.');
        return;
    }
    const userId = authReq.user.id;
    const { nome, nome_exibicao, telefone, foto_url, senha } = req.body;
    if (!nome) {
        res.status(400).send('Nome completo é obrigatório.');
        return;
    }
    try {
        let queryText = 'UPDATE corretores SET nome = $1, nome_exibicao = $2, telefone = $3, foto_url = $4';
        let queryParams = [nome.trim(), nome_exibicao ? nome_exibicao.trim() : null, telefone ? telefone.trim() : null, foto_url || null];
        if (senha && senha.trim()) {
            const salt = await bcryptjs_1.default.genSalt(10);
            const hash = await bcryptjs_1.default.hash(senha, salt);
            queryText += ', senha_hash = $5 WHERE id = $6 RETURNING id, nome, email, telefone, nome_exibicao, foto_url, role';
            queryParams.push(hash, userId);
        }
        else {
            queryText += ' WHERE id = $5 RETURNING id, nome, email, telefone, nome_exibicao, foto_url, role';
            queryParams.push(userId);
        }
        const result = await db.query(queryText, queryParams);
        const updatedCorretor = result.rows[0];
        // Gerar novo Token JWT com os dados atualizados do perfil
        const token = jsonwebtoken_1.default.sign({
            id: updatedCorretor.id,
            email: updatedCorretor.email,
            nome: updatedCorretor.nome,
            nome_exibicao: updatedCorretor.nome_exibicao,
            foto_url: updatedCorretor.foto_url,
            role: updatedCorretor.role
        }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            corretor: updatedCorretor
        });
    }
    catch (err) {
        console.error('>>> [AUTH] Erro ao atualizar perfil:', err);
        res.status(500).send('Erro interno do servidor.');
    }
};
exports.updateProfile = updateProfile;
